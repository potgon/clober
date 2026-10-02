"""WebSocket client to the core (ws://127.0.0.1:7531/audio) with reconnection."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Callable
from typing import Any

from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosed, InvalidHandshake

log = logging.getLogger(__name__)

BACKOFF_MIN_S = 1.0
BACKOFF_MAX_S = 30.0


def next_backoff(current: float) -> float:
    return min(current * 2, BACKOFF_MAX_S)


class CoreClient:
    """Keeps a connection to the core, sends `hello` on every connect.

    Messages sent while disconnected are dropped: the core does not expect
    replays of stale transcripts.
    """

    def __init__(
        self,
        url: str,
        token: str,
        hello: dict[str, Any],
        on_message: Callable[[dict[str, Any]], None],
    ) -> None:
        self.url = url
        self._token = token
        self._hello = hello
        self._on_message = on_message
        self._conn: ClientConnection | None = None

    async def run(self) -> None:
        backoff = BACKOFF_MIN_S
        while True:
            try:
                async with connect(
                    self.url, additional_headers={"x-clober-token": self._token}
                ) as conn:
                    self._conn = conn
                    backoff = BACKOFF_MIN_S
                    log.info("connected to core at %s", self.url)
                    await conn.send(json.dumps(self._hello))
                    async for raw in conn:
                        try:
                            self._on_message(json.loads(raw))
                        except json.JSONDecodeError:
                            log.warning("ignoring non-JSON message from core")
            except (OSError, ConnectionClosed, InvalidHandshake) as err:
                log.info("core unavailable (%s), retrying in %.0f s", err, backoff)
            finally:
                self._conn = None
            await asyncio.sleep(backoff)
            backoff = next_backoff(backoff)

    async def send(self, message: dict[str, Any]) -> None:
        conn = self._conn
        if conn is None:
            log.warning("dropping %s: not connected", message.get("type"))
            return
        try:
            await conn.send(json.dumps(message))
        except ConnectionClosed:
            log.warning("dropping %s: connection closed", message.get("type"))
