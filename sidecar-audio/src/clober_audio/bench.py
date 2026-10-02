"""Helpers for the STT benchmark (F0.6): word error rate and the model choice rule."""

from __future__ import annotations

import statistics
import unicodedata
from dataclasses import dataclass

MAX_P50_MS = 600
FALLBACK_MODEL = "base"


def normalize_words(text: str) -> list[str]:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c if c.isalnum() else " " for c in text if unicodedata.category(c) != "Mn")
    return text.split()


def wer(reference: str, hypothesis: str) -> float:
    """Word error rate: word-level edit distance / reference length."""
    ref, hyp = normalize_words(reference), normalize_words(hypothesis)
    if not ref:
        return 0.0 if not hyp else 1.0
    prev = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        cur = [i] + [0] * len(hyp)
        for j, h in enumerate(hyp, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != h))
        prev = cur
    return prev[-1] / len(ref)


def percentile(values: list[float], q: float) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, max(0, round(q * len(ordered)) - 1))]


@dataclass
class ModelResult:
    model: str
    times_ms: list[float]
    wers: list[float]

    @property
    def p50(self) -> float:
        return statistics.median(self.times_ms)

    @property
    def p95(self) -> float:
        return percentile(self.times_ms, 0.95)

    @property
    def wer(self) -> float:
        return statistics.fmean(self.wers)


def choose_model(results: list[ModelResult]) -> str:
    """PLAN.md F0.6: among models with p50 < 600 ms, the lowest WER (ties: the
    larger model, which comes later in `results`); if none qualifies, 'base'."""
    fast = [r for r in results if r.p50 < MAX_P50_MS]
    if not fast:
        return FALLBACK_MODEL
    best = min(r.wer for r in fast)
    return [r for r in fast if r.wer == best][-1].model
