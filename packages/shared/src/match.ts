import { distance } from "fastest-levenshtein";

/** Lowercase, no diacritics, no punctuation, single spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** 1 - levenshtein / max length, on already normalized strings. */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - distance(a, b) / longest;
}

const NUMBER_WORDS: Record<string, string> = {
  cero: "0",
  uno: "1",
  dos: "2",
  tres: "3",
  cuatro: "4",
  cinco: "5",
  seis: "6",
  siete: "7",
  ocho: "8",
  nueve: "9",
  diez: "10",
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};

/** `normalize` plus number words as digits, so "juego dos" matches "Juego 2". */
export function normalizeName(text: string): string {
  return normalize(text)
    .split(" ")
    .map((word) => NUMBER_WORDS[word] ?? word)
    .join(" ");
}

// A match against a part of the name ("juego" in "juego principal") scores
// slightly less than the same match against the whole name, so whole names win ties.
const PARTIAL_PENALTY = 0.95;

/** Score of `query` against `name`: whole name, or best run of the same number of words. */
export function nameScore(query: string, name: string): number {
  const q = normalizeName(query);
  const n = normalizeName(name);
  let best = similarity(q, n);
  const qWords = q.split(" ").length;
  const nWords = n.split(" ");
  if (qWords >= nWords.length) return best;
  for (let i = 0; i <= nWords.length - qWords; i++) {
    const part = nWords.slice(i, i + qWords).join(" ");
    best = Math.max(best, similarity(q, part) * PARTIAL_PENALTY);
  }
  return best;
}

export interface MatchOptions {
  /** Minimum score to accept (PLAN.md F0.5: 0.75). */
  threshold: number;
}

/**
 * Best candidate for `query`, or null when nothing reaches the threshold or the
 * top score is shared by several candidates (ambiguous: let the agent decide).
 */
export function bestMatch(
  query: string,
  candidates: readonly string[],
  { threshold }: MatchOptions,
): string | null {
  let best: string | null = null;
  let bestScore = -1;
  let tie = false;
  for (const candidate of candidates) {
    const score = nameScore(query, candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
      tie = false;
    } else if (score === bestScore) {
      tie = true;
    }
  }
  return best !== null && bestScore >= threshold && !tie ? best : null;
}
