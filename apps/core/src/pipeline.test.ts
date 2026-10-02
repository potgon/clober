import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type CoreMessage,
  type LogEntry,
  logEntrySchema,
  type ToolDefinition,
  type TranscriptMessage,
} from "@clober/shared";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { SessionLog } from "./log/session-log.js";
import { createPipeline } from "./pipeline.js";
import { createFastpath } from "./router/fastpath.js";

const scenes = ["Inicio", "Juego"];
let current = "Inicio";
const live = { scenes: () => scenes, currentScene: () => current };

const setScene: ToolDefinition = {
  name: "obs_set_scene",
  description: "test",
  input: z.object({ scene: z.string() }),
  defaultLevel: "free",
  async handler(args) {
    const { scene } = args as { scene: string };
    if (scene === "Juego" && current === "broken") throw new Error("OBS gone");
    current = scene;
    return {
      ok: true,
      summary: { es: `Escena: ${scene}`, en: `Scene: ${scene}` },
      undo: async () => {},
    };
  },
};

function transcript(text: string): TranscriptMessage {
  return {
    type: "transcript",
    id: "t1",
    text,
    lang: "es",
    mode: "command",
    t_wake: 1000,
    t_speech_end: 2000,
    t_transcript: 2400,
  };
}

function setup() {
  const sent: CoreMessage[] = [];
  const entries: LogEntry[] = [];
  let clock = 2500;
  const handle = createPipeline({
    fastpath: createFastpath({ wakeWords: ["regidor"], scenes: () => scenes }),
    tools: [setScene],
    live,
    log: { append: async (e) => void entries.push(e) },
    send: (m) => sent.push(m),
    now: () => clock++,
  });
  return { handle, sent, entries };
}

afterEach(() => {
  current = "Inicio";
});

describe("pipeline", () => {
  it("runs a fast path command, plays the ok earcon and logs timings", async () => {
    const { handle, sent, entries } = setup();
    const entry = await handle(transcript("regidor escena juego"));
    expect(current).toBe("Juego");
    expect(sent).toEqual([{ type: "earcon", name: "ok" }]);
    expect(entries).toEqual([entry]);
    expect(logEntrySchema.parse(entry)).toEqual(entry);
    expect(entry.route).toBe("fastpath");
    expect(entry.calls).toEqual([
      {
        tool: "obs_set_scene",
        args: { scene: "Juego" },
        decision: "allow",
        result: "ok",
        summary: "Escena: Juego",
        undoable: true,
      },
    ]);
    expect(entry.t).toEqual({
      wake: 1000,
      speech_end: 2000,
      transcript: 2400,
      routed: 2500,
      first_action_done: 2501,
    });
  });

  it("says it did not understand when nothing matches", async () => {
    const { handle, sent } = setup();
    const entry = await handle(transcript("pon el meme de la cabra"));
    expect(sent).toEqual([
      { type: "earcon", name: "error" },
      { type: "speak", id: "s1", text: "No te he entendido", lang: "es" },
    ]);
    expect(entry.calls).toEqual([]);
    expect(entry.t.first_action_done).toBeNull();
  });

  it("reports a tool that throws as an error without crashing", async () => {
    current = "broken";
    const { handle, sent } = setup();
    const entry = await handle(transcript("escena juego"));
    expect(sent[0]).toEqual({ type: "earcon", name: "error" });
    expect(entry.calls[0]).toMatchObject({ result: "error", summary: "No he podido hacerlo" });
    expect(entry.t.first_action_done).toBeNull();
  });
});

describe("SessionLog", () => {
  let dir = "";
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("writes one JSON line per entry, in order", async () => {
    dir = await mkdtemp(join(tmpdir(), "clober-log-"));
    const log = new SessionLog(dir, new Date("2026-10-02T20:00:00.000Z"));
    expect(log.file).toBe(join(dir, "session-2026-10-02T20-00-00-000Z.jsonl"));
    const { handle } = setup();
    const a = await handle(transcript("escena juego"));
    await Promise.all([log.append({ ...a, id: "1" }), log.append({ ...a, id: "2" })]);
    const lines = (await readFile(log.file, "utf8")).trim().split("\n");
    expect(lines.map((l) => JSON.parse(l).id)).toEqual(["1", "2"]);
  });
});
