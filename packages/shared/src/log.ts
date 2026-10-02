import { z } from "zod";
import { langSchema, timestampSchema } from "./common.js";
import { actorSchema } from "./policy.js";

// One line per command in logs/session-<ISO>.jsonl. Contract: docs/PLAN.md §5.6.
// Official latency = t.first_action_done - t.speech_end.

export const logCallSchema = z.object({
  tool: z.string(),
  args: z.unknown(),
  decision: z.enum(["allow", "confirm", "deny"]),
  result: z.enum(["ok", "error", "cancelled", "denied", "dry_run"]),
  summary: z.string(),
  undoable: z.boolean(),
});

export const logEntrySchema = z.object({
  id: z.string().min(1),
  ts: timestampSchema,
  actor: actorSchema,
  utterance: z.string(),
  lang: langSchema,
  route: z.enum(["fastpath", "agent"]),
  calls: z.array(logCallSchema),
  t: z.object({
    wake: timestampSchema,
    speech_end: timestampSchema,
    transcript: timestampSchema,
    routed: timestampSchema,
    // null when no action completed (denied, cancelled or no match).
    first_action_done: timestampSchema.nullable(),
  }),
  llm: z
    .object({
      model: z.string(),
      input_tokens: z.number().int().nonnegative(),
      output_tokens: z.number().int().nonnegative(),
    })
    .optional(),
});
export type LogEntry = z.infer<typeof logEntrySchema>;
export type LogCall = z.infer<typeof logCallSchema>;
