import { useState, useCallback, useRef, useEffect } from "react";
import { postMessage } from "./hooks/useVSCodeAPI.js";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Board } from "./components/Board.js";
import { Card } from "./components/Card.js";
import { useBoardState } from "./hooks/useBoardState.js";
import type { Card as CardType } from "../../src/parser/types.ts";
import type { DateColor } from "../../src/parser/types.ts";
import type { DataKey } from "../../src/parser/types.ts";
import "./styles/tokens.css";
import "./styles/board.css";
import "./styles/appearance.css";

/** Root application component managing drag-and-drop context and board state. */
export function App(): React.ReactElement | null {
  const {
    board,
    settings,
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
    applyInsertColumn,
    applyArchiveColumn,
    applySortColumn,
    applyArchiveCard,
    applyNewNoteFromCard,
    applySplitCard,
    applyDuplicateCard,
    applyArchiveAllCards,
  } = useBoardState();
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const dragOverColumnIdRef = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Propagate accent color to :root scope so appearance.css can use it
  useEffect(() => {
    const accentColor = board?.settings?.["accent-color"] as string | undefined;
    if (accentColor) {
      document.documentElement.style.setProperty("--board-accent-color", accentColor);
    } else {
      document.documentElement.style.removeProperty("--board-accent-color");
    }
  }, [board]);

  /** Captures the dragged card for the DragOverlay preview. */
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setDragOverColumnId(null);
      dragOverColumnIdRef.current = null;

      const data = event.active.data.current;
      if (data?.type === "card" && board) {
        // Find the card for the overlay preview
        for (const col of board.columns) {
          const card = col.cards.find((c) => c.id === data.cardId);
          if (card) {
            setActiveCard(card);
            setActiveColumnId(data.columnId);
            break;
          }
        }
      }
    },
    [board],
  );

  /** Tracks which column the pointer is over during drag (resolves through card or column droppable). */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    let newColumnId: string | null = null;

    if (over) {
      const overData = over.data.current as { type?: string; columnId?: string };
      if (overData?.type === "card" || overData?.type === "column") {
        newColumnId = overData.columnId ?? null;
      }
    }

    if (newColumnId !== dragOverColumnIdRef.current) {
      dragOverColumnIdRef.current = newColumnId;
      setDragOverColumnId(newColumnId);
    }
  }, []);

  /** Opens the current board file as Markdown in the default editor. */
  const applyOpenAsMarkdown = useCallback(() => {
    postMessage({ type: "OPEN_BOARD_FILE" });
  }, []);

  /** Resolves drag-and-drop completion — dispatches card or column move. */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Clear overlay state
      setActiveCard(null);
      setActiveColumnId(null);
      setDragOverColumnId(null);

      if (!over || !board) {
        return;
      }

      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData?.type === "card" && overData?.type === "card") {
        const fromCol = activeData.columnId;
        const toCol = overData.columnId;
        const cardId = activeData.cardId;
        let newIndex = overData.index;
        // Same-column reorder: adjust for post-removal index shift
        if (fromCol === toCol && newIndex > activeData.index) {
          newIndex--;
        }
        applyMoveCard(cardId, fromCol, toCol, newIndex);
      } else if (activeData?.type === "card" && overData?.type === "column") {
        const toCol = overData.columnId;
        const fromCol = activeData.columnId;
        const toColumn = board.columns.find((c) => c.id === toCol);
        const cardId = activeData.cardId;

        let toIndex: number;
        const translatedRect = active.rect.current.translated;
        if (translatedRect) {
          // Compute insertion index from the dragged card's final translated position
          const draggedCenterY = translatedRect.top + translatedRect.height / 2;
          const allCardEls = Array.from(
            document.querySelectorAll<HTMLElement>(`[data-card-id][data-column-id="${toCol}"]`),
          )
            .filter((el) => el.getAttribute("data-card-id") !== cardId)
            .map((el) => ({
              id: el.getAttribute("data-card-id")!,
              rect: el.getBoundingClientRect(),
            }))
            .sort((a, b) => a.rect.top - b.rect.top);

          toIndex = allCardEls.length;
          for (let i = 0; i < allCardEls.length; i++) {
            const cardCenterY = allCardEls[i]!.rect.top + allCardEls[i]!.rect.height / 2;
            if (draggedCenterY < cardCenterY) {
              toIndex = i;
              break;
            }
          }
        } else {
          // Fallback: same-column keeps position, cross-column appends
          toIndex = fromCol === toCol ? activeData.index : (toColumn?.cards.length ?? 0);
        }

        applyMoveCard(cardId, fromCol, toCol, toIndex);
      } else if (activeData?.type === "column" && overData?.type === "column") {
        const oldIndex = board.columns.findIndex((c) => c.id === activeData.columnId);
        const newIndex = board.columns.findIndex((c) => c.id === overData.columnId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          applyMoveColumn(activeData.columnId, newIndex);
        }
      } else {
      }
    },
    [board, applyMoveCard, applyMoveColumn],
  );

  if (!board) {
    return null;
  }

  const dateDisplayFormat =
    (settings?.["date-display-format"] as string | undefined) ?? "YYYY-MM-DD";
  const showCheckboxes = settings?.["show-checkboxes"] !== false;
  const moveDates = settings?.["move-dates"] === true;
  const moveTags = settings?.["move-tags"] === true;
  const showRelativeDate = settings?.["show-relative-date"] === true;
  const dateColors = (settings?.["date-colors"] as DateColor[] | undefined) ?? [];
  const inlineMetadataPosition =
    (settings?.["inline-metadata-position"] as "body" | "footer" | "metadata-table" | undefined) ??
    "body";
  const moveTaskMetadata = settings?.["move-task-metadata"] === true;
  const metadataKeys = (settings?.["metadata-keys"] as DataKey[] | undefined) ?? [];

  // Extract cssClasses from board state for board-level styling
  const cssClasses = board.cssClasses ?? [];
  const rootClassName = cssClasses.length > 0 ? cssClasses.join(" ") : undefined;

  return (
    <div
      style={
        board?.settings?.["accent-color"]
          ? ({ "--board-accent-color": board.settings["accent-color"] } as React.CSSProperties)
          : undefined
      }
    >
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Board
          className={rootClassName}
          board={board}
          settings={settings}
          fileName={fileName}
          viewMode={viewMode}
          onSetView={setViewMode}
          dragOverColumnId={dragOverColumnId}
          onUpdateCard={applyUpdateCard}
          onDeleteCard={applyDeleteCard}
          onAddCard={applyAddCard}
          onAddColumn={applyAddColumn}
          onDeleteColumn={applyDeleteColumn}
          onRenameColumn={applyRenameColumn}
          onToggleColumnComplete={applyToggleColumnComplete}
          onToggleCard={applyToggleCard}
          onUpdateSettings={applyUpdateSettings}
          onInsertCard={applyInsertCard}
          onMoveCard={applyMoveCard}
          onAddBlockId={applyAddBlockId}
          onArchiveColumnCards={applyArchiveColumnCards}
          onInsertColumn={applyInsertColumn}
          onArchiveColumn={applyArchiveColumn}
          onSortColumn={applySortColumn}
          onArchiveCard={applyArchiveCard}
          onNewNoteFromCard={applyNewNoteFromCard}
          onSplitCard={applySplitCard}
          onDuplicateCard={applyDuplicateCard}
          onOpenAsMarkdown={applyOpenAsMarkdown}
          onArchiveAll={applyArchiveAllCards}
        />
        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <Card
              card={activeCard}
              columnId={activeColumnId ?? ""}
              isOverlay
              dateDisplayFormat={dateDisplayFormat}
              showCheckboxes={showCheckboxes}
              moveDates={moveDates}
              moveTags={moveTags}
              showRelativeDate={showRelativeDate}
              dateColors={dateColors}
              inlineMetadataPosition={inlineMetadataPosition}
              moveTaskMetadata={moveTaskMetadata}
              metadataKeys={metadataKeys}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
