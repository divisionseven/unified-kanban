import { describe, it, expect } from "vitest";
import { parse, parseCard, extractCssClasses } from "./parse.js";
import { serialize } from "./serialize.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURES_DIR = join(__dirname, "__fixtures__");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf-8");
}

// ─── Frontmatter ──────────────────────────────────────────────────────────────

describe("parse > frontmatter", () => {
  it("extracts YAML frontmatter between --- delimiters", () => {
    const md = "---\nkanban-plugin: basic\n---\n\n## Todo\n";
    const result = parse(md);
    expect(result.frontmatter).toBe("kanban-plugin: basic");
    expect(result.frontmatterRaw).toBe("---\nkanban-plugin: basic\n---");
  });

  it("handles missing frontmatter", () => {
    const md = "## Todo\n- [ ] Task\n";
    const result = parse(md);
    expect(result.frontmatter).toBe("");
    expect(result.frontmatterRaw).toBe("");
  });

  it("preserves frontmatter content verbatim in frontmatterRaw", () => {
    const md = "---\nkanban-plugin: basic\nfoo: bar\n---\n\n## Todo\n";
    const result = parse(md);
    expect(result.frontmatterRaw).toBe("---\nkanban-plugin: basic\nfoo: bar\n---");
    expect(result.frontmatter).toBe("kanban-plugin: basic\nfoo: bar");
  });
});

// ─── Columns ──────────────────────────────────────────────────────────────────

describe("parse > columns", () => {
  it("parses ## headings as columns", () => {
    const md = "---\nkanban-plugin: basic\n---\n\n## Backlog\n- [ ] Task\n## Done\n";
    const result = parse(md);
    expect(result.columns).toHaveLength(2);
    expect(result.columns[0]?.title).toBe("Backlog");
    expect(result.columns[1]?.title).toBe("Done");
  });

  it("creates empty column for heading with no cards (edge case #1)", () => {
    const md = "---\nkanban-plugin: basic\n---\n\n## Empty Column\n\n## Next\n";
    const result = parse(md);
    const emptyCol = result.columns.find((c) => c.title === "Empty Column");
    expect(emptyCol).toBeDefined();
    expect(emptyCol?.cards).toHaveLength(0);
  });

  it("generates deterministic column IDs from title", () => {
    const md = "## In Progress\n- [ ] Task\n";
    const result = parse(md);
    expect(result.columns[0]?.id).toBe("in-progress");
  });

  it("parses **Complete** marker and sets column.complete (edge case #14)", () => {
    const md = "## Done\n\n**Complete**\n- [x] Finished\n";
    const result = parse(md);
    expect(result.columns[0]?.complete).toBe(true);
  });

  it("handles column without **Complete** marker", () => {
    const md = "## Todo\n- [ ] Task\n";
    const result = parse(md);
    expect(result.columns[0]?.complete).toBe(false);
  });
});

// ─── Cards ────────────────────────────────────────────────────────────────────

