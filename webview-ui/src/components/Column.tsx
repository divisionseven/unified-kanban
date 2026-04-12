import { useState, useCallback, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Column as ColumnType } from "../../../src/parser/types.ts";
import type { DateColor } from "../../../src/parser/types.ts";
import type { TagColor } from "../../../src/parser/types.ts";
import type { TagSort } from "../../../src/parser/types.ts";
import type { DataKey } from "../../../src/parser/types.ts";
import { Card } from "./Card.js";
import { InlineEdit } from "./InlineEdit.js";
import { usePortalDropdown } from "../hooks/usePortalDropdown.js";
import { PortalDropdown } from "./PortalDropdown.js";
import { PenTool, Archive, Plus, ArrowUpDown, CheckCircle, Trash2 } from "lucide-react";

/** Props for the Column component — column data and card/column mutation callbacks. */
interface ColumnProps {
  column: ColumnType;
  laneWidth?: number;
  dateFormat?: string;
  timeFormat?: string;
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
  configuredMetadataKeys?: DataKey[];
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
  onArchiveColumnCards?: (columnId: string) => void;
  onInsertColumn?: (title: string, position: "before" | "after", referenceColumnId: string) => void;
  onArchiveColumn?: (columnId: string) => void;
  onSortColumn?: (columnId: string, sortKey: string, direction: "asc" | "desc") => void;
  onArchiveCard?: (cardId: string, columnId: string) => void;
  onNewNoteFromCard?: (cardId: string, columnId: string) => void;
  onSplitCard?: (cardId: string, columnId: string) => void;
  onDuplicateCard?: (cardId: string, columnId: string) => void;
  searchDimmedCardIds?: Set<string> | null;
}

