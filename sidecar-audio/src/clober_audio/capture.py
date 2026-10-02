"""Microphone capture: 16 kHz mono float32 in 32 ms chunks."""

from __future__ import annotations

import logging
from collections.abc import Callable

import numpy as np
import sounddevice as sd

from .vad import CHUNK_SAMPLES, SAMPLE_RATE

log = logging.getLogger(__name__)


class Microphone:
    """Calls `on_chunk` from the audio thread with each 512-sample chunk."""

    def __init__(self, on_chunk: Callable[[np.ndarray], None], device: str | None = None) -> None:
        self._on_chunk = on_chunk
        self._stream = sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="float32",
            blocksize=CHUNK_SAMPLES,
            device=device,
            callback=self._callback,
        )

    def _callback(self, indata: np.ndarray, frames: int, time, status) -> None:  # noqa: ANN001
        if status:
            log.warning("audio input status: %s", status)
        self._on_chunk(indata[:, 0].copy())

    def start(self) -> None:
        self._stream.start()

    def stop(self) -> None:
        self._stream.stop()
        self._stream.close()
