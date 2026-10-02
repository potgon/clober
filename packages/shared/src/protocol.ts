import { z } from "zod";
import { langSchema, type ParseResult, parseWith, timestampSchema } from "./common.js";

// Sidecar <-> core protocol over WS /audio. Contract: docs/PLAN.md §5.1.
// Field names are snake_case because the sidecar is Python.

export const earconNameSchema = z.enum(["wake", "ok", "error", "confirm", "cancel"]);
export type EarconName = z.infer<typeof earconNameSchema>;

export const listenModeSchema = z.enum(["command", "confirm"]);

// --- Sidecar -> core ---

export const helloSchema = z.object({
  type: z.literal("hello"),
  version: z.string(),
  wake_word: z.string(),
  stt_model: z.string(),
  devices: z.object({ input: z.string().nullable(), output: z.string().nullable() }),
});

export const wakeSchema = z.object({
  type: z.literal("wake"),
  source: z.enum(["wakeword", "ptt"]),
  score: z.number().min(0).max(1).optional(),
  t_wake: timestampSchema,
});

export const transcriptSchema = z.object({
  type: z.literal("transcript"),
  id: z.string().min(1),
  text: z.string(),
  lang: langSchema,
  mode: listenModeSchema,
  t_wake: timestampSchema,
  t_speech_end: timestampSchema,
  t_transcript: timestampSchema,
});

export const listenCancelledSchema = z.object({
  type: z.literal("listen_cancelled"),
  reason: z.enum(["silence", "timeout"]),
});

export const spokenSchema = z.object({ type: z.literal("spoken"), id: z.string().min(1) });

export const sidecarErrorSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
  message: z.string(),
});

export const sidecarMessageSchema = z.discriminatedUnion("type", [
  helloSchema,
  wakeSchema,
  transcriptSchema,
  listenCancelledSchema,
  spokenSchema,
  sidecarErrorSchema,
]);
export type SidecarMessage = z.infer<typeof sidecarMessageSchema>;
export type TranscriptMessage = z.infer<typeof transcriptSchema>;

// --- Core -> sidecar ---

export const sidecarConfigSchema = z.object({
  type: z.literal("config"),
  wake_word: z.string(),
  threshold: z.number().min(0).max(1),
  ptt_key: z.string(),
  input_device: z.string().nullable(),
  output_device: z.string().nullable(),
  lang: langSchema,
  silence_ms: z.number().int().positive(),
  stt_model: z.string(),
});

export const listenSchema = z.object({
  type: z.literal("listen"),
  mode: z.literal("confirm"),
  timeout_ms: z.number().int().positive(),
});

export const speakSchema = z.object({
  type: z.literal("speak"),
  id: z.string().min(1),
  text: z.string().min(1),
  lang: langSchema,
});

export const earconSchema = z.object({ type: z.literal("earcon"), name: earconNameSchema });

export const coreMessageSchema = z.discriminatedUnion("type", [
  sidecarConfigSchema,
  listenSchema,
  speakSchema,
  earconSchema,
  z.object({ type: z.literal("pause") }),
  z.object({ type: z.literal("resume") }),
]);
export type CoreMessage = z.infer<typeof coreMessageSchema>;

/** Parses a message received from the sidecar (raw JSON string or object). */
export function parseSidecarMessage(raw: unknown): ParseResult<SidecarMessage> {
  return parseWith(sidecarMessageSchema, raw);
}

/** Parses a message sent by the core (used by tests and tooling). */
export function parseCoreMessage(raw: unknown): ParseResult<CoreMessage> {
  return parseWith(coreMessageSchema, raw);
}