/** Renders a sortable, droppable column with card list, inline add, rename, and delete. */
export function Column({
  column,
  laneWidth = 270,
  dateFormat = "YYYY-MM-DD",
  timeFormat = "HH:mm",
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
  configuredMetadataKeys = [],
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
  onArchiveColumnCards,
  onInsertColumn,
  onArchiveColumn,
  onSortColumn,
  onArchiveCard,
  onNewNoteFromCard,
  onSplitCard,
  onDuplicateCard,
  searchDimmedCardIds = null,
}: ColumnProps): React.ReactElement {
  const [isAdding, setIsAdding] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [insertPosition, setInsertPosition] = useState<"before" | "after" | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const dropdown = usePortalDropdown();

  // Sortable context for column reordering
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `col-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  // Droppable context for accepting cards
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  const isColumnDragOver = isOver || dragOverColumnId === column.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleAddClick = useCallback(() => {
    setIsAdding(true);
  }, []);

  const handleAddConfirm = useCallback(
    (text: string) => {
      setIsAdding(false);
      if (text.trim() && onAddCard) {
        onAddCard(column.id, text.trim());
      }
    },
    [onAddCard, column.id],
  );

  const handleAddCancel = useCallback(() => {
    setIsAdding(false);
  }, []);

  const handleMenuToggle = useCallback(
    (e: React.MouseEvent) => {
      if (dropdown.isOpen) {
        dropdown.close();
      } else {
        dropdown.open(e);
      }
    },
    [dropdown],
  );

  const handleRename = useCallback(() => {
    dropdown.close();
    setIsRenaming(true);
  }, [dropdown]);

  const handleRenameConfirm = useCallback(
    (newTitle: string) => {
      setIsRenaming(false);
      if (onRenameColumn && newTitle !== column.title) {
        onRenameColumn(column.id, newTitle);
      }
    },
    [onRenameColumn, column.id, column.title],
  );

  const handleRenameCancel = useCallback(() => {
    setIsRenaming(false);
  }, []);

  const handleDelete = useCallback(() => {
    dropdown.close();
    if (!onDeleteColumn) return;
    if (column.cards.length > 0) {
      const confirmed = window.confirm(
        `This column has ${column.cards.length} card${column.cards.length === 1 ? "" : "s"}. Delete anyway?`,
      );
      if (confirmed) {
        onDeleteColumn(column.id);
      }
    } else {
      onDeleteColumn(column.id);
    }
  }, [onDeleteColumn, column.id, column.cards.length, dropdown]);

  const handleToggleComplete = useCallback(() => {
    dropdown.close();
    if (onToggleColumnComplete) {
      onToggleColumnComplete(column.id);
    }
  }, [onToggleColumnComplete, column.id, dropdown]);

  const handleArchiveColumnCards = useCallback(() => {
    dropdown.close();
    if (onArchiveColumnCards) {
      onArchiveColumnCards(column.id);
    }
  }, [onArchiveColumnCards, column.id, dropdown]);

  const handleInsertBefore = useCallback(() => {
    setInsertPosition("before");
  }, []);

  const handleInsertAfter = useCallback(() => {
    setInsertPosition("after");
  }, []);

  const handleInsertConfirm = useCallback(
    (title: string) => {
      setInsertPosition(null);
      dropdown.close();
      if (title.trim() && onInsertColumn) {
        onInsertColumn(title.trim(), insertPosition ?? "after", column.id);
      }
    },
    [onInsertColumn, column.id, insertPosition, dropdown],
  );

  const handleInsertCancel = useCallback(() => {
    setInsertPosition(null);
  }, []);

  const handleSort = useCallback(
    (sortKey: string, direction: "asc" | "desc") => {
      dropdown.close();
      setShowSortMenu(false);
      if (onSortColumn) {
        onSortColumn(column.id, sortKey, direction);
      }
    },
    [onSortColumn, column.id, dropdown],
  );

  const handleArchiveColumn = useCallback(() => {
    dropdown.close();
    if (onArchiveColumn) {
      onArchiveColumn(column.id);
    }
  }, [onArchiveColumn, column.id, dropdown]);

  const handleSortMenuToggle = useCallback(() => {
    setShowSortMenu((prev) => !prev);
  }, []);

  const inlineMetadataKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const card of column.cards) {
      for (const meta of card.metadata.inlineMetadata) {
        keys.add(meta.key);
      }
    }
    return Array.from(keys).sort();
  }, [column.cards]);

  const handleHeaderDoubleClick = useCallback(() => {
    setIsRenaming(true);
  }, []);

  if (isRenaming) {
    return (
      <div
        ref={setSortableRef}
        className={`column${isDragging ? " dragging" : ""}`}
        style={{ ...style, minWidth: laneWidth, maxWidth: laneWidth }}
      >
        <div className="column-header" {...attributes} {...listeners}>
          <InlineEdit
            defaultValue={column.title}
            placeholder="Column title..."
            onConfirm={handleRenameConfirm}
            onCancel={handleRenameCancel}
            className="column-title-edit"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setSortableRef}
      className={`column${isDragging ? " dragging" : ""}`}
      style={{ ...style, minWidth: laneWidth, maxWidth: laneWidth }}
    >
      <div className="column-header" {...attributes} {...listeners}>
        <h2
          className={`column-title${column.complete ? " complete" : ""}`}
          onDoubleClick={handleHeaderDoubleClick}
        >
          {column.title}
          {column.complete && <span className="column-complete-badge">✓</span>}
        </h2>
        {!hideCardCount && <span className="column-count">{column.cards.length}</span>}
        <div className="column-menu">
          <button
            ref={dropdown.triggerRef}
            className="column-menu-trigger"
            onClick={handleMenuToggle}
            aria-label="Column actions"
          >
            ⋯
          </button>
          <PortalDropdown
            isOpen={dropdown.isOpen}
            position={dropdown.position}
            onClose={dropdown.close}
            dropdownClassName="column-menu-dropdown"
          >
            {/* Rename */}
            <button className="column-menu-item" onClick={handleRename}>
              <PenTool size={14} />
              Rename
            </button>

            <div className="column-menu-separator" />

            {/* Archive completed cards */}
            <button className="column-menu-item" onClick={handleArchiveColumnCards}>
              <Archive size={14} />
              Archive completed cards
            </button>

            {/* Insert list before */}
            {insertPosition === "before" ? (
              <InlineEdit
                defaultValue=""
                placeholder="New list title (before)..."
                onConfirm={handleInsertConfirm}
                onCancel={handleInsertCancel}
                className="column-title-edit"
              />
            ) : (
              <button className="column-menu-item" onClick={handleInsertBefore}>
                <Plus size={14} />
                Insert list before
              </button>
            )}

            {/* Insert list after */}
            {insertPosition === "after" ? (
              <InlineEdit
                defaultValue=""
                placeholder="New list title (after)..."
                onConfirm={handleInsertConfirm}
                onCancel={handleInsertCancel}
                className="column-title-edit"
              />
            ) : (
              <button className="column-menu-item" onClick={handleInsertAfter}>
                <Plus size={14} />
                Insert list after
              </button>
            )}

            <div className="column-menu-separator" />

            {/* Sort by submenu */}
            <button className="column-menu-item" onClick={handleSortMenuToggle}>
              <ArrowUpDown size={14} />
              Sort by {showSortMenu ? "▴" : "▾"}
            </button>
            {showSortMenu && (
              <div className="sort-submenu">
                <button
                  className="column-menu-item column-menu-subitem"
                  onClick={() => handleSort("text", "asc")}
                >
                  Card text A→Z
                </button>
                <button
                  className="column-menu-item column-menu-subitem"
                  onClick={() => handleSort("text", "desc")}
                >
                  Card text Z→A
                </button>
                <button
                  className="column-menu-item column-menu-subitem"
                  onClick={() => handleSort("date", "asc")}
                >
                  Date ↑
                </button>
                <button
                  className="column-menu-item column-menu-subitem"
                  onClick={() => handleSort("date", "desc")}
                >
                  Date ↓
                </button>
                <button
                  className="column-menu-item column-menu-subitem"
                  onClick={() => handleSort("tags", "asc")}
                >
                  Tags A→Z
                </button>
                <button
                  className="column-menu-item column-menu-subitem"
                  onClick={() => handleSort("priority", "asc")}
                >
                  Priority ↑
                </button>
                {inlineMetadataKeys.map((key) => (
                  <span key={key}>
                    <button
                      className="column-menu-item column-menu-subitem"
                      onClick={() => handleSort(`metadata:${key}`, "asc")}
                    >
                      {key} ↑
                    </button>
                    <button
                      className="column-menu-item column-menu-subitem"
                      onClick={() => handleSort(`metadata:${key}`, "desc")}
                    >
                      {key} ↓
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="column-menu-separator" />

            {/* Set as Completed Board / Remove Completed Status (preserved toggle) */}
            <button
              className="column-menu-item"
              onClick={handleToggleComplete}
              title={column.complete ? "" : "All tasks placed here are marked as complete"}
            >
              <CheckCircle size={14} />
              {column.complete ? "Remove Completed Status" : "Set as Completed Board"}
            </button>

            <div className="column-menu-separator" />

            {/* Archive list */}
            <button className="column-menu-item" onClick={handleArchiveColumn}>
              <Archive size={14} />
              Archive list
            </button>

            {/* Delete (with confirmation) */}
            <button className="column-menu-item column-menu-item-danger" onClick={handleDelete}>
              <Trash2 size={14} />
              Delete
            </button>
          </PortalDropdown>
        </div>
      </div>
      <div
        ref={setDroppableRef}
        className={`column-cards${isColumnDragOver ? " drag-over" : ""}`}
        data-column-id={column.id}
      >
        <SortableContext
          items={column.cards.map((card) => `card-${card.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {column.cards.map((card, index) => (
            <Card
              key={card.id}
              card={card}
              columnId={column.id}
              cardIndex={index}
              dateFormat={dateFormat}
              timeFormat={timeFormat}
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
              metadataKeys={configuredMetadataKeys}
              onUpdate={onUpdateCard}
              onDelete={onDeleteCard}
              onToggle={onToggleCard}
              onInsertCard={onInsertCard}
              onMoveCard={onMoveCard}
              onAddBlockId={onAddBlockId}
              onArchiveCard={onArchiveCard}
              onNewNoteFromCard={onNewNoteFromCard}
              onSplitCard={onSplitCard}
              onDuplicateCard={onDuplicateCard}
              boardColumns={boardColumns}
              searchDimmed={searchDimmedCardIds !== null && !searchDimmedCardIds.has(card.id)}
            />
          ))}
        </SortableContext>
        {column.cards.length === 0 && !isAdding && <div className="column-empty">No cards</div>}
        {isAdding && (
          <InlineEdit
            defaultValue=""
            placeholder="New card text..."
            onConfirm={handleAddConfirm}
            onCancel={handleAddCancel}
            className="add-card-textarea"
          />
        )}
        <button className="add-card-button" onClick={handleAddClick}>
          + Add card
        </button>
      </div>
    </div>
  );
}
