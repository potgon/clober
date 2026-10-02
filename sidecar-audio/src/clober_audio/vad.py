"""Voice activity detection: streaming Silero model plus the end-of-utterance rule."""

from __future__ import annotations

import os
from enum import Enum

import numpy as np
import onnxruntime
from faster_whisper.vad import get_assets_path

SAMPLE_RATE = 16_000
CHUNK_SAMPLES = 512  # 32 ms, the chunk size Silero expects at 16 kHz
CHUNK_MS = CHUNK_SAMPLES * 1000 // SAMPLE_RATE
_CONTEXT_SAMPLES = 64


class SileroVad:
    """Streaming Silero VAD using the ONNX model bundled with faster-whisper.

    Call it with consecutive 512-sample float32 chunks; it keeps the recurrent
    state between calls. Call `reset()` before a new utterance.
    """

    def __init__(self, model_path: str | None = None) -> None:
        opts = onnxruntime.SessionOptions()
        opts.inter_op_num_threads = 1
        opts.intra_op_num_threads = 1
        opts.log_severity_level = 4
        path = model_path or os.path.join(get_assets_path(), "silero_vad_v6.onnx")
        self._session = onnxruntime.InferenceSession(
            path, providers=["CPUExecutionProvider"], sess_options=opts
        )
        self.reset()

    def reset(self) -> None:
        self._h = np.zeros((1, 1, 128), dtype=np.float32)
        self._c = np.zeros((1, 1, 128), dtype=np.float32)
        self._context = np.zeros(_CONTEXT_SAMPLES, dtype=np.float32)

    def __call__(self, chunk: np.ndarray) -> float:
        if chunk.shape != (CHUNK_SAMPLES,):
            raise ValueError(f"expected {CHUNK_SAMPLES} samples, got {chunk.shape}")
        frame = np.concatenate([self._context, chunk.astype(np.float32)])[np.newaxis, :]
        prob, self._h, self._c = self._session.run(
            None, {"input": frame, "h": self._h, "c": self._c}
        )
        self._context = chunk[-_CONTEXT_SAMPLES:].astype(np.float32)
        return float(prob[0])


class EndReason(Enum):
    END = "end"  # speech followed by enough silence
    MAX_LENGTH = "max_length"  # utterance hit the maximum length
    NO_SPEECH = "no_speech"  # nothing said before the start timeout


class Endpointer:
    """Decides when an utterance ends from per-chunk speech probabilities.

    Rule (PLAN.md §3): end after `silence_ms` of silence following speech, or at
    `max_ms`. If no speech starts within `start_timeout_ms`, the listen is cancelled.
    """

    def __init__(
        self,
        silence_ms: int = 500,
        max_ms: int = 10_000,
        start_timeout_ms: int = 3_000,
        threshold: float = 0.5,
        chunk_ms: int = CHUNK_MS,
    ) -> None:
        self.silence_ms = silence_ms
        self.max_ms = max_ms
        self.start_timeout_ms = start_timeout_ms
        self.threshold = threshold
        self.chunk_ms = chunk_ms
        self.reset()

    def reset(self) -> None:
        self.elapsed_ms = 0
        self.speech_started = False
        self._silence_run_ms = 0

    def push(self, prob: float) -> EndReason | None:
        self.elapsed_ms += self.chunk_ms
        if prob >= self.threshold:
            self.speech_started = True
            self._silence_run_ms = 0
        elif self.speech_started:
            self._silence_run_ms += self.chunk_ms

        if self.speech_started and self._silence_run_ms >= self.silence_ms:
            return EndReason.END
        if not self.speech_started and self.elapsed_ms >= self.start_timeout_ms:
            return EndReason.NO_SPEECH
        if self.elapsed_ms >= self.max_ms:
            return EndReason.MAX_LENGTH if self.speech_started else EndReason.NO_SPEECH
        return None
