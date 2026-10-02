// pnpm latency-report [session.jsonl ...]
// Without arguments, reads the latest session in %APPDATA%\Clober\logs.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { type LogEntry, logEntrySchema } from "@clober/shared";
import { formatReport, latencyReport } from "../src/latency.js";
import { logsDir } from "../src/paths.js";

async function latestSession(): Promise<string> {
  const dir = logsDir();
  const files = (await readdir(dir)).filter((f) => /^session-.*\.jsonl$/.test(f)).sort();
  const last = files.at(-1);
  if (!last) throw new Error(`no session logs in ${dir}`);
  return join(dir, last);
}

const files = process.argv.slice(2);
if (files.length === 0) files.push(await latestSession());

const entries: LogEntry[] = [];
for (const file of files) {
  const lines = (await readFile(file, "utf8")).split("\n").filter(Boolean);
  lines.forEach((line, i) => {
    const parsed = logEntrySchema.safeParse(JSON.parse(line));
    if (parsed.success) entries.push(parsed.data);
    else console.warn(`${file}:${i + 1}: skipped invalid entry`);
  });
}

console.log(`${entries.length} commands from ${files.join(", ")}\n`);
console.log(formatReport(latencyReport(entries)));
