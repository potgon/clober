import { describe, expect, it } from "vitest";
import { parseConfig } from "./config.js";
import { logEntrySchema } from "./log.js";

const token = "x".repeat(32);

describe("parseConfig", () => {
  it("fills every default from a minimal config", () => {
    const result = parseConfig({ version: 1, localToken: token });
    expect(result).toEqual({
      ok: true,
      value: {
        version: 1,
        lang: "es",
        localToken: token,
        dryRun: false,
        audio: {
          wakeWord: "regidor",
          threshold: 0.5,
          pttKey: "ctrl+shift+space",
          inputDevice: null,
          outputDevice: null,
          silenceMs: 500,
          sttModel: "base",
        },
        obs: { url: "ws://127.0.0.1:4455" },
        twitch: { clientId: null, broadcasterLogin: null },
        llm: { provider: "anthropic", model: "claude-haiku-4-5", baseUrl: null },
        media: { folders: [] },
        policy: { overrides: {}, longTimeoutSeconds: 600, mods: {} },
      },
    });
  });

  it("keeps provided values", () => {
    const result = parseConfig({
      version: 1,
      localToken: token,
      llm: {
        provider: "openai-compatible",
        model: "llama3.2",
        baseUrl: "http://localhost:11434/v1",
      },
    });
    expect(result.ok && result.value.llm.baseUrl).toBe("http://localhost:11434/v1");
  });

  it("rejects an unknown version and a short token", () => {
    expect(parseConfig({ version: 2, localToken: token }).ok).toBe(false);
    expect(parseConfig({ version: 1, localToken: "short" }).ok).toBe(false);
  });

  it("names the failing field", () => {
    const result = parseConfig({ version: 1, localToken: token, audio: { threshold: 3 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("audio.threshold");
  });
});

describe("logEntrySchema", () => {
  const entry = {
    id: "c1",
    ts: 1,
    actor: { kind: "streamer" },
    utterance: "escena juego",
    lang: "es",
    route: "fastpath",
    calls: [
      {
        tool: "obs_set_scene",
        args: { scene: "Juego" },
        decision: "allow",
        result: "ok",
        summary: "Escena: Juego",
        undoable: true,
      },
    ],
    t: { wake: 1, speech_end: 2, transcript: 3, routed: 4, first_action_done: 5 },
  };

  it("accepts a fastpath entry without llm usage", () => {
    expect(logEntrySchema.safeParse(entry).success).toBe(true);
  });

  it("rejects an unknown route", () => {
    expect(logEntrySchema.safeParse({ ...entry, route: "magic" }).success).toBe(false);
  });
});
