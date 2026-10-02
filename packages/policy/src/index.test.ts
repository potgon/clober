import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION } from "./index.js";

describe("policy", () => {
  it("resolves the shared workspace package", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});
