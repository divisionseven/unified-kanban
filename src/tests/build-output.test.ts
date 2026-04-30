import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// Resolve paths relative to project root (vitest runs from project root)
const PROJECT_ROOT = resolve(__dirname, "../..");
const DIST_EXTENSION = join(PROJECT_ROOT, "dist", "extension.js");

/**
 * Build output verification tests for Issue #26 — esbuild bundler fix.
 *
 * Root cause: On fresh install, the extension failed to activate because `tsc`
 * doesn't bundle npm dependencies. The compiled JS contained live `require()`
 * calls for packages (mdast-util-from-markdown, unist-util-visit, etc.) that
 * were not shipped in the `.vsix` (excluded by `.vscodeignore`).
 *
 * Fix: Replaced `tsc`-only build with `esbuild` bundler that inlines all
 * dependencies into a single `dist/extension.js`, with only `vscode` and
 * Node.js built-ins kept as external `require()` calls.
 *
 * These tests FAIL before the fix (tsc-only build) and PASS after (esbuild).
 */
describe("Build Output — esbuild bundler (Issue #26)", () => {
  let bundleSource: string;

  beforeAll(() => {
    expect(existsSync(DIST_EXTENSION)).toBe(true);
    bundleSource = readFileSync(DIST_EXTENSION, "utf-8");
  });

  // ─── 1. dist/extension.js exists and is a bundled file ───────────────────

  describe("bundled output file", () => {
    it("dist/extension.js exists after build", () => {
      expect(existsSync(DIST_EXTENSION)).toBe(true);
    });

    it("dist/extension.js is a non-empty file (bundled, not empty placeholder)", () => {
      const stats = statSync(DIST_EXTENSION);
      // A bundled VS Code extension with mdast + unist dependencies should be > 100 KB
      // A bare tsc-compiled extension.js (entry point only) would be just a few KB
      expect(stats.size).toBeGreaterThan(100_000);
    });

    it("dist/extension.js uses esbuild's module wrapper pattern", () => {
      // esbuild wraps modules with __toESM / __toCommonJS helpers
      expect(bundleSource).toContain("__toESM");
      expect(bundleSource).toContain("__toCommonJS");
    });

    it("dist/extension.js has module.exports as the CJS entry point", () => {
      // esbuild sets module.exports for CJS output
      expect(bundleSource).toContain("module.exports =");
    });
  });

  // ─── 2. npm dependencies are inlined (bundled), not live require() ──────

  describe("dependency bundling", () => {
    /**
     * These npm packages must be bundled into dist/extension.js.
     * Before the fix, tsc-compiled code had:
     *   var mdast_util_from_markdown_1 = require("mdast-util-from-markdown");
     * After the fix, esbuild inlines the full source code and no require() exists.
     *
     * Note: mdast-util-frontmatter and micromark-extension-frontmatter are in
     * package.json but not imported in source — esbuild tree-shakes them out.
     * We only verify packages that are actually used.
     */
    const MUST_BE_BUNDLED = [
      "mdast-util-from-markdown",
      "unist-util-visit",
      "mdast-util-to-string",
    ];

    for (const pkg of MUST_BE_BUNDLED) {
      it(`does NOT contain live require() for "${pkg}" (must be bundled)`, () => {
        // A live require() for an npm package would look like:
        //   require("mdast-util-from-markdown")
        //   require('unist-util-visit')
        const liveRequirePattern = new RegExp(
          `require\\s*\\(\\s*["']${escapeRegex(pkg)}["']\\s*\\)`,
        );
        expect(liveRequirePattern.test(bundleSource)).toBe(false);
      });

      it(`contains inlined source code for "${pkg}" (bundled by esbuild)`, () => {
        // esbuild adds a comment header for each bundled file:
        //   // node_modules/mdast-util-from-markdown/lib/index.js
        const bundledCommentPattern = new RegExp(`//\\s*node_modules/${escapeRegex(pkg)}/`);
        expect(bundledCommentPattern.test(bundleSource)).toBe(true);
      });
    }
  });

  // ─── 3. Key function identifiers from bundled deps are present ──────────

  describe("bundled dependency identifiers present in output", () => {
    /**
     * Before the fix (tsc-only): these identifiers would NOT appear in dist/extension.js
     * because the source code was in separate node_modules files, not inlined.
     * After the fix (esbuild): the full dependency source is inlined.
     */
    it("contains fromMarkdown function (from mdast-util-from-markdown)", () => {
      // mdast-util-from-markdown exports fromMarkdown
      expect(bundleSource).toContain("fromMarkdown");
    });

    it("contains visit function (from unist-util-visit)", () => {
      // unist-util-visit exports visit
      // The bundled code contains "function visit(" or similar
      const visitPattern = /function\s+visit\s*\(/;
      expect(visitPattern.test(bundleSource)).toBe(true);
    });

    it("contains toString function (from mdast-util-to-string)", () => {
      // mdast-util-to-string exports toString
      expect(bundleSource).toContain("function toString(");
    });
  });

  // ─── 4. Only allowed external require() calls ──────────────────────────

  describe("external require() calls (only vscode + Node.js built-ins)", () => {
    /**
     * The only allowed require() calls in the bundled output are:
     * - "vscode" (VS Code API — always external)
     * - Node.js built-in modules (crypto, fs, path, etc.)
     *
     * Any other require() for an npm package indicates a bundling failure.
     * Before the fix, there were require() calls for mdast-util-from-markdown,
     * unist-util-visit, etc.
     */

    // Allowed external modules: vscode + Node.js built-ins
    const ALLOWED_EXTERNALS = [
      "vscode",
      "crypto",
      "fs",
      "path",
      "node:path",
      "node:fs",
      "node:crypto",
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
      // Extract all require("...") or require('...') strings
      const requirePattern = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
      const requires: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = requirePattern.exec(bundleSource)) !== null) {
        requires.push(match[1]!);
      }

      // Deduplicate
      const uniqueRequires = [...new Set(requires)];

      const disallowed = uniqueRequires.filter((req) => !ALLOWED_EXTERNALS.includes(req));

      expect(disallowed).toEqual([]);
    });

    it("contains require('vscode') for VS Code API access", () => {
      expect(bundleSource).toContain('require("vscode")');
    });
  });

  // ─── 5. Source map exists ─────────────────────────────────────────────

  describe("source map", () => {
    it("dist/extension.js.map exists for debugging", () => {
      const sourceMapPath = DIST_EXTENSION + ".map";
      expect(existsSync(sourceMapPath)).toBe(true);
    });
  });
});

/**
 * Escape a string for safe use in a RegExp constructor.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
