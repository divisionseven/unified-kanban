// ─── useBoardState Hook Comprehensive Tests ───────────────────────────────────

import { renderHook, act } from "@testing-library/react";
import { useBoardState } from "../hooks/useBoardState.js";
import type { BoardState, Card, Column } from "../../../src/parser/types.ts";

// ─── Test Utilities ───────────────────────────────────────────────────────────

/** Helper to create a minimal BoardState for testing. */
function createTestBoard(overrides: Partial<BoardState> = {}): BoardState {
  return {
    frontmatter: "",
    frontmatterRaw: "---\nkanban-plugin: basic\n---",
    columns: [],
    settings: { "kanban-plugin": "basic" },
    settingsRaw: null,
    rawBody: "",
    archiveCards: [],
    archiveRawContent: "",
    cssClasses: [],
    ...overrides,
  };
}

/** Create a test card with full metadata. */
function createTestCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "test-card",
    text: "Test card",
    rawText: "- [ ] Test card",
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
    ...overrides,
  };
}

/** Create a test column with cards. */
function createTestColumn(overrides: Partial<Column> = {}): Column {
  return {
    id: "todo",
    title: "Todo",
    complete: false,
    cards: [],
    rawContent: "",
    ...overrides,
  };
}

// ─── Initial State ───────────────────────────────────────────────────────────

describe("useBoardState — initial state", () => {
  it("returns null board before INIT message", () => {
    const { result } = renderHook(() => useBoardState());
    expect(result.current.board).toBe(null);
    expect(result.current.settings).toBe(null);
    expect(result.current.fileName).toBe(null);
    expect(result.current.viewMode).toBe("board");
  });

  it("returns all apply functions", () => {
    const { result } = renderHook(() => useBoardState());
    expect(typeof result.current.applyMoveCard).toBe("function");
    expect(typeof result.current.applyMoveColumn).toBe("function");
    expect(typeof result.current.applyUpdateCard).toBe("function");
    expect(typeof result.current.applyAddCard).toBe("function");
    expect(typeof result.current.applyDeleteCard).toBe("function");
    expect(typeof result.current.applyAddColumn).toBe("function");
    expect(typeof result.current.applyDeleteColumn).toBe("function");
    expect(typeof result.current.applyRenameColumn).toBe("function");
    expect(typeof result.current.applyToggleColumnComplete).toBe("function");
    expect(typeof result.current.applyToggleCard).toBe("function");
    expect(typeof result.current.applyUpdateSettings).toBe("function");
    expect(typeof result.current.applyInsertCard).toBe("function");
    expect(typeof result.current.applyAddBlockId).toBe("function");
    expect(typeof result.current.applyArchiveColumnCards).toBe("function");
    expect(typeof result.current.applyArchiveAllCards).toBe("function");
    expect(typeof result.current.applyInsertColumn).toBe("function");
    expect(typeof result.current.applyArchiveColumn).toBe("function");
    expect(typeof result.current.applySortColumn).toBe("function");
    expect(typeof result.current.applySetView).toBe("function");
    expect(typeof result.current.applyArchiveCard).toBe("function");
    expect(typeof result.current.applyAddDate).toBe("function");
    expect(typeof result.current.applyRemoveDate).toBe("function");
    expect(typeof result.current.applyAddTime).toBe("function");
    expect(typeof result.current.applyRemoveTime).toBe("function");
    expect(typeof result.current.applyNewNoteFromCard).toBe("function");
    expect(typeof result.current.applySplitCard).toBe("function");
    expect(typeof result.current.applyDuplicateCard).toBe("function");
    expect(typeof result.current.setViewMode).toBe("function");
  });
});

// ─── INIT Message Handling ──────────────────────────────────────────────────

