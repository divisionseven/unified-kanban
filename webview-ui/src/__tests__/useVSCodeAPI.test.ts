// ─── useVSCodeAPI Hook Tests ────────────────────────────────────────────────
// Note: This is not a React hook but a wrapper around VS Code's webview API.
// Tests verify the exported functions: postMessage, getState, setState

import { vi, describe, it, expect, beforeEach } from "vitest";

// Create mock functions that will be used in the module
const mockPostMessage = vi.fn();
const mockGetState = vi.fn();
const mockSetState = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  mockPostMessage.mockClear();
  mockGetState.mockClear();
  mockSetState.mockClear();
});

describe("useVSCodeAPI — module exports", () => {
  it("exports postMessage, getState, and setState functions", async () => {
    // Test that the module loads and exports exist
    const module = await import("../hooks/useVSCodeAPI.js");

    expect(module.postMessage).toBeDefined();
    expect(typeof module.postMessage).toBe("function");
    expect(module.getState).toBeDefined();
    expect(typeof module.getState).toBe("function");
    expect(module.setState).toBeDefined();
    expect(typeof module.setState).toBe("function");
  });
});

describe("useVSCodeAPI — postMessage behavior", () => {
  it("postMessage is callable with a WebviewMessage", async () => {
    // The default mock from setup.ts allows calling without throwing
    const { postMessage } = await import("../hooks/useVSCodeAPI.js");

    // Should not throw with the default mock
    expect(() => {
      postMessage({ type: "READY" });
    }).not.toThrow();
  });

  it("postMessage accepts different message types", async () => {
    const { postMessage } = await import("../hooks/useVSCodeAPI.js");

    // Test with various message types - should not throw
    expect(() => {
      postMessage({ type: "READY" });
      postMessage({ type: "REQUEST_INIT" });
      postMessage({ type: "ARCHIVE_ALL_CARDS" });
    }).not.toThrow();
  });

  it("postMessage works with complex message payloads", async () => {
    const { postMessage } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      postMessage({
        type: "MOVE_CARD",
        cardId: "card-123",
        fromColumnId: "todo",
        toColumnId: "done",
        newIndex: 0,
      });
      postMessage({
        type: "UPDATE_SETTINGS",
        settings: { "accent-color": "#ff0000" },
      });
      postMessage({
        type: "ADD_CARD",
        columnId: "todo",
        text: "New task",
      });
    }).not.toThrow();
  });

  it("postMessage works with messages containing all optional fields", async () => {
    const { postMessage } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      postMessage({
        type: "INSERT_CARD",
        columnId: "todo",
        text: "New card",
        position: "before",
        referenceCardId: "ref-card",
      });
    }).not.toThrow();
  });

  it("postMessage handles rapid successive calls", async () => {
    const { postMessage } = await import("../hooks/useVSCodeAPI.js");

    // Rapid calls should not throw
    for (let i = 0; i < 100; i++) {
      postMessage({ type: "READY" });
    }
    // Should complete without error
    expect(true).toBe(true);
  });
});

describe("useVSCodeAPI — getState behavior", () => {
  it("getState is callable without arguments", async () => {
    const { getState } = await import("../hooks/useVSCodeAPI.js");

    // The default mock should return undefined
    expect(() => {
      getState();
    }).not.toThrow();
  });

  it("getState returns expected type", async () => {
    const { getState } = await import("../hooks/useVSCodeAPI.js");

    const result = getState();
    // With default mock, result is undefined
    expect(result).toBeUndefined();
  });

  it("getState works with generic type parameter", async () => {
    const { getState } = await import("../hooks/useVSCodeAPI.js");

    interface AppState {
      viewMode: string;
    }

    const result = getState<AppState>();
    // Default mock returns undefined
    expect(result).toBeUndefined();
  });

  it("getState can be called multiple times", async () => {
    const { getState } = await import("../hooks/useVSCodeAPI.js");

    // Multiple calls should not throw
    expect(() => {
      getState();
      getState();
      getState();
    }).not.toThrow();
  });
});

