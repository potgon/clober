"""Wires microphone, push-to-talk, STT and the core connection together.

The sidecar never interprets text: it only turns audio into transcripts
(and, from F1.2, text into audio). Contract: docs/PLAN.md §5.1.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any

import numpy as np

from . import __version__
from .vad import SAMPLE_RATE

log = logging.getLogger(__name__)

MIN_UTTERANCE_S = 0.3


def now_ms() -> int:
    return time.time_ns() // 1_000_000


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


class AudioApp:
    """Push-to-talk flow: key down -> `wake`, key up -> `transcript`."""

    def __init__(self, settings: Settings, transcriber: Any, send: Any) -> None:
        self.settings = settings
        self._transcriber = transcriber
        self._send = send  # async callable taking a message dict
        self._stt_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="stt")
        self._loop: asyncio.AbstractEventLoop | None = None
        self._recording = False
        self._buffer: list[np.ndarray] = []
        self._t_wake = 0

    def hello(self) -> dict[str, Any]:
        return {
            "type": "hello",
            "version": __version__,
            "wake_word": self.settings.wake_word,
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
        if self._recording:
            self._buffer.append(chunk)

    def _ptt_down(self, t: int) -> None:
        self._recording = True
        self._buffer = []
        self._t_wake = t
        self._spawn(self._send({"type": "wake", "source": "ptt", "t_wake": t}))

    def _ptt_up(self, t_speech_end: int) -> None:
        if not self._recording:
            return
        self._recording = False
        audio = np.concatenate(self._buffer) if self._buffer else np.zeros(0, np.float32)
        self._buffer = []
        if audio.size < MIN_UTTERANCE_S * SAMPLE_RATE:
            self._spawn(self._send({"type": "listen_cancelled", "reason": "silence"}))
            return
        self._spawn(self._finish(audio, self._t_wake, t_speech_end, "command"))

    async def _finish(self, audio: np.ndarray, t_wake: int, t_speech_end: int, mode: str) -> None:
        assert self._loop is not None
        text = await self._loop.run_in_executor(self._stt_pool, self._transcriber.transcribe, audio)
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