describe("useBoardState — INIT message handling", () => {
  it("sets board state from INIT message", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [
          createTestColumn({
            id: "todo",
            title: "Todo",
            cards: [createTestCard({ id: "card-1", text: "Task 1" })],
          }),
        ],
        settings: { "kanban-plugin": "basic", "show-title": true },
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard, fileName: "test.md" },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.board).not.toBeNull();
    expect(result.current.board?.columns).toHaveLength(1);
    expect(result.current.board?.columns[0]?.title).toBe("Todo");
    expect(result.current.fileName).toBe("test.md");
    expect(result.current.settings).toEqual({ "kanban-plugin": "basic", "show-title": true });
  });

  it("handles INIT without fileName", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard();
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.fileName).toBeNull();
  });
});

// ─── UPDATE Message Handling ─────────────────────────────────────────────────

describe("useBoardState — UPDATE message handling", () => {
  it("updates board from UPDATE message when no operation in flight", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "Todo" })],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      const updatedBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "Todo Updated" })],
      });
      const event = new MessageEvent("message", {
        data: { type: "UPDATE", board: updatedBoard },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.board?.columns[0]?.title).toBe("Todo Updated");
  });

  it("merges UPDATE when operation is in flight", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "Todo" })],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyAddCard("todo", "New card");
    });

    act(() => {
      const updatedBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "External change" })],
      });
      const event = new MessageEvent("message", {
        data: { type: "UPDATE", board: updatedBoard },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.board?.columns[0]?.title).toBe("External change");
  });
});

// ─── Operation Result Handling ───────────────────────────────────────────────

