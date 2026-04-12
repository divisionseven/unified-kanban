import { useState, useEffect, useRef, useCallback } from "react";
import type { BoardState } from "../../../src/parser/types.ts";
import type { HostMessage } from "../../../src/messages.ts";
import { postMessage } from "./useVSCodeAPI.js";
import { djb2Hash } from "../utils/hash.js";

/**
 * Slugify a string: lowercase, replace non-alphanumeric with hyphens.
 * Mirrors the implementation in parser/parse.ts for optimistic updates.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Return type for the useBoardState hook.
 */
/** Shape returned by useBoardState — board data, settings, and optimistic mutation functions. */
interface BoardStateHook {
  board: BoardState | null;
  settings: BoardState["settings"];
  fileName: string | null;
  viewMode: "board" | "table" | "list";
  setViewMode(view: "board" | "table" | "list"): void;
  applyMoveCard(cardId: string, fromColumnId: string, toColumnId: string, newIndex: number): void;
  applyMoveColumn(columnId: string, newIndex: number): void;
  applyUpdateCard(cardId: string, columnId: string, text: string): void;
  applyAddCard(columnId: string, text: string): void;
  applyDeleteCard(cardId: string, columnId: string): void;
  applyAddColumn(title: string): void;
  applyDeleteColumn(columnId: string): void;
  applyRenameColumn(columnId: string, title: string): void;
  applyToggleColumnComplete(columnId: string): void;
  applyToggleCard(cardId: string, columnId: string): void;
  applyUpdateSettings(settings: Record<string, unknown>): void;
  applyInsertCard(
    columnId: string,
    text: string,
    position: "before" | "after",
    referenceCardId: string,
  ): void;
  applyAddBlockId(cardId: string, columnId: string, blockId: string): void;
  applyArchiveColumnCards(columnId: string): void;
  applyArchiveAllCards(): void;
  applyInsertColumn(title: string, position: "before" | "after", referenceColumnId: string): void;
  applyArchiveColumn(columnId: string): void;
  applySortColumn(columnId: string, sortKey: string, direction: "asc" | "desc"): void;
  applySetView(view: "board" | "table" | "list"): void;
  applyArchiveCard(cardId: string, columnId: string): void;
  applyAddDate(cardId: string, columnId: string, date: string): void;
  applyRemoveDate(cardId: string, columnId: string): void;
  applyAddTime(cardId: string, columnId: string, time: string): void;
  applyRemoveTime(cardId: string, columnId: string): void;
  applyNewNoteFromCard(cardId: string, columnId: string): void;
  applySplitCard(cardId: string, columnId: string): void;
  applyDuplicateCard(cardId: string, columnId: string): void;
}

/**
 * Deep-clone a BoardState using structuredClone.
 */
function cloneBoard(board: BoardState): BoardState {
  return structuredClone(board);
}

/**
 * Manages board state with optimistic updates for drag-and-drop.
 *
 * - Applies local changes immediately on drop (optimistic)
 * - Sends MOVE_CARD/MOVE_COLUMN to the host for persistence
 * - Reconciles on UPDATE (external edits) and *_RESULT (host confirmation)
 * - Reverts on failure
 */
