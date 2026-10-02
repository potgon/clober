from __future__ import annotations

import os
import wave
from pathlib import Path

import numpy as np
import pytest

DATA = Path(__file__).parent / "data"

# Same as the config default. "tiny" mishears the synthetic test voice.
TEST_STT_MODEL = os.environ.get("CLOBER_TEST_STT_MODEL", "base")


def load_wav(name: str) -> np.ndarray:
    """16 kHz mono 16-bit wav -> float32 in [-1, 1]."""
    with wave.open(str(DATA / name), "rb") as w:
        assert w.getframerate() == 16_000 and w.getnchannels() == 1 and w.getsampwidth() == 2
        pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    return pcm.astype(np.float32) / 32768.0


@pytest.fixture(scope="session")
def escena_juego() -> np.ndarray:
    return load_wav("escena_juego.wav")


@pytest.fixture(scope="session")
def transcriber():
    from clober_audio.stt import Transcriber

    return Transcriber(TEST_STT_MODEL, "es")
