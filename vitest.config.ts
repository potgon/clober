import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Workspace packages expose their TypeScript sources under the "development"
    // condition, so tests run without building first.
    conditions: ["development"],
  },
  test: {
    include: ["apps/*/src/**/*.test.ts", "packages/*/src/**/*.test.ts"],
  },
});