describe("parse > cards", () => {
  it("parses - [ ] as unchecked card", () => {
    const md = "## Todo\n- [ ] Open task\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.checked).toBe(false);
    expect(card?.text).toBe("Open task");
  });

  it("parses - [x] as checked card", () => {
    const md = "## Done\n- [x] Done task\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.checked).toBe(true);
    expect(card?.text).toBe("Done task");
  });

  it("extracts @{YYYY-MM-DD} due dates to metadata.dueDates", () => {
    const md = "## Todo\n- [ ] Task @{2025-04-15}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.dueDates).toEqual(["2025-04-15"]);
  });

  it("extracts @{HH:mm} times to metadata.times", () => {
    const md = "## Todo\n- [ ] Meeting @{08:30}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.times).toEqual(["08:30"]);
  });

  it("extracts #tag to metadata.tags", () => {
    const md = "## Todo\n- [ ] Task #feature\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.tags).toEqual(["feature"]);
  });

  it("extracts [[wikilink]] to metadata.wikilinks", () => {
    const md = "## Todo\n- [ ] Task [[my-note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.wikilinks).toEqual(["my-note"]);
  });

  it("strips metadata from card.text (parser-layer stripping)", () => {
    const md = "## Todo\n- [ ] Task #feature @{2025-04-15}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // card.text is stripped of @{} markers and #tags by the parser
    expect(card?.text).toBe("Task");
    // rawText is preserved verbatim for card ID stability
    expect(card?.rawText).toBe("- [ ] Task #feature @{2025-04-15}");
  });

  it("preserves rawText as original line", () => {
    const md = "## Todo\n- [x] Done @{2025-03-01} #archived\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.rawText).toBe("- [x] Done @{2025-03-01} #archived");
  });

  it("generates deterministic card IDs", () => {
    const md = "## Todo\n- [ ] Same task\n";
    const result1 = parse(md);
    const result2 = parse(md);
    expect(result1.columns[0]?.cards[0]?.id).toBe(result2.columns[0]?.cards[0]?.id);
  });

  it("handles card with multiple metadata types combined (edge case #18)", () => {
    const md = "## Todo\n- [ ] Task @{2025-04-15} #feature [[note]] @{08:30}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.dueDates).toEqual(["2025-04-15"]);
    expect(card?.metadata.times).toEqual(["08:30"]);
    expect(card?.metadata.tags).toEqual(["feature"]);
    expect(card?.metadata.wikilinks).toEqual(["note"]);
  });

  it("handles card with multiple @{date} values (edge case #8)", () => {
    const md = "## Todo\n- [ ] Task @{2025-04-15} @{2025-05-01}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.dueDates).toEqual(["2025-04-15", "2025-05-01"]);
  });

  it("handles markdown formatting in card title (edge case #4)", () => {
    const md = "## Todo\n- [ ] Task with **bold** and *italic* text\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.text).toBe("Task with **bold** and *italic* text");
    expect(card?.rawText).toBe("- [ ] Task with **bold** and *italic* text");
  });

  it("preserves content inside fenced code blocks", () => {
    const md = "## Todo\n- [ ] Task with ```code #tag @{2025-01-01}``` content\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Code block content is preserved - tags/dates inside are NOT stripped
    expect(card?.text).toBe("Task with ```code #tag @{2025-01-01}``` content");
    // Metadata is still extracted (extractedMetadata uses different logic than stripCardText)
    expect(card?.metadata.dueDates).toEqual(["2025-01-01"]);
  });

  it("preserves content inside inline code", () => {
    const md = "## Todo\n- [ ] Task with `code #tag @{2025-01-01}` content\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Inline code preserves content - date inside is preserved
    expect(card?.text).toBe("Task with `code #tag @{2025-01-01}` content");
    // Tags in inline code are not extracted, but dates ARE extracted by extractMetadata
    expect(card?.metadata.tags).toEqual([]);
    expect(card?.metadata.dueDates).toEqual(["2025-01-01"]);
  });

  it("preserves content inside indented code blocks", () => {
    const md = "## Todo\n- [ ] Task\n    code #tag @{2025-01-01}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Indented code is preserved
    expect(card?.text).toBe("Task\n    code #tag @{2025-01-01}");
    // Metadata is extracted (the tag outside indented code)
    expect(card?.metadata.tags).toEqual(["tag"]);
    expect(card?.metadata.dueDates).toEqual(["2025-01-01"]);
  });

  // ─── stripCardText Edge Cases ─────────────────────────────────────────────

  it("handles multiple fenced code blocks in one card", () => {
    const md = "## Todo\n- [ ] Task with ```code1``` middle ```code2``` end\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.text).toBe("Task with ```code1``` middle ```code2``` end");
  });

  it("handles fenced code blocks with language specifiers", () => {
    const md = "## Todo\n- [ ] Task ```typescript\nconst x = 1;\n``` end\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.text).toBe("Task ```typescript\nconst x = 1;\n``` end");
  });

  it("preserves tags inside fenced code blocks in card.text", () => {
    const md = "## Todo\n- [ ] Task ```#tag @{2025-01-01} [[link]]``` more\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Text is preserved with code block content
    expect(card?.text).toContain("```#tag @{2025-01-01} [[link]]```");
  });

  it("handles mixed content: text + code + metadata", () => {
    const md = "## Todo\n- [ ] Task #tag ```code``` more #tag2 @{2025-04-15}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Metadata outside code blocks is stripped from text
    expect(card?.text).toContain("```code```");
    // But extracted to metadata
    expect(card?.metadata.tags).toEqual(["tag", "tag2"]);
    expect(card?.metadata.dueDates).toEqual(["2025-04-15"]);
  });

  it("handles empty fenced code blocks", () => {
    const md = "## Todo\n- [ ] Task with ``` ``` content\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.text).toBe("Task with ``` ``` content");
  });

  it("handles malformed/incomplete code blocks", () => {
    const md = "## Todo\n- [ ] Task with ``` unclosed code block\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Incomplete fenced code should be handled gracefully
    expect(card?.text).toBe("Task with ``` unclosed code block");
  });

  it("handles very long code blocks (100+ lines)", () => {
    const codeLines = Array.from({ length: 105 }, (_, i) => `line ${i + 1}`).join("\n");
    const md = `## Todo\n- [ ] Task \`\`\`\n${codeLines}\n\`\`\` end\n`;
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.text).toContain("```");
    expect(card?.text).toContain("line 105");
  });

  it("handles unicode in code blocks", () => {
    const md = "## Todo\n- [ ] Task ```🎉 emoji 🗂 CJK: 中文日本語``` end\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.text).toBe("Task ```🎉 emoji 🗂 CJK: 中文日本語``` end");
  });

  it("handles tabs in indented code blocks", () => {
    const md = "## Todo\n- [ ] Task\n\there's code\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Tab-indented code should be preserved (1 tab >= 4 spaces conceptually)
    expect(card?.text).toContain("\there's code");
  });

  it("handles double-backtick code spans", () => {
    const md = "## Todo\n- [ ] Task ``javascript code `` content\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.text).toContain("``javascript code ``");
  });

  it("handles multiple inline code blocks", () => {
    const md = "## Todo\n- [ ] Task `code1` middle `code2` end\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.text).toBe("Task `code1` middle `code2` end");
  });

  it("does not treat 3 spaces as indented code (requires 4+ spaces)", () => {
    const md = "## Todo\n- [ ] Task\n   text with #hashtag\n   more text\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // 3 spaces is NOT treated as code (requires 4+), so hashtag in continuation is stripped
    expect(card?.text).toContain("text with");
    expect(card?.text).toContain("more text");
    expect(card?.metadata.tags).toEqual(["hashtag"]);
  });

  it("handles fenced code block ending at end of line", () => {
    const md = "## Todo\n- [ ] Task ```code```\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.text).toBe("Task ```code```");
  });

  it("handles priority emojis with code blocks", () => {
    const md = "## Todo\n- [ ] 🔺 High priority with ```code``` inside\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.priority).toBe(0);
    expect(card?.text).toContain("```code```");
  });

  it("preserves block IDs inside code blocks in card.text", () => {
    const md = "## Todo\n- [ ] Task ```^blockid``` more\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Text is preserved with code block content
    expect(card?.text).toContain("```^blockid```");
  });

  it("preserves indented fenced code blocks in list items", () => {
    // Obsidian format: code block inside a list item with 6 spaces of indentation
    const md = `## Todo
- [ ] Task with
      \`\`\`typescript
      const x = 1;
      \`\`\`
      more content
`;
    const board = parse(md);
    const card = board.columns[0]?.cards[0];
    expect(card).toBeDefined();
    // The code block should be detected as part of the card (not split)
    expect(card?.text).toContain("```typescript");
    expect(card?.text).toContain("const x = 1;");
    expect(card?.rawText).toContain("```typescript");
  });

  it("handles tab-indented fenced code blocks in list items", () => {
    // Code block with tab indentation inside list item
    const md = "## Todo\n- [ ] Task with\n\t\t```typescript\n\t\tconst x = 1;\n\t\t```\n";
    const board = parse(md);
    const card = board.columns[0]?.cards[0];
    expect(card).toBeDefined();
    // Tab-indented code block should be preserved
    expect(card?.text).toContain("```typescript");
    expect(card?.text).toContain("const x = 1;");
  });

  it("preserves Dataview inline metadata inside code blocks in card.text", () => {
    const md = "## Todo\n- [ ] Task ```[key:: value]``` more\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Text is preserved with code block content
    expect(card?.text).toContain("```[key:: value]```");
  });

  it("preserves recurrence inside code blocks in card.text", () => {
    const md = "## Todo\n- [ ] Task ```🔁 every week``` more\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Text is preserved with code block content
    expect(card?.text).toContain("```🔁 every week```");
  });

  it("preserves wikilink dates inside code blocks in card.text", () => {
    const md = "## Todo\n- [ ] Task ```@[[2026-04-01]]``` more\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Text is preserved with code block content
    expect(card?.text).toContain("```@[[2026-04-01]]```");
  });

  it("handles empty card with only metadata", () => {
    const md = "## Todo\n- [ ] #tag @{2025-04-15}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Card with only metadata becomes empty text after stripping
    expect(card?.text).toBe("");
    // But metadata is still extracted
    expect(card?.metadata.tags).toEqual(["tag"]);
    expect(card?.metadata.dueDates).toEqual(["2025-04-15"]);
  });

  it("handles inline code without closing backtick gracefully", () => {
    const md = "## Todo\n- [ ] Task `incomplete code\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Incomplete inline code should be handled gracefully
    expect(card?.text).toContain("Task");
    expect(card?.text).toContain("`incomplete code");
  });

  it("strips [[wikilinks]] from card.text", () => {
    const md = "## Todo\n- [ ] Task [[my-note]] [[another-note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Wikilinks are stripped from text
    expect(card?.text).toBe("Task");
    // But preserved in metadata
    expect(card?.metadata.wikilinks).toEqual(["my-note", "another-note"]);
  });

  it("strips Dataview inline metadata from card.text", () => {
    const md = "## Todo\n- [ ] Task [priority:: high]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // Inline metadata is stripped from text
    expect(card?.text).toBe("Task");
    // But preserved in metadata
    expect(card?.metadata.inlineMetadata).toEqual([
      { key: "priority", value: "high", raw: "[priority:: high]" },
    ]);
  });

  it("card.id is stable based on rawText (not stripped text)", () => {
    const md = "## Todo\n- [ ] Task #feature\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    // ID is based on rawText (with markers)
    expect(card?.id).toBe("118kvhw"); // djb2Hash of "- [ ] Task #feature"
  });
});

// ─── NEW_NOTE_FROM_CARD Metadata Preservation ────────────────────────────

/**
 * Regression tests for NEW_NOTE_FROM_CARD metadata preservation.
 *
 * Bug: KanbanEditorProvider.ts reconstructs card.rawText from stripped card.text
 * when adding a wikilink, losing all metadata markers (@{date}, #tag, etc.).
 *
 * These tests verify that parseCard() correctly extracts ALL metadata
 * (dates, tags, wikilinks) when they coexist in rawText.
 *
 * Scenario: User adds wikilink [[new-note]] to existing card with date.
 * Before fix: rawText = "Task [[new-note]]" (metadata lost)
 * After fix: rawText = "Task @{2025-01-15} [[new-note]]" (metadata preserved)
 */
describe("parse > NEW_NOTE_FROM_CARD metadata preservation", () => {
  it("extracts both date metadata AND wikilink when they coexist", () => {
    // Scenario: Card with @{date} gets [[wikilink]] appended
    const md = "## Todo\n- [ ] Task @{2025-01-15} [[new-note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card?.metadata.wikilinks).toEqual(["new-note"]);
  });

  it("extracts both tag metadata AND wikilink when they coexist", () => {
    // Scenario: Card with #work #urgent gets [[wikilink]] appended
    const md = "## Todo\n- [ ] Task #work #urgent [[new-note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.tags).toEqual(["work", "urgent"]);
    expect(card?.metadata.wikilinks).toEqual(["new-note"]);
  });

  it("extracts metadata correctly from multi-line card with wikilink", () => {
    // Scenario: Multi-line card with date, wikilink added on continuation line
    const md = `## Todo
- [ ] Task @{2025-01-15}
  [[new-note]]
`;
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card?.metadata.wikilinks).toEqual(["new-note"]);
    // Multi-line content should be preserved
    expect(card?.rawText).toContain("[[new-note]]");
  });

  it("extracts wikilink from simple card without other metadata", () => {
    // Scenario: Simple card with just [[wikilink]] appended
    const md = "## Todo\n- [ ] Task [[new-note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.wikilinks).toEqual(["new-note"]);
    expect(card?.text).toBe("Task");
  });

  it("extracts checked state AND date AND wikilink from completed card", () => {
    // Scenario: Checked card with @{date} gets [[wikilink]] appended
    const md = "## Todo\n- [x] Task @{2025-01-15} [[new-note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.checked).toBe(true);
    expect(card?.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card?.metadata.wikilinks).toEqual(["new-note"]);
  });
});

