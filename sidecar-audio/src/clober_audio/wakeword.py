"""Wake word detection with openWakeWord (ONNX).

Until the custom model of F1.3 exists, the bundled pre-trained `hey_jarvis`
model stands in for it.
"""

from __future__ import annotations

import os
import warnings
from pathlib import Path

import numpy as np
import openwakeword
from openwakeword.model import Model

FRAME_SAMPLES = 1280  # 80 ms at 16 kHz, openWakeWord's frame size

BUNDLED_MODELS_DIR = Path(os.path.dirname(openwakeword.__file__)) / "resources" / "models"
PLACEHOLDER_MODEL = BUNDLED_MODELS_DIR / "hey_jarvis_v0.1.onnx"


def model_name(path: str | Path) -> str:
    """'hey_jarvis_v0.1.onnx' -> 'hey_jarvis'."""
    return Path(path).stem.split("_v")[0]


class WakeWordDetector:
    """Feed 16 kHz float32 chunks of any size; returns a score when the word is heard."""

    def __init__(self, model_path: str | Path = PLACEHOLDER_MODEL, threshold: float = 0.5) -> None:
        self.name = model_name(model_path)
        self.threshold = threshold
        with warnings.catch_warnings():
            # openWakeWord asks onnxruntime for CUDA first; CPU is what we want.
            warnings.filterwarnings("ignore", message=".*CUDAExecutionProvider.*")
            self._model = Model(wakeword_model_paths=[str(model_path)])
        self._key = next(iter(self._model.models))
        self._pending = np.zeros(0, dtype=np.int16)

    def reset(self) -> None:
        """Clears buffered audio and the model's history (call after a detection)."""
        self._pending = np.zeros(0, dtype=np.int16)
        self._model.reset()

    def feed(self, chunk: np.ndarray) -> float | None:
        pcm = (np.clip(chunk, -1.0, 1.0) * 32767).astype(np.int16)
        self._pending = np.concatenate([self._pending, pcm])
        detected: float | None = None
        while len(self._pending) >= FRAME_SAMPLES:
            frame, self._pending = self._pending[:FRAME_SAMPLES], self._pending[FRAME_SAMPLES:]
            score = float(self._model.predict(frame)[self._key])
            if detected is None and score >= self.threshold:
                detected = score
        if detected is not None:
            self.reset()
        return detected
