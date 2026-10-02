"""Clober audio sidecar: wake word, push-to-talk, VAD, STT and TTS."""

__version__ = "0.1.0"


def main() -> None:
    from .main import run

    run()
