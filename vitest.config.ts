import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globals: true,
  },
  coverage: {
    provider: "v8",
    reporter: ["text", "lcov"],
    reportsDirectory: "coverage",
    exclude: ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**", "**/dist/**", "**/coverage/**"],
  },
});