describe("useBoardState — operation result handling", () => {
  it("applies successful MOVE_CARD_RESULT", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [
          createTestColumn({
            id: "todo",
            title: "Todo",
            cards: [createTestCard({ id: "card-1", text: "Task 1" })],
          }),
          createTestColumn({ id: "done", title: "Done", cards: [] }),
        ],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyMoveCard("card-1", "todo", "done", 0);
    });

    act(() => {
      const resultBoard = createTestBoard({
        columns: [
          createTestColumn({ id: "todo", title: "Todo", cards: [] }),
          createTestColumn({
            id: "done",
            title: "Done",
            cards: [createTestCard({ id: "card-1", text: "Task 1" })],
          }),
        ],
      });
      const event = new MessageEvent("message", {
        data: { type: "MOVE_CARD_RESULT", success: true, board: resultBoard },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.board?.columns[1]?.cards).toHaveLength(1);
  });

  it("reverts on failed MOVE_CARD_RESULT", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [
          createTestColumn({
            id: "todo",
            title: "Todo",
            cards: [createTestCard({ id: "card-1", text: "Task 1" })],
          }),
          createTestColumn({ id: "done", title: "Done", cards: [] }),
        ],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyMoveCard("card-1", "todo", "done", 0);
    });

    expect(result.current.board?.columns[1]?.cards).toHaveLength(1);

    act(() => {
      const event = new MessageEvent("message", {
        data: { type: "MOVE_CARD_RESULT", success: false },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.board?.columns[0]?.cards).toHaveLength(1);
    expect(result.current.board?.columns[1]?.cards).toHaveLength(0);
  });

  it("handles UPDATE_SETTINGS_RESULT success", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        settings: { "kanban-plugin": "basic" },
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyUpdateSettings({ "custom-title": "My Board" });
    });

    act(() => {
      const resultBoard = createTestBoard({
        settings: { "kanban-plugin": "basic", "custom-title": "My Board" },
      });
      const event = new MessageEvent("message", {
        data: { type: "UPDATE_SETTINGS_RESULT", success: true, board: resultBoard },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.board?.settings?.["custom-title"]).toBe("My Board");
  });

  it("handles SET_VIEW_RESULT success", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard();
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.viewMode).toBe("board");

    act(() => {
      result.current.applySetView("table");
    });

    expect(result.current.viewMode).toBe("table");

    act(() => {
      const event = new MessageEvent("message", {
        data: { type: "SET_VIEW_RESULT", success: true },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.viewMode).toBe("table");
  });
});

// ─── Card Operations ─────────────────────────────────────────────────────────

describe("useBoardState — card operations", () => {
  describe("applyAddCard", () => {
    it("adds card to column (append mode)", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [createTestColumn({ id: "todo", title: "Todo" })],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyAddCard("todo", "New task");
      });

      const card = result.current.board?.columns[0]?.cards[0];
      expect(card?.text).toBe("New task");
      expect(card?.checked).toBe(false);
      expect(card?.rawText).toBe("- [ ] New task");
    });

    it("adds card at start when prepend mode", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "existing", text: "Existing" })],
            }),
          ],
          settings: { "kanban-plugin": "basic", "new-card-insertion-method": "prepend" },
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyAddCard("todo", "First task");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.text).toBe("First task");
      expect(result.current.board?.columns[0]?.cards[1]?.text).toBe("Existing");
    });
  });

  describe("applyUpdateCard", () => {
    it("updates card text", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Old text" })],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyUpdateCard("card-1", "todo", "Updated text");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.text).toBe("Updated text");
    });
  });

  describe("applyDeleteCard", () => {
    it("removes card from column", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Task" })],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyDeleteCard("card-1", "todo");
      });

      expect(result.current.board?.columns[0]?.cards).toHaveLength(0);
    });
  });

  describe("applyToggleCard", () => {
    it("toggles card checked state", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [
                createTestCard({
                  id: "card-1",
                  text: "Task",
                  checked: false,
                  rawText: "- [ ] Task",
                }),
              ],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyToggleCard("card-1", "todo");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.checked).toBe(true);
      expect(result.current.board?.columns[0]?.cards[0]?.rawText).toBe("- [x] Task");
    });

    it("toggles card unchecked", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [
                createTestCard({
                  id: "card-1",
                  text: "Task",
                  checked: true,
                  rawText: "- [x] Task",
                }),
              ],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyToggleCard("card-1", "todo");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.checked).toBe(false);
      expect(result.current.board?.columns[0]?.cards[0]?.rawText).toBe("- [ ] Task");
    });
  });

  describe("applyMoveCard", () => {
    it("moves card to different column", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Task" })],
            }),
            createTestColumn({ id: "done", title: "Done", cards: [] }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyMoveCard("card-1", "todo", "done", 0);
      });

      expect(result.current.board?.columns[0]?.cards).toHaveLength(0);
      expect(result.current.board?.columns[1]?.cards).toHaveLength(1);
    });

    it("auto-checks card when moving to complete column", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Task", checked: false })],
            }),
            createTestColumn({ id: "done", title: "Done", complete: true, cards: [] }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyMoveCard("card-1", "todo", "done", 0);
      });

      expect(result.current.board?.columns[1]?.cards[0]?.checked).toBe(true);
    });
  });

  describe("applyAddBlockId", () => {
    it("adds block ID to card", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Task", rawText: "- [ ] Task" })],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyAddBlockId("card-1", "todo", "abc123");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.metadata.blockId).toBe("abc123");
    });
  });

  describe("applyAddDate", () => {
    it("adds date to card", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Task", rawText: "- [ ] Task" })],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyAddDate("card-1", "todo", "2025-01-15");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.metadata.dueDates).toContain("2025-01-15");
    });
  });

  describe("applyRemoveDate", () => {
    it("removes dates from card", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [
                createTestCard({
                  id: "card-1",
                  text: "Task",
                  rawText: "- [ ] Task @{2025-01-15}",
                  metadata: { ...createTestCard().metadata, dueDates: ["2025-01-15"] },
                }),
              ],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyRemoveDate("card-1", "todo");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.metadata.dueDates).toHaveLength(0);
    });
  });

  describe("applyAddTime", () => {
    it("adds time to card", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Task", rawText: "- [ ] Task" })],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyAddTime("card-1", "todo", "14:30");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.metadata.times).toContain("14:30");
    });
  });

  describe("applyRemoveTime", () => {
    it("removes times from card", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [
                createTestCard({
                  id: "card-1",
                  text: "Task",
                  rawText: "- [ ] Task @{14:30}",
                  metadata: { ...createTestCard().metadata, times: ["14:30"] },
                }),
              ],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyRemoveTime("card-1", "todo");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.metadata.times).toHaveLength(0);
    });
  });
});