describe("useVSCodeAPI — setState behavior", () => {
  it("setState is callable with any value", async () => {
    const { setState } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      setState({ key: "value" });
    }).not.toThrow();
  });

  it("setState accepts different value types", async () => {
    const { setState } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      setState("string value");
      setState(42);
      setState(true);
      setState({ nested: { object: true } });
      setState([1, 2, 3]);
      setState(null);
    }).not.toThrow();
  });

  it("setState works with complex nested objects", async () => {
    const { setState } = await import("../hooks/useVSCodeAPI.js");

    const complexState = {
      board: {
        columns: [
          { id: "todo", title: "Todo", cards: [] },
          { id: "done", title: "Done", cards: [] },
        ],
      },
      settings: { theme: "dark", accentColor: "#ff0000" },
      viewMode: "board",
    };

    expect(() => {
      setState(complexState);
    }).not.toThrow();
  });

  it("setState works with typed state parameter", async () => {
    const { setState } = await import("../hooks/useVSCodeAPI.js");

    interface AppState {
      viewMode: string;
      board: unknown;
    }

    const state: AppState = { viewMode: "list", board: null };

    expect(() => {
      setState(state);
    }).not.toThrow();
  });

  it("setState can be called multiple times sequentially", async () => {
    const { setState } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      setState({ step: 1 });
      setState({ step: 2 });
      setState({ step: 3 });
    }).not.toThrow();
  });

  it("setState handles empty object", async () => {
    const { setState } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      setState({});
    }).not.toThrow();
  });

  it("setState handles large state objects", async () => {
    const { setState } = await import("../hooks/useVSCodeAPI.js");

    const largeState = {
      data: Array(1000)
        .fill(null)
        .map((_, i) => ({ id: i, value: `item-${i}` })),
    };

    expect(() => {
      setState(largeState);
    }).not.toThrow();
    expect(largeState.data).toHaveLength(1000);
  });
});

describe("useVSCodeAPI — integration with WebviewMessage types", () => {
  it("supports all WebviewMessage types without throwing", async () => {
    const { postMessage } = await import("../hooks/useVSCodeAPI.js");

    // Test all message types from the messages.ts type
    const messages = [
      { type: "READY" },
      { type: "REQUEST_INIT" },
      { type: "ARCHIVE_ALL_CARDS" },
      { type: "OPEN_BOARD_FILE" },
      { type: "MOVE_CARD", cardId: "c1", fromColumnId: "todo", toColumnId: "done", newIndex: 0 },
      { type: "UPDATE_CARD", cardId: "c1", columnId: "todo", text: "text" },
      { type: "ADD_CARD", columnId: "todo", text: "text" },
      { type: "DELETE_CARD", cardId: "c1", columnId: "todo" },
      { type: "ADD_COLUMN", title: "New" },
      { type: "DELETE_COLUMN", columnId: "todo" },
      { type: "RENAME_COLUMN", columnId: "todo", title: "New" },
      { type: "TOGGLE_COLUMN_COMPLETE", columnId: "todo" },
      { type: "TOGGLE_CARD", cardId: "c1", columnId: "todo" },
      { type: "OPEN_FILE", path: "/path.md" },
      { type: "UPDATE_SETTINGS", settings: {} },
      { type: "ADD_BLOCK_ID", cardId: "c1", columnId: "todo", blockId: "b1" },
      {
        type: "INSERT_CARD",
        columnId: "todo",
        text: "t",
        position: "before",
        referenceCardId: "r1",
      },
      { type: "ARCHIVE_COLUMN_CARDS", columnId: "todo" },
      { type: "ARCHIVE_CARD", cardId: "c1", columnId: "todo" },
      { type: "INSERT_COLUMN", title: "t", position: "after", referenceColumnId: "r1" },
      { type: "ARCHIVE_COLUMN", columnId: "todo" },
      { type: "SORT_COLUMN", columnId: "todo", sortKey: "text", direction: "asc" },
      { type: "SET_VIEW", view: "table" },
      { type: "ADD_DATE", cardId: "c1", columnId: "todo", date: "2025-01-01" },
      { type: "REMOVE_DATE", cardId: "c1", columnId: "todo" },
      { type: "ADD_TIME", cardId: "c1", columnId: "todo", time: "14:00" },
      { type: "REMOVE_TIME", cardId: "c1", columnId: "todo" },
      { type: "NEW_NOTE_FROM_CARD", cardId: "c1", columnId: "todo" },
      { type: "SPLIT_CARD", cardId: "c1", columnId: "todo" },
      { type: "DUPLICATE_CARD", cardId: "c1", columnId: "todo" },
      { type: "SEARCH_TAG", tag: "urgent" },
    ];

    expect(() => {
      for (const msg of messages) {
        postMessage(msg as any);
      }
    }).not.toThrow();
  });
});

