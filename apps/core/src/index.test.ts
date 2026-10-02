import { PROTOCOL_VERSION } from "@clober/shared";
import { describe, expect, it } from "vitest";

describe("core", () => {
  it("resolves workspace dependencies", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});