// ─── Column Operations ────────────────────────────────────────────────────────

describe("useBoardState — column operations", () => {
  describe("applyAddColumn", () => {
    it("adds new column with slugified id", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({ columns: [] });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyAddColumn("In Progress");
      });

      expect(result.current.board?.columns).toHaveLength(1);
      expect(result.current.board?.columns[0]?.title).toBe("In Progress");
      expect(result.current.board?.columns[0]?.id).toBe("in-progress");
    });
  });

  describe("applyDeleteColumn", () => {
    it("removes column from board", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [createTestColumn({ id: "todo", title: "Todo" })],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyDeleteColumn("todo");
      });

      expect(result.current.board?.columns).toHaveLength(0);
    });
  });

  describe("applyRenameColumn", () => {
    it("renames column and updates id", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [createTestColumn({ id: "todo", title: "Todo" })],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyRenameColumn("todo", "In Progress");
      });

      expect(result.current.board?.columns[0]?.title).toBe("In Progress");
      expect(result.current.board?.columns[0]?.id).toBe("in-progress");
    });
  });

  describe("applyToggleColumnComplete", () => {
    it("marks column complete and auto-checks cards", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              complete: false,
              cards: [
                createTestCard({
                  id: "card-1",
                  text: "Task",
                  checked: false,
                  rawText: "- [ ] Task",
                }),
              ],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyToggleColumnComplete("todo");
      });

      expect(result.current.board?.columns[0]?.complete).toBe(true);
      expect(result.current.board?.columns[0]?.cards[0]?.checked).toBe(true);
    });

    it("unmarks column complete", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              complete: true,
              cards: [createTestCard({ id: "card-1", text: "Task", checked: true })],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyToggleColumnComplete("todo");
      });

      expect(result.current.board?.columns[0]?.complete).toBe(false);
    });
  });

  describe("applyMoveColumn", () => {
    it("reorders columns", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({ id: "todo", title: "Todo" }),
            createTestColumn({ id: "in-progress", title: "In Progress" }),
            createTestColumn({ id: "done", title: "Done" }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyMoveColumn("todo", 2);
      });

      expect(result.current.board?.columns[0]?.id).toBe("in-progress");
      expect(result.current.board?.columns[1]?.id).toBe("done");
      expect(result.current.board?.columns[2]?.id).toBe("todo");
    });
  });

  describe("applyInsertColumn", () => {
    it("inserts column before reference", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({ id: "todo", title: "Todo" }),
            createTestColumn({ id: "done", title: "Done" }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyInsertColumn("In Progress", "before", "done");
      });

      expect(result.current.board?.columns[1]?.title).toBe("In Progress");
    });

    it("inserts column after reference", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({ id: "todo", title: "Todo" }),
            createTestColumn({ id: "done", title: "Done" }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyInsertColumn("In Progress", "after", "todo");
      });

      expect(result.current.board?.columns[1]?.title).toBe("In Progress");
    });
  });

  describe("applyArchiveColumnCards", () => {
    it("moves checked cards to archive column", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [
                createTestCard({ id: "card-1", text: "Done task", checked: true }),
                createTestCard({ id: "card-2", text: "Open task", checked: false }),
              ],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyArchiveColumnCards("todo");
      });

      expect(result.current.board?.columns[0]?.cards).toHaveLength(1);
      expect(result.current.board?.columns[0]?.cards[0]?.text).toBe("Open task");
      expect(result.current.board?.columns[1]?.title).toBe("Archive");
      expect(result.current.board?.columns[1]?.cards).toHaveLength(1);
      expect(result.current.board?.columns[1]?.cards[0]?.text).toBe("Done task");
    });
  });

  describe("applyArchiveColumn", () => {
    it("moves all cards to archive and removes column", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Task" })],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyArchiveColumn("todo");
      });

      expect(result.current.board?.columns).toHaveLength(1);
      expect(result.current.board?.columns[0]?.title).toBe("Archive");
      expect(result.current.board?.columns[0]?.cards).toHaveLength(1);
    });
  });

  describe("applySortColumn", () => {
    it("sorts cards by text ascending", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [
                createTestCard({ id: "c", text: "Zebra" }),
                createTestCard({ id: "a", text: "Apple" }),
                createTestCard({ id: "b", text: "Banana" }),
              ],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applySortColumn("todo", "text", "asc");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.text).toBe("Apple");
      expect(result.current.board?.columns[0]?.cards[1]?.text).toBe("Banana");
      expect(result.current.board?.columns[0]?.cards[2]?.text).toBe("Zebra");
    });

    it("sorts cards by text descending", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [
                createTestCard({ id: "a", text: "Apple" }),
                createTestCard({ id: "b", text: "Banana" }),
              ],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applySortColumn("todo", "text", "desc");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.text).toBe("Banana");
      expect(result.current.board?.columns[0]?.cards[1]?.text).toBe("Apple");
    });

    it("sorts cards by priority", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [
                createTestCard({
                  id: "a",
                  text: "Medium",
                  metadata: { ...createTestCard().metadata, priority: 3 },
                }),
                createTestCard({
                  id: "b",
                  text: "High",
                  metadata: { ...createTestCard().metadata, priority: 1 },
                }),
                createTestCard({
                  id: "c",
                  text: "Low",
                  metadata: { ...createTestCard().metadata, priority: 5 },
                }),
              ],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applySortColumn("todo", "priority", "asc");
      });

      expect(result.current.board?.columns[0]?.cards[0]?.text).toBe("High");
      expect(result.current.board?.columns[0]?.cards[1]?.text).toBe("Medium");
      expect(result.current.board?.columns[0]?.cards[2]?.text).toBe("Low");
    });
  });

  describe("applyArchiveCard", () => {
    it("moves card to archive column", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Task" })],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyArchiveCard("card-1", "todo");
      });

      expect(result.current.board?.columns[0]?.cards).toHaveLength(0);
      expect(result.current.board?.columns[1]?.title).toBe("Archive");
      expect(result.current.board?.columns[1]?.cards).toHaveLength(1);
    });
  });
});

