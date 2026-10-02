import type { ToolContext } from "@clober/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObsClient, type ObsSocket } from "./client.js";
import { createObsTools } from "./tools.js";

type Listener = (data: never) => void;

class FakeSocket implements ObsSocket {
  listeners = new Map<string, Listener[]>();
  calls: Array<{ type: string; data: unknown }> = [];
  failConnects = 0;
  connects = 0;
  scenes = ["BRB", "Juego", "Inicio"]; // OBS order: bottom-up
  current = "Inicio";

  async connect() {
    this.connects++;
    if (this.failConnects > 0) {
      this.failConnects--;
      throw new Error("refused");
    }
  }
  async disconnect() {}
  on(event: string, listener: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
  }
  emit(event: string, data?: unknown) {
    for (const l of this.listeners.get(event) ?? []) l(data as never);
  }
  // biome-ignore lint/suspicious/noExplicitAny: fake of a large generic API
  async call(type: string, data?: unknown): Promise<any> {
    this.calls.push({ type, data });
    if (type === "GetSceneList") {
      return {
        currentProgramSceneName: this.current,
        scenes: this.scenes.map((sceneName) => ({ sceneName })),
      };
    }
    if (type === "SetCurrentProgramScene") {
      this.current = (data as { sceneName: string }).sceneName;
    }
    return {};
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ObsClient", () => {
  it("loads scenes in OBS UI order and tracks the current scene by events", async () => {
    const socket = new FakeSocket();
    const client = new ObsClient({ url: "ws://x", socket });
    await client.start();
    expect(client.isConnected).toBe(true);
    expect(client.scenes()).toEqual(["Inicio", "Juego", "BRB"]);
    expect(client.currentScene()).toBe("Inicio");

    socket.emit("CurrentProgramSceneChanged", { sceneName: "Juego" });
    expect(client.currentScene()).toBe("Juego");

    socket.scenes = ["Final", ...socket.scenes];
    socket.emit("SceneListChanged");
    await vi.waitFor(() => expect(client.scenes()).toContain("Final"));
  });

  it("retries with exponential backoff and reports status", async () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    socket.failConnects = 2;
    const status: boolean[] = [];
    const client = new ObsClient({
      url: "ws://x",
      socket,
      onStatus: (c) => status.push(c),
      backoffMs: { min: 1000, max: 30_000 },
    });
    await client.start();
    expect(socket.connects).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(socket.connects).toBe(2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(socket.connects).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(socket.connects).toBe(3);
    expect(status).toEqual([true]);

    socket.emit("ConnectionClosed");
    expect(status).toEqual([true, false]);
    expect(client.isConnected).toBe(false);
    await expect(client.call("GetSceneList")).rejects.toThrow("not connected");
    await vi.advanceTimersByTimeAsync(1000);
    expect(status).toEqual([true, false, true]);
    await client.stop();
  });
});

describe("obs_set_scene", () => {
  async function setup() {
    const socket = new FakeSocket();
    const client = new ObsClient({ url: "ws://x", socket });
    await client.start();
    const [tool] = createObsTools(client);
    if (!tool) throw new Error("missing tool");
    const ctx: ToolContext = {
      dryRun: false,
      actor: { kind: "streamer" },
      live: client,
      signal: new AbortController().signal,
    };
    return { socket, tool, ctx };
  }

  it("switches to the closest scene and can undo", async () => {
    const { socket, tool, ctx } = await setup();
    const result = await tool.handler({ scene: "juego" }, ctx);
    expect(result.ok).toBe(true);
    expect(result.summary.es).toBe("Escena: Juego");
    expect(socket.current).toBe("Juego");
    await result.undo?.();
    expect(socket.current).toBe("Inicio");
  });

  it("does nothing when already on the scene", async () => {
    const { socket, tool, ctx } = await setup();
    const result = await tool.handler({ scene: "inicio" }, ctx);
    expect(result).toMatchObject({ ok: true, summary: { es: "Ya estás en Inicio" } });
    expect(result.undo).toBeUndefined();
    expect(socket.calls.some((c) => c.type === "SetCurrentProgramScene")).toBe(false);
  });

  it("fails clearly for an unknown scene", async () => {
    const { tool, ctx } = await setup();
    const result = await tool.handler({ scene: "cocina" }, ctx);
    expect(result).toMatchObject({ ok: false, summary: { es: "No encuentro la escena «cocina»" } });
  });

  it("validates its input", async () => {
    const { tool } = await setup();
    expect(tool.input.safeParse({ scene: "" }).success).toBe(false);
  });
});
