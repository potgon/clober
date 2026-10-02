import unicodedata


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in text if c.isalnum() or c == " ").strip()


def test_transcribes_spanish_command(transcriber, escena_juego):
    # The synthetic Windows voice slurs "escena" (Whisper hears "estena" about half
    # the time), so this checks the pipeline, not accuracy. Accuracy is measured with
    # real recordings in F0.6, and the fast path tolerates near misses (F0.5).
    words = normalize(transcriber.transcribe(escena_juego)).split()
    assert words[-1] == "juego"
    assert len(words) >= 2
