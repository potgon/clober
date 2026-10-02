"""End to end without microphone or keyboard: wav -> PTT flow -> STT -> WebSocket."""

import asyncio
import json

import numpy as np
from test_stt import normalize
from websockets.asyncio.server import serve

from clober_audio.app import AudioApp, Settings
from clober_audio.client import CoreClient, next_backoff
from clober_audio.vad import CHUNK_SAMPLES

TOKEN = "test-token"


def settings(port: int) -> Settings:
    return Settings(
        url=f"ws://127.0.0.1:{port}/audio",
        token=TOKEN,
        lang="es",
        stt_model="base",
        ptt_key="ctrl+shift+space",
        wake_word="regidor",
        input_device=None,
        output_device=None,
    )


async def wait_for(predicate, timeout: float = 60.0) -> None:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while not predicate():
        assert loop.time() < deadline, "timed out"
        await asyncio.sleep(0.02)


def test_backoff_caps_at_30_seconds():
    assert next_backoff(1) == 2
    assert next_backoff(20) == 30


def test_ptt_utterance_reaches_core_as_transcript(transcriber, escena_juego):
    async def scenario() -> list[dict]:
        received: list[dict] = []
        headers: list[str | None] = []

        async def handler(conn):
            headers.append(conn.request.headers.get("x-clober-token"))
            async for raw in conn:
                received.append(json.loads(raw))

        async with serve(handler, "127.0.0.1", 0) as server:
            port = server.sockets[0].getsockname()[1]
            client: CoreClient

            async def send(msg):
                await client.send(msg)

            app = AudioApp(settings(port), transcriber, send)
            client = CoreClient(app.settings.url, TOKEN, app.hello(), app.on_core_message)
            app.attach(asyncio.get_running_loop())
            task = asyncio.create_task(client.run())
            await wait_for(lambda: received)  # hello

            app.on_ptt_down()
            usable = len(escena_juego) // CHUNK_SAMPLES * CHUNK_SAMPLES
            for chunk in escena_juego[:usable].reshape(-1, CHUNK_SAMPLES):
                app.on_chunk(chunk)
            await asyncio.sleep(0.05)
            app.on_ptt_up()
            await wait_for(lambda: any(m["type"] == "transcript" for m in received))
            task.cancel()
        assert headers == [TOKEN]
        return received

    messages = asyncio.run(scenario())
    types = [m["type"] for m in messages]
    assert types == ["hello", "wake", "transcript"]
    transcript = messages[2]
    assert normalize(transcript["text"]).endswith("juego")
    assert transcript["mode"] == "command" and transcript["lang"] == "es"
    assert transcript["t_wake"] <= transcript["t_speech_end"] <= transcript["t_transcript"]


def test_too_short_press_is_cancelled():
    async def scenario() -> list[dict]:
        sent: list[dict] = []

        async def send(msg):
            sent.append(msg)

        app = AudioApp(settings(1), transcriber=None, send=send)
        app.attach(asyncio.get_running_loop())
        app.on_ptt_down()
        app.on_chunk(np.zeros(CHUNK_SAMPLES, dtype=np.float32))
        app.on_ptt_up()
        await asyncio.sleep(0.05)
        return sent

    sent = asyncio.run(scenario())
    assert [m["type"] for m in sent] == ["wake", "listen_cancelled"]
