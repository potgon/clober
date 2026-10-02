import { randomBytes } from "node:crypto";
import { createObsTools, ObsClient } from "@clober/mcp-obs";
import { SessionLog } from "./log/session-log.js";
import { logsDir } from "./paths.js";
import { createPipeline } from "./pipeline.js";
import { createFastpath } from "./router/fastpath.js";
import { DEFAULT_PORT, startLocalServer } from "./server/local-server.js";

// F0 configuration comes from environment variables; config.json and the
// system keychain replace them in F1.1.
const env = process.env;
const token = env.CLOBER_TOKEN ?? randomBytes(32).toString("hex");
const port = Number(env.CLOBER_PORT ?? DEFAULT_PORT);
const wakeWord = env.CLOBER_WAKE_WORD ?? "regidor";

const obs = new ObsClient({
  url: env.CLOBER_OBS_URL ?? "ws://127.0.0.1:4455",
  password: env.CLOBER_OBS_PASSWORD,
  onStatus: (connected) => console.log(connected ? "OBS connected" : "OBS disconnected"),
});

const log = new SessionLog(logsDir());
let send: Parameters<typeof createPipeline>[0]["send"] = () => {};
const handleTranscript = createPipeline({
  fastpath: createFastpath({ wakeWords: [wakeWord], scenes: () => obs.scenes() }),
  tools: createObsTools(obs),
  live: obs,
  log,
  send: (message) => send(message),
});

const server = await startLocalServer({
  port,
  token,
  onSidecarStatus: (connected) =>
    console.log(connected ? "sidecar connected" : "sidecar disconnected"),
  onInvalidMessage: (error) => console.warn(`invalid sidecar message: ${error}`),
  onSidecarMessage: (message) => {
    if (message.type !== "transcript" || message.mode !== "command") return;
    handleTranscript(message)
      .then((entry) => {
        const done = entry.t.first_action_done;
        const latency = done === null ? "no action" : `${done - entry.t.speech_end} ms`;
        console.log(
          `"${entry.utterance}" -> ${entry.calls[0]?.summary ?? "no match"} (${latency})`,
        );
      })
      .catch((err: unknown) => console.error("command failed", err));
  },
});
send = (message) => void server.sendToSidecar(message);

await obs.start();
console.log(`Clober core on http://127.0.0.1:${server.port}`);
console.log(`Action log: ${log.file}`);
if (!env.CLOBER_TOKEN) {
  console.log("Start the sidecar with:");
  console.log(`  cd sidecar-audio && uv run python -m clober_audio --token ${token}`);
}

const shutdown = async () => {
  await obs.stop();
  await server.close();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
