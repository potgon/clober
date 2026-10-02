"""Short tones played on the headphones. F1.2 replaces these with bundled assets."""

from __future__ import annotations

import logging

import numpy as np
import sounddevice as sd

log = logging.getLogger(__name__)

RATE = 24_000

# name -> list of (frequency Hz, duration ms)
_TONES: dict[str, list[tuple[float, int]]] = {
    "wake": [(880, 70)],
    "ok": [(660, 60), (990, 80)],
    "error": [(330, 140)],
    "confirm": [(660, 80), (660, 80)],
    "cancel": [(520, 60), (390, 90)],
}


def render(name: str) -> np.ndarray:
    parts = []
    for freq, ms in _TONES[name]:
        t = np.arange(int(RATE * ms / 1000)) / RATE
        fade = np.minimum(1.0, np.minimum(t, t[::-1]) / 0.01)  # 10 ms fades, no clicks
        parts.append(0.2 * np.sin(2 * np.pi * freq * t) * fade)
    return np.concatenate(parts).astype(np.float32)


def play(name: str, device: str | None = None) -> None:
    try:
        sd.play(render(name), RATE, device=device)
    except Exception:  # an earcon must never take the sidecar down
        log.exception("could not play earcon %s", name)
