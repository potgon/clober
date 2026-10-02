"""Stand-in for the core during sidecar development.

Prints every message the sidecar sends and the STT time of each transcript.

    uv run scripts/echo_server.py --token dev
    uv run python -m clober_audio --token dev
"""

from __future__ import annotations

import argparse
import asyncio
import json

from websockets.asyncio.server import ServerConnection, serve
from websockets.exceptions import ConnectionClosed


async def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=7531)
    p.add_argument("--token", required=True)
    args = p.parse_args()

    async def handler(conn: ServerConnection) -> None:
        if conn.request is None or conn.request.path != "/audio":
            await conn.close(code=1008, reason="unknown path")
            return
        if conn.request.headers.get("x-clober-token") != args.token:
            await conn.close(code=1008, reason="bad token")
            return
        print("sidecar connected", flush=True)
        try:
            async for raw in conn:
                msg = json.loads(raw)
                if msg.get("type") == "transcript":
                    stt_ms = msg["t_transcript"] - msg["t_speech_end"]
                    print(f"transcript {msg['text']!r} (STT {stt_ms} ms)", flush=True)
                else:
                    print(msg, flush=True)
        except ConnectionClosed:
            pass
        print("sidecar disconnected", flush=True)

    async with serve(handler, "127.0.0.1", args.port):
        print(f"listening on ws://127.0.0.1:{args.port}/audio", flush=True)
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
