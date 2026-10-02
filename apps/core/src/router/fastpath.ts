import { bestMatch, normalize, similarity } from "@clober/shared";

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface FastpathOptions {
  /** Wake words to strip from the start of the utterance. */
  wakeWords: readonly string[];
  scenes: () => readonly string[];
}

/** Word similarity accepted for keywords and the wake word ("estena" -> "escena"). */
const WORD_THRESHOLD = 0.75;
/** Name similarity accepted for scenes (PLAN.md F0.5). */
const NAME_THRESHOLD = 0.75;
const SCENE_KEYWORDS = ["escena", "scene"];
/** Words allowed before the keyword: "pon la", "cambia a la", "switch to the"… */
const MAX_WORDS_BEFORE_KEYWORD = 3;

const isLike = (word: string, target: string) => similarity(word, target) >= WORD_THRESHOLD;

/**
 * Literal commands resolved without the LLM. Returns null when unsure so the
 * agent (F1.10) gets the utterance instead: a wrong fast action is worse than
 * a slower right one.
 *
 * Instead of exact regular expressions, it looks for the keyword among the first
 * words, because Whisper often mangles both the keyword and the filler before it
 * ("por la estena juego" for "pon la escena juego").
 */
export function createFastpath({ wakeWords, scenes }: FastpathOptions) {
  const wake = wakeWords.map(normalize);

  return function match(utterance: string): ToolCall | null {
    let words = normalize(utterance).split(" ").filter(Boolean);
    const first = words[0];
    if (first && wake.some((w) => isLike(first, w))) words = words.slice(1);

    const keywordAt = words
      .slice(0, MAX_WORDS_BEFORE_KEYWORD + 1)
      .findIndex((word) => SCENE_KEYWORDS.some((k) => isLike(word, k)));
    if (keywordAt === -1) return null;

    const name = words.slice(keywordAt + 1).join(" ");
    if (!name) return null;
    const scene = bestMatch(name, scenes(), { threshold: NAME_THRESHOLD });
    return scene ? { tool: "obs_set_scene", args: { scene } } : null;
  };
}

export type Fastpath = ReturnType<typeof createFastpath>;
