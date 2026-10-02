"""Speech to text with faster-whisper on CPU (int8)."""

from __future__ import annotations

import numpy as np
from faster_whisper import WhisperModel


class Transcriber:
    """Loads the model once; `transcribe` takes 16 kHz mono float32 audio."""

    def __init__(self, model: str = "base", lang: str = "es", cpu_threads: int = 0) -> None:
        self.model_name = model
        self.lang = lang
        options = {"device": "cpu", "compute_type": "int8", "cpu_threads": cpu_threads}
        try:
            # A cached model loads without asking Hugging Face, which can take
            # tens of seconds on a slow network and should not be needed offline.
            self._model = WhisperModel(model, local_files_only=True, **options)
        except Exception:  # not cached yet: download it once
            self._model = WhisperModel(model, **options)

    def transcribe(self, audio: np.ndarray) -> str:
        segments, _ = self._model.transcribe(
            audio.astype(np.float32),
            language=self.lang,
            beam_size=1,
            # Audio is already cut by PTT or our own VAD.
            vad_filter=False,
            condition_on_previous_text=False,
            without_timestamps=True,
        )
        return " ".join(segment.text.strip() for segment in segments).strip()
