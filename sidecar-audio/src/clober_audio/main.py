"""Command line entry point: python -m clober_audio --url ... --token ..."""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
from dataclasses import dataclass

from . import earcons
from .app import AudioApp, Settings
from .capture import Microphone
from .client import CoreClient
from .ptt import PushToTalk
from .stt import Transcriber
from .vad import SileroVad
from .wakeword import PLACEHOLDER_MODEL, WakeWordDetector, model_name

log = logging.getLogger("clober_audio")


@dataclass
class Options:
    settings: Settings
    wake_model: str | None  # None disables the wake word (push-to-talk only)
    threshold: float


def parse_args(argv: list[str] | None = None) -> Options:
    p = argparse.ArgumentParser(prog="clober_audio")
    p.add_argument("--url", default="ws://127.0.0.1:7531/audio")
    p.add_argument("--token", default=os.environ.get("CLOBER_TOKEN"))
    p.add_argument("--lang", default="es", choices=["es", "en"])
    p.add_argument("--stt-model", default="base")
    p.add_argument("--ptt-key", default="ctrl+shift+space")
    p.add_argument(
        "--wake-model",
        default=str(PLACEHOLDER_MODEL),
        help="openWakeWord .onnx model (default: bundled hey_jarvis until F1.3)",
    )
    p.add_argument("--no-wake-word", action="store_true", help="push-to-talk only")
    p.add_argument("--threshold", type=float, default=0.5)
    p.add_argument("--silence-ms", type=int, default=500)
    p.add_argument("--input-device", default=None)
    p.add_argument("--output-device", default=None)
    args = p.parse_args(argv)
    if not args.token:
        p.error("--token or CLOBER_TOKEN is required")
    wake_model = None if args.no_wake_word else args.wake_model
    settings = Settings(
        url=args.url,
        token=args.token,
        lang=args.lang,
        stt_model=args.stt_model,
        ptt_key=args.ptt_key,
        wake_word=model_name(wake_model) if wake_model else "",
        input_device=args.input_device,
        output_device=args.output_device,
        silence_ms=args.silence_ms,
    )
    return Options(settings, wake_model, args.threshold)


async def _run(options: Options) -> None:
    settings = options.settings
    log.info("loading STT model %s", settings.stt_model)
    transcriber = Transcriber(settings.stt_model, settings.lang)
    detector = (
        WakeWordDetector(options.wake_model, options.threshold) if options.wake_model else None
    )

    client: CoreClient | None = None

    async def send(message: dict) -> None:
        assert client is not None
        await client.send(message)

    app = AudioApp(
        settings,
        transcriber,
        send,
        detector=detector,
        vad=SileroVad(),
        earcon=lambda name: earcons.play(name, settings.output_device),
    )
    client = CoreClient(settings.url, settings.token, app.hello(), app.on_core_message)
    app.attach(asyncio.get_running_loop())

    mic = Microphone(app.on_chunk, settings.input_device)
    ptt = PushToTalk(settings.ptt_key, app.on_ptt_down, app.on_ptt_up)
    mic.start()
    ptt.start()
    wake = f"say '{detector.name}' or " if detector else ""
    log.info("ready: %shold %s to talk", wake, settings.ptt_key)
    try:
        await client.run()
    finally:
        ptt.stop()
        mic.stop()


def run(argv: list[str] | None = None) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    try:
        asyncio.run(_run(parse_args(argv)))
    except KeyboardInterrupt:
        pass
