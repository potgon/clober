import numpy as np
import pytest

from clober_audio.vad import CHUNK_SAMPLES, Endpointer, EndReason, SileroVad


def run(endpointer: Endpointer, probs: list[float]) -> tuple[EndReason | None, int]:
    for i, p in enumerate(probs):
        reason = endpointer.push(p)
        if reason:
            return reason, i + 1
    return None, len(probs)


class TestEndpointer:
    def test_ends_after_silence_following_speech(self):
        ep = Endpointer(silence_ms=500, chunk_ms=32)
        # 10 speech chunks, then silence: 500 ms = 16 chunks (15.6 rounded up)
        reason, n = run(ep, [0.9] * 10 + [0.1] * 40)
        assert reason is EndReason.END
        assert n == 10 + 16

    def test_short_pauses_do_not_end_the_utterance(self):
        ep = Endpointer(silence_ms=500, chunk_ms=32)
        reason, _ = run(ep, [0.9] * 5 + [0.1] * 10 + [0.9] * 5)
        assert reason is None

    def test_no_speech_before_start_timeout(self):
        ep = Endpointer(start_timeout_ms=3000, chunk_ms=32)
        reason, n = run(ep, [0.1] * 200)
        assert reason is EndReason.NO_SPEECH
        assert n * 32 >= 3000

    def test_max_length(self):
        ep = Endpointer(max_ms=10_000, chunk_ms=32)
        reason, n = run(ep, [0.9] * 400)
        assert reason is EndReason.MAX_LENGTH
        assert n == 313  # first chunk reaching 10 s

    def test_reset(self):
        ep = Endpointer(silence_ms=64, chunk_ms=32)
        run(ep, [0.9, 0.1, 0.1])
        ep.reset()
        assert ep.elapsed_ms == 0 and not ep.speech_started


class TestSileroVad:
    def test_detects_speech_only_where_there_is_speech(self, escena_juego):
        vad = SileroVad()
        usable = len(escena_juego) // CHUNK_SAMPLES * CHUNK_SAMPLES
        probs = [vad(c) for c in escena_juego[:usable].reshape(-1, CHUNK_SAMPLES)]
        # The wav starts with 600 ms of silence (~18 chunks).
        assert max(probs[:12]) < 0.5
        assert max(probs) > 0.8

    def test_endpointer_on_real_audio(self, escena_juego):
        vad, ep = SileroVad(), Endpointer(silence_ms=500)
        usable = len(escena_juego) // CHUNK_SAMPLES * CHUNK_SAMPLES
        reasons = [ep.push(vad(c)) for c in escena_juego[:usable].reshape(-1, CHUNK_SAMPLES)]
        assert EndReason.END in reasons

    def test_rejects_wrong_chunk_size(self):
        with pytest.raises(ValueError):
            SileroVad()(np.zeros(100, dtype=np.float32))