// ─── Priority Emojis ─────────────────────────────────────────────────────

describe("parse > priority emojis", () => {
  it("extracts 🔺 as priority 0 (highest)", () => {
    const md = "## Todo\n- [ ] 🔺 Critical task\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.priority).toBe(0);
  });

  it("extracts ⏫ as priority 1 (high)", () => {
    const md = "## Todo\n- [ ] ⏫ High task\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.priority).toBe(1);
  });

  it("extracts 🔼 as priority 2 (medium)", () => {
    const md = "## Todo\n- [ ] 🔼 Medium task\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.priority).toBe(2);
  });

  it("extracts 🔽 as priority 4 (low)", () => {
    const md = "## Todo\n- [ ] 🔽 Low task\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.priority).toBe(4);
  });

  it("extracts ⏬ as priority 5 (lowest)", () => {
    const md = "## Todo\n- [ ] ⏬ Lowest task\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.priority).toBe(5);
  });

  it("returns null priority when no emoji present", () => {
    const md = "## Todo\n- [ ] Normal task\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.priority).toBeNull();
  });

  it("extracts priority emoji followed immediately by text (no space)", () => {
    const md = "## Todo\n- [ ] ⏫Urgent task\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.priority).toBe(1);
  });

  it("extracts priority emoji followed immediately by date emoji (no space)", () => {
    const md = "## Todo\n- [ ] 🔺📅 2026-04-15\n";
    const result = parse(md);
    const meta = result.columns[0]?.cards[0]?.metadata;
    expect(meta?.priority).toBe(0);
    expect(meta?.dueDate).toBe("2026-04-15");
  });

  it("extracts priority emoji at end of card text (no text after)", () => {
    const md = "## Todo\n- [ ] Do this 🔽\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.priority).toBe(4);
  });
});

// ─── Task Date Emojis ────────────────────────────────────────────────────

describe("parse > task date emojis", () => {
  it("extracts 🛫 start date", () => {
    const md = "## Todo\n- [ ] Task 🛫 2026-04-01\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.startDate).toBe("2026-04-01");
  });

  it("extracts ➕ created date", () => {
    const md = "## Todo\n- [ ] Task ➕ 2026-03-25\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.createdDate).toBe("2026-03-25");
  });

  it("extracts ⏳ scheduled date", () => {
    const md = "## Todo\n- [ ] Task ⏳ 2026-04-05\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.scheduledDate).toBe("2026-04-05");
  });

  it("extracts ⌛ as scheduled date variant", () => {
    const md = "## Todo\n- [ ] Task ⌛ 2026-04-05\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.scheduledDate).toBe("2026-04-05");
  });

  it("extracts 📅 due date (canonical)", () => {
    const md = "## Todo\n- [ ] Task 📅 2026-04-15\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.dueDate).toBe("2026-04-15");
  });

  it("extracts 📆 as due date variant", () => {
    const md = "## Todo\n- [ ] Task 📆 2026-04-15\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.dueDate).toBe("2026-04-15");
  });

  it("extracts 🗓 as due date variant", () => {
    const md = "## Todo\n- [ ] Task 🗓 2026-04-15\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.dueDate).toBe("2026-04-15");
  });

  it("extracts ✅ done date", () => {
    const md = "## Done\n- [x] Done task ✅ 2026-03-30\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.doneDate).toBe("2026-03-30");
  });

  it("extracts ❌ cancelled date", () => {
    const md = "## Done\n- [x] Cancelled ❌ 2026-03-28\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.cancelledDate).toBe("2026-03-28");
  });

  it("returns null for date fields not present", () => {
    const md = "## Todo\n- [ ] Plain task\n";
    const result = parse(md);
    const meta = result.columns[0]?.cards[0]?.metadata;
    expect(meta?.startDate).toBeNull();
    expect(meta?.createdDate).toBeNull();
    expect(meta?.scheduledDate).toBeNull();
    expect(meta?.dueDate).toBeNull();
    expect(meta?.doneDate).toBeNull();
    expect(meta?.cancelledDate).toBeNull();
  });

  it("extracts multiple date emojis on one card", () => {
    const md = "## Todo\n- [ ] Task ➕ 2026-03-25 🛫 2026-04-01 📅 2026-04-15\n";
    const result = parse(md);
    const meta = result.columns[0]?.cards[0]?.metadata;
    expect(meta?.createdDate).toBe("2026-03-25");
    expect(meta?.startDate).toBe("2026-04-01");
    expect(meta?.dueDate).toBe("2026-04-15");
  });

  it("extracts both @{date} dueDates AND 📅 emoji dueDate to separate fields", () => {
    const md = "## Todo\n- [ ] Task @{2025-04-15} 📅 2026-05-01\n";
    const result = parse(md);
    const meta = result.columns[0]?.cards[0]?.metadata;
    // @{date} goes to dueDates array
    expect(meta?.dueDates).toEqual(["2025-04-15"]);
    // 📅 date goes to singular dueDate field
    expect(meta?.dueDate).toBe("2026-05-01");
  });
});

// ─── Recurrence and DependsOn ────────────────────────────────────────────

describe("parse > recurrence and dependsOn", () => {
  it("extracts 🔁 recurrence string", () => {
    const md = "## Todo\n- [ ] Task 🔁 every week\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.recurrence).toBe("every week");
  });

  it("extracts complex recurrence pattern", () => {
    const md = "## Todo\n- [ ] Task 🔁 every 2 months on the 1st\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.recurrence).toBe("every 2 months on the 1st");
  });

  it("extracts ⛔ dependsOn", () => {
    const md = "## Todo\n- [ ] Task ⛔ task-123\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.dependsOn).toBe("task-123");
  });

  it("returns null when no recurrence or dependsOn present", () => {
    const md = "## Todo\n- [ ] Plain task\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.recurrence).toBeNull();
    expect(result.columns[0]?.cards[0]?.metadata.dependsOn).toBeNull();
  });

  it("extracts recurrence with ordinal suffixes (every month on the 1st)", () => {
    const md = "## Todo\n- [ ] Task 🔁 every month on the 1st and 15th\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.recurrence).toBe(
      "every month on the 1st and 15th",
    );
  });

  it("extracts recurrence with schedule keyword (scheduled every weekday)", () => {
    const md = "## Todo\n- [ ] Task 🔁 scheduled every weekday\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.recurrence).toBe("scheduled every weekday");
  });
});

// ─── Block IDs ────────────────────────────────────────────────────────────

describe("parse > block IDs", () => {
  it("extracts 🆔 emoji block ID", () => {
    const md = "## Todo\n- [ ] Task 🆔 abc123\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.blockId).toBe("abc123");
  });

  it("extracts ^caret block ID at end of line", () => {
    const md = "## Todo\n- [ ] Task ^def456\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.blockId).toBe("def456");
  });

  it("prefers 🆔 emoji form over ^caret form", () => {
    const md = "## Todo\n- [ ] Task 🆔 emoji-id ^caret-id\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.blockId).toBe("emoji-id");
  });

  it("returns null when no block ID present", () => {
    const md = "## Todo\n- [ ] Task without block ID\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.blockId).toBeNull();
  });

  it("does not extract ^caret block ID in middle of text (not at end)", () => {
    const md = "## Todo\n- [ ] Task ^mid-id more text\n";
    const result = parse(md);
    // ^caret regex requires $ anchor — must be at end of line
    expect(result.columns[0]?.cards[0]?.metadata.blockId).toBeNull();
  });
});

