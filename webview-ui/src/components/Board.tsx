import { useState, useCallback, useMemo } from "react";
import {
  Settings,
  Search,
  FileText,
  Archive,
  Plus,
  X,
  LayoutGrid,
  Table,
  List,
} from "lucide-react";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import type { BoardState } from "../../../src/parser/types.ts";
import type { DateColor } from "../../../src/parser/types.ts";
import type { TagColor } from "../../../src/parser/types.ts";
import type { TagSort } from "../../../src/parser/types.ts";
import type { DataKey } from "../../../src/parser/types.ts";
import { Column } from "./Column.js";
import { InlineEdit } from "./InlineEdit.js";
import { SettingsPanel } from "./SettingsPanel.js";
import { TableView } from "./TableView.js";
import { ListView } from "./ListView.js";

/** Props for the Board component — board state and mutation callbacks. */
interface BoardProps {
  board: BoardState;
  settings: BoardState["settings"];
  fileName?: string | null;
  dragOverColumnId?: string | null;
  onUpdateCard?: (cardId: string, columnId: string, newText: string) => void;
  onDeleteCard?: (cardId: string, columnId: string) => void;
  onAddCard?: (columnId: string, text: string) => void;
  onAddColumn?: (title: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onRenameColumn?: (columnId: string, title: string) => void;
  onToggleColumnComplete?: (columnId: string) => void;
  onToggleCard?: (cardId: string, columnId: string) => void;
  onUpdateSettings?: (settings: Record<string, unknown>) => void;
  onInsertCard?: (
    columnId: string,
    text: string,
    position: "before" | "after",
    referenceCardId: string,
  ) => void;
  onMoveCard?: (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => void;
  onAddBlockId?: (cardId: string, columnId: string, blockId: string) => void;
  onArchiveColumnCards?: (columnId: string) => void;
  onInsertColumn?: (title: string, position: "before" | "after", referenceColumnId: string) => void;
  onArchiveColumn?: (columnId: string) => void;
  onSortColumn?: (columnId: string, sortKey: string, direction: "asc" | "desc") => void;
  onArchiveCard?: (cardId: string, columnId: string) => void;
  onNewNoteFromCard?: (cardId: string, columnId: string) => void;
  onSplitCard?: (cardId: string, columnId: string) => void;
  onDuplicateCard?: (cardId: string, columnId: string) => void;
  viewMode?: "board" | "table" | "list";
  onSetView?: (view: "board" | "table" | "list") => void;
  onOpenAsMarkdown?: () => void;
  onArchiveAll?: () => void;
  /** CSS classes to apply to the root board wrapper */
  className?: string;
}

/** Renders the kanban board with sortable columns, settings panel, and add-column flow. */
export function Board({
  board,
  settings,
  fileName,
  dragOverColumnId,
  onUpdateCard,
  onDeleteCard,
  onAddCard,
  onAddColumn,
  onDeleteColumn,
  onRenameColumn,
  onToggleColumnComplete,
  onToggleCard,
  onUpdateSettings,
  onInsertCard,
  onMoveCard,
  onAddBlockId,
  onArchiveColumnCards,
  onInsertColumn,
  onArchiveColumn,
  onSortColumn,
  onArchiveCard,
  onNewNoteFromCard,
  onSplitCard,
  onDuplicateCard,
  viewMode = "board",
  onSetView,
  onOpenAsMarkdown,
  onArchiveAll,
  className: propClassName,
}: BoardProps): React.ReactElement {
  // Use propClassName (from App.tsx) if provided, otherwise use board.cssClasses
  const boardClasses = board.cssClasses ?? [];
  const appliedClassName =
    propClassName ?? (boardClasses.length > 0 ? boardClasses.join(" ") : undefined);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewSwitcherOpen, setViewSwitcherOpen] = useState(false);

  const laneWidth = (settings?.["lane-width"] as number | undefined) ?? 270;
  const dateFormat = (settings?.["date-format"] as string | undefined) ?? "YYYY-MM-DD";
  const timeFormat = (settings?.["time-format"] as string | undefined) ?? "HH:mm";
  const hideCardCount = settings?.["hide-card-count"] === true;
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

  const showAddList = settings?.["show-add-list"] !== false;
  const showArchiveAll = settings?.["show-archive-all"] !== false;
  const showViewAsMarkdown = settings?.["show-view-as-markdown"] !== false;
  const showBoardSettings = settings?.["show-board-settings"] !== false;
  const showSearch = settings?.["show-search"] !== false;
  const showSetView = settings?.["show-set-view"] !== false;

  const fullListLaneWidth = settings?.["full-list-lane-width"] === true;
  const listCollapse = (settings?.["list-collapse"] as boolean[] | undefined) ?? [];
  const accentColor = (settings?.["accent-color"] as string | undefined) ?? "";

  // Title settings
  const showTitle = settings?.["show-title"] !== false;
  const customTitle = (settings?.["custom-title"] as string | undefined) ?? "";
  // Compute display title: customTitle takes precedence over fileName
  const displayTitle = showTitle ? customTitle || fileName || null : null;

  // Tag-related settings
  const tagColors = (settings?.["tag-colors"] as TagColor[] | undefined) ?? [];
  const tagSort = (settings?.["tag-sort"] as TagSort[] | undefined) ?? [];
  const tagAction = (settings?.["tag-action"] as "kanban" | "obsidian" | undefined) ?? "obsidian";

  // Tag filter state
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  const handleAddColumnConfirm = useCallback(
    (title: string) => {
      setIsAddingColumn(false);
      if (title.trim() && onAddColumn) {
        onAddColumn(title.trim());
      }
    },
    [onAddColumn],
  );

  const handleAddColumnCancel = useCallback(() => {
    setIsAddingColumn(false);
  }, []);

  const handleSettingsToggle = useCallback(() => {
    setIsSettingsOpen((prev) => !prev);
  }, []);

  const handleSettingsSave = useCallback(
    (newSettings: Record<string, unknown>) => {
      setIsSettingsOpen(false);
      if (onUpdateSettings) {
        onUpdateSettings(newSettings);
      }
    },
    [onUpdateSettings],
  );

  const handleSettingsCancel = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleSearchToggle = useCallback(() => {
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) {
      setSearchQuery("");
    }
  }, [isSearchOpen]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery("");
    setIsSearchOpen(false);
  }, []);

  const handleViewSwitch = useCallback(
    (view: "board" | "table" | "list") => {
      setViewSwitcherOpen(false);
      if (onSetView) {
        onSetView(view);
      }
    },
    [onSetView],
  );

  const handleViewSwitcherToggle = useCallback(() => {
    setViewSwitcherOpen((prev) => !prev);
  }, []);

  const handleOpenAsMarkdown = useCallback(() => {
    if (onOpenAsMarkdown) {
      onOpenAsMarkdown();
    }
  }, [onOpenAsMarkdown]);

  const handleArchiveAll = useCallback(() => {
    if (onArchiveAll) {
      onArchiveAll();
    }
  }, [onArchiveAll]);

  const handleAddListClick = useCallback(() => {
    setIsAddingColumn(true);
  }, []);

  const handleTagFilter = useCallback((tag: string) => {
    setActiveTagFilter((prev) => (prev === tag ? null : tag));
  }, []);

  const handleDismissTagFilter = useCallback(() => {
    setActiveTagFilter(null);
  }, []);

  const searchLower = searchQuery.toLowerCase();
  const matchingCardIds = useMemo(() => {
    const hasTextFilter = searchQuery.trim().length > 0;
    const hasTagFilter = activeTagFilter != null;
    if (!hasTextFilter && !hasTagFilter) return null; // no filtering

    const ids = new Set<string>();
    for (const col of board.columns) {
      for (const card of col.cards) {
        let matches = false;
        if (hasTextFilter && card.text.toLowerCase().includes(searchLower)) {
          matches = true;
        }
        if (hasTagFilter && card.metadata.tags.includes(activeTagFilter!)) {
          matches = true;
        }
        // When both filters active, card must match BOTH (AND logic)
        if (hasTextFilter && hasTagFilter) {
          matches =
            card.text.toLowerCase().includes(searchLower) &&
            card.metadata.tags.includes(activeTagFilter!);
        }
        if (matches) {
          ids.add(card.id);
        }
      }
    }
    return ids;
  }, [board.columns, searchLower, searchQuery, activeTagFilter]);

  return (
    <div
      className={`board-wrapper${appliedClassName ? ` ${appliedClassName}` : ""}`}
      data-accent-color={accentColor || undefined}
      style={
        {
          "--kanban-column-width": `${laneWidth}px`,
          ...(accentColor && { "--board-accent-color": accentColor }),
        } as React.CSSProperties
      }
    >
      <div className="board-header">
        {displayTitle && <div className="board-title">{displayTitle}</div>}
        {showBoardSettings && (
          <button
            className="toolbar-button"
            onClick={handleSettingsToggle}
            aria-label="Board settings"
            title="Board settings"
          >
            <Settings size={16} className="toolbar-icon" /> Settings
          </button>
        )}
        {showSetView && (
          <div className="view-switcher">
            <button
              className="toolbar-button"
              onClick={handleViewSwitcherToggle}
              aria-label="Switch view"
              title={`View: ${viewMode ?? "board"}`}
            >
              {viewMode === "table" ? (
                <Table size={16} className="toolbar-icon" />
              ) : viewMode === "list" ? (
                <List size={16} className="toolbar-icon" />
              ) : (
                <LayoutGrid size={16} className="toolbar-icon" />
              )}{" "}
              {viewMode === "table" ? "Table" : viewMode === "list" ? "List" : "Board"}
            </button>
            {viewSwitcherOpen && (
              <div className="view-switcher-dropdown">
                <button
                  className={`view-switcher-item${viewMode === "board" ? " active" : ""}`}
                  onClick={() => handleViewSwitch("board")}
                >
                  <LayoutGrid size={16} className="toolbar-icon" /> Board
                </button>
                <button
                  className={`view-switcher-item${viewMode === "table" ? " active" : ""}`}
                  onClick={() => handleViewSwitch("table")}
                >
                  <Table size={16} className="toolbar-icon" /> Table
                </button>
                <button
                  className={`view-switcher-item${viewMode === "list" ? " active" : ""}`}
                  onClick={() => handleViewSwitch("list")}
                >
                  <List size={16} className="toolbar-icon" /> List
                </button>
              </div>
            )}
          </div>
        )}
        {showSearch && (
          <button
            className="toolbar-button"
            onClick={handleSearchToggle}
            aria-label="Search cards"
            title="Search cards"
          >
            <Search size={16} className="toolbar-icon" /> Search
          </button>
        )}
        {showViewAsMarkdown && (
          <button
            className="toolbar-button"
            onClick={handleOpenAsMarkdown}
            aria-label="Open as markdown"
            title="Open as markdown"
          >
            <FileText size={16} className="toolbar-icon" /> Markdown
          </button>
        )}
        {showArchiveAll && (
          <button
            className="toolbar-button"
            onClick={handleArchiveAll}
            aria-label="Archive completed"
            title="Archive completed cards"
          >
            <Archive size={16} className="toolbar-icon" /> Archive
          </button>
        )}
        {showAddList && (
          <button
            className="toolbar-button"
            onClick={handleAddListClick}
            aria-label="Add list"
            title="Add a new list"
          >
            <Plus size={16} className="toolbar-icon" /> Add List
          </button>
        )}
      </div>
      {isSearchOpen && (
        <div className="search-bar">
          <input
            className="search-input"
            type="text"
            placeholder="Filter cards..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
          />
          {searchQuery && (
            <button className="search-clear" onClick={handleSearchClear} aria-label="Clear search">
              <X size={16} className="toolbar-icon" />
            </button>
          )}
        </div>
      )}
      {activeTagFilter && (
        <div className="tag-filter-bar">
          <span className="tag-filter-label">
            Filtering by: <span className="tag-filter-tag">#{activeTagFilter}</span>
          </span>
          <button
            className="tag-filter-dismiss"
            onClick={handleDismissTagFilter}
            aria-label="Dismiss tag filter"
          >
            <X size={16} className="toolbar-icon" />
          </button>
        </div>
      )}
      {isSettingsOpen && (
        <SettingsPanel
          settings={settings}
          onSave={handleSettingsSave}
          onCancel={handleSettingsCancel}
        />
      )}
      <div className="board">
        {viewMode === "table" ? (
          <TableView
            board={board}
            dateFormat={dateFormat}
            dateDisplayFormat={dateDisplayFormat}
            showCheckboxes={showCheckboxes}
            moveDates={moveDates}
            moveTags={moveTags}
            tagColors={tagColors}
            tagSort={tagSort}
            tagAction={tagAction}
            onTagFilter={handleTagFilter}
            showRelativeDate={showRelativeDate}
            dateColors={dateColors}
            inlineMetadataPosition={inlineMetadataPosition}
            moveTaskMetadata={moveTaskMetadata}
            metadataKeys={metadataKeys}
            onUpdateCard={onUpdateCard}
            onDeleteCard={onDeleteCard}
            onToggleCard={onToggleCard}
          />
        ) : viewMode === "list" ? (
          <ListView
            board={board}
            fullListLaneWidth={fullListLaneWidth}
            listCollapse={listCollapse}
            dateFormat={dateFormat}
            dateDisplayFormat={dateDisplayFormat}
            showCheckboxes={showCheckboxes}
            moveDates={moveDates}
            moveTags={moveTags}
            tagColors={tagColors}
            tagSort={tagSort}
            tagAction={tagAction}
            onTagFilter={handleTagFilter}
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
            boardColumns={board.columns.map((c) => ({
              id: c.id,
              title: c.title,
              cardCount: c.cards.length,
            }))}
            searchDimmedCardIds={matchingCardIds}
          />
        ) : (
          <>
            <SortableContext
              items={board.columns.map((col) => `col-${col.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {board.columns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  laneWidth={laneWidth}
                  dateFormat={dateFormat}
                  timeFormat={timeFormat}
                  dateDisplayFormat={dateDisplayFormat}
                  showCheckboxes={showCheckboxes}
                  moveDates={moveDates}
                  moveTags={moveTags}
                  tagColors={tagColors}
                  tagSort={tagSort}
                  tagAction={tagAction}
                  onTagFilter={handleTagFilter}
                  showRelativeDate={showRelativeDate}
                  dateColors={dateColors}
                  inlineMetadataPosition={inlineMetadataPosition}
                  moveTaskMetadata={moveTaskMetadata}
                  configuredMetadataKeys={metadataKeys}
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
                  onArchiveColumnCards={onArchiveColumnCards}
                  onInsertColumn={onInsertColumn}
                  onArchiveColumn={onArchiveColumn}
                  onSortColumn={onSortColumn}
                  onArchiveCard={onArchiveCard}
                  onNewNoteFromCard={onNewNoteFromCard}
                  onSplitCard={onSplitCard}
                  onDuplicateCard={onDuplicateCard}
                  boardColumns={board.columns.map((c) => ({
                    id: c.id,
                    title: c.title,
                    cardCount: c.cards.length,
                  }))}
                  searchDimmedCardIds={matchingCardIds}
                />
              ))}
            </SortableContext>
            {isAddingColumn ? (
              <InlineEdit
                defaultValue=""
                placeholder="Column title..."
                onConfirm={handleAddColumnConfirm}
                onCancel={handleAddColumnCancel}
                className="column-title-edit"
              />
            ) : (
              <button className="add-column-button" onClick={() => setIsAddingColumn(true)}>
                + Add column
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
