import type { LogEntry } from "@clober/shared";
import { describe, expect, it } from "vitest";
import { formatReport, latencyReport, percentile } from "./latency.js";

function entry(total: number | null, route: LogEntry["route"] = "fastpath"): LogEntry {
  const speechEnd = 10_000;
  return {
    id: "x",
    ts: 0,
    actor: { kind: "streamer" },
    utterance: "escena juego",
    lang: "es",
    route,
    calls: [],
    t: {
      wake: 9_000,
      speech_end: speechEnd,
      transcript: speechEnd + 400,
      routed: speechEnd + 410,
      first_action_done: total === null ? null : speechEnd + total,
    },
  };
}

describe("percentile", () => {
  it("uses nearest rank", () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(percentile(values, 0.5)).toBe(10);
    expect(percentile(values, 0.95)).toBe(19);
    expect(percentile([7], 0.95)).toBe(7);
  });
});

describe("latencyReport", () => {
  it("measures speech end to first action, by route and stage", () => {
    const entries = [
      ...[500, 600, 700, 800, 2500].map((t) => entry(t)),
      entry(1500, "agent"),
      entry(null),
    ];
    const report = latencyReport(entries);
    expect(report.byRoute.fastpath).toEqual({ count: 5, p50: 700, p95: 2500 });
    expect(report.byRoute.agent).toEqual({ count: 1, p50: 1500, p95: 1500 });
    expect(report.stages.stt).toEqual({ count: 6, p50: 400, p95: 400 });
    expect(report.stages.routing.p50).toBe(10);
    expect(report.withoutAction).toBe(1);
    expect(formatReport(report)).toContain("total (fastpath)");
  });
});
