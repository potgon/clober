import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { LogEntry } from "@clober/shared";

export interface ActionLog {
  append(entry: LogEntry): Promise<void>;
}

/** One JSONL file per session: logs/session-<ISO>.jsonl (PLAN.md §5.6). */
export class SessionLog implements ActionLog {
  readonly file: string;
  private ready: Promise<unknown>;

  constructor(dir: string, startedAt: Date = new Date()) {
    const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
    this.file = join(dir, `session-${stamp}.jsonl`);
    this.ready = mkdir(dir, { recursive: true });
  }

  async append(entry: LogEntry): Promise<void> {
    // Chained so lines keep their order even when appends overlap.
    this.ready = this.ready.then(() => appendFile(this.file, `${JSON.stringify(entry)}\n`, "utf8"));
    await this.ready;
  }
}