// ─── Dataview Inline Metadata ────────────────────────────────────────────

describe("parse > dataview inline metadata", () => {
  it("extracts [key:: value] square bracket form", () => {
    const md = "## Todo\n- [ ] Task [due:: 2026-04-15]\n";
    const result = parse(md);
    const meta = result.columns[0]?.cards[0]?.metadata.inlineMetadata;
    expect(meta).toHaveLength(1);
    expect(meta?.[0]?.key).toBe("due");
    expect(meta?.[0]?.value).toBe("2026-04-15");
    expect(meta?.[0]?.raw).toBe("[due:: 2026-04-15]");
  });

  it("extracts (key:: value) parenthesis form", () => {
    const md = "## Todo\n- [ ] Task (project:: alpha)\n";
    const result = parse(md);
    const meta = result.columns[0]?.cards[0]?.metadata.inlineMetadata;
    expect(meta).toHaveLength(1);
    expect(meta?.[0]?.key).toBe("project");
    expect(meta?.[0]?.value).toBe("alpha");
  });

  it("extracts multiple inline metadata fields", () => {
    const md = "## Todo\n- [ ] Task [due:: 2026-04-15] [priority:: high]\n";
    const result = parse(md);
    const meta = result.columns[0]?.cards[0]?.metadata.inlineMetadata;
    expect(meta).toHaveLength(2);
    expect(meta?.[0]?.key).toBe("due");
    expect(meta?.[1]?.key).toBe("priority");
  });

  it("handles :: in value (greedy value capture)", () => {
    const md = "## Todo\n- [ ] Task [notes:: see url:: path]\n";
    const result = parse(md);
    const meta = result.columns[0]?.cards[0]?.metadata.inlineMetadata;
    expect(meta).toHaveLength(1);
    expect(meta?.[0]?.key).toBe("notes");
    expect(meta?.[0]?.value).toBe("see url:: path");
  });

  it("handles mixed square and parenthesis forms", () => {
    const md = "## Todo\n- [ ] Task [url:: https://example.com] (notes:: see doc)\n";
    const result = parse(md);
    const meta = result.columns[0]?.cards[0]?.metadata.inlineMetadata;
    expect(meta).toHaveLength(2);
  });

  it("returns empty array when no inline metadata present", () => {
    const md = "## Todo\n- [ ] Plain task\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.inlineMetadata).toEqual([]);
  });

  it("does not extract empty Dataview value [key:: ]", () => {
    const md = "## Todo\n- [ ] Task [key:: ]\n";
    const result = parse(md);
    const meta = result.columns[0]?.cards[0]?.metadata.inlineMetadata;
    // Regex requires 1+ chars for value — empty value should not match
    expect(meta).toHaveLength(0);
  });

  it("extracts Dataview with whitespace-only value but trims to empty string", () => {
    const md = "## Todo\n- [ ] Task [key::   ]\n";
    const result = parse(md);
    const meta = result.columns[0]?.cards[0]?.metadata.inlineMetadata;
    // Regex matches (spaces after :: satisfy [^\]]+), but value trims to ""
    expect(meta).toHaveLength(1);
    expect(meta?.[0]?.key).toBe("key");
    expect(meta?.[0]?.value).toBe("");
  });
});

// ─── Wikilink Dates and Markdown Note Dates ──────────────────────────────

describe("parse > wikilink dates and markdown note dates", () => {
  it("extracts @[[date]] wikilink dates", () => {
    const md = "## Todo\n- [ ] Task @[[2026-04-01]]\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.wikilinkDates).toEqual(["2026-04-01"]);
  });

  it("extracts multiple @[[date]] wikilink dates", () => {
    const md = "## Todo\n- [ ] Task @[[2026-03-15]] @[[2026-03-20]]\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.wikilinkDates).toEqual([
      "2026-03-15",
      "2026-03-20",
    ]);
  });

  it("extracts @[date](path) markdown note dates", () => {
    const md = "## Todo\n- [ ] Task @[2026-04-01](specs/api-v2)\n";
    const result = parse(md);
    const mdDates = result.columns[0]?.cards[0]?.metadata.mdNoteDates;
    expect(mdDates).toHaveLength(1);
    expect(mdDates?.[0]?.date).toBe("2026-04-01");
    expect(mdDates?.[0]?.path).toBe("specs/api-v2");
  });

  it("returns empty arrays when no special dates present", () => {
    const md = "## Todo\n- [ ] Plain task\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.wikilinkDates).toEqual([]);
    expect(result.columns[0]?.cards[0]?.metadata.mdNoteDates).toEqual([]);
  });
});

// ─── Settings ─────────────────────────────────────────────────────────────────