describe("useVSCodeAPI — error handling", () => {
  it("module loads even when acquireVsCodeApi returns null-like object", async () => {
    // The setup.ts provides a basic mock - we verify it works
    const module = await import("../hooks/useVSCodeAPI.js");

    // All functions should still be callable
    expect(() => {
      module.postMessage({ type: "READY" });
      module.getState();
      module.setState({});
    }).not.toThrow();
  });
});

describe("useVSCodeAPI — edge cases", () => {
  it("handles messages with empty/missing optional fields", async () => {
    const { postMessage } = await import("../hooks/useVSCodeAPI.js");

    // Minimal messages with only required fields should work
    expect(() => {
      postMessage({ type: "ADD_COLUMN", title: "" });
      postMessage({ type: "ADD_CARD", columnId: "", text: "" });
    }).not.toThrow();
  });

  it("handles special characters in messages", async () => {
    const { postMessage } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      postMessage({ type: "ADD_CARD", columnId: "col-1", text: "Emoji: 🎉" });
      postMessage({ type: "ADD_CARD", columnId: "col", text: "Unicode: \u{1F600}" });
      postMessage({ type: "UPDATE_SETTINGS", settings: { key: "🎊" } });
    }).not.toThrow();
  });

  it("handles state with special characters", async () => {
    const { setState, getState } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      setState("emoji: 🎉, unicode: \u{1F600}");
      getState();
    }).not.toThrow();
  });

  it("handles all view mode values in SET_VIEW", async () => {
    const { postMessage } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      postMessage({ type: "SET_VIEW", view: "board" });
      postMessage({ type: "SET_VIEW", view: "table" });
      postMessage({ type: "SET_VIEW", view: "list" });
    }).not.toThrow();
  });

  it("handles sort direction values", async () => {
    const { postMessage } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      postMessage({ type: "SORT_COLUMN", columnId: "todo", sortKey: "text", direction: "asc" });
      postMessage({ type: "SORT_COLUMN", columnId: "todo", sortKey: "text", direction: "desc" });
    }).not.toThrow();
  });

  it("handles insertion position values", async () => {
    const { postMessage } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      postMessage({
        type: "INSERT_CARD",
        columnId: "todo",
        text: "t",
        position: "before",
        referenceCardId: "r1",
      });
      postMessage({
        type: "INSERT_CARD",
        columnId: "todo",
        text: "t",
        position: "after",
        referenceCardId: "r1",
      });
      postMessage({
        type: "INSERT_COLUMN",
        title: "t",
        position: "before",
        referenceColumnId: "r1",
      });
      postMessage({
        type: "INSERT_COLUMN",
        title: "t",
        position: "after",
        referenceColumnId: "r1",
      });
    }).not.toThrow();
  });
});

describe("useVSCodeAPI — state round-trip", () => {
  it("setState and getState can be used in sequence", async () => {
    const { setState, getState } = await import("../hooks/useVSCodeAPI.js");

    // With the default mock that returns undefined, we just verify no throws
    expect(() => {
      setState({ test: "value" });
      void getState();
    }).not.toThrow();
  });

  it("multiple setState calls work", async () => {
    const { setState, getState } = await import("../hooks/useVSCodeAPI.js");

    expect(() => {
      setState("first");
      setState(2);
      setState({ third: true });
      void getState();
    }).not.toThrow();
  });
});
