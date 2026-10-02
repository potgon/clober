"""Guided recorder for evaluation clips (T3): writes NN.wav + NN.txt pairs.

    uv run scripts/record_clips.py [--out ../evals/audio/poc] [--count 30] [--device NAME]

For each clip: Enter to start, say the phrase, Enter to stop, then type what you said.
Empty text discards the clip and records it again. Ctrl+C stops; existing clips are kept
and numbering continues where it left off.
"""

from __future__ import annotations

import argparse
import threading
import wave
from pathlib import Path

import numpy as np
import sounddevice as sd

RATE = 16_000
DEFAULT_OUT = Path(__file__).resolve().parents[2] / "evals" / "audio" / "poc"


def record(device: str | None) -> np.ndarray:
    chunks: list[np.ndarray] = []
    stop = threading.Event()

    def callback(indata, frames, time, status):  # noqa: ANN001
        chunks.append(indata[:, 0].copy())

    with sd.InputStream(
        samplerate=RATE, channels=1, dtype="int16", device=device, callback=callback
    ):
        threading.Thread(target=lambda: (input(), stop.set()), daemon=True).start()
        stop.wait()
    return np.concatenate(chunks) if chunks else np.zeros(0, np.int16)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    p.add_argument("--count", type=int, default=30)
    p.add_argument("--device", default=None)
    args = p.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    n = len(list(args.out.glob("*.wav")))
    print(f"{n} clips already in {args.out}")
    while n < args.count:
        name = f"{n + 1:02d}"
        input(f"\n[{name}/{args.count}] Enter to start recording… ")
        print("  recording — Enter to stop")
        audio = record(args.device)
        seconds = len(audio) / RATE
        text = input(f"  {seconds:.1f} s. What did you say? (empty = redo) ").strip()
        if not text or seconds < 0.3:
            print("  discarded")
            continue
        with wave.open(str(args.out / f"{name}.wav"), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes(audio.tobytes())
        (args.out / f"{name}.txt").write_text(text + "\n", encoding="utf-8")
        n += 1
    print(f"\ndone: {n} clips in {args.out}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nstopped")