// ─── View Operations ────────────────────────────────────────────────────────

describe("useBoardState — view operations", () => {
  describe("setViewMode", () => {
    it("changes view mode and applies set view", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard();
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.setViewMode("table");
      });

      expect(result.current.viewMode).toBe("table");
    });
  });

  describe("CYCLE_VIEW message", () => {
    it("cycles through board -> table -> list -> board", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard();
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.viewMode).toBe("board");

      act(() => {
        const event = new MessageEvent("message", {
          data: { type: "CYCLE_VIEW" },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.viewMode).toBe("table");

      act(() => {
        const event = new MessageEvent("message", {
          data: { type: "CYCLE_VIEW" },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.viewMode).toBe("list");

      act(() => {
        const event = new MessageEvent("message", {
          data: { type: "CYCLE_VIEW" },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.viewMode).toBe("board");
    });
  });

  describe("SET_VIEW_COMMAND message", () => {
    it("sets view mode from command", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard();
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        const event = new MessageEvent("message", {
          data: { type: "SET_VIEW_COMMAND", view: "list" },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.viewMode).toBe("list");
    });
  });
});

// ─── Settings Operations ────────────────────────────────────────────────────

describe("useBoardState — settings operations", () => {
  describe("applyUpdateSettings", () => {
    it("updates board settings optimistically", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          settings: { "kanban-plugin": "basic" },
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyUpdateSettings({ "accent-color": "#ff0000" });
      });

      expect(result.current.board?.settings?.["accent-color"]).toBe("#ff0000");
    });

    it("merges with existing settings", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          settings: { "kanban-plugin": "basic", "show-title": true },
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyUpdateSettings({ "accent-color": "#00ff00" });
      });

      expect(result.current.board?.settings?.["show-title"]).toBe(true);
      expect(result.current.board?.settings?.["accent-color"]).toBe("#00ff00");
    });
  });

  describe("applySetView", () => {
    it("updates settings with view mode", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          settings: { "kanban-plugin": "basic" },
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applySetView("list");
      });

      expect(result.current.board?.settings?.["set-view"]).toBe("list");
    });
  });
});

