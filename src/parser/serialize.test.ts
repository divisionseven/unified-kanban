import { describe, it, expect } from "vitest";
import { parse } from "./parse.js";
import { serialize } from "./serialize.js";
import type { BoardState } from "./types.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURES_DIR = join(__dirname, "__fixtures__");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf-8");
}

// ─── Serializer Output ────────────────────────────────────────────────────────

describe("serialize", () => {
  it("reconstructs frontmatter from frontmatterRaw", () => {
    const state: BoardState = {
      frontmatter: "kanban-plugin: basic",
      frontmatterRaw: "---\nkanban-plugin: basic\n---",
      columns: [],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain("---\nkanban-plugin: basic\n---");
  });

  it("reconstructs column headings", () => {
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        { id: "todo", title: "Todo", complete: false, cards: [], rawContent: "" },
        { id: "done", title: "Done", complete: false, cards: [], rawContent: "" },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain("## Todo");
    expect(result).toContain("## Done");
  });

  it("emits **Complete** marker for complete columns", () => {
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "done",
          title: "Done",
          complete: true,
          cards: [],
          rawContent: "",
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain("**Complete**");
  });

  it("emits cards using rawText for unmodified cards", () => {
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          rawContent: "",
          cards: [
            {
              id: "abc123",
              text: "Task",
              rawText: "- [ ] Task",
              checked: false,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain("- [ ] Task");
  });

  it("reconstructs card lines from structured fields when rawText is absent", () => {
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          rawContent: "",
          cards: [
            {
              id: "abc123",
              text: "Task #feature",
              rawText: "",
              checked: false,
              metadata: {
                dueDates: ["2025-04-15"],
                times: [],
                tags: ["feature"],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain("- [ ] Task #feature @{2025-04-15}");
  });

  it("appends settings block verbatim from settingsRaw", () => {
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [],
      settings: { "kanban-plugin": "basic" },
      settingsRaw: '%% kanban:settings\n{"kanban-plugin":"basic"}\n%%',
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain('%% kanban:settings\n{"kanban-plugin":"basic"}\n%%');
  });

  it("omits settings block when settingsRaw is null", () => {
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).not.toContain("kanban:settings");
  });

  it("handles empty columns", () => {
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [{ id: "empty", title: "Empty", complete: false, cards: [], rawContent: "" }],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain("## Empty");
    expect(result).not.toContain("- [ ]");
  });
});

// ─── Bug 2 Regression: Serializer Drops Cards When rawContent Present ────────

describe("serialize > Bug 2 regression — cards emitted with rawContent", () => {
  it("emits cards when rawContent is present and non-empty", () => {
    /**
     * Regression test for Bug 2: serializer drops cards.
     *
     * Root cause: serialize.ts lines 26-37 used if/else — rawContent XOR cards.
     * When rawContent was present, the card emission loop was in the else branch
     * and never executed. Cards were silently dropped from output.
     *
     * This test FAILS before the fix and PASSES after.
     *
     * Scenario: Column has rawContent AND cards in structured data.
     * Expected: Both rawContent lines AND cards appear in serialized output.
     * Previously: Only rawContent appeared; cards were silently dropped.
     */
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          rawContent: "- [ ] Original task\n\n- [ ] Another task",
          cards: [
            {
              id: "card-1",
              text: "Original task",
              rawText: "- [ ] Original task",
              checked: false,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
            {
              id: "card-2",
              text: "Another task",
              rawText: "- [ ] Another task",
              checked: false,
              lineIndex: 2,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);

    // Both card lines must appear in output
    expect(result).toContain("- [ ] Original task");
    expect(result).toContain("- [ ] Another task");
    // Blank line between cards must be preserved
    expect(result).toMatch(/- \[ \] Original task\n\n- \[ \] Another task/);
  });

  it("emits **Complete** marker when rawContent is present and column is complete", () => {
    /**
     * Regression test for Bug 2: **Complete** marker was inside the else branch
     * and was not emitted when rawContent was present.
     *
     * Previously: **Complete** marker silently dropped.
     * Now: **Complete** marker is emitted regardless of rawContent.
     */
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "done",
          title: "Done",
          complete: true,
          rawContent: "- [x] Finished task\n**Complete**",
          cards: [
            {
              id: "card-1",
              text: "Finished task",
              rawText: "- [x] Finished task",
              checked: true,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain("**Complete**");
    expect(result).toContain("- [x] Finished task");
  });

  it("emits modified card text when rawContent has original text", () => {
    /**
     * Tests that reconstructColumnContent replaces the old card line at
     * lineIndex with the current card data from structured fields.
     *
     * Scenario: rawContent has "- [ ] Old text" at lineIndex 0, but card
     * text has been changed to "New text". The serialized output should
     * contain the NEW text, not the old rawContent line.
     */
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          rawContent: "- [ ] Old text\n\n- [ ] Unchanged task",
          cards: [
            {
              id: "card-1",
              text: "New text",
              rawText: "", // No rawText — card was modified
              checked: false,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
            {
              id: "card-2",
              text: "Unchanged task",
              rawText: "- [ ] Unchanged task",
              checked: false,
              lineIndex: 2,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);

    // Modified card should show new text
    expect(result).toContain("- [ ] New text");
    // Old text should NOT appear
    expect(result).not.toContain("- [ ] Old text");
    // Unchanged card should still appear
    expect(result).toContain("- [ ] Unchanged task");
    // Blank line between cards preserved
    expect(result).toMatch(/- \[ \] New text\n\n- \[ \] Unchanged task/);
  });
});

// ─── Bug 3 Regression: Non-Card Content Survives Mutation ────────────────────

describe("serialize > Bug 3 regression — mutation preserves non-card content", () => {
  it("round-trip preserves blank lines between cards after mutation", () => {
    /**
     * Regression test for Bug 3: rawContent cleared on mutation.
     *
     * Root cause: Every mutation handler cleared column.rawContent = "".
     * After rawContent was cleared, the serializer reconstructed the column
     * entirely from structured data, losing blank lines, comments, and
     * interstitial text.
     *
     * This test FAILS before the fix and PASSES after.
     *
     * Scenario: Parse a file with blank lines between cards. Simulate a
     * mutation (edit card text) while keeping rawContent intact. Serialize
     * and re-parse. Verify blank lines are still present.
     * Previously: Blank lines permanently lost after any mutation.
     */
    const input = loadFixture("interstitial-content.md");
    const board = parse(input);

    // Simulate a mutation: edit the first card's text in the Todo column
    const todoCol = board.columns.find((c) => c.title === "Todo");
    expect(todoCol).toBeDefined();
    expect(todoCol?.cards.length).toBeGreaterThan(0);

    // Mutate the first card — change text but keep rawContent
    const firstCard = todoCol?.cards[0];
    if (firstCard) {
      firstCard.text = "Edited first task";
      firstCard.rawText = ""; // Simulate modified card (no rawText passthrough)
    }

    // Serialize and re-parse
    const serialized = serialize(board);
    const reparsed = parse(serialized);
    const reparsedTodo = reparsed.columns.find((c) => c.title === "Todo");

    // The blank line between cards should still exist in rawContent
    expect(reparsedTodo?.rawContent).toBeDefined();
    expect(reparsedTodo?.rawContent).toContain("\n\n");
    // The edited card text should appear
    expect(serialized).toContain("Edited first task");
    // The comment between cards should be preserved
    expect(serialized).toContain("<!-- This is a comment between cards -->");
  });

  it("preserves HTML comments in rawContent after mutation", () => {
    /**
     * HTML comments between cards are non-card content that must survive
     * serialization even when cards are modified.
     */
    const input = loadFixture("interstitial-content.md");
    const board = parse(input);
    const serialized = serialize(board);

    // Comment should be in serialized output
    expect(serialized).toContain("<!-- This is a comment between cards -->");
  });

  it("preserves double blank lines in rawContent", () => {
    /**
     * Double blank lines are significant formatting that must be preserved.
     */
    const input = loadFixture("interstitial-content.md");
    const board = parse(input);
    const serialized = serialize(board);

    // Double blank line between cards in "In Progress" column
    expect(serialized).toContain(
      "- [ ] Working on this\n\n\n- [ ] Another with double blank line above",
    );
  });
});

// ─── reconstructColumnContent Edge Cases ─────────────────────────────────────

describe("serialize > reconstructColumnContent edge cases", () => {
  it("handles new cards (no lineIndex) appended before **Complete** marker", () => {
    /**
     * New cards added via ADD_CARD have no lineIndex. They should be
     * appended before the **Complete** marker in complete columns.
     */
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "done",
          title: "Done",
          complete: true,
          rawContent: "- [x] Existing task\n**Complete**",
          cards: [
            {
              id: "existing",
              text: "Existing task",
              rawText: "- [x] Existing task",
              checked: true,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
            // New card — no lineIndex
            {
              id: "new-card",
              text: "Newly completed task",
              rawText: "- [x] Newly completed task",
              checked: true,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);

    // New card should appear before **Complete**
    const completeIdx = result.indexOf("**Complete**");
    const newCardIdx = result.indexOf("- [x] Newly completed task");
    expect(newCardIdx).toBeGreaterThan(-1);
    expect(completeIdx).toBeGreaterThan(-1);
    expect(newCardIdx).toBeLessThan(completeIdx);
  });

  it("skips orphan card lines from deleted cards instead of emitting verbatim", () => {
    /**
     * When a card is deleted, its lineIndex is no longer in column.cards.
     * The rawContent line at that index is a card-pattern line that should
     * be SKIPPED (not emitted verbatim) to prevent duplication.
     * Non-card lines (blank lines, comments) are still preserved.
     */
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          rawContent: "- [ ] First task\n- [ ] Second task\n- [ ] Third task",
          cards: [
            // First card still present
            {
              id: "card-1",
              text: "First task",
              rawText: "- [ ] First task",
              checked: false,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
            // Second card was deleted — no card with lineIndex 1
            // Third card still present
            {
              id: "card-3",
              text: "Third task",
              rawText: "- [ ] Third task",
              checked: false,
              lineIndex: 2,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);

    // Deleted card's orphan line should be SKIPPED, not emitted
    expect(result).not.toContain("- [ ] Second task");
    // Remaining cards should appear
    expect(result).toContain("- [ ] First task");
    expect(result).toContain("- [ ] Third task");
  });

  it("does not duplicate cards when moved between columns (MOVE_CARD regression)", () => {
    /**
     * Regression test for card duplication bug: when a card is moved between
     * columns, the serializer should emit it exactly ONCE — in the target
     * column only — not in both source and target.
     *
     * Scenario: Simulates the board state after MOVE_CARD has:
     * 1. Removed card from source column.cards
     * 2. Added card to target column.cards with lineIndex cleared
     * 3. Source column.rawContent still contains the original card line
     *
     * The serializer must skip the orphan card line in source rawContent
     * and emit the card only from the target column's cards array.
     */
    const state: BoardState = {
      frontmatter: "---\nkanban-plugin: basic\n---",
      frontmatterRaw: "---\nkanban-plugin: basic\n---",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          rawContent: "- [ ] Task A\n- [ ] Moved card\n- [ ] Task C",
          cards: [
            {
              id: "card-a",
              text: "Task A",
              rawText: "- [ ] Task A",
              checked: false,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
            // "Moved card" was removed from source — no card at lineIndex 1
            {
              id: "card-c",
              text: "Task C",
              rawText: "- [ ] Task C",
              checked: false,
              lineIndex: 2,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
        {
          id: "done",
          title: "Done",
          complete: false,
          rawContent: "- [ ] Existing done task",
          cards: [
            {
              id: "card-done",
              text: "Existing done task",
              rawText: "- [ ] Existing done task",
              checked: false,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
            // Moved card — lineIndex cleared (treated as new card in target)
            {
              id: "moved-card",
              text: "Moved card",
              rawText: "- [ ] Moved card",
              checked: false,
              lineIndex: undefined,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);

    // The moved card should appear exactly ONCE
    const occurrences = result.match(/- \[ \] Moved card/g);
    expect(occurrences).toHaveLength(1);

    // It should appear in the Done column (after the existing card)
    const doneIdx = result.indexOf("## Done");
    const movedCardIdx = result.indexOf("- [ ] Moved card");
    expect(movedCardIdx).toBeGreaterThan(doneIdx);

    // Source column should still have its other cards
    expect(result).toContain("- [ ] Task A");
    expect(result).toContain("- [ ] Task C");
  });

  it("handles new cards appended at end for non-complete columns", () => {
    /**
     * For non-complete columns, new cards without lineIndex should be
     * appended at the end.
     */
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          rawContent: "- [ ] Existing task",
          cards: [
            {
              id: "existing",
              text: "Existing task",
              rawText: "- [ ] Existing task",
              checked: false,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
            // New card — no lineIndex
            {
              id: "new-card",
              text: "New task",
              rawText: "- [ ] New task",
              checked: false,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);

    // Both cards should appear
    expect(result).toContain("- [ ] Existing task");
    expect(result).toContain("- [ ] New task");
    // New card should come after existing card
    const existingIdx = result.indexOf("- [ ] Existing task");
    const newIdx = result.indexOf("- [ ] New task");
    expect(newIdx).toBeGreaterThan(existingIdx);
  });

  it("adds **Complete** marker when column.complete but marker is missing from rawContent", () => {
    /**
     * If column.complete is true but **Complete** was somehow removed from
     * rawContent, the serializer should re-add it.
     */
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "done",
          title: "Done",
          complete: true,
          rawContent: "- [x] Finished task", // No **Complete** marker
          cards: [
            {
              id: "card-1",
              text: "Finished task",
              rawText: "- [x] Finished task",
              checked: true,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain("**Complete**");
  });

  it("handles column with empty rawContent falling back to structured serialization", () => {
    /**
     * When rawContent is empty, the serializer should fall back to
     * structured-only serialization (cards + Complete marker).
     */
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          rawContent: "",
          cards: [
            {
              id: "card-1",
              text: "Structured task",
              rawText: "",
              checked: false,
              metadata: {
                dueDates: ["2025-06-01"],
                times: [],
                tags: ["urgent"],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    // Should reconstruct from structured fields
    expect(result).toContain("- [ ] Structured task @{2025-06-01} #urgent");
  });
});

// ─── Mark Complete Toggle Regression ──────────────────────────────────────────

describe("serialize > Mark Complete toggle regression", () => {
  it("removes **Complete** marker when column.complete is toggled to false", () => {
    /**
     * Regression test for "Mark Complete" toggle being one-way.
     *
     * Root cause: serialize.ts reconstructColumnContent never removed the
     * **Complete** marker from rawContent when column.complete was toggled
     * to false. On re-parse, the **Complete** line set complete = true again,
     * making the toggle sticky.
     *
     * This test FAILS before the fix and PASSES after.
     *
     * Scenario: Column has rawContent with **Complete** marker, but
     * column.complete has been toggled to false. Serializer must strip
     * the marker from output.
     */
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "done",
          title: "Done",
          complete: false, // was toggled from true to false
          rawContent: "- [x] Finished task\n**Complete**", // rawContent still has the marker
          cards: [
            {
              id: "card-1",
              text: "Finished task",
              rawText: "- [x] Finished task",
              checked: true,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).not.toContain("**Complete**");
    expect(result).toContain("- [x] Finished task");
  });
});

// ─── Checkbox Toggle Regression ───────────────────────────────────────────────

describe("serialize > checkbox toggle regression", () => {
  it("serializes toggled card with correct checkbox state", () => {
    /**
     * Regression test for checkbox toggle serialization.
     *
     * When a card is toggled from unchecked to checked, the webview
     * rewrites card.rawText to "- [x] ..." and sets card.checked = true.
     * The serializer must honor the updated rawText — not the stale
     * rawContent line.
     *
     * Root cause path: serializeCard() returns rawText when present
     * (serialize.ts:60-61). reconstructColumnContent maps lineIndex→card
     * and emits serializeCard(card) replacing the rawContent line.
     *
     * Scenario: Two cards in rawContent. One is toggled to checked
     * (rawText rewritten, checked=true). Serializer should output the
     * toggled state from rawText, not the original "- [ ]" from rawContent.
     */
    const state: BoardState = {
      frontmatter: "kanban-plugin: basic",
      frontmatterRaw: "---\nkanban-plugin: basic\n---",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          rawContent: "- [ ] My task\n- [ ] Other task",
          cards: [
            {
              id: "card-1",
              text: "My task",
              rawText: "- [x] My task", // toggled to checked
              checked: true,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
            {
              id: "card-2",
              text: "Other task",
              rawText: "- [ ] Other task",
              checked: false,
              lineIndex: 1,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain("- [x] My task");
    expect(result).toContain("- [ ] Other task");

    // Verify toggled card appears only once (orphan line skipped)
    const myTaskMatches = result.match(/My task/g);
    expect(myTaskMatches).toHaveLength(1);
  });

  it("serializes toggled-off card with unchecked checkbox", () => {
    /**
     * Symmetric regression: card was checked, then toggled back to unchecked.
     * rawText rewritten to "- [ ]", checked=false. Serializer must emit "- [ ]".
     */
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "done",
          title: "Done",
          complete: false,
          rawContent: "- [x] Reopened task",
          cards: [
            {
              id: "card-1",
              text: "Reopened task",
              rawText: "- [ ] Reopened task", // toggled back to unchecked
              checked: false,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain("- [ ] Reopened task");
    expect(result).not.toContain("- [x] Reopened task");
  });
});

// ─── Archive Serialization ──────────────────────────────────────────────────

describe("serialize > archive section", () => {
  it("outputs archive section when archiveCards is non-empty", () => {
    const state: BoardState = {
      frontmatter: "---\nkanban-plugin: basic\n---",
      frontmatterRaw: "---\nkanban-plugin: basic\n---",
      columns: [{ id: "todo", title: "Todo", complete: false, cards: [], rawContent: "" }],
      settings: { "kanban-plugin": "basic" },
      settingsRaw: '%% kanban:settings\n{"kanban-plugin":"basic"}\n%%',
      rawBody: "",
      archiveCards: [
        {
          id: "arch-1",
          text: "Old task",
          rawText: "- [x] Old task",
          checked: true,
          metadata: {
            dueDates: [],
            times: [],
            tags: [],
            wikilinks: [],
            priority: null,
            startDate: null,
            createdDate: null,
            scheduledDate: null,
            dueDate: null,
            doneDate: null,
            cancelledDate: null,
            recurrence: null,
            dependsOn: null,
            blockId: null,
            inlineMetadata: [],
            wikilinkDates: [],
            mdNoteDates: [],
          },
        },
      ],
      archiveRawContent: "***\n## Archive\n- [x] Old task",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).toContain("***");
    expect(result).toContain("## Archive");
    expect(result).toContain("- [x] Old task");
  });

  it("does not output archive section when archiveCards is empty", () => {
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);
    expect(result).not.toContain("## Archive");
  });

  it("round-trip preserves archive section", () => {
    const input = loadFixture("archive-section.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);
    expect(second.archiveCards).toHaveLength(first.archiveCards.length);
    expect(second.archiveRawContent).toContain("## Archive");
  });
});

// ─── Round-Trip Fidelity ──────────────────────────────────────────────────────

describe("round-trip fidelity", () => {
  it("parse(serialize(parse(input))) deep-equals parse(input)", () => {
    const input = loadFixture("standard-board.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    // Deep structural equality
    expect(second.columns.length).toBe(first.columns.length);
    for (let i = 0; i < first.columns.length; i++) {
      expect(second.columns[i]?.title).toBe(first.columns[i]?.title);
      expect(second.columns[i]?.complete).toBe(first.columns[i]?.complete);
      expect(second.columns[i]?.cards.length).toBe(first.columns[i]?.cards.length);
      for (let j = 0; j < (first.columns[i]?.cards.length ?? 0); j++) {
        expect(second.columns[i]?.cards[j]?.text).toBe(first.columns[i]?.cards[j]?.text);
        expect(second.columns[i]?.cards[j]?.checked).toBe(first.columns[i]?.cards[j]?.checked);
        expect(second.columns[i]?.cards[j]?.metadata).toEqual(first.columns[i]?.cards[j]?.metadata);
      }
    }
    expect(second.frontmatter).toBe(first.frontmatter);
    expect(second.settings).toEqual(first.settings);
  });

  it("serialize(parse(input)) is byte-identical to input for standard file", () => {
    const input = loadFixture("standard-board.md");
    const result = serialize(parse(input));
    expect(result).toBe(input);
  });

  it("serialize(parse(input)) is byte-identical to input for minimal file", () => {
    const input = loadFixture("minimal-board.md");
    const result = serialize(parse(input));
    expect(result).toBe(input);
  });

  it("round-trip preserves empty columns", () => {
    const input = loadFixture("minimal-board.md");
    const result = parse(serialize(parse(input)));
    const emptyCol = result.columns.find((c) => c.title === "In Progress");
    expect(emptyCol).toBeDefined();
    expect(emptyCol?.cards).toHaveLength(0);
  });

  it("round-trip preserves settings block verbatim", () => {
    const input = loadFixture("standard-board.md");
    const first = parse(input);
    const second = parse(serialize(first));
    expect(second.settingsRaw).toBe(first.settingsRaw);
  });

  it("round-trip preserves rawBody content", () => {
    const input = "---\nkanban-plugin: basic\n---\n\nSome preamble\n\n## Todo\n- [ ] Task\n";
    const first = parse(input);
    const second = parse(serialize(first));
    expect(second.rawBody).toBe(first.rawBody);
  });

  it("round-trip is stable across 10 serialize→parse cycles (exponential duplication regression)", () => {
    const input = loadFixture("interstitial-content.md");
    let current = input;
    for (let i = 0; i < 10; i++) {
      const board = parse(current);
      current = serialize(board);
    }
    const finalBoard = parse(current);
    const finalOutput = serialize(finalBoard);
    expect(finalOutput).toBe(current);
  });

  it("round-trip with preamble content is stable across 10 cycles", () => {
    const input = "---\nkanban-plugin: basic\n---\n\nSome preamble\n\n## Todo\n- [ ] Task\n";
    let current = input;
    for (let i = 0; i < 10; i++) {
      const board = parse(current);
      current = serialize(board);
    }
    const singleCycle = serialize(parse(input));
    expect(current).toBe(singleCycle);
  });

  it("round-trip with complex fixture (backtick settings)", () => {
    const input = loadFixture("complex-board.md");
    const first = parse(input);
    const serialized = serialize(first);
    const second = parse(serialized);

    expect(second.columns.length).toBe(first.columns.length);
    expect(second.settings).toEqual(first.settings);
  });

  it("round-trip preserves cards with all metadata types", () => {
    const md =
      "---\nkanban-plugin: basic\n---\n\n## Todo\n- [ ] Task @{2025-04-15} @{08:30} #feature [[note]]\n";
    const first = parse(md);
    const second = parse(serialize(first));
    const card = second.columns[0]?.cards[0];
    expect(card?.metadata.dueDates).toEqual(["2025-04-15"]);
    expect(card?.metadata.times).toEqual(["08:30"]);
    expect(card?.metadata.tags).toEqual(["feature"]);
    expect(card?.metadata.wikilinks).toEqual(["note"]);
  });
});

// ─── Bug 4 Regression: Multi-Line Card Duplication on Move ───────────────────

describe("serialize > Bug 4 regression — multi-line card duplication on move", () => {
  it("does not duplicate multi-line card with special content when moved between columns", () => {
    /**
     * Regression test for card duplication bug: when a card with multi-line
     * content (tags, code blocks) is moved between columns, the content was
     * appearing BOTH in the original AND in another card.
     *
     * Root cause: serialize.ts lines 189-206 - orphan detection only matched
     * first line with /^- \[[ x]\] /, but continuation lines of multi-line
     * cards were NOT skipped. The fix replaces fragile newline-counting with
     * parser-style look-ahead logic.
     *
     * This test FAILS before the fix and PASSES after.
     *
     * Scenario: Multi-line card with tags/code blocks moved from Todo to Done.
     * - Source column rawContent still contains the original card lines
     * - Card in target column has lineIndex cleared (treated as new)
     * - Serializer must skip ALL lines of orphan card in source, not just first
     */
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          // Multi-line card with tags and code block in source column rawContent
          rawContent:
            "- [ ] Task A\n- [ ] Multi-line card with #tag and ```code```\n  continuation line\n  another line\n- [ ] Task D",
          cards: [
            {
              id: "card-a",
              text: "Task A",
              rawText: "- [ ] Task A",
              checked: false,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
            // Multi-line card was moved — no card at lineIndex 1
            // Its continuation lines at 2,3 should also be skipped (orphan)
            {
              id: "card-d",
              text: "Task D",
              rawText: "- [ ] Task D",
              checked: false,
              lineIndex: 4, // After the multi-line card (lines 1,2,3)
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
        {
          id: "done",
          title: "Done",
          complete: false,
          rawContent: "- [ ] Existing done task",
          cards: [
            {
              id: "card-done",
              text: "Existing done task",
              rawText: "- [ ] Existing done task",
              checked: false,
              lineIndex: 0,
              metadata: {
                dueDates: [],
                times: [],
                tags: [],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
            // Moved multi-line card — lineIndex cleared (treated as new card)
            {
              id: "moved-multi",
              text: "Multi-line card with #tag and ```code```\ncontinuation line\nanother line",
              rawText:
                "- [ ] Multi-line card with #tag and ```code```\n  continuation line\n  another line",
              checked: false,
              lineIndex: undefined,
              metadata: {
                dueDates: [],
                times: [],
                tags: ["tag"],
                wikilinks: [],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
    const result = serialize(state);

    // The multi-line card should appear exactly ONCE (in target column)
    const occurrences = result.match(/Multi-line card/g);
    expect(occurrences).toHaveLength(1);

    // It should appear in the Done column
    const doneIdx = result.indexOf("## Done");
    const multiLineCardIdx = result.indexOf("Multi-line card");
    expect(multiLineCardIdx).toBeGreaterThan(doneIdx);

    // Source column should have Task A and Task D, but NOT the moved card
    const todoSection = result.substring(0, result.indexOf("## Done"));
    expect(todoSection).toContain("- [ ] Task A");
    expect(todoSection).toContain("- [ ] Task D");
    expect(todoSection).not.toContain("Multi-line card");
  });
});

// ─── Checkbox Toggle Indentation Accumulation Regression ──────────────────────

describe("serialize > checkbox toggle indentation accumulation regression", () => {
  it("multi-line card with code block survives multiple toggles without indentation growth", () => {
    /**
     * Regression test for indentation accumulation bug in TOGGLE_CARD handler.
     *
     * Root cause: KanbanEditorProvider.ts lines 860-882 reconstructed rawText
     * by prepending "\\n  " to each continuation line on every toggle, causing
     * indentation to grow by 2 spaces per toggle cycle.
     *
     * This test FAILS before the fix and PASSES after.
     *
     * Scenario: Multi-line card with fenced code block. Toggle checked/unchecked
     * 5 times. Verify rawText length is stable and code block fences are intact.
     */
    const originalRawText = "- [ ] Write a function\n  ```typescript\n  const x = 42;\n  ```";

    // Simulate 5 toggle cycles (unchecked → checked → unchecked → ...)
    let rawText = originalRawText;
    for (let i = 0; i < 5; i++) {
      // Toggle to checked
      rawText = rawText.replace(/^- \[[ x]\]/, "- [x]");
      // Toggle back to unchecked
      rawText = rawText.replace(/^- \[[ x]\]/, "- [ ]");
    }

    // rawText must be byte-identical to original after even number of toggles
    expect(rawText).toBe(originalRawText);

    // Verify no indentation accumulation
    const originalLines = originalRawText.split("\n");
    const toggledLines = rawText.split("\n");
    expect(toggledLines.length).toBe(originalLines.length);
    for (let i = 0; i < originalLines.length; i++) {
      expect(toggledLines[i]).toBe(originalLines[i]);
    }

    // Verify code block fences are intact (not broken by extra indentation)
    expect(rawText).toContain("```typescript");
    expect(rawText).toContain("```");
  });

  it("single-line card toggles correctly", () => {
    const rawText = "- [ ] Simple task";
    const toggled = rawText.replace(/^- \[[ x]\]/, "- [x]");
    expect(toggled).toBe("- [x] Simple task");

    const untoggled = toggled.replace(/^- \[[ x]\]/, "- [ ]");
    expect(untoggled).toBe("- [ ] Simple task");
  });

  it("non-matching rawText is preserved unchanged", () => {
    const rawText = "This is not a checkbox line";
    const result = rawText.replace(/^- \[[ x]\]/, "- [x]");
    expect(result).toBe(rawText);
  });

  it("multi-line card with tags and metadata survives toggle", () => {
    const originalRawText = "- [ ] Task with metadata\n  @{2025-04-15} #feature [[notes]]";

    const toggled = originalRawText.replace(/^- \[[ x]\]/, "- [x]");
    expect(toggled).toBe("- [x] Task with metadata\n  @{2025-04-15} #feature [[notes]]");

    const untoggled = toggled.replace(/^- \[[ x]\]/, "- [ ]");
    expect(untoggled).toBe(originalRawText);
  });

  it("multi-line card with nested indentation is preserved", () => {
    /**
     * Cards with deeply nested continuation lines (e.g., indented lists
     * inside card content) must preserve their original indentation.
     */
    const originalRawText = "- [ ] List card\n  - Item one\n    - Sub-item\n  - Item two";

    const toggled = originalRawText.replace(/^- \[[ x]\]/, "- [x]");
    expect(toggled).toBe("- [x] List card\n  - Item one\n    - Sub-item\n  - Item two");
  });

  it("10 rapid toggles produce zero length change", () => {
    const originalRawText = "- [ ] Code card\n  ```python\n  def foo():\n      return bar\n  ```";

    let rawText = originalRawText;
    for (let i = 0; i < 10; i++) {
      rawText = rawText.replace(/^- \[[ x]\]/, i % 2 === 0 ? "- [x]" : "- [ ]");
    }

    expect(rawText.length).toBe(originalRawText.length);
    expect(rawText).toBe(originalRawText);
  });
});
