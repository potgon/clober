"""STT benchmark to choose the default Whisper model (PLAN.md F0.6).

    uv run scripts/bench_stt.py [--dir ../evals/audio/poc] [--models tiny base small]

The folder holds pairs `NN.wav` (16 kHz mono 16-bit) + `NN.txt` (what was said).
Prints p50/p95 transcription time and WER per model and the model the rule picks.
"""

from __future__ import annotations

import argparse
import time
import wave
from pathlib import Path

import numpy as np

from clober_audio.bench import ModelResult, choose_model, wer
from clober_audio.stt import Transcriber

DEFAULT_DIR = Path(__file__).resolve().parents[2] / "evals" / "audio" / "poc"


def load(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as w:
        if (w.getframerate(), w.getnchannels(), w.getsampwidth()) != (16_000, 1, 2):
            raise SystemExit(f"{path.name}: expected 16 kHz mono 16-bit")
        pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    return pcm.astype(np.float32) / 32768.0


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--dir", type=Path, default=DEFAULT_DIR)
    p.add_argument("--models", nargs="+", default=["tiny", "base", "small"])
    p.add_argument("--lang", default="es")
    args = p.parse_args()

    pairs = [(w, w.with_suffix(".txt")) for w in sorted(args.dir.glob("*.wav"))]
    pairs = [(w, t) for w, t in pairs if t.exists()]
    if not pairs:
        raise SystemExit(f"no NN.wav + NN.txt pairs in {args.dir}")
    clips = [(w.name, load(w), t.read_text(encoding="utf-8").strip()) for w, t in pairs]
    print(f"{len(clips)} clips from {args.dir}\n")

    results = []
    for model in args.models:
        stt = Transcriber(model, args.lang)
        stt.transcribe(clips[0][1])  # warm up; the live sidecar loads once too
        result = ModelResult(model, [], [])
        for name, audio, reference in clips:
            start = time.perf_counter()
            text = stt.transcribe(audio)
            result.times_ms.append((time.perf_counter() - start) * 1000)
            result.wers.append(wer(reference, text))
            if result.wers[-1] > 0:
                print(f"  [{model}] {name}: {text!r} (expected {reference!r})")
        results.append(result)

    print(f"\n{'model':<8}{'p50 ms':>8}{'p95 ms':>8}{'WER':>7}")
    for r in results:
        print(f"{r.model:<8}{r.p50:>8.0f}{r.p95:>8.0f}{r.wer:>7.1%}")
    print(f"\nchosen by the F0.6 rule: {choose_model(results)}")


if __name__ == "__main__":
    main()