// ─── Operation In-Flight Blocking ────────────────────────────────────────────

describe("useBoardState — operation in-flight blocking", () => {
  it("blocks subsequent operations when one is in flight", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "Todo" })],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyAddCard("todo", "First card");
    });

    expect(result.current.board?.columns[0]?.cards).toHaveLength(1);

    act(() => {
      result.current.applyAddCard("todo", "Second card");
    });

    expect(result.current.board?.columns[0]?.cards).toHaveLength(1);
  });

  it("allows operations after result is received", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "Todo" })],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyAddCard("todo", "First card");
    });

    act(() => {
      const resultBoard = createTestBoard({
        columns: [
          createTestColumn({
            id: "todo",
            title: "Todo",
            cards: [createTestCard({ id: "first-card-hash", text: "First card" })],
          }),
        ],
      });
      const event = new MessageEvent("message", {
        data: { type: "ADD_CARD_RESULT", success: true, board: resultBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyAddCard("todo", "Second card");
    });

    expect(result.current.board?.columns[0]?.cards).toHaveLength(2);
  });
});

// ─── Timeout Auto-Recovery ───────────────────────────────────────────────────

describe("useBoardState — timeout auto-recovery", () => {
  it("clears operation in flight after timeout", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "Todo" })],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyAddCard("todo", "First card");
    });

    act(() => {
      vi.advanceTimersByTime(5001);
    });

    act(() => {
      result.current.applyAddCard("todo", "Second card");
    });

    expect(result.current.board?.columns[0]?.cards).toHaveLength(2);

    vi.useRealTimers();
  });
});

// ─── Special Operations ───────────────────────────────────────────────────────

