import { useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardState } from "../../../src/parser/types.ts";
import type { DateColor } from "../../../src/parser/types.ts";
import type { Column as ColumnType } from "../../../src/parser/types.ts";
import type { TagColor } from "../../../src/parser/types.ts";
import type { TagSort } from "../../../src/parser/types.ts";
import type { DataKey } from "../../../src/parser/types.ts";
import { Card } from "./Card.js";

/** Props for the ListView component — board state, list-specific settings, and callbacks. */
interface ListViewProps {
  board: BoardState;
  fullListLaneWidth?: boolean;
  listCollapse?: boolean[];
  dateFormat?: string;
  dateDisplayFormat?: string;
  showCheckboxes?: boolean;
  moveDates?: boolean;
  moveTags?: boolean;
  tagColors?: TagColor[];
  tagSort?: TagSort[];
  tagAction?: "kanban" | "obsidian";
  onTagFilter?: (tag: string) => void;
  showRelativeDate?: boolean;
  dateColors?: DateColor[];
  inlineMetadataPosition?: "body" | "footer" | "metadata-table";
  moveTaskMetadata?: boolean;
  metadataKeys?: DataKey[];
  hideCardCount?: boolean;
  dragOverColumnId?: string | null;
  onUpdateCard?: (cardId: string, columnId: string, newText: string) => void;
  onDeleteCard?: (cardId: string, columnId: string) => void;
  onAddCard?: (columnId: string, text: string) => void;
  onRenameColumn?: (columnId: string, title: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onToggleColumnComplete?: (columnId: string) => void;
  onToggleCard?: (cardId: string, columnId: string) => void;
  onInsertCard?: (
    columnId: string,
    text: string,
    position: "before" | "after",
    referenceCardId: string,
  ) => void;
  onMoveCard?: (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => void;
  onAddBlockId?: (cardId: string, columnId: string, blockId: string) => void;
  boardColumns?: Array<{ id: string; title: string; cardCount: number }>;
  searchDimmedCardIds?: Set<string> | null;
}

/**
 * Renders the board in list view — columns stacked vertically with full-width cards.
 * Each column is collapsible via a toggle button in the header.
 */
export function ListView({
  board,
  fullListLaneWidth = false,
  listCollapse = [],
  dateFormat = "YYYY-MM-DD",
  dateDisplayFormat = "YYYY-MM-DD",
  showCheckboxes = true,
  moveDates = false,
  moveTags = false,
  tagColors = [],
  tagSort = [],
  tagAction = "obsidian",
  onTagFilter,
  showRelativeDate = false,
  dateColors = [],
  inlineMetadataPosition = "body",
  moveTaskMetadata = false,
  metadataKeys = [],
  hideCardCount = false,
  dragOverColumnId,
  onUpdateCard,
  onDeleteCard,
  onAddCard,
  onRenameColumn,
  onDeleteColumn,
  onToggleColumnComplete,
  onToggleCard,
  onInsertCard,
  onMoveCard,
  onAddBlockId,
  boardColumns,
  searchDimmedCardIds,
}: ListViewProps): React.ReactElement {
  // Pass metadata settings to ListColumn (they're needed for card display)
  void moveTaskMetadata;
  void metadataKeys;
  // Track collapsed state per column (index-based)
  const [collapsed, setCollapsed] = useState<boolean[]>(() => {
    // Initialize collapsed state from settings, defaulting to expanded
    return board.columns.map((_, i) => listCollapse[i] ?? false);
  });

  const handleToggleCollapse = useCallback((columnIndex: number) => {
    setCollapsed((prev) => {
      const newCollapsed = [...prev];
      newCollapsed[columnIndex] = !newCollapsed[columnIndex];
      return newCollapsed;
    });
  }, []);

  return (
    <div className="list-view">
      {board.columns.map((column, index) => (
        <ListColumn
          key={column.id}
          column={column}
          columnIndex={index}
          fullListLaneWidth={fullListLaneWidth}
          isCollapsed={collapsed[index] ?? false}
          onToggleCollapse={() => handleToggleCollapse(index)}
          dateFormat={dateFormat}
          dateDisplayFormat={dateDisplayFormat}
          showCheckboxes={showCheckboxes}
          moveDates={moveDates}
          moveTags={moveTags}
          tagColors={tagColors}
          tagSort={tagSort}
          tagAction={tagAction}
          onTagFilter={onTagFilter}
          showRelativeDate={showRelativeDate}
          dateColors={dateColors}
          inlineMetadataPosition={inlineMetadataPosition}
          moveTaskMetadata={moveTaskMetadata}
          metadataKeys={metadataKeys}
          hideCardCount={hideCardCount}
          dragOverColumnId={dragOverColumnId}
          onUpdateCard={onUpdateCard}
          onDeleteCard={onDeleteCard}
          onAddCard={onAddCard}
          onRenameColumn={onRenameColumn}
          onDeleteColumn={onDeleteColumn}
          onToggleColumnComplete={onToggleColumnComplete}
          onToggleCard={onToggleCard}
          onInsertCard={onInsertCard}
          onMoveCard={onMoveCard}
          onAddBlockId={onAddBlockId}
          boardColumns={boardColumns}
          searchDimmedCardIds={searchDimmedCardIds}
        />
      ))}
    </div>
  );
}

/** Props for the ListColumn component — column data and all card/column handlers. */
interface ListColumnProps {
  column: ColumnType;
  columnIndex: number;
  fullListLaneWidth?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  dateFormat?: string;
  dateDisplayFormat?: string;
  showCheckboxes?: boolean;
  moveDates?: boolean;
  moveTags?: boolean;
  tagColors?: TagColor[];
  tagSort?: TagSort[];
  tagAction?: "kanban" | "obsidian";
  onTagFilter?: (tag: string) => void;
  showRelativeDate?: boolean;
  dateColors?: DateColor[];
  inlineMetadataPosition?: "body" | "footer" | "metadata-table";
  moveTaskMetadata?: boolean;
  metadataKeys?: DataKey[];
  hideCardCount?: boolean;
  dragOverColumnId?: string | null;
  onUpdateCard?: (cardId: string, columnId: string, newText: string) => void;
  onDeleteCard?: (cardId: string, columnId: string) => void;
  onAddCard?: (columnId: string, text: string) => void;
  onRenameColumn?: (columnId: string, title: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onToggleColumnComplete?: (columnId: string) => void;
  onToggleCard?: (cardId: string, columnId: string) => void;
  onInsertCard?: (
    columnId: string,
    text: string,
    position: "before" | "after",
    referenceCardId: string,
  ) => void;
  onMoveCard?: (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => void;
  onAddBlockId?: (cardId: string, columnId: string, blockId: string) => void;
  boardColumns?: Array<{ id: string; title: string; cardCount: number }>;
  searchDimmedCardIds?: Set<string> | null;
}

/** Renders a collapsible column section for list view. */
function ListColumn({
  column,
  columnIndex: _columnIndex,
  fullListLaneWidth,
  isCollapsed,
  onToggleCollapse,
  dateFormat = "YYYY-MM-DD",
  dateDisplayFormat = "YYYY-MM-DD",
  showCheckboxes = true,
  moveDates = false,
  moveTags = false,
  tagColors = [],
  tagSort = [],
  tagAction = "obsidian",
  onTagFilter,
  showRelativeDate = false,
  dateColors = [],
  inlineMetadataPosition = "body",
  moveTaskMetadata = false,
  metadataKeys = [],
  hideCardCount = false,
  dragOverColumnId,
  onUpdateCard,
  onDeleteCard,
  onAddCard: _onAddCard,
  onRenameColumn: _onRenameColumn,
  onDeleteColumn: _onDeleteColumn,
  onToggleColumnComplete: _onToggleColumnComplete,
  onToggleCard,
  onInsertCard,
  onMoveCard,
  onAddBlockId,
  boardColumns,
  searchDimmedCardIds,
}: ListColumnProps): React.ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `list-col-${column.id}`,
    data: { type: "list-column", columnId: column.id },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `list-droppable-${column.id}`,
    data: { type: "list-column", columnId: column.id },
  });

  const isColumnDragOver = isOver || dragOverColumnId === column.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const columnClassName = `list-column${isDragging ? " dragging" : ""}${
    fullListLaneWidth ? " full-width" : ""
  }${isCollapsed ? " collapsed" : ""}`;

  const headerClassName = `list-column-header${isCollapsed ? " collapsed" : ""}`;

  const contentClassName = `list-column-content${isColumnDragOver ? " drag-over" : ""}${
    isCollapsed ? " collapsed" : ""
  }`;

  return (
    <div ref={setSortableRef} className={columnClassName} style={style}>
      <div className={headerClassName} {...attributes} {...listeners}>
        <button
          className="list-column-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse?.();
          }}
          aria-label={isCollapsed ? "Expand column" : "Collapse column"}
        >
          {isCollapsed ? "▸" : "▾"}
        </button>
        <span className="list-column-title">
          {column.title}
          {column.complete && <span className="column-complete-badge">✓</span>}
        </span>
        {!hideCardCount && <span className="column-count">({column.cards.length})</span>}
      </div>
      <div ref={setDroppableRef} className={contentClassName}>
        <SortableContext
          items={column.cards.map((card) => `card-${card.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {column.cards.map((card, cardIndex) => (
            <div key={card.id} className="list-card-wrapper">
              <Card
                card={card}
                columnId={column.id}
                cardIndex={cardIndex}
                dateFormat={dateFormat}
                timeFormat="HH:mm"
                dateDisplayFormat={dateDisplayFormat}
                showCheckboxes={showCheckboxes}
                moveDates={moveDates}
                moveTags={moveTags}
                tagColors={tagColors}
                tagSort={tagSort}
                tagAction={tagAction}
                onTagFilter={onTagFilter}
                showRelativeDate={showRelativeDate}
                dateColors={dateColors}
                inlineMetadataPosition={inlineMetadataPosition}
                moveTaskMetadata={moveTaskMetadata}
                metadataKeys={metadataKeys}
                onUpdate={onUpdateCard}
                onDelete={onDeleteCard}
                onToggle={onToggleCard}
                onInsertCard={onInsertCard}
                onMoveCard={onMoveCard}
                onAddBlockId={onAddBlockId}
                boardColumns={boardColumns}
                searchDimmed={
                  searchDimmedCardIds !== null &&
                  searchDimmedCardIds !== undefined &&
                  !searchDimmedCardIds.has(card.id)
                }
              />
            </div>
          ))}
        </SortableContext>
        {column.cards.length === 0 && !isCollapsed && <div className="column-empty">No cards</div>}
      </div>
    </div>
  );
}
