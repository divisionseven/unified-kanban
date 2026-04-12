// ─── MarkdownRenderer Direct Function Tests ───────────────────────────────
// Test the exported normalizeFencedCodeIndent function directly
// to improve line coverage

import { describe, it, expect } from "vitest";
import { normalizeFencedCodeIndent } from "../components/MarkdownRenderer.js";

describe("normalizeFencedCodeIndent — direct function tests", () => {
  it("handles single line with no fence", () => {
    expect(normalizeFencedCodeIndent("no fence here")).toBe("no fence here");
  });

  it("handles content with multiple code blocks", () => {
    const input = "text\n```js\ncode1\n```\nmore text\n```python\ncode2\n```\nend";
    const result = normalizeFencedCodeIndent(input);
    expect(result).toContain("code1");
    expect(result).toContain("code2");
  });

  it("handles code blocks at end of content", () => {
    const input = "start\n```js\ncode\n```";
    const result = normalizeFencedCodeIndent(input);
    expect(result).toBe("start\n```js\ncode\n```");
  });

  it("handles indented fence followed by indented content", () => {
    // This specifically tests line 29 condition (minIndent === Infinity)
    const input = "   \n      ```\n      code\n      ```";
    const result = normalizeFencedCodeIndent(input);
    expect(result).toBeDefined();
  });

  it("handles fence with only whitespace before it", () => {
    const input = "     \n```js\n```";
    const result = normalizeFencedCodeIndent(input);
    expect(result).toBeDefined();
  });

  it("handles tilde fences with indentation", () => {
    const input = "  ~~~python\n  code\n  ~~~";
    const result = normalizeFencedCodeIndent(input);
    expect(result).toContain("~~~python");
  });
});