export function useBoardState(): BoardStateHook {
  const [board, setBoard] = useState<BoardState | null>(null);
  const preOpBoardRef = useRef<BoardState | null>(null);
  const pendingOpRef = useRef<"card" | "column" | null>(null);
  const operationInFlight = useRef(false);
  const operationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewMode, setViewModeState] = useState<"board" | "table" | "list">("board");
  const [fileName, setFileName] = useState<string | null>(null);

  // Refs to forward-declare callbacks used in handleMessage (avoids circular dependency)
  const applySetViewRef = useRef<(view: "board" | "table" | "list") => void>(() => {});
  const applyAddColumnRef = useRef<(title: string) => void>(() => {});

  useEffect(() => {
    function handleMessage(event: MessageEvent): void {
      const message = event.data as HostMessage;

      switch (message.type) {
        case "INIT":
          setBoard(message.board);
          setFileName((message as { fileName?: string }).fileName ?? null);
          break;

        case "UPDATE": {
          if (pendingOpRef.current !== null) {
            // External edit arrived while our operation is in-flight.
            // Merge: take host's board as the new truth but don't clobber
            // our optimistic state. The *_RESULT will finalize.
            // For simplicity, accept host state — our move is already
            // serialized and will appear in the re-parse.
            setBoard(message.board);
          } else {
            // Pure external edit — accept as truth
            setBoard(message.board);
          }
          break;
        }

        case "MOVE_CARD_RESULT":
        case "MOVE_COLUMN_RESULT":
        case "UPDATE_CARD_RESULT":
        case "ADD_CARD_RESULT":
        case "DELETE_CARD_RESULT":
        case "ADD_COLUMN_RESULT":
        case "DELETE_COLUMN_RESULT":
        case "RENAME_COLUMN_RESULT":
        case "TOGGLE_COLUMN_COMPLETE_RESULT":
        case "TOGGLE_CARD_RESULT":
        case "ADD_BLOCK_ID_RESULT":
        case "INSERT_CARD_RESULT":
        case "ARCHIVE_COLUMN_CARDS_RESULT":
        case "ARCHIVE_CARD_RESULT":
        case "INSERT_COLUMN_RESULT":
        case "ARCHIVE_COLUMN_RESULT":
        case "SORT_COLUMN_RESULT":
        case "ADD_DATE_RESULT":
        case "REMOVE_DATE_RESULT":
        case "ADD_TIME_RESULT":
        case "REMOVE_TIME_RESULT":
        case "NEW_NOTE_FROM_CARD_RESULT":
        case "SPLIT_CARD_RESULT":
        case "DUPLICATE_CARD_RESULT": {
          try {
            if (operationTimeoutRef.current) {
              clearTimeout(operationTimeoutRef.current);
              operationTimeoutRef.current = null;
            }
            pendingOpRef.current = null;
            if (message.success) {
              setBoard(message.board);
              preOpBoardRef.current = null;
            } else {
              if (preOpBoardRef.current) {
                // Revert to pre-operation state
                setBoard(preOpBoardRef.current);
              }
              preOpBoardRef.current = null;
            }
          } finally {
            operationInFlight.current = false;
          }
          break;
        }

        case "ARCHIVE_ALL_CARDS_RESULT": {
          const payload = message as { type: string; success: boolean; archivedCount: number };
          if (payload.success && payload.archivedCount > 0) {
            postMessage({ type: "REQUEST_INIT" });
          }
          break;
        }

        case "SET_VIEW_RESULT": {
          try {
            if (operationTimeoutRef.current) {
              clearTimeout(operationTimeoutRef.current);
              operationTimeoutRef.current = null;
            }
            pendingOpRef.current = null;
            if (message.success) {
              setBoard(message.board);
              preOpBoardRef.current = null;
            } else {
              if (preOpBoardRef.current) {
                setBoard(preOpBoardRef.current);
              }
              preOpBoardRef.current = null;
            }
          } finally {
            operationInFlight.current = false;
          }
          break;
        }

        case "UPDATE_SETTINGS_RESULT": {
          try {
            if (operationTimeoutRef.current) {
              clearTimeout(operationTimeoutRef.current);
              operationTimeoutRef.current = null;
            }
            pendingOpRef.current = null;
            if (message.success) {
              setBoard(message.board);
              preOpBoardRef.current = null;
            } else {
              if (preOpBoardRef.current) {
                setBoard(preOpBoardRef.current);
              }
              preOpBoardRef.current = null;
            }
          } finally {
            operationInFlight.current = false;
          }
          break;
        }

        case "THEME_CHANGE":
          // Theme handling deferred — VS Code CSS vars auto-update
          break;

        case "CYCLE_VIEW": {
          const order: Array<"board" | "table" | "list"> = ["board", "table", "list"];
          setViewModeState((current) => {
            const next = order[(order.indexOf(current) + 1) % order.length]!;
            applySetViewRef.current(next);
            return next;
          });
          break;
        }

        case "SET_VIEW_COMMAND": {
          const { view } = message as { type: string; view: "board" | "table" | "list" };
          setViewModeState(view);
          applySetViewRef.current(view);
          break;
        }

        case "OPEN_SETTINGS": {
          // Dispatched via window event — Board component listens
          window.dispatchEvent(new CustomEvent("kanban:open-settings"));
          break;
        }

        case "ADD_LANE_COMMAND": {
          const { title } = message as { type: string; title: string };
          applyAddColumnRef.current(title);
          break;
        }
      }
    }

    window.addEventListener("message", handleMessage);
    postMessage({ type: "READY" });

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const applyMoveCard = useCallback(
    (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => {
      if (operationInFlight.current) {
        return;
      }
      operationInFlight.current = true;
      // Auto-recovery timeout — clear the flag if no result arrives within 5 seconds
      if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
      operationTimeoutRef.current = setTimeout(() => {
        operationInFlight.current = false;
        operationTimeoutRef.current = null;
      }, 5000);

      setBoard((current) => {
        if (!current) return current;

        // Save pre-operation snapshot for revert on failure
        preOpBoardRef.current = cloneBoard(current);
        pendingOpRef.current = "card";

        // Optimistic update
        const updated = cloneBoard(current);
        const fromColumn = updated.columns.find((c) => c.id === fromColumnId);
        const toColumn = updated.columns.find((c) => c.id === toColumnId);
        if (!fromColumn || !toColumn) return current;

        const cardIndex = fromColumn.cards.findIndex((c) => c.id === cardId);
        if (cardIndex === -1) return current;

        const [card] = fromColumn.cards.splice(cardIndex, 1);

        // Auto-check if dropping into a Complete column
        if (toColumn.complete && !card.checked) {
          card.checked = true;
          card.rawText = card.rawText.replace(/^- \[ \]/, "- [x]");
        }

        toColumn.cards.splice(
          fromColumnId === toColumnId && newIndex > cardIndex ? newIndex - 1 : newIndex,
          0,
          card,
        );

        return updated;
      });

      // Send to host for persistence
      postMessage({
        type: "MOVE_CARD",
        cardId,
        fromColumnId,
        toColumnId,
        newIndex,
      });
    },
    [],
  );

  const applyMoveColumn = useCallback((columnId: string, newIndex: number) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    // Auto-recovery timeout — clear the flag if no result arrives within 5 seconds
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      // Save pre-operation snapshot for revert on failure
      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "column";

      // Optimistic update
      const updated = cloneBoard(current);
      const columnIndex = updated.columns.findIndex((c) => c.id === columnId);
      if (columnIndex === -1) return current;

      const [column] = updated.columns.splice(columnIndex, 1);
      updated.columns.splice(newIndex, 0, column);

      return updated;
    });

    // Send to host for persistence
    postMessage({
      type: "MOVE_COLUMN",
      columnId,
      newIndex,
    });
  }, []);

  const applyUpdateCard = useCallback((cardId: string, columnId: string, text: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    // Auto-recovery timeout — clear the flag if no result arrives within 5 seconds
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      const card = column.cards.find((c) => c.id === cardId);
      if (!card) return current;

      // Optimistic: update text for immediate display
      card.text = text;

      return updated;
    });

    postMessage({
      type: "UPDATE_CARD",
      cardId,
      columnId,
      text,
    });
  }, []);

  const applyAddCard = useCallback((columnId: string, text: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    // Auto-recovery timeout — clear the flag if no result arrives within 5 seconds
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      // Create card with deterministic ID matching host's djb2 hash
      const tempCard = {
        id: djb2Hash(`- [ ] ${text}`),
        text,
        rawText: `- [ ] ${text}`,
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
      };

      const insertMethod = current?.settings?.["new-card-insertion-method"];
      if (insertMethod === "prepend" || insertMethod === "prepend-compact") {
        column.cards.unshift(tempCard);
      } else {
        column.cards.push(tempCard);
      }

      return updated;
    });

    postMessage({
      type: "ADD_CARD",
      columnId,
      text,
    });
  }, []);

  const applyDeleteCard = useCallback((cardId: string, columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    // Auto-recovery timeout — clear the flag if no result arrives within 5 seconds
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      const cardIndex = column.cards.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) return current;

      column.cards.splice(cardIndex, 1);

      return updated;
    });

    postMessage({
      type: "DELETE_CARD",
      cardId,
      columnId,
    });
  }, []);

  const applyAddColumn = useCallback((title: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    // Auto-recovery timeout — clear the flag if no result arrives within 5 seconds
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "column";

      const updated = cloneBoard(current);
      const tempColumn = {
        id: slugify(title),
        title,
        complete: false,
        cards: [],
        rawContent: "",
      };
      updated.columns.push(tempColumn);

      return updated;
    });

    postMessage({
      type: "ADD_COLUMN",
      title,
    });
  }, []);

  const applyDeleteColumn = useCallback((columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    // Auto-recovery timeout — clear the flag if no result arrives within 5 seconds
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "column";

      const updated = cloneBoard(current);
      const columnIndex = updated.columns.findIndex((c) => c.id === columnId);
      if (columnIndex === -1) return current;

      updated.columns.splice(columnIndex, 1);

      return updated;
    });

    postMessage({
      type: "DELETE_COLUMN",
      columnId,
    });
  }, []);

  const applyRenameColumn = useCallback((columnId: string, title: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    // Auto-recovery timeout — clear the flag if no result arrives within 5 seconds
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "column";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      column.title = title;
      column.id = slugify(title);

      return updated;
    });

    postMessage({
      type: "RENAME_COLUMN",
      columnId,
      title,
    });
  }, []);

  const applyToggleColumnComplete = useCallback((columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    // Auto-recovery timeout — clear the flag if no result arrives within 5 seconds
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "column";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      column.complete = !column.complete;

      // When marking column complete, auto-check all unchecked cards
      if (column.complete) {
        column.cards.forEach((card) => {
          if (!card.checked) {
            card.checked = true;
            card.rawText = card.rawText.replace(/^- \[ \]/, "- [x]");
          }
        });
      }

      return updated;
    });

    postMessage({
      type: "TOGGLE_COLUMN_COMPLETE",
      columnId,
    });
  }, []);

  const applyToggleCard = useCallback((cardId: string, columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    // Auto-recovery timeout — clear the flag if no result arrives within 5 seconds
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      const card = column.cards.find((c) => c.id === cardId);
      if (!card) return current;

      // Toggle checked state and rewrite rawText prefix
      card.checked = !card.checked;
      if (card.checked) {
        card.rawText = card.rawText.replace(/^- \[[ x]\]/, "- [x]");
      } else {
        card.rawText = card.rawText.replace(/^- \[[ x]\]/, "- [ ]");
      }

      return updated;
    });

    postMessage({
      type: "TOGGLE_CARD",
      cardId,
      columnId,
    });
  }, []);

  const applyUpdateSettings = useCallback((settings: Record<string, unknown>) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    // Auto-recovery timeout — clear the flag if no result arrives within 5 seconds
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "column";

      const updated = cloneBoard(current);
      if (updated.settings) {
        Object.assign(updated.settings, settings);
      } else {
        updated.settings = { "kanban-plugin": "basic", ...settings };
      }
      return updated;
    });

    postMessage({
      type: "UPDATE_SETTINGS",
      settings,
    });
  }, []);

  const applyInsertCard = useCallback(
    (columnId: string, text: string, position: "before" | "after", referenceCardId: string) => {
      if (operationInFlight.current) {
        return;
      }
      operationInFlight.current = true;
      if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
      operationTimeoutRef.current = setTimeout(() => {
        operationInFlight.current = false;
        operationTimeoutRef.current = null;
      }, 5000);

      setBoard((current) => {
        if (!current) return current;

        preOpBoardRef.current = cloneBoard(current);
        pendingOpRef.current = "card";

        const updated = cloneBoard(current);
        const column = updated.columns.find((c) => c.id === columnId);
        if (!column) return current;

        const refIndex = column.cards.findIndex((c) => c.id === referenceCardId);
        if (refIndex === -1) return current;

        // Create card with deterministic ID matching host's djb2 hash
        const tempCard = {
          id: djb2Hash(`- [ ] ${text}`),
          text,
          rawText: `- [ ] ${text}`,
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
        };

        const insertAt = position === "before" ? refIndex : refIndex + 1;
        column.cards.splice(insertAt, 0, tempCard);

        return updated;
      });

      postMessage({
        type: "INSERT_CARD",
        columnId,
        text,
        position,
        referenceCardId,
      });
    },
    [],
  );

  const applyAddBlockId = useCallback((cardId: string, columnId: string, blockId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      const card = column.cards.find((c) => c.id === cardId);
      if (!card) return current;

      // Update blockId in metadata and append to rawText
      card.metadata.blockId = blockId;
      card.rawText = card.rawText.replace(/\s*\^[a-zA-Z0-9-]+$/, "") + ` ^${blockId}`;

      return updated;
    });

    postMessage({
      type: "ADD_BLOCK_ID",
      cardId,
      columnId,
      blockId,
    });
  }, []);

  const applyArchiveColumnCards = useCallback((columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "column";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      // Find or create Archive column
      let archiveColumn = updated.columns.find((c) => c.title === "Archive");
      if (!archiveColumn) {
        archiveColumn = {
          id: "archive",
          title: "Archive",
          complete: false,
          cards: [],
          rawContent: "",
        };
        updated.columns.push(archiveColumn);
      }

      const checkedCards = column.cards.filter((c) => c.checked);
      const uncheckedCards = column.cards.filter((c) => !c.checked);

      if (checkedCards.length === 0) return current;

      column.cards = uncheckedCards;
      archiveColumn.cards.push(...checkedCards);

      return updated;
    });

    postMessage({
      type: "ARCHIVE_COLUMN_CARDS",
      columnId,
    });
  }, []);

  const applyArchiveAllCards = useCallback(() => {
    postMessage({ type: "ARCHIVE_ALL_CARDS" });
  }, []);

  const applyInsertColumn = useCallback(
    (title: string, position: "before" | "after", referenceColumnId: string) => {
      if (operationInFlight.current) {
        return;
      }
      operationInFlight.current = true;
      if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
      operationTimeoutRef.current = setTimeout(() => {
        operationInFlight.current = false;
        operationTimeoutRef.current = null;
      }, 5000);

      setBoard((current) => {
        if (!current) return current;

        preOpBoardRef.current = cloneBoard(current);
        pendingOpRef.current = "column";

        const updated = cloneBoard(current);
        const refIndex = updated.columns.findIndex((c) => c.id === referenceColumnId);
        if (refIndex === -1) return current;

        const newColumn = {
          id: slugify(title),
          title,
          complete: false,
          cards: [],
          rawContent: "",
        };

        const insertAt = position === "before" ? refIndex : refIndex + 1;
        updated.columns.splice(insertAt, 0, newColumn);

        return updated;
      });

      postMessage({
        type: "INSERT_COLUMN",
        title,
        position,
        referenceColumnId,
      });
    },
    [],
  );

  const applyArchiveColumn = useCallback((columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "column";

      const updated = cloneBoard(current);
      const columnIndex = updated.columns.findIndex((c) => c.id === columnId);
      if (columnIndex === -1) return current;

      const column = updated.columns[columnIndex];
      if (!column) return current;

      // Find or create Archive column
      let archiveColumn = updated.columns.find((c) => c.title === "Archive");
      if (!archiveColumn) {
        archiveColumn = {
          id: "archive",
          title: "Archive",
          complete: false,
          cards: [],
          rawContent: "",
        };
        updated.columns.push(archiveColumn);
      }

      // Move all cards to archive, then remove column
      archiveColumn.cards.push(...column.cards);
      updated.columns.splice(columnIndex, 1);

      return updated;
    });

    postMessage({
      type: "ARCHIVE_COLUMN",
      columnId,
    });
  }, []);

  const applySortColumn = useCallback(
    (columnId: string, sortKey: string, direction: "asc" | "desc") => {
      if (operationInFlight.current) {
        return;
      }
      operationInFlight.current = true;
      if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
      operationTimeoutRef.current = setTimeout(() => {
        operationInFlight.current = false;
        operationTimeoutRef.current = null;
      }, 5000);

      setBoard((current) => {
        if (!current) return current;

        preOpBoardRef.current = cloneBoard(current);
        pendingOpRef.current = "column";

        const updated = cloneBoard(current);
        const column = updated.columns.find((c) => c.id === columnId);
        if (!column) return current;

        const dir = direction === "asc" ? 1 : -1;

        column.cards.sort((a, b) => {
          let cmp = 0;
          switch (sortKey) {
            case "text":
              cmp = a.text.localeCompare(b.text);
              break;
            case "date": {
              const getDate = (card: typeof a): string | null =>
                card.metadata.dueDate ??
                card.metadata.scheduledDate ??
                card.metadata.createdDate ??
                card.metadata.startDate ??
                (card.metadata.dueDates.length > 0 ? (card.metadata.dueDates[0] ?? null) : null);
              const dateA = getDate(a);
              const dateB = getDate(b);
              if (dateA && dateB) cmp = dateA.localeCompare(dateB);
              else if (dateA) cmp = -1;
              else if (dateB) cmp = 1;
              break;
            }
            case "tags": {
              const tagA = a.metadata.tags.length > 0 ? (a.metadata.tags[0] ?? "") : "";
              const tagB = b.metadata.tags.length > 0 ? (b.metadata.tags[0] ?? "") : "";
              cmp = tagA.localeCompare(tagB);
              break;
            }
            case "priority": {
              const priA = a.metadata.priority;
              const priB = b.metadata.priority;
              if (priA !== null && priB !== null) cmp = priA - priB;
              else if (priA !== null) cmp = -1;
              else if (priB !== null) cmp = 1;
              break;
            }
            default: {
              if (sortKey.startsWith("metadata:")) {
                const key = sortKey.slice("metadata:".length);
                const metaA = a.metadata.inlineMetadata.find((m) => m.key === key);
                const metaB = b.metadata.inlineMetadata.find((m) => m.key === key);
                if (metaA && metaB) cmp = metaA.value.localeCompare(metaB.value);
                else if (metaA) cmp = -1;
                else if (metaB) cmp = 1;
              }
              break;
            }
          }
          return cmp * dir;
        });

        return updated;
      });

      postMessage({
        type: "SORT_COLUMN",
        columnId,
        sortKey,
        direction,
      });
    },
    [],
  );

  const applySetView = useCallback((view: "board" | "table" | "list") => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;
      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "column"; // reuse existing pending op type

      const updated = cloneBoard(current);
      if (updated.settings) {
        updated.settings["set-view"] = view;
      }
      return updated;
    });

    setViewModeState(view);

    postMessage({
      type: "SET_VIEW",
      view,
    });
  }, []);

  const applyArchiveCard = useCallback((cardId: string, columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      const cardIndex = column.cards.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) return current;

      const card = column.cards[cardIndex];
      if (!card) return current;

      // Find or create Archive column
      let archiveColumn = updated.columns.find((c) => c.title === "Archive");
      if (!archiveColumn) {
        archiveColumn = {
          id: "archive",
          title: "Archive",
          complete: false,
          cards: [],
          rawContent: "",
        };
        updated.columns.push(archiveColumn);
      }

      // Remove from source and add to archive
      column.cards.splice(cardIndex, 1);
      archiveColumn.cards.push(card);

      return updated;
    });

    postMessage({
      type: "ARCHIVE_CARD",
      cardId,
      columnId,
    });
  }, []);

  const applyAddDate = useCallback((cardId: string, columnId: string, date: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      const card = column.cards.find((c) => c.id === cardId);
      if (!card) return current;

      // Add date marker to rawText directly to preserve existing metadata
      const dateMarker = `@{${date}}`;
      if (!card.text.includes(dateMarker)) {
        const oldRawText = card.rawText;
        if (oldRawText.includes("\n  ")) {
          card.rawText = `${oldRawText}\n  ${dateMarker}`;
        } else {
          card.rawText = `${oldRawText} ${dateMarker}`;
        }
        // Update metadata with the new date
        if (!card.metadata.dueDates.includes(date)) {
          card.metadata.dueDates.push(date);
        }
      }

      return updated;
    });

    postMessage({
      type: "ADD_DATE",
      cardId,
      columnId,
      date,
    });
  }, []);

  const applyRemoveDate = useCallback((cardId: string, columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      const card = column.cards.find((c) => c.id === cardId);
      if (!card) return current;

      // Remove date markers directly from rawText to preserve other metadata
      card.rawText = card.rawText.replace(/\s*@\{\d{4}-\d{2}-\d{2}\}/g, "");
      // Clear all due dates from metadata
      card.metadata.dueDates = [];

      return updated;
    });

    postMessage({
      type: "REMOVE_DATE",
      cardId,
      columnId,
    });
  }, []);

  const applyAddTime = useCallback((cardId: string, columnId: string, time: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      const card = column.cards.find((c) => c.id === cardId);
      if (!card) return current;

      // Add time marker to rawText directly to preserve existing metadata
      const timeMarker = `@{${time}}`;
      if (!card.text.includes(timeMarker)) {
        const oldRawText = card.rawText;
        if (oldRawText.includes("\n  ")) {
          card.rawText = `${oldRawText}\n  ${timeMarker}`;
        } else {
          card.rawText = `${oldRawText} ${timeMarker}`;
        }
        // Update metadata with the new time
        if (!card.metadata.times.includes(time)) {
          card.metadata.times.push(time);
        }
      }

      return updated;
    });

    postMessage({
      type: "ADD_TIME",
      cardId,
      columnId,
      time,
    });
  }, []);

  const applyRemoveTime = useCallback((cardId: string, columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      const updated = cloneBoard(current);
      const column = updated.columns.find((c) => c.id === columnId);
      if (!column) return current;

      const card = column.cards.find((c) => c.id === cardId);
      if (!card) return current;

      // Remove time markers directly from rawText to preserve other metadata
      card.rawText = card.rawText.replace(/\s*@\{\d{2}:\d{2}\}/g, "");
      // Clear all times from metadata
      card.metadata.times = [];

      return updated;
    });

    postMessage({
      type: "REMOVE_TIME",
      cardId,
      columnId,
    });
  }, []);

  const applyNewNoteFromCard = useCallback((cardId: string, columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      // Optimistic: wikilink will be added by host, but we don't know the filename yet
      // Just mark operation in-flight; board will be updated on result
      return current;
    });

    postMessage({
      type: "NEW_NOTE_FROM_CARD",
      cardId,
      columnId,
    });
  }, []);

  const applySplitCard = useCallback((cardId: string, columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      // Optimistic: board will be updated by host with split cards
      return current;
    });

    postMessage({
      type: "SPLIT_CARD",
      cardId,
      columnId,
    });
  }, []);

  const applyDuplicateCard = useCallback((cardId: string, columnId: string) => {
    if (operationInFlight.current) {
      return;
    }
    operationInFlight.current = true;
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    operationTimeoutRef.current = setTimeout(() => {
      operationInFlight.current = false;
      operationTimeoutRef.current = null;
    }, 5000);

    setBoard((current) => {
      if (!current) return current;

      preOpBoardRef.current = cloneBoard(current);
      pendingOpRef.current = "card";

      // Optimistic: board will be updated by host with duplicated card
      return current;
    });

    postMessage({
      type: "DUPLICATE_CARD",
      cardId,
      columnId,
    });
  }, []);

  const setViewMode = useCallback(
    (view: "board" | "table" | "list") => {
      setViewModeState(view);
      applySetView(view);
    },
    [applySetView],
  );

  // Sync callbacks into refs so useEffect message handler can call them
  applySetViewRef.current = applySetView;
  applyAddColumnRef.current = applyAddColumn;

  return {
    board,
    settings: board?.settings ?? null,
    fileName,
    viewMode,
    setViewMode,
    applyMoveCard,
    applyMoveColumn,
    applyUpdateCard,
    applyAddCard,
    applyDeleteCard,
    applyAddColumn,
    applyDeleteColumn,
    applyRenameColumn,
    applyToggleColumnComplete,
    applyToggleCard,
    applyUpdateSettings,
    applyInsertCard,
    applyAddBlockId,
    applyArchiveColumnCards,
    applyArchiveAllCards,
    applyInsertColumn,
    applyArchiveColumn,
    applySortColumn,
    applySetView,
    applyArchiveCard,
    applyAddDate,
    applyRemoveDate,
    applyAddTime,
    applyRemoveTime,
    applyNewNoteFromCard,
    applySplitCard,
    applyDuplicateCard,
  };
}
