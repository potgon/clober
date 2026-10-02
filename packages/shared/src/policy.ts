import { z } from "zod";
import type { Localized } from "./common.js";

// Contract: docs/PLAN.md §5.3.

export const permissionLevelSchema = z.enum(["free", "confirm", "blocked"]);
export type PermissionLevel = z.infer<typeof permissionLevelSchema>;

export const actorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("streamer") }),
  z.object({ kind: z.literal("mod"), login: z.string().min(1) }),
]);
export type Actor = z.infer<typeof actorSchema>;

export type Decision =
  | { kind: "allow" }
  | { kind: "confirm"; prompt: Localized }
  | { kind: "deny"; reason: "blocked" | "not_allowed_for_actor" | "unknown_tool" };

export const policyConfigSchema = z.object({
  overrides: z.record(z.string(), permissionLevelSchema).default({}),
  longTimeoutSeconds: z.number().int().positive().default(600),
  mods: z.record(z.string(), z.object({ allow: z.array(z.string()) })).default({}),
});
export type PolicyConfig = z.infer<typeof policyConfigSchema>;
