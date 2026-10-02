import { request } from "node:http";
import type { SidecarMessage } from "@clober/shared";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { type LocalServer, startLocalServer } from "./local-server.js";

const TOKEN = "t".repeat(64);
let server: LocalServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function start() {
  const received: SidecarMessage[] = [];
  const invalid: string[] = [];
  server = await startLocalServer({
    port: 0,
    token: TOKEN,
    onSidecarMessage: (m) => received.push(m),
    onInvalidMessage: (e) => invalid.push(e),
  });
  return { server, received, invalid };
}

function connect(port: number, headers: Record<string, string>): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/audio`, { headers });
    ws.once("open", () => resolve(ws));
    ws.once("unexpected-response", (_req, res) => reject(new Error(String(res.statusCode))));
    ws.once("error", reject);
  });
}

describe("local server", () => {
  it("accepts the sidecar with the token and delivers parsed messages", async () => {
    const { server, received, invalid } = await start();
    const ws = await connect(server.port, { "x-clober-token": TOKEN });
    ws.send(JSON.stringify({ type: "wake", source: "ptt", t_wake: 1 }));
    ws.send("{broken");
    await expect.poll(() => received.length + invalid.length).toBe(2);
    expect(received).toEqual([{ type: "wake", source: "ptt", t_wake: 1 }]);

    const got = new Promise<string>((resolve) => ws.once("message", (d) => resolve(d.toString())));
    expect(server.sendToSidecar({ type: "earcon", name: "ok" })).toBe(true);
    expect(JSON.parse(await got)).toEqual({ type: "earcon", name: "ok" });
    ws.close();
  });

  it("rejects a missing or wrong token", async () => {
    const { server } = await start();
    await expect(connect(server.port, {})).rejects.toThrow("401");
    await expect(connect(server.port, { "x-clober-token": "nope" })).rejects.toThrow("401");
  });

  it("rejects a foreign Host header (DNS rebinding)", async () => {
    const { server } = await start();
    await expect(
      connect(server.port, { "x-clober-token": TOKEN, host: "evil.example:7531" }),
    ).rejects.toThrow("403");
    const status = await new Promise<number | undefined>((resolve) => {
      request({ port: server.port, host: "127.0.0.1", headers: { host: "evil.example" } }, (res) =>
        resolve(res.statusCode),
      ).end();
    });
    expect(status).toBe(403);
  });

  it("accepts only one sidecar at a time", async () => {
    const { server } = await start();
    const first = await connect(server.port, { "x-clober-token": TOKEN });
    await expect(connect(server.port, { "x-clober-token": TOKEN })).rejects.toThrow("409");
    first.close();
    await expect.poll(() => server.sendToSidecar({ type: "pause" })).toBe(false);
    const again = await connect(server.port, { "x-clober-token": TOKEN });
    again.close();
  });
});
