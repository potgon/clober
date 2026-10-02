"""Command line entry point: python -m clober_audio --url ... --token ..."""

from __future__ import annotations

import argparse
import asyncio
import logging
import os

from .app import AudioApp, Settings
from .capture import Microphone
from .client import CoreClient
from .ptt import PushToTalk
from .stt import Transcriber

log = logging.getLogger("clober_audio")


def parse_args(argv: list[str] | None = None) -> Settings:
    p = argparse.ArgumentParser(prog="clober_audio")
    p.add_argument("--url", default="ws://127.0.0.1:7531/audio")
    p.add_argument("--token", default=os.environ.get("CLOBER_TOKEN"))
    p.add_argument("--lang", default="es", choices=["es", "en"])
    p.add_argument("--stt-model", default="base")
    p.add_argument("--ptt-key", default="ctrl+shift+space")
    p.add_argument("--wake-word", default="regidor")
    p.add_argument("--input-device", default=None)
    p.add_argument("--output-device", default=None)
    args = p.parse_args(argv)
    if not args.token:
        p.error("--token or CLOBER_TOKEN is required")
    return Settings(
        url=args.url,
        token=args.token,
        lang=args.lang,
        stt_model=args.stt_model,
        ptt_key=args.ptt_key,
        wake_word=args.wake_word,
        input_device=args.input_device,
        output_device=args.output_device,
    )


async def _run(settings: Settings) -> None:
    log.info("loading STT model %s", settings.stt_model)
    transcriber = Transcriber(settings.stt_model, settings.lang)

    client: CoreClient | None = None

    async def send(message: dict) -> None:
        assert client is not None
        await client.send(message)

    app = AudioApp(settings, transcriber, send)
    client = CoreClient(settings.url, settings.token, app.hello(), app.on_core_message)
    app.attach(asyncio.get_running_loop())

    mic = Microphone(app.on_chunk, settings.input_device)
    ptt = PushToTalk(settings.ptt_key, app.on_ptt_down, app.on_ptt_up)
    mic.start()
    ptt.start()
    log.info("ready: hold %s to talk", settings.ptt_key)
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
