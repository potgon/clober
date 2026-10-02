import { bestMatch, type ToolDefinition } from "@clober/shared";
import { z } from "zod";
import type { ObsRequester } from "./client.js";

/** Minimum name score to accept a scene or source (PLAN.md F0.5). */
export const NAME_THRESHOLD = 0.75;

const setSceneInput = z.object({ scene: z.string().min(1) });

export function createObsTools(obs: ObsRequester): ToolDefinition[] {
  const setScene: ToolDefinition<typeof setSceneInput> = {
    name: "obs_set_scene",
    description:
      "Switch the OBS program scene. `scene` is matched approximately against the real scene names.",
    input: setSceneInput,
    defaultLevel: "free",
    async handler({ scene }, { live }) {
      const target = bestMatch(scene, live.scenes(), { threshold: NAME_THRESHOLD });
      if (!target) {
        return {
          ok: false,
          summary: { es: `No encuentro la escena «${scene}»`, en: `No scene called "${scene}"` },
        };
      }
      const previous = live.currentScene();
      if (previous === target) {
        return { ok: true, summary: { es: `Ya estás en ${target}`, en: `Already on ${target}` } };
      }
      await obs.call("SetCurrentProgramScene", { sceneName: target });
      return {
        ok: true,
        summary: { es: `Escena: ${target}`, en: `Scene: ${target}` },
        data: { scene: target, previous },
        ...(previous && {
          undo: async () => {
            await obs.call("SetCurrentProgramScene", { sceneName: previous });
          },
          undoSummary: { es: `Vuelta a ${previous}`, en: `Back to ${previous}` },
        }),
      };
    },
  };

  return [setScene as unknown as ToolDefinition];
}