describe("useBoardState — special operations", () => {
  describe("applyArchiveAllCards", () => {
    it("posts ARCHIVE_ALL_CARDS message without throwing", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard();
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      expect(() => {
        result.current.applyArchiveAllCards();
      }).not.toThrow();
    });
  });

  describe("applyNewNoteFromCard", () => {
    it("does not change board state (optimistic placeholder)", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Task" })],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyNewNoteFromCard("card-1", "todo");
      });

      expect(result.current.board?.columns[0]?.cards).toHaveLength(1);
    });
  });

  describe("applySplitCard", () => {
    it("does not change board state (optimistic placeholder)", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Task" })],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applySplitCard("card-1", "todo");
      });

      expect(result.current.board?.columns[0]?.cards).toHaveLength(1);
    });
  });

  describe("applyDuplicateCard", () => {
    it("does not change board state (optimistic placeholder)", () => {
      const { result } = renderHook(() => useBoardState());

      act(() => {
        const initialBoard = createTestBoard({
          columns: [
            createTestColumn({
              id: "todo",
              title: "Todo",
              cards: [createTestCard({ id: "card-1", text: "Task" })],
            }),
          ],
        });
        const event = new MessageEvent("message", {
          data: { type: "INIT", board: initialBoard },
        });
        window.dispatchEvent(event);
      });

      act(() => {
        result.current.applyDuplicateCard("card-1", "todo");
      });

      expect(result.current.board?.columns[0]?.cards).toHaveLength(1);
    });
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe("useBoardState — edge cases", () => {
  it("handles operations when board is null (no-op)", () => {
    const { result } = renderHook(() => useBoardState());

    expect(() => {
      act(() => {
        result.current.applyAddCard("todo", "Task");
      });
    }).not.toThrow();

    expect(result.current.board).toBeNull();
  });

  it("handles move card to non-existent column", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [
          createTestColumn({
            id: "todo",
            title: "Todo",
            cards: [createTestCard({ id: "card-1", text: "Task" })],
          }),
        ],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyMoveCard("card-1", "todo", "non-existent", 0);
    });

    expect(result.current.board?.columns[0]?.cards).toHaveLength(1);
  });

  it("handles move non-existent card", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "Todo", cards: [] })],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    expect(() => {
      act(() => {
        result.current.applyMoveCard("non-existent", "todo", "done", 0);
      });
    }).not.toThrow();
  });

  it("handles update card in non-existent column", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "Todo", cards: [] })],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    expect(() => {
      act(() => {
        result.current.applyUpdateCard("card-1", "non-existent", "New text");
      });
    }).not.toThrow();
  });

  it("handles delete non-existent card", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [
          createTestColumn({
            id: "todo",
            title: "Todo",
            cards: [createTestCard({ id: "card-1", text: "Task" })],
          }),
        ],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyDeleteCard("non-existent", "todo");
    });

    expect(result.current.board?.columns[0]?.cards).toHaveLength(1);
  });

  it("handles toggle non-existent card", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [
          createTestColumn({
            id: "todo",
            title: "Todo",
            cards: [createTestCard({ id: "card-1", text: "Task" })],
          }),
        ],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyToggleCard("non-existent", "todo");
    });

    expect(result.current.board?.columns[0]?.cards[0]?.checked).toBe(false);
  });

  it("handles delete non-existent column", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "Todo" })],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyDeleteColumn("non-existent");
    });

    expect(result.current.board?.columns).toHaveLength(1);
  });

  it("handles rename non-existent column", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "Todo" })],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyRenameColumn("non-existent", "New Title");
    });

    expect(result.current.board?.columns[0]?.title).toBe("Todo");
  });

  it("handles toggle non-existent column", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        columns: [createTestColumn({ id: "todo", title: "Todo", complete: false })],
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyToggleColumnComplete("non-existent");
    });

    expect(result.current.board?.columns[0]?.complete).toBe(false);
  });
});

// ─── ADD_LANE_COMMAND Handling ────────────────────────────────────────────────

describe("useBoardState — ADD_LANE_COMMAND message", () => {
  it("adds column when receiving ADD_LANE_COMMAND", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({ columns: [] });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      const event = new MessageEvent("message", {
        data: { type: "ADD_LANE_COMMAND", title: "New Lane" },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.board?.columns).toHaveLength(1);
    expect(result.current.board?.columns[0]?.title).toBe("New Lane");
  });
});

// ─── Slugify Helper (via applyAddColumn behavior) ───────────────────────────

describe("useBoardState — slugify behavior", () => {
  it("slugifies column titles correctly", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({ columns: [] });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyAddColumn("My New Column");
    });

    expect(result.current.board?.columns[0]?.id).toBe("my-new-column");
  });

  it("handles special characters in column titles", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({ columns: [] });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.applyAddColumn("Test @#$% Column!");
    });

    expect(result.current.board?.columns[0]?.id).toBe("test-column");
  });
});

// ─── Settings accessor ───────────────────────────────────────────────────────

describe("useBoardState — settings accessor", () => {
  it("returns settings from board", () => {
    const { result } = renderHook(() => useBoardState());

    act(() => {
      const initialBoard = createTestBoard({
        settings: { "kanban-plugin": "basic", "custom-key": "custom-value" },
      });
      const event = new MessageEvent("message", {
        data: { type: "INIT", board: initialBoard },
      });
      window.dispatchEvent(event);
    });

    expect(result.current.settings).toEqual({
      "kanban-plugin": "basic",
      "custom-key": "custom-value",
    });
  });

  it("returns null when board is null", () => {
    const { result } = renderHook(() => useBoardState());
    expect(result.current.settings).toBe(null);
  });
});
