import { describe, expect, it } from "vitest";
import { parseCoreMessage, parseSidecarMessage } from "./protocol.js";

const T = 1_759_400_000_000;

// Each case: a valid message and a variant that must be rejected.
const sidecarCases = [
  {
    valid: {
      type: "hello",
      version: "0.1.0",
      wake_word: "regidor",
      stt_model: "base",
      devices: { input: "Mic", output: null },
    },
    invalid: { type: "hello", version: "0.1.0", wake_word: "regidor", stt_model: "base" },
  },
  {
    valid: { type: "wake", source: "ptt", t_wake: T },
    invalid: { type: "wake", source: "keyboard", t_wake: T },
  },
  {
    valid: {
      type: "transcript",
      id: "a1",
      text: "escena juego",
      lang: "es",
      mode: "command",
      t_wake: T,
      t_speech_end: T + 1200,
      t_transcript: T + 1600,
    },
    invalid: {
      type: "transcript",
      id: "a1",
      text: "escena juego",
      lang: "fr",
      mode: "command",
      t_wake: T,
      t_speech_end: T,
      t_transcript: T,
    },
  },
  {
    valid: { type: "listen_cancelled", reason: "silence" },
    invalid: { type: "listen_cancelled", reason: "bored" },
  },
  { valid: { type: "spoken", id: "s1" }, invalid: { type: "spoken", id: "" } },
  {
    valid: { type: "error", code: "mic_lost", message: "Input device disconnected" },
    invalid: { type: "error", code: "mic_lost" },
  },
];

const coreCases = [
  {
    valid: {
      type: "config",
      wake_word: "regidor",
      threshold: 0.5,
      ptt_key: "ctrl+shift+space",
      input_device: null,
      output_device: "Headphones",
      lang: "es",
      silence_ms: 500,
      stt_model: "base",
    },
    invalid: {
      type: "config",
      wake_word: "regidor",
      threshold: 1.5,
      ptt_key: "ctrl+shift+space",
      input_device: null,
      output_device: null,
      lang: "es",
      silence_ms: 500,
      stt_model: "base",
    },
  },
  {
    valid: { type: "listen", mode: "confirm", timeout_ms: 8000 },
    invalid: { type: "listen", mode: "command", timeout_ms: 8000 },
  },
  {
    valid: { type: "speak", id: "s1", text: "¿Baneo a troll? Di sí", lang: "es" },
    invalid: { type: "speak", id: "s1", text: "", lang: "es" },
  },
  {
    valid: { type: "earcon", name: "ok" },
    invalid: { type: "earcon", name: "fanfare" },
  },
  { valid: { type: "pause" }, invalid: { type: "pauze" } },
  { valid: { type: "resume" }, invalid: { kind: "resume" } },
];

describe("parseSidecarMessage", () => {
  it.each(sidecarCases)("accepts a valid $valid.type", ({ valid }) => {
    expect(parseSidecarMessage(valid)).toEqual({ ok: true, value: valid });
  });

  it.each(sidecarCases)("rejects an invalid $valid.type", ({ invalid }) => {
    expect(parseSidecarMessage(invalid).ok).toBe(false);
  });

  it("parses raw JSON strings", () => {
    const msg = { type: "wake", source: "wakeword", score: 0.8, t_wake: T };
    expect(parseSidecarMessage(JSON.stringify(msg))).toEqual({ ok: true, value: msg });
  });

  it("reports invalid JSON", () => {
    expect(parseSidecarMessage("{not json")).toEqual({ ok: false, error: "invalid JSON" });
  });

  it("rejects core-to-sidecar messages", () => {
    expect(parseSidecarMessage({ type: "pause" }).ok).toBe(false);
  });
});

describe("parseCoreMessage", () => {
  it.each(coreCases)("accepts a valid $valid.type", ({ valid }) => {
    expect(parseCoreMessage(valid)).toEqual({ ok: true, value: valid });
  });

  it.each(coreCases)("rejects an invalid $valid.type", ({ invalid }) => {
    expect(parseCoreMessage(invalid).ok).toBe(false);
  });
});
