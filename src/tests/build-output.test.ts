import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const PROJECT_ROOT = resolve(__dirname as string, "../..");
const DIST_EXTENSION = join(PROJECT_ROOT, "dist", "extension.js");

const FILE_EXISTS = existsSync(DIST_EXTENSION);
const BUNDLE = FILE_EXISTS ? readFileSync(DIST_EXTENSION, "utf-8") : "";

if (!FILE_EXISTS) {
  // eslint-disable-next-line no-console
  console.warn(
    "⚠️ Skipping build output tests: dist/extension.js not found (build step may not have run)",
  );
}

describe.skipIf(!FILE_EXISTS)("Build Output — esbuild bundler (Issue #26)", () => {
  describe("bundled output file", () => {
    it("dist/extension.js exists after build", () => {
      expect(existsSync(DIST_EXTENSION)).toBe(true);
    });

    it("dist/extension.js is a non-empty file (bundled, not empty placeholder)", () => {
      const stats = statSync(DIST_EXTENSION);
      expect(stats.size).toBeGreaterThan(100_000);
    });

    it("dist/extension.js uses esbuild's module wrapper pattern", () => {
      expect(BUNDLE).toContain("__toESM");
      expect(BUNDLE).toContain("__toCommonJS");
    });

    it("dist/extension.js has module.exports as the CJS entry point", () => {
      expect(BUNDLE).toContain("module.exports =");
    });
  });

  describe("dependency bundling", () => {
    const MUST_BE_BUNDLED = [
      "mdast-util-from-markdown",
      "unist-util-visit",
      "mdast-util-to-string",
    ];

    for (const pkg of MUST_BE_BUNDLED) {
      it(`does NOT contain live require() for "${pkg}" (must be bundled)`, () => {
        const liveRequirePattern = new RegExp(
          `require\\s*\\(\\s*["']${escapeRegex(pkg)}["']\\s*\\)`,
        );
        expect(liveRequirePattern.test(BUNDLE)).toBe(false);
      });

      it(`contains inlined source code for "${pkg}" (bundled by esbuild)`, () => {
        const bundledCommentPattern = new RegExp(`//\\s*node_modules/${escapeRegex(pkg)}/`);
        expect(bundledCommentPattern.test(BUNDLE)).toBe(true);
      });
    }
  });

  describe("bundled dependency identifiers present in output", () => {
    it("contains fromMarkdown function (from mdast-util-from-markdown)", () => {
      expect(BUNDLE).toContain("fromMarkdown");
    });

    it("contains visit function (from unist-util-visit)", () => {
      const visitPattern = /function\s+visit\s*\(/;
      expect(visitPattern.test(BUNDLE)).toBe(true);
    });

    it("contains toString function (from mdast-util-to-string)", () => {
      expect(BUNDLE).toContain("function toString(");
    });
  });

  describe("external require() calls (only vscode + Node.js built-ins)", () => {
    const ALLOWED_EXTERNALS = [
      "vscode",
      "crypto",
      "node:crypto",
      "fs",
      "node:fs",
      "path",
      "node:path",
      "os",
      "node:os",
      "events",
      "node:events",
      "stream",
      "node:stream",
      "url",
      "node:url",
      "util",
      "node:util",
      "buffer",
      "node:buffer",
      "child_process",
      "node:child_process",
      "net",
      "node:net",
      "http",
      "node:http",
      "https",
      "node:https",
      "assert",
      "node:assert",
      "module",
      "node:module",
      "process",
      "node:process",
      "timers",
      "node:timers",
      "zlib",
      "node:zlib",
    ];

    it("all require() calls are for allowed external modules only", () => {
      const requirePattern = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
      const requires: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = requirePattern.exec(BUNDLE)) !== null) {
        requires.push(match[1]!);
      }
      const uniqueRequires = [...new Set(requires)];
      const disallowed = uniqueRequires.filter((req) => !ALLOWED_EXTERNALS.includes(req));
      expect(disallowed).toEqual([]);
    });

    it("contains require('vscode') for VS Code API access", () => {
      expect(BUNDLE).toContain('require("vscode")');
    });
  });

  describe("source map", () => {
    it("dist/extension.js.map exists for debugging", () => {
      expect(existsSync(DIST_EXTENSION + ".map")).toBe(true);
    });
  });
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
