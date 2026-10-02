import type {
  CoreMessage,
  Lang,
  LiveContextReader,
  Localized,
  LogCall,
  LogEntry,
  ToolDefinition,
  TranscriptMessage,
} from "@clober/shared";
import type { ActionLog } from "./log/session-log.js";
import type { Fastpath } from "./router/fastpath.js";

const TOOL_TIMEOUT_MS = 5_000;

const NOT_UNDERSTOOD: Localized = { es: "No te he entendido", en: "Sorry, I didn't get that" };
const TOOL_FAILED: Localized = { es: "No he podido hacerlo", en: "That didn't work" };

export interface PipelineDeps {
  fastpath: Fastpath;
  tools: readonly ToolDefinition[];
  live: LiveContextReader;
  log: ActionLog;
  send: (message: CoreMessage) => void;
  now?: () => number;
}

/**
 * F0 command flow: transcript -> fast path -> tool -> earcon + log.
 * Policies, confirmation, undo and the agent are added in F1.10–F1.11.
 */
export function createPipeline(deps: PipelineDeps) {
  const now = deps.now ?? Date.now;
  const tools = new Map(deps.tools.map((t) => [t.name, t]));
  let speakSeq = 0;

  const speak = (text: Localized, lang: Lang) =>
    deps.send({ type: "speak", id: `s${++speakSeq}`, text: text[lang], lang });

  return async function handleTranscript(msg: TranscriptMessage): Promise<LogEntry> {
    const call = deps.fastpath(msg.text);
    const routed = now();
    const calls: LogCall[] = [];
    let firstActionDone: number | null = null;

    if (!call) {
      deps.send({ type: "earcon", name: "error" });
      speak(NOT_UNDERSTOOD, msg.lang);
    } else {
      const tool = tools.get(call.tool);
      const args = tool?.input.safeParse(call.args);
      if (!tool || !args?.success) {
        throw new Error(`fast path produced an invalid call: ${JSON.stringify(call)}`);
      }
      let summary: Localized;
      let ok = false;
      let undoable = false;
      try {
        const result = await tool.handler(args.data, {
          dryRun: false,
          actor: { kind: "streamer" },
          live: deps.live,
          signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
        });
        ({ ok, summary } = result);
        undoable = result.undo !== undefined;
      } catch {
        summary = TOOL_FAILED;
      }
      if (ok) firstActionDone = now();
      deps.send({ type: "earcon", name: ok ? "ok" : "error" });
      if (!ok) speak(summary, msg.lang);
      calls.push({
        tool: tool.name,
        args: args.data,
        decision: "allow",
        result: ok ? "ok" : "error",
        summary: summary[msg.lang],
        undoable,
      });
    }

    const entry: LogEntry = {
      id: msg.id,
      ts: msg.t_transcript,
      actor: { kind: "streamer" },
      utterance: msg.text,
      lang: msg.lang,
      route: "fastpath",
      calls,
      t: {
        wake: msg.t_wake,
        speech_end: msg.t_speech_end,
        transcript: msg.t_transcript,
        routed,
        first_action_done: firstActionDone,
      },
    };
    await deps.log.append(entry);
    return entry;
  };
}
