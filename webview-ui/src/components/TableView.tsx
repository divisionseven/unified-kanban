import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnSizingState,
} from "@tanstack/react-table";
import type { BoardState } from "../../../src/parser/types.ts";
import type { DateColor } from "../../../src/parser/types.ts";
import type { TagColor } from "../../../src/parser/types.ts";
import type { TagSort } from "../../../src/parser/types.ts";
import type { DataKey } from "../../../src/parser/types.ts";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import { postMessage } from "../hooks/useVSCodeAPI.js";
import { stripMetadataMarkers } from "./Card.js";

/** Props for the TableView component */
interface TableViewProps {
  board: BoardState;
  dateFormat: string;
  dateDisplayFormat: string;
  showCheckboxes: boolean;
  moveDates: boolean;
  moveTags: boolean;
  tagColors?: TagColor[];
  tagSort?: TagSort[];
  tagAction?: "kanban" | "obsidian";
  onTagFilter?: (tag: string) => void;
  showRelativeDate: boolean;
  dateColors: DateColor[];
  inlineMetadataPosition: "body" | "footer" | "metadata-table";
  moveTaskMetadata?: boolean;
  metadataKeys?: DataKey[];
  onUpdateCard?: (cardId: string, columnId: string, newText: string) => void;
  onDeleteCard?: (cardId: string, columnId: string) => void;
  onToggleCard?: (cardId: string, columnId: string) => void;
}

/** Flattened card with column info for table display */
interface TableCard {
  id: string;
  text: string;
  checked: boolean;
  columnId: string;
  columnTitle: string;
  dueDate: string | null;
  createdDate: string | null;
  startDate: string | null;
  scheduledDate: string | null;
  tags: string[];
  priority: number | null;
  blockId: string | null;
  inlineMetadata: Array<{ key: string; value: string }>;
}

/** Sort tags according to tagSort setting */
function sortTags(tags: string[], tagSort: TagSort[]): string[] {
  if (!tagSort || tagSort.length === 0) return tags;
  const sortOrder = new Map(tagSort.map((ts, i) => [ts.tag, i]));
  return [...tags].sort((a, b) => {
    const aIdx = sortOrder.get(a);
    const bIdx = sortOrder.get(b);
    if (aIdx != null && bIdx != null) return aIdx - bIdx;
    if (aIdx != null) return -1;
    if (bIdx != null) return 1;
    return a.localeCompare(b);
  });
}

/** Get tag color for table - checks custom tagColors */
function getTableTagColor(tag: string, tagColors: TagColor[]): React.CSSProperties | undefined {
  if (!tagColors || tagColors.length === 0) return undefined;
  const custom = tagColors.find((tc) => tc.tagKey === tag);
  if (custom) {
    return { backgroundColor: custom.color, color: custom.backgroundColor || "#fff" };
  }
  return undefined;
}

