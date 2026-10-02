import { z } from "zod";

export const langSchema = z.enum(["es", "en"]);
export type Lang = z.infer<typeof langSchema>;

/** A user-facing sentence in every supported language. */
export const localizedSchema = z.object({ es: z.string(), en: z.string() });
export type Localized = z.infer<typeof localizedSchema>;

/** Milliseconds since epoch. */
export const timestampSchema = z.number().int().nonnegative();

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validates `raw` (a JSON string or an already parsed value) against `schema`. */
export function parseWith<T>(schema: z.ZodType<T>, raw: unknown): ParseResult<T> {
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, error: "invalid JSON" };
    }
  }
  const result = schema.safeParse(data);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: z.prettifyError(result.error) };
}
