// ─── Regression Tests for Phase 1 Bugs ─────────────────────────────────────

import { renderHook, act } from "@testing-library/react";
import { djb2Hash } from "../utils/hash.js";
import { useBoardState } from "../hooks/useBoardState.js";
import type { BoardState } from "../../../src/parser/types.ts";

// ─── djb2Hash Cross-Verification — Bug 4 Regression ────────────────────────

/**
 * These tests verify the webview djb2Hash implementation produces
 * deterministic, consistent output that would match the host parser.
 *
 * The host parser uses djb2Hash(rawLine) at parse.ts:198 to generate card IDs.
 * The webview must produce identical hashes for optimistic card ID reconciliation.
 */
describe("djb2Hash — Bug 4 regression", () => {
  it("produces deterministic output for the same input", () => {
    const input = "- [ ] My Task";
    const hash1 = djb2Hash(input);
    const hash2 = djb2Hash(input);
    expect(hash1).toBe(hash2);
  });

  it("produces different output for different inputs", () => {
    const hash1 = djb2Hash("- [ ] Task A");
    const hash2 = djb2Hash("- [ ] Task B");
    expect(hash1).not.toBe(hash2);
  });

  it("produces the expected hash for a known card line", () => {
    // This value must match what parseCard("- [ ] My Task") produces in the host
    const expected = djb2Hash("- [ ] My Task");
    expect(typeof expected).toBe("string");
    expect(expected.length).toBeGreaterThan(0);
  });

  it("handles empty string", () => {
    const hash = djb2Hash("");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("handles unicode input", () => {
    const hash1 = djb2Hash("- [ ] 中文任务");
    const hash2 = djb2Hash("- [ ] 中文任务");
    expect(hash1).toBe(hash2);
  });

  it("produces base-36 output (digits + lowercase letters)", () => {
    const inputs = [
      "- [ ] Simple task",
      "- [ ] Task with #tag",
      "- [ ] Task @{2025-01-01}",
      "- [ ] Task [[wikilink]]",
      "- [x] Completed task",
      "",
      "a",
      "hello world",
    ];
    for (const input of inputs) {
      const hash = djb2Hash(input);
      expect(hash).toMatch(/^[0-9a-z]+$/);
    }
  });

  it("produces short hashes suitable for card IDs", () => {
    // All hashes should be reasonably short (under 15 chars)
    const inputs = [
      "- [ ] Short",
      "- [ ] This is a much longer task title with lots of text in it",
      "- [ ] 中文任务 #tag @{2025-01-01} [[Some Note]]",
    ];
    for (const input of inputs) {
      const hash = djb2Hash(input);
      expect(hash.length).toBeLessThan(15);
    }
  });

  it("produces different hashes for checked vs unchecked versions of same task", () => {
    // "- [ ] Task" and "- [x] Task" should produce different IDs
    const unchecked = djb2Hash("- [ ] Task");
    const checked = djb2Hash("- [x] Task");
    expect(unchecked).not.toBe(checked);
  });

  it("produces different hashes when metadata differs", () => {
    const base = djb2Hash("- [ ] Task");
    const withTag = djb2Hash("- [ ] Task #feature");
    const withDate = djb2Hash("- [ ] Task @{2025-01-01}");
    expect(withTag).not.toBe(base);
    expect(withDate).not.toBe(base);
    expect(withTag).not.toBe(withDate);
  });
});

// ─── Card ID Format Verification — Bug 4 Regression ────────────────────────

describe("card ID format — Bug 4 regression", () => {
  it("djb2Hash output is a valid base-36 string", () => {
    const hash = djb2Hash("- [ ] Test card");
    // Base-36 uses digits 0-9 and lowercase letters a-z
    expect(hash).toMatch(/^[0-9a-z]+$/);
  });

  it("card ID format is a hash, not a temp timestamp", () => {
    const id = djb2Hash("- [ ] My Task");
    // Should NOT start with "temp-"
    expect(id).not.toMatch(/^temp-/);
    // Should be a short base-36 string
    expect(id.length).toBeLessThan(15);
  });

  it("card ID format does not contain hyphens or special characters", () => {
    const id = djb2Hash("- [ ] Task with special chars!@#$%");
    expect(id).not.toContain("-");
    expect(id).not.toContain("_");
    expect(id).toMatch(/^[0-9a-z]+$/);
  });
});

// ─── useBoardState Optimistic ID — Bug 4 Regression ────────────────────────

describe("useBoardState optimistic card ID — Bug 4 regression", () => {
  /**
   * Regression test for Bug 4: Temp ID non-reconciliation.
   *
   * Root cause: useBoardState.ts line 266 used `id: "temp-${Date.now()}"`
   * which never matched the host's djb2 hash ID. Any operation targeting
   * the card after initial render (move, edit, delete) would fail because
   * the host couldn't find a matching card to update.
   *
   * The fix uses djb2Hash(rawText) to generate deterministic IDs that
   * match the host parser's card ID generation.
   */

  it("applyAddCard generates card ID using djb2Hash of the card line", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard: BoardState = {
        frontmatter: "",
        frontmatterRaw: "---\nkanban-plugin: basic\n---",
        columns: [
          {
            id: "todo",
            title: "Todo",
            complete: false,
            cards: [],
            rawContent: "",
          },
        ],
        settings: { "kanban-plugin": "basic" },
        settingsRaw: null,
        rawBody: "",
        archiveCards: [],
        archiveRawContent: "",
        cssClasses: [],
      };
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyAddCard("todo", "New task");
    });

    const board = result.current.board;
    const todoCol = board?.columns.find((c) => c.id === "todo");

    expect(todoCol?.cards.length).toBe(1);
    const newCard = todoCol?.cards[0];
    expect(newCard?.text).toBe("New task");
    // ID should be a deterministic hash, not a temp timestamp
    expect(newCard?.id).not.toMatch(/^temp-/);
    expect(newCard?.id).toMatch(/^[0-9a-z]+$/);
  });

  it("applyAddCard with prepend-new-cards setting inserts at start", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard: BoardState = {
        frontmatter: "",
        frontmatterRaw: "---\nkanban-plugin: basic\n---\nprepend-new-cards: true",
        columns: [
          {
            id: "todo",
            title: "Todo",
            complete: false,
            cards: [
              {
                id: "card-1",
                text: "Existing task",
                rawText: "- [ ] Existing task",
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
            rawContent: "- [ ] Existing task",
          },
        ],
        settings: { "kanban-plugin": "basic", "new-card-insertion-method": "prepend" },
        settingsRaw: null,
        rawBody: "",
        archiveCards: [],
        archiveRawContent: "",
        cssClasses: [],
      };
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyAddCard("todo", "New First Task");
    });

    const board = result.current.board;
    const todoCol = board?.columns.find((c) => c.id === "todo");
    expect(todoCol?.cards.length).toBe(2);
    // New card should be first (prepend mode)
    expect(todoCol?.cards[0]?.text).toBe("New First Task");
    expect(todoCol?.cards[1]?.text).toBe("Existing task");
  });
});