export function TableView({
  board,
  dateFormat: _dateFormat,
  dateDisplayFormat: _dateDisplayFormat,
  showCheckboxes,
  moveDates: _moveDates,
  moveTags: _moveTags,
  tagColors = [],
  tagSort = [],
  tagAction: _tagAction = "obsidian",
  onTagFilter: _onTagFilter,
  showRelativeDate: _showRelativeDate,
  dateColors: _dateColors,
  inlineMetadataPosition: _inlineMetadataPosition,
  moveTaskMetadata: _moveTaskMetadata,
  metadataKeys: _metadataKeys,
  onUpdateCard: _onUpdateCard,
  onDeleteCard: _onDeleteCard,
  onToggleCard,
}: TableViewProps): React.ReactElement {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  // Flatten all cards with column info
  const tableData = useMemo((): TableCard[] => {
    const cards: TableCard[] = [];
    for (const column of board.columns) {
      for (const card of column.cards) {
        // card.text is already stripped of @{} markers, tags, wikilinks, and inline metadata
        // by the parser. Only strip date emojis and checkboxes from continuation lines.
        // Strip tags only when moveTags is true (tags shown in metadata).
        cards.push({
          id: card.id,
          text: stripMetadataMarkers(card.text, {
            stripDateEmojis: true,
            stripTags: _moveTags,
            stripWikilinks: false,
            stripCheckboxes: true,
          }),
          checked: card.checked,
          columnId: column.id,
          columnTitle: column.title,
          dueDate: card.metadata.dueDates?.[0] ?? card.metadata.dueDate ?? null,
          createdDate: card.metadata.createdDate,
          startDate: card.metadata.startDate,
          scheduledDate: card.metadata.scheduledDate,
          tags: card.metadata.tags,
          priority: card.metadata.priority,
          blockId: card.metadata.blockId,
          inlineMetadata: card.metadata.inlineMetadata.map((m) => ({
            key: m.key,
            value: m.value,
          })),
        });
      }
    }
    return cards;
  }, [board.columns]);

  // Get unique inline metadata keys from all cards
  const inlineMetadataKeys = useMemo((): string[] => {
    const keys = new Set<string>();
    for (const card of tableData) {
      for (const meta of card.inlineMetadata) {
        keys.add(meta.key);
      }
    }
    return Array.from(keys).sort();
  }, [tableData]);

  // Dynamic column definitions
  const columns = useMemo((): ColumnDef<TableCard>[] => {
    const cols: ColumnDef<TableCard>[] = [
      {
        accessorKey: "columnTitle",
        header: "List",
        cell: (info) => <span className="table-cell-list">{info.getValue() as string}</span>,
        size: 120,
        enableResizing: true,
      },
      {
        accessorKey: "text",
        header: "Card",
        cell: (info) => {
          const row = info.row.original;
          const text = info.getValue() as string;
          if (!text) return <span className="table-cell-empty">—</span>;
          return (
            <div className="table-cell-card">
              {showCheckboxes && (
                <input
                  type="checkbox"
                  checked={row.checked}
                  onChange={() => row.columnId && onToggleCard?.(row.id, row.columnId)}
                  className="table-checkbox"
                />
              )}
              <MarkdownRenderer
                content={text}
                className={row.checked ? "card-text-checked" : ""}
                onTagClick={(tag) => {
                  if (_tagAction === "kanban" && _onTagFilter) {
                    _onTagFilter(tag);
                  } else if (_tagAction === "obsidian") {
                    postMessage({ type: "SEARCH_TAG", tag });
                  }
                }}
              />
            </div>
          );
        },
        size: 300,
        enableResizing: true,
      },
      {
        accessorKey: "dueDate",
        header: "Due Date",
        cell: (info) => {
          const date = info.getValue() as string | null;
          if (!date) return <span className="table-cell-empty">—</span>;
          return <span className="table-cell-date">{date}</span>;
        },
        size: 100,
        enableResizing: true,
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: (info) => {
          const tags = info.getValue() as string[];
          if (tags.length === 0) return <span className="table-cell-empty">—</span>;
          const sorted = sortTags(tags, tagSort);
          return (
            <div className="table-cell-tags">
              {sorted.map((tag) => (
                <span key={tag} className="table-tag" style={getTableTagColor(tag, tagColors)}>
                  {tag}
                </span>
              ))}
            </div>
          );
        },
        size: 150,
        enableResizing: true,
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: (info) => {
          const priority = info.getValue() as number | null;
          if (priority === null) return <span className="table-cell-empty">—</span>;
          const labels = ["Highest", "High", "Medium", "Low", "Lowest", "None"];
          return (
            <span className={`table-priority priority-${priority}`}>
              {labels[priority] ?? "None"}
            </span>
          );
        },
        size: 80,
        enableResizing: true,
      },
    ];

    // Add dynamic columns for inline metadata keys
    for (const key of inlineMetadataKeys) {
      cols.push({
        accessorFn: (row) => {
          const meta = row.inlineMetadata.find((m) => m.key === key);
          return meta?.value ?? "";
        },
        header: key,
        cell: (info) => {
          const value = info.getValue() as string;
          if (!value) return <span className="table-cell-empty">—</span>;
          return <span className="table-cell-metadata">{value}</span>;
        },
        size: 100,
        enableResizing: true,
      });
    }

    return cols;
  }, [inlineMetadataKeys, showCheckboxes, onToggleCard, tagColors, tagSort]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, columnSizing },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: "onChange",
  });

  return (
    <div className="table-view">
      <table className="kanban-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="table-header"
                  style={{ width: header.getSize() }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="table-header-content">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: " ↑",
                      desc: " ↓",
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>
                  <div
                    className="table-resize-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startWidth = header.getSize();
                      const columnId = header.column.id;
                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const delta = moveEvent.clientX - startX;
                        table.setColumnSizing((prev) => ({
                          ...prev,
                          [columnId]: startWidth + delta,
                        }));
                      };
                      const onMouseUp = () => {
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                      };
                      document.addEventListener("mousemove", onMouseMove);
                      document.addEventListener("mouseup", onMouseUp);
                    }}
                  />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="table-row">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="table-cell">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {tableData.length === 0 && <div className="table-empty">No cards to display</div>}
    </div>
  );
}
