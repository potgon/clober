import type { z } from "zod";
import type { Localized } from "./common.js";
import type { Actor, PermissionLevel } from "./policy.js";

// Contract: docs/PLAN.md §5.2.

/** Read-only view of the live context. Grows with F1.4 and F1.7. */
export interface LiveContextReader {
  scenes(): readonly string[];
  currentScene(): string | null;
}

export interface ToolContext {
  /** When true the executor never calls the handler. */
  dryRun: boolean;
  actor: Actor;
  live: LiveContextReader;
  /** Aborted after the 5 s per-tool timeout. */
  signal: AbortSignal;
}

export interface ToolResult {
  ok: boolean;
  /** Short sentence for TTS and the action log. */
  summary: Localized;
  /** Returned to the LLM when the call came from the agent. */
  data?: unknown;
  /** Present only when the action is reversible. */
  undo?: () => Promise<void>;
  undoSummary?: Localized;
}

export interface ToolDefinition<A extends z.ZodType = z.ZodType> {
  /** snake_case with prefix: obs_, twitch_, media_, context_, core_. */
  name: string;
  /** English, for the LLM, at most 300 characters. */
  description: string;
  input: A;
  defaultLevel: PermissionLevel;
  /** Required when defaultLevel is "confirm". */
  confirmPrompt?: (args: z.infer<A>) => Localized;
  handler: (args: z.infer<A>, ctx: ToolContext) => Promise<ToolResult>;
}
