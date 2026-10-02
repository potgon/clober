"""Wires microphone, wake word, push-to-talk, VAD, STT and the core connection.

The sidecar never interprets text: it only turns audio into transcripts
(and, from F1.2, text into audio). Contract: docs/PLAN.md §5.1.

States:
- idle: only the wake word detector runs (keeps idle CPU low)
- ptt: recording while the hotkey is held
- listening: after the wake word, VAD decides when the utterance ends
- busy: transcribing; new activations are ignored until it finishes
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from enum import Enum
from typing import Any, Protocol

import numpy as np

from . import __version__
from .vad import CHUNK_SAMPLES, SAMPLE_RATE, Endpointer, EndReason

log = logging.getLogger(__name__)

MIN_UTTERANCE_S = 0.3


def now_ms() -> int:
    return time.time_ns() // 1_000_000


class Detector(Protocol):
    name: str

    def feed(self, chunk: np.ndarray) -> float | None: ...
    def reset(self) -> None: ...


class Vad(Protocol):
    def __call__(self, chunk: np.ndarray) -> float: ...
    def reset(self) -> None: ...


class State(Enum):
    IDLE = "idle"
    PTT = "ptt"
    LISTENING = "listening"
    BUSY = "busy"


@dataclass
class Settings:
    url: str
    token: str
    lang: str
    stt_model: str
    ptt_key: str
    wake_word: str
    input_device: str | None
    output_device: str | None
    silence_ms: int = 500


class AudioApp:
    def __init__(
        self,
        settings: Settings,
        transcriber: Any,
        send: Any,
        *,
        detector: Detector | None = None,
        vad: Vad | None = None,
        earcon: Callable[[str], None] = lambda name: None,
    ) -> None:
        self.settings = settings
        self._transcriber = transcriber
        self._send = send  # async callable taking a message dict
        self._detector = detector
        self._vad = vad
        self._endpointer = Endpointer(silence_ms=settings.silence_ms)
        self._earcon = earcon
        self._stt_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="stt")
        self._loop: asyncio.AbstractEventLoop | None = None
        self.state = State.IDLE
        self._buffer: list[np.ndarray] = []
        self._t_wake = 0

    def hello(self) -> dict[str, Any]:
        return {
            "type": "hello",
            "version": __version__,
            "wake_word": self._detector.name if self._detector else self.settings.wake_word,
            "stt_model": self.settings.stt_model,
            "devices": {
                "input": self.settings.input_device,
                "output": self.settings.output_device,
            },
        }

    def attach(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    # --- thread-safe entry points (audio and keyboard threads) ---

    def on_chunk(self, chunk: np.ndarray) -> None:
        if self._loop:
            self._loop.call_soon_threadsafe(self._chunk, chunk)

    def on_ptt_down(self) -> None:
        if self._loop:
            self._loop.call_soon_threadsafe(self._ptt_down, now_ms())

    def on_ptt_up(self) -> None:
        if self._loop:
            self._loop.call_soon_threadsafe(self._ptt_up, now_ms())

    def on_core_message(self, message: dict[str, Any]) -> None:
        # speak, earcon, listen, pause/resume and config arrive in F1.2.
        log.debug("core message ignored in F0: %s", message.get("type"))

    # --- event loop side ---

    def _chunk(self, chunk: np.ndarray) -> None:
        if self.state is State.PTT:
            self._buffer.append(chunk)
        elif self.state is State.LISTENING:
            self._listen(chunk)
        elif self.state is State.IDLE and self._detector:
            score = self._detector.feed(chunk)
            if score is not None:
                self._wake(score)

    def _wake(self, score: float) -> None:
        if self._vad is None:
            log.error("wake word heard but no VAD configured")
            return
        self._earcon("wake")
        self.state = State.LISTENING
        self._buffer = []
        self._vad.reset()
        self._endpointer.reset()
        self._t_wake = now_ms()
        msg = {"type": "wake", "source": "wakeword", "score": score, "t_wake": self._t_wake}
        self._spawn(self._send(msg))

    def _listen(self, chunk: np.ndarray) -> None:
        assert self._vad is not None
        self._buffer.append(chunk)
        reason = None
        # The VAD needs exact 512-sample chunks; the microphone already delivers them.
        for i in range(0, len(chunk) - CHUNK_SAMPLES + 1, CHUNK_SAMPLES):
            reason = self._endpointer.push(self._vad(chunk[i : i + CHUNK_SAMPLES])) or reason
        if reason is None:
            return
        if reason is EndReason.NO_SPEECH:
            self._to_idle()
            self._spawn(self._send({"type": "listen_cancelled", "reason": "silence"}))
            return
        # The utterance ended when speech stopped, not when the silence timer ran out.
        # Measured in audio time since the wake, which matches the wall clock live
        # and stays consistent when audio is fed faster (tests, files).
        recorded_ms = sum(len(c) for c in self._buffer) * 1000 // SAMPLE_RATE
        t_speech_end = self._t_wake + recorded_ms - self._endpointer.trailing_silence_ms
        self._submit(t_speech_end)

    def _ptt_down(self, t: int) -> None:
        if self.state is State.BUSY:
            return
        self.state = State.PTT
        self._buffer = []
        self._t_wake = t
        self._spawn(self._send({"type": "wake", "source": "ptt", "t_wake": t}))

    def _ptt_up(self, t_speech_end: int) -> None:
        if self.state is not State.PTT:
            return
        if sum(len(c) for c in self._buffer) < MIN_UTTERANCE_S * SAMPLE_RATE:
            self._to_idle()
            self._spawn(self._send({"type": "listen_cancelled", "reason": "silence"}))
            return
        self._submit(t_speech_end)

    def _submit(self, t_speech_end: int) -> None:
        audio = np.concatenate(self._buffer)
        self._buffer = []
        self.state = State.BUSY
        self._spawn(self._finish(audio, self._t_wake, t_speech_end, "command"))

    def _to_idle(self) -> None:
        self.state = State.IDLE
        self._buffer = []
        if self._detector:
            self._detector.reset()

    async def _finish(self, audio: np.ndarray, t_wake: int, t_speech_end: int, mode: str) -> None:
        assert self._loop is not None
        try:
            text = await self._loop.run_in_executor(
                self._stt_pool, self._transcriber.transcribe, audio
            )
        finally:
            self._to_idle()
        t_transcript = now_ms()
        log.info("transcript (%d ms): %r", t_transcript - t_speech_end, text)
        if not text:
            await self._send({"type": "listen_cancelled", "reason": "silence"})
            return
        await self._send(
            {
                "type": "transcript",
                "id": uuid.uuid4().hex[:12],
                "text": text,
                "lang": self.settings.lang,
                "mode": mode,
                "t_wake": t_wake,
                "t_speech_end": t_speech_end,
                "t_transcript": t_transcript,
            }
        )

    def _spawn(self, coro: Any) -> None:
        task = asyncio.ensure_future(coro)
        task.add_done_callback(_log_task_error)


def _log_task_error(task: asyncio.Future) -> None:
    if not task.cancelled() and task.exception():
        log.error("sidecar task failed", exc_info=task.exception())
