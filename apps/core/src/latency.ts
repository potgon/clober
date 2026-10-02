import type { LogEntry } from "@clober/shared";

// Official latency (PLAN.md §5.6): t.first_action_done - t.speech_end.

export interface Stats {
  count: number;
  p50: number;
  p95: number;
}

export interface LatencyReport {
  /** Commands that ended in an action, by route. */
  byRoute: Partial<Record<LogEntry["route"], Stats>>;
  /** Where the time goes, over the same commands. */
  stages: { stt: Stats; routing: Stats; action: Stats };
  /** Commands without an action (no match, error, cancelled). */
  withoutAction: number;
}

/** Nearest-rank percentile. */
export function percentile(values: readonly number[], q: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil(q * sorted.length)));
  return sorted[rank - 1] as number;
}

function stats(values: readonly number[]): Stats {
  return { count: values.length, p50: percentile(values, 0.5), p95: percentile(values, 0.95) };
}

export function latencyReport(entries: readonly LogEntry[]): LatencyReport {
  const done = entries.filter((e) => e.t.first_action_done !== null);
  const total = (e: LogEntry) => (e.t.first_action_done as number) - e.t.speech_end;
  const byRoute: LatencyReport["byRoute"] = {};
  for (const route of ["fastpath", "agent"] as const) {
    const values = done.filter((e) => e.route === route).map(total);
    if (values.length) byRoute[route] = stats(values);
  }
  return {
    byRoute,
    stages: {
      stt: stats(done.map((e) => e.t.transcript - e.t.speech_end)),
      routing: stats(done.map((e) => e.t.routed - e.t.transcript)),
      action: stats(done.map((e) => (e.t.first_action_done as number) - e.t.routed)),
    },
    withoutAction: entries.length - done.length,
  };
}

export function formatReport(report: LatencyReport): string {
  const row = (label: string, s: Stats) =>
    `${label.padEnd(22)}${String(s.count).padStart(6)}${`${s.p50} ms`.padStart(10)}${`${s.p95} ms`.padStart(10)}`;
  const lines = [`${"".padEnd(22)}${"n".padStart(6)}${"p50".padStart(10)}${"p95".padStart(10)}`];
  for (const [route, s] of Object.entries(report.byRoute)) lines.push(row(`total (${route})`, s));
  lines.push(row("  STT", report.stages.stt));
  lines.push(row("  routing", report.stages.routing));
  lines.push(row("  action", report.stages.action));
  lines.push(`commands without action: ${report.withoutAction}`);
  return lines.join("\n");
}
