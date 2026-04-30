#!/usr/bin/env node
/**
 * Build output verification script for Issue #26 — esbuild bundler fix.
 *
 * This script verifies that the esbuild bundler produces correct output.
 * It can be run standalone (no test framework required) or as part of CI/CD.
 *
 * Usage:
 *   node scripts/verify-build-output.js
 *
 * Exit code: 0 if all checks pass, 1 if any check fails.
 */

const { existsSync, readFileSync, statSync } = require("node:fs");
const { resolve, join } = require("node:path");

const PROJECT_ROOT = resolve(__dirname, "..");
const DIST_EXTENSION = join(PROJECT_ROOT, "dist", "extension.js");

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

/**
 * These npm packages must be bundled into dist/extension.js.
 * Note: mdast-util-frontmatter and micromark-extension-frontmatter are in
 * package.json but not imported in source — esbuild tree-shakes them out.
 * We only verify packages that are actually used.
 */
const MUST_BE_BUNDLED = ["mdast-util-from-markdown", "unist-util-visit", "mdast-util-to-string"];

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${name}`);
  console.log("─".repeat(name.length));
}

// Read the bundled file
if (!existsSync(DIST_EXTENSION)) {
  console.error(`FATAL: ${DIST_EXTENSION} does not exist. Run 'npm run build' first.`);
  process.exit(1);
}

const bundleSource = readFileSync(DIST_EXTENSION, "utf-8");
const stats = statSync(DIST_EXTENSION);

section("Bundled output file");
assert(existsSync(DIST_EXTENSION), "dist/extension.js exists");
assert(stats.size > 100_000, `dist/extension.js is > 100 KB (${Math.round(stats.size / 1024)} KB)`);
assert(bundleSource.includes("__toESM"), "Contains esbuild __toESM helper");
assert(bundleSource.includes("__toCommonJS"), "Contains esbuild __toCommonJS helper");
assert(bundleSource.includes("module.exports ="), "Has module.exports entry point");

section("Dependency bundling — no live require() for npm packages");
for (const pkg of MUST_BE_BUNDLED) {
  const liveRequirePattern = new RegExp(
    `require\\s*\\(\\s*["']${pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']\\s*\\)`,
  );
  assert(!liveRequirePattern.test(bundleSource), `No live require("${pkg}")`);
}

for (const pkg of MUST_BE_BUNDLED) {
  const bundledCommentPattern = new RegExp(
    `//\\s*node_modules/${pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/`,
  );
  assert(
    bundledCommentPattern.test(bundleSource),
    `Bundled source for "${pkg}" (// node_modules/${pkg}/...)`,
  );
}

section("Bundled dependency identifiers present");
assert(bundleSource.includes("fromMarkdown"), "fromMarkdown (mdast-util-from-markdown)");
assert(/function\s+visit\s*\(/.test(bundleSource), "function visit() (unist-util-visit)");
assert(bundleSource.includes("function toString("), "function toString() (mdast-util-to-string)");

section("External require() calls (only vscode + Node.js built-ins)");
const requirePattern = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
const requires = [];
let match;
while ((match = requirePattern.exec(bundleSource)) !== null) {
  requires.push(match[1]);
}
const uniqueRequires = [...new Set(requires)];
const disallowed = uniqueRequires.filter((req) => !ALLOWED_EXTERNALS.includes(req));
assert(disallowed.length === 0, `All require() calls are allowed: [${uniqueRequires.join(", ")}]`);
if (disallowed.length > 0) {
  console.error(`    Disallowed require() calls: ${disallowed.join(", ")}`);
}

assert(bundleSource.includes('require("vscode")'), "require('vscode') for VS Code API");

section("Source map");
assert(existsSync(DIST_EXTENSION + ".map"), "dist/extension.js.map exists");

// Summary
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);

if (failed > 0) {
  console.error("\nBUILD OUTPUT VERIFICATION FAILED");
  process.exit(1);
} else {
  console.log("\nBUILD OUTPUT VERIFICATION PASSED ✓");
  process.exit(0);
}
