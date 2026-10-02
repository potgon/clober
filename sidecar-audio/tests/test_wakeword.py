from conftest import load_wav

from clober_audio.wakeword import PLACEHOLDER_MODEL, WakeWordDetector, model_name


def detections(detector: WakeWordDetector, audio, chunk: int = 512) -> list[float]:
    hits = []
    for i in range(0, len(audio) - chunk + 1, chunk):
        score = detector.feed(audio[i : i + chunk])
        if score is not None:
            hits.append(i / 16_000)
    return hits


def test_model_name():
    assert model_name(PLACEHOLDER_MODEL) == "hey_jarvis"


def test_detects_the_wake_word():
    hits = detections(WakeWordDetector(), load_wav("hey_jarvis_escena_juego.wav"))
    assert hits, "hey jarvis not detected"
    assert 0.6 < hits[0] < 2.0  # the phrase starts at 0.6 s


def test_ignores_speech_without_the_wake_word(escena_juego):
    assert detections(WakeWordDetector(), escena_juego) == []


def test_accepts_chunks_of_any_size():
    assert detections(WakeWordDetector(), load_wav("hey_jarvis_escena_juego.wav"), chunk=300)