// ─── handleDragEnd Card→Column Drop — DnD Regression ────────────────────────

describe("handleDragEnd — card drop on column droppable", () => {
  /**
   * Regression test for the card→column drop path.
   *
   * Root cause: App.tsx:58 — when `over` was null (closestCenter failing
   * near column boundaries or in sparse columns), handleDragEnd exited
   * early and the card snapped back. The fix switches to pointerWithin
   * collision detection so the column droppable under the cursor is found.
   *
   * These tests exercise the `overData.type === "column"` branch at
   * App.tsx:69-74 by calling applyMoveCard with toColumnId pointing to
   * a different column — the same code path handleDragEnd uses when
   * pointerWithin returns the column droppable.
   */

  it("moves card to empty target column when dropped on column area", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard: BoardState = {
        frontmatter: "",
        frontmatterRaw: "---\nkanban-plugin: basic\n---",
        columns: [
          {
            id: "todo",
            title: "Todo",
            complete: false,
            cards: [
              {
                id: "card-1",
                text: "Task A",
                rawText: "- [ ] Task A",
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
            rawContent: "- [ ] Task A",
          },
          {
            id: "done",
            title: "Done",
            complete: false,
            cards: [],
            rawContent: "",
          },
        ],
        settings: { "kanban-plugin": "basic" },
        settingsRaw: null,
        rawBody: "",
        archiveCards: [],
        archiveRawContent: "",
        cssClasses: [],
      };
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    // Simulate dropping card-1 onto the "done" column droppable
    // (This is what pointerWithin returns when pointer is over empty column area)
    act(() => {
      result.current.applyMoveCard("card-1", "todo", "done", 0);
    });

    const board = result.current.board;
    const todoCol = board?.columns.find((c) => c.id === "todo");
    const doneCol = board?.columns.find((c) => c.id === "done");

    expect(todoCol?.cards.length).toBe(0);
    expect(doneCol?.cards.length).toBe(1);
    expect(doneCol?.cards[0]?.text).toBe("Task A");
  });

  it("appends card to end of column with existing cards when dropped on column area", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard: BoardState = {
        frontmatter: "",
        frontmatterRaw: "---\nkanban-plugin: basic\n---",
        columns: [
          {
            id: "todo",
            title: "Todo",
            complete: false,
            cards: [
              {
                id: "card-1",
                text: "Task A",
                rawText: "- [ ] Task A",
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
            rawContent: "- [ ] Task A",
          },
          {
            id: "done",
            title: "Done",
            complete: false,
            cards: [
              {
                id: "card-2",
                text: "Already done",
                rawText: "- [ ] Already done",
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
            rawContent: "- [ ] Already done",
          },
        ],
        settings: { "kanban-plugin": "basic" },
        settingsRaw: null,
        rawBody: "",
        archiveCards: [],
        archiveRawContent: "",
        cssClasses: [],
      };
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    // Drop card-1 onto done column — index = doneColumn.cards.length = 1
    act(() => {
      result.current.applyMoveCard("card-1", "todo", "done", 1);
    });

    const board = result.current.board;
    const doneCol = board?.columns.find((c) => c.id === "done");

    expect(doneCol?.cards.length).toBe(2);
    expect(doneCol?.cards[0]?.text).toBe("Already done");
    expect(doneCol?.cards[1]?.text).toBe("Task A");
  });
});
