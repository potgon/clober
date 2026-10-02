import { z } from "zod";
import { langSchema, type ParseResult, parseWith } from "./common.js";
import { policyConfigSchema } from "./policy.js";

// %APPDATA%\Clober\config.json. Contract: docs/PLAN.md §5.5. Never holds secrets.
// Defaults for open decisions D1 (wake word) and D2 (LLM): see PLAN.md §10.

export const CONFIG_VERSION = 1;

export const audioConfigSchema = z.object({
  wakeWord: z.string().min(1).default("regidor"),
  threshold: z.number().min(0).max(1).default(0.5),
  pttKey: z.string().min(1).default("ctrl+shift+space"),
  inputDevice: z.string().nullable().default(null),
  outputDevice: z.string().nullable().default(null),
  silenceMs: z.number().int().positive().default(500),
  // Fallback of the F0.6 selection rule until it is measured.
  sttModel: z.string().min(1).default("base"),
});

export const llmConfigSchema = z.object({
  provider: z.enum(["anthropic", "openai-compatible"]).default("anthropic"),
  model: z.string().min(1).default("claude-haiku-4-5"),
  baseUrl: z.url().nullable().default(null),
});

export const configSchema = z.object({
  version: z.literal(CONFIG_VERSION),
  lang: langSchema.default("es"),
  localToken: z.string().min(32),
  dryRun: z.boolean().default(false),
  audio: audioConfigSchema.prefault({}),
  obs: z.object({ url: z.string().default("ws://127.0.0.1:4455") }).prefault({}),
  twitch: z
    .object({
      clientId: z.string().nullable().default(null),
      broadcasterLogin: z.string().nullable().default(null),
    })
    .prefault({}),
  llm: llmConfigSchema.prefault({}),
  media: z.object({ folders: z.array(z.string()).default([]) }).prefault({}),
  policy: policyConfigSchema.prefault({}),
});
export type Config = z.infer<typeof configSchema>;

export function parseConfig(raw: unknown): ParseResult<Config> {
  return parseWith(configSchema, raw);
}