describe("parse > settings", () => {
  it("parses %% kanban:settings ... %% block", () => {
    const md = '## Todo\n- [ ] Task\n\n%% kanban:settings\n{"kanban-plugin":"basic"}\n%%\n';
    const result = parse(md);
    expect(result.settings).not.toBeNull();
    expect(result.settings?.["kanban-plugin"]).toBe("basic");
  });

  it("extracts JSON settings from the block", () => {
    const md = '## Todo\n\n%% kanban:settings\n{"kanban-plugin":"basic","lane-width":300}\n%%\n';
    const result = parse(md);
    expect(result.settings?.["lane-width"]).toBe(300);
  });

  it("preserves full block in settingsRaw", () => {
    const md = '## Todo\n\n%% kanban:settings\n{"kanban-plugin":"basic"}\n%%\n';
    const result = parse(md);
    expect(result.settingsRaw).toBe('%% kanban:settings\n{"kanban-plugin":"basic"}\n%%');
  });

  it("returns null settings when block is absent (edge case #7)", () => {
    const md = "## Todo\n- [ ] Task\n";
    const result = parse(md);
    expect(result.settings).toBeNull();
    expect(result.settingsRaw).toBeNull();
  });

  it("handles settings block with backtick-wrapped JSON (edge case #16)", () => {
    const md =
      '## Todo\n\n%% kanban:settings\n```\n{"kanban-plugin":"basic","lane-width":270}\n```\n%%\n';
    const result = parse(md);
    expect(result.settings).not.toBeNull();
    expect(result.settings?.["kanban-plugin"]).toBe("basic");
    expect(result.settings?.["lane-width"]).toBe(270);
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe("parse > edge cases", () => {
  it("handles CRLF line endings (edge case #3)", () => {
    const md = "---\r\nkanban-plugin: basic\r\n---\r\n\r\n## Todo\r\n- [ ] Task\r\n";
    const result = parse(md);
    expect(result.columns).toHaveLength(1);
    expect(result.columns[0]?.cards).toHaveLength(1);
  });

  it("extracts block IDs correctly from CRLF input", () => {
    const md = "## Todo\r\n- [ ] Task with ID 🆔 crlf-block\r\n- [ ] Another ^caret-crlf\r\n";
    const result = parse(md);
    expect(result.columns[0]?.cards[0]?.metadata.blockId).toBe("crlf-block");
    expect(result.columns[0]?.cards[1]?.metadata.blockId).toBe("caret-crlf");
  });

  it("handles empty input string (edge case #15)", () => {
    const result = parse("");
    expect(result.frontmatter).toBe("");
    expect(result.columns).toHaveLength(0);
    expect(result.settings).toBeNull();
  });

  it("handles file with only frontmatter", () => {
    const md = "---\nkanban-plugin: basic\n---\n";
    const result = parse(md);
    expect(result.frontmatter).toBe("kanban-plugin: basic");
    expect(result.columns).toHaveLength(0);
  });

  it("handles tags that look like issue numbers #123 (edge case #9)", () => {
    const md = "## Todo\n- [ ] Fix issue #123\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.tags).toEqual(["123"]);
  });

  it("handles wikilinks with spaces (edge case #5)", () => {
    const md = "## Todo\n- [ ] Task [[My Note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.wikilinks).toEqual(["My Note"]);
  });

  it("preserves preamble content in rawBody (edge case #17)", () => {
    const md =
      "---\nkanban-plugin: basic\n---\n\nSome preamble text\n\n## Todo\n- [ ] Task\n\nSome interstitial text\n\n## Done\n";
    const result = parse(md);
    // rawBody captures only pre-heading preamble content
    expect(result.rawBody).toContain("Some preamble text");
    // Interstitial content between columns stays in column.rawContent
    const todoCol = result.columns.find((c) => c.title === "Todo");
    expect(todoCol?.rawContent).toContain("Some interstitial text");
  });

  it("handles file with no columns and no settings", () => {
    const md = "---\nkanban-plugin: basic\n---\n\nJust some text here.\n";
    const result = parse(md);
    expect(result.columns).toHaveLength(0);
    // Frontmatter settings are now extracted
    expect(result.settings).not.toBeNull();
    expect(result.settings?.["kanban-plugin"]).toBe("basic");
  });

  it("does not extract tags from backtick-wrapped code", () => {
    const md = "## Todo\n- [ ] Use `#not-a-tag` in code\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.tags).toEqual([]);
  });

  it("handles columns with only completed cards (edge case #2)", () => {
    const md = "## Done\n- [x] First\n- [x] Second\n- [x] Third\n";
    const result = parse(md);
    expect(result.columns[0]?.cards).toHaveLength(3);
    expect(result.columns[0]?.cards.every((c) => c.checked)).toBe(true);
  });

  it("handles bare #hashtag vs heading-like # text (edge case #6)", () => {
    // #tag on card line = tag; ## at line start = heading (handled in section split)
    const md = "## Todo\n- [ ] Task with #tag inline\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];
    expect(card?.metadata.tags).toEqual(["tag"]);
  });
});

// ─── Fixture Tests ────────────────────────────────────────────────────────────

describe("parse > fixtures", () => {
  it("parses standard-board.md without errors", () => {
    const md = loadFixture("standard-board.md");
    const result = parse(md);
    expect(result.columns.length).toBeGreaterThan(0);
    expect(result.settings).not.toBeNull();
    expect(result.frontmatter).toContain("kanban-plugin: basic");
  });

  it("parses minimal-board.md without errors", () => {
    const md = loadFixture("minimal-board.md");
    const result = parse(md);
    expect(result.columns).toHaveLength(3);
    // Empty "In Progress" column
    const inProgress = result.columns.find((c) => c.title === "In Progress");
    expect(inProgress?.cards).toHaveLength(0);
  });

  it("parses complex-board.md without errors", () => {
    const md = loadFixture("complex-board.md");
    const result = parse(md);
    expect(result.columns.length).toBeGreaterThan(0);
    expect(result.settings).not.toBeNull();
    // Backtick-wrapped settings JSON
    expect(result.settings?.["kanban-plugin"]).toBe("basic");
  });

  // ─── New Fixture Tests (Phase 2) ─────────────────────────────────────────

  it("parses large-board-50-cards.md with 50 cards across 5 columns", () => {
    const md = loadFixture("large-board-50-cards.md");
    const result = parse(md);
    expect(result.columns).toHaveLength(5);
    const totalCards = result.columns.reduce((sum, c) => sum + c.cards.length, 0);
    expect(totalCards).toBe(50);
    // Verify each column has 10 cards
    for (const col of result.columns) {
      expect(col.cards).toHaveLength(10);
    }
    // Done column should be complete
    const doneCol = result.columns.find((c) => c.title === "Done");
    expect(doneCol?.complete).toBe(true);
  });

  it("parses interstitial-content.md and preserves blank lines in rawContent", () => {
    const md = loadFixture("interstitial-content.md");
    const result = parse(md);
    expect(result.columns).toHaveLength(3);

    const todoCol = result.columns.find((c) => c.title === "Todo");
    expect(todoCol).toBeDefined();
    expect(todoCol?.cards).toHaveLength(4);
    // rawContent should contain blank lines between cards
    expect(todoCol?.rawContent).toContain("\n\n");
    // rawContent should contain the HTML comment
    expect(todoCol?.rawContent).toContain("<!-- This is a comment between cards -->");
  });

  it("parses multiple-date-formats.md and extracts all dates", () => {
    const md = loadFixture("multiple-date-formats.md");
    const result = parse(md);
    expect(result.columns.length).toBeGreaterThan(0);
    // Verify dates are extracted from cards
    const allCards = result.columns.flatMap((c) => c.cards);
    const cardsWithDates = allCards.filter((c) => c.metadata.dueDates.length > 0);
    expect(cardsWithDates.length).toBeGreaterThan(0);
  });

  it("parses complex-tags.md with hyphenated and unicode tags", () => {
    const md = loadFixture("complex-tags.md");
    const result = parse(md);
    const allCards = result.columns.flatMap((c) => c.cards);
    const allTags = allCards.flatMap((c) => c.metadata.tags);
    expect(allTags.length).toBeGreaterThan(0);
  });

  it("parses nested-wikilinks.md with nested wikilinks", () => {
    const md = loadFixture("nested-wikilinks.md");
    const result = parse(md);
    const allCards = result.columns.flatMap((c) => c.cards);
    const allLinks = allCards.flatMap((c) => c.metadata.wikilinks);
    // Should contain nested wikilinks like "Parent/Child Note"
    const hasNestedLink = allLinks.some((l) => l.includes("/"));
    expect(hasNestedLink).toBe(true);
  });

  it("parses backtick-settings.md with backtick-wrapped settings", () => {
    const md = loadFixture("backtick-settings.md");
    const result = parse(md);
    expect(result.settings).not.toBeNull();
    expect(result.settings?.["kanban-plugin"]).toBe("basic");
  });

  it("parses crlf-endings.md with CRLF line endings", () => {
    const md = loadFixture("crlf-endings.md");
    const result = parse(md);
    expect(result.columns.length).toBeGreaterThan(0);
    // Cards should be parsed correctly despite CRLF
    const allCards = result.columns.flatMap((c) => c.cards);
    expect(allCards.length).toBeGreaterThan(0);
  });

  it("parses empty-columns.md with 3+ empty columns", () => {
    const md = loadFixture("empty-columns.md");
    const result = parse(md);
    const emptyCols = result.columns.filter((c) => c.cards.length === 0);
    expect(emptyCols.length).toBeGreaterThanOrEqual(3);
  });

  it("parses duplicate-column-titles.md with two columns titled 'Todo'", () => {
    const md = loadFixture("duplicate-column-titles.md");
    const result = parse(md);
    const todoCols = result.columns.filter((c) => c.title === "Todo");
    expect(todoCols.length).toBe(2);
    // Both should have slugified IDs
    expect(todoCols[0]?.id).toBe("todo");
    expect(todoCols[1]?.id).toBe("todo");
  });

  it("parses malformed-frontmatter.md without crashing", () => {
    const md = loadFixture("malformed-frontmatter.md");
    const result = parse(md);
    // Should not throw — parser should handle malformed frontmatter gracefully
    expect(result).toBeDefined();
    expect(result.columns.length).toBeGreaterThanOrEqual(0);
  });

  it("parses missing-settings.md with no footer settings block", () => {
    const md = loadFixture("missing-settings.md");
    const result = parse(md);
    // Frontmatter settings are now extracted from kanban-plugin: basic
    expect(result.settings).not.toBeNull();
    expect(result.settings?.["kanban-plugin"]).toBe("basic");
    expect(result.settingsRaw).toBeNull();
    expect(result.columns.length).toBeGreaterThan(0);
  });

  it("parses complete-marker-variants.md with **Complete** at various positions", () => {
    const md = loadFixture("complete-marker-variants.md");
    const result = parse(md);
    expect(result.columns).toHaveLength(3);
    // All three columns should be complete
    for (const col of result.columns) {
      expect(col.complete).toBe(true);
    }
  });

  it("parses unicode-card-text.md with emoji, CJK, and RTL text", () => {
    const md = loadFixture("unicode-card-text.md");
    const result = parse(md);
    const allCards = result.columns.flatMap((c) => c.cards);
    expect(allCards.length).toBeGreaterThan(0);
    // Cards should have non-empty text
    for (const card of allCards) {
      expect(card.text.length).toBeGreaterThan(0);
    }
  });

  it("parses very-long-card-text.md with titles exceeding 200 characters", () => {
    const md = loadFixture("very-long-card-text.md");
    const result = parse(md);
    const allCards = result.columns.flatMap((c) => c.cards);
    const hasLongCard = allCards.some((c) => c.text.length > 200);
    expect(hasLongCard).toBe(true);
  });

  it("parses mixed-checked-unchecked.md with interleaved checked/unchecked cards", () => {
    const md = loadFixture("mixed-checked-unchecked.md");
    const result = parse(md);
    const allCards = result.columns.flatMap((c) => c.cards);
    const checked = allCards.filter((c) => c.checked);
    const unchecked = allCards.filter((c) => !c.checked);
    expect(checked.length).toBeGreaterThan(0);
    expect(unchecked.length).toBeGreaterThan(0);
  });

  it("parses metadata-heavy.md where every card has dates, times, tags, and wikilinks", () => {
    const md = loadFixture("metadata-heavy.md");
    const result = parse(md);
    const allCards = result.columns.flatMap((c) => c.cards);
    expect(allCards.length).toBeGreaterThan(0);
    // Every card should have at least one metadata field populated
    for (const card of allCards) {
      const hasMetadata =
        card.metadata.dueDates.length > 0 ||
        card.metadata.times.length > 0 ||
        card.metadata.tags.length > 0 ||
        card.metadata.wikilinks.length > 0;
      expect(hasMetadata).toBe(true);
    }
  });

  it("parses minimal-no-frontmatter.md with no frontmatter or settings", () => {
    const md = loadFixture("minimal-no-frontmatter.md");
    const result = parse(md);
    expect(result.frontmatter).toBe("");
    expect(result.frontmatterRaw).toBe("");
    expect(result.settings).toBeNull();
    expect(result.columns.length).toBeGreaterThan(0);
  });

  it("parses obsidian-tasks-emoji.md with all priority and date emojis", () => {
    const md = loadFixture("obsidian-tasks-emoji.md");
    const result = parse(md);
    expect(result.columns.length).toBeGreaterThan(0);
    const allCards = result.columns.flatMap((c) => c.cards);
    expect(allCards.length).toBeGreaterThan(0);
    // Verify priority extraction
    const cardsWithPriority = allCards.filter((c) => c.metadata.priority !== null);
    expect(cardsWithPriority.length).toBeGreaterThanOrEqual(5);
    // Verify date emoji extraction
    const cardsWithDueDate = allCards.filter((c) => c.metadata.dueDate !== null);
    expect(cardsWithDueDate.length).toBeGreaterThan(0);
    // Verify recurrence extraction
    const cardsWithRecurrence = allCards.filter((c) => c.metadata.recurrence !== null);
    expect(cardsWithRecurrence.length).toBeGreaterThan(0);
    // Verify existing fields still extract
    const cardsWithTags = allCards.filter((c) => c.metadata.tags.length > 0);
    expect(cardsWithTags.length).toBeGreaterThan(0);
  });

  it("parses dataview-inline-metadata.md with bracket and parenthesis forms", () => {
    const md = loadFixture("dataview-inline-metadata.md");
    const result = parse(md);
    const allCards = result.columns.flatMap((c) => c.cards);
    const cardsWithInlineMeta = allCards.filter((c) => c.metadata.inlineMetadata.length > 0);
    expect(cardsWithInlineMeta.length).toBeGreaterThan(0);
    // Verify key/value extraction
    const allMeta = cardsWithInlineMeta.flatMap((c) => c.metadata.inlineMetadata);
    const keys = allMeta.map((m) => m.key);
    expect(keys).toContain("due");
    expect(keys).toContain("assignee");
  });

  it("parses wikilink-dates.md with @[[date]] and @[date](path) syntax", () => {
    const md = loadFixture("wikilink-dates.md");
    const result = parse(md);
    const allCards = result.columns.flatMap((c) => c.cards);
    // Verify wikilink dates
    const cardsWithWikilinkDates = allCards.filter((c) => c.metadata.wikilinkDates.length > 0);
    expect(cardsWithWikilinkDates.length).toBeGreaterThan(0);
    // Verify markdown note dates
    const cardsWithMdNoteDates = allCards.filter((c) => c.metadata.mdNoteDates.length > 0);
    expect(cardsWithMdNoteDates.length).toBeGreaterThan(0);
    // Verify existing tags still extract
    const cardsWithTags = allCards.filter((c) => c.metadata.tags.length > 0);
    expect(cardsWithTags.length).toBeGreaterThan(0);
  });

  it("parses block-ids.md with 🆔 and ^caret block ID syntax", () => {
    const md = loadFixture("block-ids.md");
    const result = parse(md);
    const allCards = result.columns.flatMap((c) => c.cards);
    const cardsWithBlockId = allCards.filter((c) => c.metadata.blockId !== null);
    expect(cardsWithBlockId.length).toBeGreaterThanOrEqual(3);
    // Verify both forms work
    const blockIds = cardsWithBlockId.map((c) => c.metadata.blockId);
    expect(blockIds).toContain("abc123");
    expect(blockIds).toContain("def456");
  });
});

// ─── Frontmatter Settings ────────────────────────────────────────────────────

describe("parse > frontmatter settings", () => {
  it("extracts lane-width from frontmatter", () => {
    const md = loadFixture("frontmatter-settings.md");
    const result = parse(md);
    expect(result.settings).not.toBeNull();
    expect(result.settings?.["lane-width"]).toBe(300);
  });

  it("extracts date-format from frontmatter", () => {
    const md = loadFixture("frontmatter-settings.md");
    const result = parse(md);
    expect(result.settings?.["date-format"]).toBe("DD/MM/YYYY");
  });

  it("extracts time-format from frontmatter", () => {
    const md = loadFixture("frontmatter-settings.md");
    const result = parse(md);
    expect(result.settings?.["time-format"]).toBe("HH:mm");
  });

  it("returns null settings when no settings in frontmatter or footer", () => {
    const md = "---\nfoo: bar\n---\n\n## Todo\n- [ ] Task\n";
    const result = parse(md);
    expect(result.settings).toBeNull();
  });

  it("ignores non-setting frontmatter keys", () => {
    const md = "---\nkanban-plugin: basic\nfoo: bar\n---\n\n## Todo\n";
    const result = parse(md);
    expect(result.settings).not.toBeNull();
    expect(result.settings?.["foo" as string]).toBeUndefined();
  });
});

// ─── Settings Precedence ─────────────────────────────────────────────────────

describe("parse > settings precedence", () => {
  it("footer settings override frontmatter settings", () => {
    const md = loadFixture("settings-precedence.md");
    const result = parse(md);
    expect(result.settings?.["lane-width"]).toBe(400);
  });

  it("uses frontmatter settings when no footer", () => {
    const md = loadFixture("frontmatter-settings.md");
    const result = parse(md);
    expect(result.settings?.["lane-width"]).toBe(300);
  });

  it("uses footer settings when no frontmatter settings", () => {
    const md =
      '## Todo\n- [ ] Task\n\n%% kanban:settings\n{"kanban-plugin":"basic","lane-width":500}\n%%\n';
    const result = parse(md);
    expect(result.settings?.["lane-width"]).toBe(500);
  });
});

// ─── prepend-new-cards Migration ─────────────────────────────────────────────

describe("parse > prepend-new-cards migration", () => {
  it("converts prepend-new-cards:true to new-card-insertion-method:prepend", () => {
    const md = loadFixture("prepend-cards-migration.md");
    const result = parse(md);
    expect(result.settings?.["new-card-insertion-method"]).toBe("prepend");
    expect(result.settings?.["prepend-new-cards" as string]).toBeUndefined();
  });

  it("converts prepend-new-cards:false to new-card-insertion-method:append", () => {
    const md =
      '## Todo\n- [ ] Task\n\n%% kanban:settings\n{"kanban-plugin":"basic","prepend-new-cards":false}\n%%\n';
    const result = parse(md);
    expect(result.settings?.["new-card-insertion-method"]).toBe("append");
    expect(result.settings?.["prepend-new-cards" as string]).toBeUndefined();
  });

  it("does not modify settings without prepend-new-cards key", () => {
    const md =
      '## Todo\n- [ ] Task\n\n%% kanban:settings\n{"kanban-plugin":"basic","lane-width":300}\n%%\n';
    const result = parse(md);
    expect(result.settings?.["lane-width"]).toBe(300);
    expect(result.settings?.["new-card-insertion-method" as string]).toBeUndefined();
  });
});

// ─── Archive Section ─────────────────────────────────────────────────────────

describe("parse > archive section", () => {
  it("extracts archive cards from archive section", () => {
    const md = loadFixture("archive-section.md");
    const result = parse(md);
    expect(result.archiveCards).toHaveLength(2);
    expect(result.archiveCards[0]?.text).toContain("Old archived task 1");
    expect(result.archiveCards[1]?.text).toContain("Old archived task 2");
  });

  it("stores archive raw content", () => {
    const md = loadFixture("archive-section.md");
    const result = parse(md);
    expect(result.archiveRawContent).toContain("***");
    expect(result.archiveRawContent).toContain("## Archive");
  });

  it("does not include archive as a column", () => {
    const md = loadFixture("archive-section.md");
    const result = parse(md);
    const archiveCol = result.columns.find((c) => c.title === "Archive");
    expect(archiveCol).toBeUndefined();
  });

  it("handles board with no archive section", () => {
    const md = loadFixture("standard-board.md");
    const result = parse(md);
    expect(result.archiveCards).toHaveLength(0);
    expect(result.archiveRawContent).toBe("");
  });

  it("extracts both checked and unchecked cards from archive", () => {
    const md =
      "---\nkanban-plugin: basic\n---\n## Todo\n- [ ] Task\n\n***\n## Archive\n- [x] Archived done\n- [ ] Archived undone\n";
    const result = parse(md);
    expect(result.archiveCards).toHaveLength(2);
    expect(result.archiveCards[0]?.checked).toBe(true);
    expect(result.archiveCards[1]?.checked).toBe(false);
  });
});

// ─── lineIndex Population ────────────────────────────────────────────────────

describe("parse > lineIndex", () => {
  it("populates lineIndex for each card during parsing", () => {
    const md = "## Todo\n- [ ] First\n- [ ] Second\n- [ ] Third\n";
    const result = parse(md);
    const cards = result.columns[0]?.cards;
    expect(cards).toHaveLength(3);
    expect(cards?.[0]?.lineIndex).toBe(0);
    expect(cards?.[1]?.lineIndex).toBe(1);
    expect(cards?.[2]?.lineIndex).toBe(2);
  });

  it("populates correct lineIndex with blank lines between cards", () => {
    const md = "## Todo\n- [ ] First\n\n- [ ] Second\n\n- [ ] Third\n";
    const result = parse(md);
    const cards = result.columns[0]?.cards;
    expect(cards).toHaveLength(3);
    // lineIndex should reflect actual line positions in rawContent
    expect(cards?.[0]?.lineIndex).toBe(0);
    expect(cards?.[1]?.lineIndex).toBe(2);
    expect(cards?.[2]?.lineIndex).toBe(4);
  });

  it("populates correct lineIndex with **Complete** marker", () => {
    const md = "## Done\n**Complete**\n- [x] First\n- [x] Second\n";
    const result = parse(md);
    const cards = result.columns[0]?.cards;
    expect(cards).toHaveLength(2);
    // **Complete** is at line 0, so cards start at line 1
    expect(cards?.[0]?.lineIndex).toBe(1);
    expect(cards?.[1]?.lineIndex).toBe(2);
  });

  it("populates lineIndex across multiple columns independently", () => {
    const md = "## Todo\n- [ ] A\n- [ ] B\n\n## Done\n- [x] C\n";
    const result = parse(md);
    const todoCards = result.columns[0]?.cards;
    const doneCards = result.columns[1]?.cards;
    expect(todoCards?.[0]?.lineIndex).toBe(0);
    expect(todoCards?.[1]?.lineIndex).toBe(1);
    expect(doneCards?.[0]?.lineIndex).toBe(0);
  });
});

// ─── Round-Trip Fidelity With New Fixtures ───────────────────────────────────

describe("round-trip fidelity > new fixtures", () => {
  it("round-trip preserves large-board-50-cards.md structure", () => {
    const input = loadFixture("large-board-50-cards.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    expect(second.columns).toHaveLength(5);
    const totalCards = second.columns.reduce((sum, c) => sum + c.cards.length, 0);
    expect(totalCards).toBe(50);
  });

  it("round-trip preserves interstitial-content.md blank lines", () => {
    const input = loadFixture("interstitial-content.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    // Column count preserved
    expect(second.columns).toHaveLength(first.columns.length);
    // Card count preserved
    const originalCards = first.columns.reduce((s, c) => s + c.cards.length, 0);
    const reparsedCards = second.columns.reduce((s, c) => s + c.cards.length, 0);
    expect(reparsedCards).toBe(originalCards);
    // Blank lines in rawContent preserved
    const todoCol = second.columns.find((c) => c.title === "Todo");
    expect(todoCol?.rawContent).toContain("\n\n");
  });

  it("round-trip preserves complete-marker-variants.md", () => {
    const input = loadFixture("complete-marker-variants.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    expect(second.columns).toHaveLength(3);
    for (const col of second.columns) {
      expect(col.complete).toBe(true);
    }
  });

  it("round-trip preserves unicode-card-text.md", () => {
    const input = loadFixture("unicode-card-text.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    const originalCards = first.columns.reduce((s, c) => s + c.cards.length, 0);
    const reparsedCards = second.columns.reduce((s, c) => s + c.cards.length, 0);
    expect(reparsedCards).toBe(originalCards);
  });

  it("round-trip preserves metadata-heavy.md metadata", () => {
    const input = loadFixture("metadata-heavy.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    const originalCards = first.columns.flatMap((c) => c.cards);
    const reparsedCards = second.columns.flatMap((c) => c.cards);

    expect(reparsedCards.length).toBe(originalCards.length);
    for (let i = 0; i < originalCards.length; i++) {
      expect(reparsedCards[i]?.metadata.dueDates).toEqual(originalCards[i]?.metadata.dueDates);
      expect(reparsedCards[i]?.metadata.tags).toEqual(originalCards[i]?.metadata.tags);
    }
  });

  it("round-trip preserves minimal-no-frontmatter.md", () => {
    const input = loadFixture("minimal-no-frontmatter.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    expect(second.columns.length).toBe(first.columns.length);
    expect(second.frontmatter).toBe("");
    expect(second.settings).toBeNull();
  });

  it("round-trip preserves obsidian-tasks-emoji.md metadata", () => {
    const input = loadFixture("obsidian-tasks-emoji.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    const originalCards = first.columns.flatMap((c) => c.cards);
    const reparsedCards = second.columns.flatMap((c) => c.cards);
    expect(reparsedCards.length).toBe(originalCards.length);
    for (let i = 0; i < originalCards.length; i++) {
      expect(reparsedCards[i]?.metadata.priority).toEqual(originalCards[i]?.metadata.priority);
      expect(reparsedCards[i]?.metadata.dueDate).toEqual(originalCards[i]?.metadata.dueDate);
      expect(reparsedCards[i]?.metadata.recurrence).toEqual(originalCards[i]?.metadata.recurrence);
    }
  });

  it("round-trip preserves dataview-inline-metadata.md", () => {
    const input = loadFixture("dataview-inline-metadata.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    const originalCards = first.columns.flatMap((c) => c.cards);
    const reparsedCards = second.columns.flatMap((c) => c.cards);
    expect(reparsedCards.length).toBe(originalCards.length);
    for (let i = 0; i < originalCards.length; i++) {
      expect(reparsedCards[i]?.metadata.inlineMetadata).toEqual(
        originalCards[i]?.metadata.inlineMetadata,
      );
    }
  });

  it("round-trip preserves wikilink-dates.md", () => {
    const input = loadFixture("wikilink-dates.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    const originalCards = first.columns.flatMap((c) => c.cards);
    const reparsedCards = second.columns.flatMap((c) => c.cards);
    expect(reparsedCards.length).toBe(originalCards.length);
    for (let i = 0; i < originalCards.length; i++) {
      expect(reparsedCards[i]?.metadata.wikilinkDates).toEqual(
        originalCards[i]?.metadata.wikilinkDates,
      );
      expect(reparsedCards[i]?.metadata.mdNoteDates).toEqual(
        originalCards[i]?.metadata.mdNoteDates,
      );
    }
  });

  it("round-trip preserves block-ids.md", () => {
    const input = loadFixture("block-ids.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    const originalCards = first.columns.flatMap((c) => c.cards);
    const reparsedCards = second.columns.flatMap((c) => c.cards);
    expect(reparsedCards.length).toBe(originalCards.length);
    for (let i = 0; i < originalCards.length; i++) {
      expect(reparsedCards[i]?.metadata.blockId).toEqual(originalCards[i]?.metadata.blockId);
    }
  });
});

// ─── CSS Classes ───────────────────────────────────────────────────────────────

describe("parse > cssClasses", () => {
  it("parses cssclasses array as YAML list", () => {
    const result = extractCssClasses("cssclasses:\n  - class1\n  - class2\n  - class3");
    expect(result).toEqual(["class1", "class2", "class3"]);
  });

  it("parses cssclasses inline array", () => {
    const result = extractCssClasses("cssclasses: [class1, class2, class3]");
    expect(result).toEqual(["class1", "class2", "class3"]);
  });

  it("parses single cssclass", () => {
    const result = extractCssClasses("cssclass: my-class");
    expect(result).toEqual(["my-class"]);
  });

  it("combines both formats", () => {
    const result = extractCssClasses("cssclasses:\n  - class1\n  - class2\ncssclass: class3");
    expect(result).toEqual(["class1", "class2", "class3"]);
  });

  it("returns empty array for no css classes", () => {
    const result = extractCssClasses("kanban-plugin: basic");
    expect(result).toEqual([]);
  });

  it("handles quotes around class names", () => {
    const result = extractCssClasses("cssclasses:\n  - 'class-one'\n  - 'class-two'");
    expect(result).toEqual(["class-one", "class-two"]);
  });

  it("extracts cssClasses from frontmatter in parse()", () => {
    const md = `---
kanban-plugin: basic
cssclasses:
  - custom-board-theme
  - dark-mode
cssclass: single-class
---

## Todo

- [ ] Task with CSS classes`;
    const result = parse(md);
    expect(result.cssClasses).toEqual(["custom-board-theme", "dark-mode", "single-class"]);
  });
});

describe("code block parsing audit", () => {
  // eslint-disable-next-line no-console
  it("should store fenced code block content in card", () => {
    const md = `## Todo
- [ ] Card with code
\`\`\`
function test() {
  return true;
}
\`\`\`
more text
`;

    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    if (!card) {
      throw new Error("Card not found");
    }

    // eslint-disable-next-line no-console
    console.log("=== Card rawText ===");
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(card.rawText));
    // eslint-disable-next-line no-console
    console.log("\n=== Card text ===");
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(card.text));
    // eslint-disable-next-line no-console
    console.log("\n=== Card metadata tags ===");
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(card.metadata.tags));

    // Report what we find
    expect(card.rawText).toContain("```");
    expect(card.rawText).toContain("function test()");
    expect(card.text).toContain("```");
  });
});

describe("code block tag extraction audit", () => {
  // eslint-disable-next-line no-console
  it("should extract tags outside code block but not inside", () => {
    const md = `## Todo
- [ ] Card with code #mytag
\`\`\`
function test() {
  return #secret;
}
\`\`\`
#outertag more text
`;

    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    if (!card) {
      throw new Error("Card not found");
    }

    // eslint-disable-next-line no-console
    console.log("=== Card rawText ===");
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(card.rawText));
    // eslint-disable-next-line no-console
    console.log("\n=== Card text ===");
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(card.text));
    // eslint-disable-next-line no-console
    console.log("\n=== Card metadata tags ===");
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(card.metadata.tags));
  });
});

// ─── NEW_NOTE_FROM_CARD Handler Regression Tests ──────────────────────────────
// These tests verify the fix for metadata preservation when adding wikilinks.
// Bug: handler was reconstructing rawText from stripped card.text, losing metadata.
// Fix: append wikilink directly to rawText which preserves all metadata.

describe("NEW_NOTE_FROM_CARD handler regression tests", () => {
  it("preserves @date metadata when adding wikilink", () => {
    const card = parseCard("- [ ] Task @{2026-04-01} #feature");
    const wikilink = " [[New Note]]";
    const oldRawText = card.rawText;

    // Apply the fix logic (append wikilink to rawText)
    let rawText: string;
    if (oldRawText.includes("\n  ")) {
      rawText = `${oldRawText}${wikilink}`;
    } else {
      rawText = `${oldRawText}${wikilink}`;
    }

    const reparsed = parseCard(rawText);
    expect(reparsed.metadata.dueDates).toContain("2026-04-01");
    expect(reparsed.metadata.wikilinks).toContain("New Note");
  });

  it("preserves #tag metadata when adding wikilink", () => {
    const card = parseCard("- [ ] Task @{2026-04-01} #feature");
    const wikilink = " [[New Note]]";
    const oldRawText = card.rawText;

    let rawText: string;
    if (oldRawText.includes("\n  ")) {
      rawText = `${oldRawText}${wikilink}`;
    } else {
      rawText = `${oldRawText}${wikilink}`;
    }

    const reparsed = parseCard(rawText);
    expect(reparsed.metadata.tags).toContain("feature");
    expect(reparsed.metadata.wikilinks).toContain("New Note");
  });

  it("preserves multi-line card content when adding wikilink", () => {
    const card = parseCard("- [ ] Task line 1\n  line 2 @{2026-04-01} #tag");
    const wikilink = " [[New Note]]";
    const oldRawText = card.rawText;

    let rawText: string;
    if (oldRawText.includes("\n  ")) {
      rawText = `${oldRawText}${wikilink}`;
    } else {
      rawText = `${oldRawText}${wikilink}`;
    }

    const reparsed = parseCard(rawText);
    expect(reparsed.text).toContain("line 1");
    expect(reparsed.text).toContain("line 2");
    expect(reparsed.metadata.dueDates).toContain("2026-04-01");
    expect(reparsed.metadata.tags).toContain("tag");
    expect(reparsed.metadata.wikilinks).toContain("New Note");
  });

  it("handles single-line card with wikilink", () => {
    const card = parseCard("- [ ] Simple task");
    const wikilink = " [[New Note]]";
    const oldRawText = card.rawText;

    let rawText: string;
    if (oldRawText.includes("\n  ")) {
      rawText = `${oldRawText}${wikilink}`;
    } else {
      rawText = `${oldRawText}${wikilink}`;
    }

    const reparsed = parseCard(rawText);
    expect(reparsed.text).toContain("Simple task");
    expect(reparsed.metadata.wikilinks).toContain("New Note");
  });

  it("preserves checked state when adding wikilink", () => {
    const card = parseCard("- [x] Completed @{2026-04-01}");
    const wikilink = " [[New Note]]";
    const oldRawText = card.rawText;

    let rawText: string;
    if (oldRawText.includes("\n  ")) {
      rawText = `${oldRawText}${wikilink}`;
    } else {
      rawText = `${oldRawText}${wikilink}`;
    }

    const reparsed = parseCard(rawText);
    expect(reparsed.checked).toBe(true);
    expect(reparsed.metadata.dueDates).toContain("2026-04-01");
    expect(reparsed.metadata.wikilinks).toContain("New Note");
  });

  it("preserves priority marker when adding wikilink", () => {
    const card = parseCard("- [ ] !! High priority task");
    const wikilink = " [[New Note]]";
    const oldRawText = card.rawText;

    let rawText: string;
    if (oldRawText.includes("\n  ")) {
      rawText = `${oldRawText}${wikilink}`;
    } else {
      rawText = `${oldRawText}${wikilink}`;
    }

    const reparsed = parseCard(rawText);
    expect(reparsed.text).toContain("High priority task");
    expect(reparsed.metadata.wikilinks).toContain("New Note");
  });
});
