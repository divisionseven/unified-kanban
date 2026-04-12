import { useState, useCallback, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card as CardType } from "../../../src/parser/types.ts";
import type { DateColor } from "../../../src/parser/types.ts";
import type { TagColor } from "../../../src/parser/types.ts";
import type { TagSort } from "../../../src/parser/types.ts";
import type { DataKey } from "../../../src/parser/types.ts";
import { InlineEdit } from "./InlineEdit.js";
import { MetadataTable } from "./MetadataTable.js";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import { postMessage } from "../hooks/useVSCodeAPI.js";
import { usePortalDropdown } from "../hooks/usePortalDropdown.js";
import { PortalDropdown } from "./PortalDropdown.js";
import { DatePicker } from "./DatePicker.js";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import relativeTime from "dayjs/plugin/relativeTime.js";
import {
  Pencil,
  Copy,
  FileText,
  Scissors,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Calendar,
  CalendarX,
  Clock,
  TimerOff,
  Archive,
  Trash2,
  FilePlus,
  Layers,
  MoreHorizontal,
} from "lucide-react";

dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);

/** Priority level to emoji mapping (Obsidian Tasks convention). */
const PriorityEmoji: Record<number, string> = {
  0: "\u{1F53A}", // 🔺 highest
  1: "\u{26EB}", // ⏫ high
  2: "\u{1F53C}", // 🔼 medium
  4: "\u{1F53D}", // 🔽 low
  5: "\u{23EC}", // ⏬ lowest
};

/** Props for the Card component — card data, column context, and callbacks. */
interface CardProps {
  card: CardType;
  columnId: string;
  cardIndex?: number;
  dateFormat?: string;
  timeFormat?: string;
  dateDisplayFormat?: string;
  showCheckboxes?: boolean;
  moveDates?: boolean;
  moveTags?: boolean;
  showRelativeDate?: boolean;
  dateColors?: DateColor[];
  tagColors?: TagColor[];
  tagSort?: TagSort[];
  tagAction?: "kanban" | "obsidian";
  onTagFilter?: (tag: string) => void;
  inlineMetadataPosition?: "body" | "footer" | "metadata-table";
  /** When true, moves task emoji dates (🛫📅✅) to footer display */
  moveTaskMetadata?: boolean;
  /** DataKey configuration for filtering inline metadata */
  metadataKeys?: DataKey[];
  /** When true, renders without useSortable (used in DragOverlay) */
  isOverlay?: boolean;
  onUpdate?: (cardId: string, columnId: string, newText: string) => void;
  onDelete?: (cardId: string, columnId: string) => void;
  onToggle?: (cardId: string, columnId: string) => void;
  onArchiveCard?: (cardId: string, columnId: string) => void;
  onInsertCard?: (
    columnId: string,
    text: string,
    position: "before" | "after",
    referenceCardId: string,
  ) => void;
  onMoveCard?: (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => void;
  onAddBlockId?: (cardId: string, columnId: string, blockId: string) => void;
  onNewNoteFromCard?: (cardId: string, columnId: string) => void;
  onSplitCard?: (cardId: string, columnId: string) => void;
  onDuplicateCard?: (cardId: string, columnId: string) => void;
  boardColumns?: Array<{ id: string; title: string; cardCount: number }>;
  searchDimmed?: boolean;
}

/**
 * Format a YYYY-MM-DD date string using dayjs with custom format tokens.
 * Falls back to the raw dateStr if parsing fails.
 */
function formatDate(dateStr: string, format: string): string {
  const d = dayjs(dateStr, "YYYY-MM-DD", true);
  if (!d.isValid()) return dateStr;
  return d.format(format);
}

/**
 * Format a date string as a relative date ("Today", "Tomorrow", "3 days ago", etc.).
 * Uses dayjs relativeTime plugin for human-readable distance strings.
 * Returns formatted date via formatDate() when the date is more than 30 days away.
 */
function formatRelativeDate(dateStr: string, _displayFormat: string): string {
  const d = dayjs(dateStr, "YYYY-MM-DD", true);
  if (!d.isValid()) return dateStr;

  const now = dayjs().startOf("day");
  const target = d.startOf("day");
  const diffDays = target.diff(now, "day");

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  // Beyond 7 days: use dayjs relativeTime for "a month ago", "in 2 months", etc.
  return d.fromNow();
}

/**
 * Evaluate date-color rules against a date string and return matching styles.
 * Returns first matching rule's color/backgroundColor, or null if no rule matches.
 */
function getDateColor(
  dateStr: string,
  dateColors: DateColor[],
): { color?: string; backgroundColor?: string } | null {
  const date = dayjs(dateStr, "YYYY-MM-DD", true);
  if (!date.isValid()) return null;

  const now = dayjs().startOf("day");

  for (const rule of dateColors) {
    let matches = false;

    if (rule.isToday) {
      matches = date.isSame(now, "day");
    } else if (rule.isBefore && rule.distance != null && rule.unit && rule.direction) {
      const unitMap: Record<string, dayjs.ManipulateType> = {
        hours: "hour",
        days: "day",
        weeks: "week",
        months: "month",
      };
      const unit = unitMap[rule.unit] ?? "day";
      if (rule.direction === "before") {
        const boundary = now.subtract(rule.distance, unit);
        matches = date.isBefore(boundary, "day");
      } else {
        const boundary = now.add(rule.distance, unit);
        matches = date.isBefore(boundary, "day") && date.isAfter(now, "day");
      }
    } else if (rule.isAfter && rule.distance != null && rule.unit && rule.direction) {
      const unitMap: Record<string, dayjs.ManipulateType> = {
        hours: "hour",
        days: "day",
        weeks: "week",
        months: "month",
      };
      const unit = unitMap[rule.unit] ?? "day";
      if (rule.direction === "after") {
        const boundary = now.add(rule.distance, unit);
        matches = date.isAfter(boundary, "day");
      } else {
        const boundary = now.subtract(rule.distance, unit);
        matches = date.isAfter(boundary, "day") && date.isBefore(now, "day");
      }
    }

    if (matches) {
      const result: { color?: string; backgroundColor?: string } = {};
      if (rule.color) result.color = rule.color;
      if (rule.backgroundColor) result.backgroundColor = rule.backgroundColor;
      return result;
    }
  }

  return null;
}

/**
 * Format an HH:mm time string using the given format template.
 * Supports HH, mm placeholders.
 */
function formatTime(timeStr: string, format: string): string {
  const parts = timeStr.split(":");
  if (parts.length !== 2) return timeStr;
  const [hours, minutes] = parts;
  return format.replace("HH", hours!).replace("mm", minutes!);
}

/**
 * Strips the checkbox prefix from card rawText for display in edit mode.
 * Converts "- [ ] Task text" to "Task text"
 * Converts "- [x] Task text" to "Task text"
 */
export function getEditableText(rawText: string): string {
  return rawText.replace(/^- \[x\] |^- \[ \] /, "");
}

/**
 * Strip metadata markers from card text for display.
 * Removes @{...}, #tag, [[wikilink]], and optionally Dataview inline metadata [key:: value] / (key:: value).
 * Optionally strips task date emojis (🛫➕⏳📅✅❌) when moveDates is true.
 * Optionally preserves #tags and [[wikilinks]] for markdown rendering.
 * Does not mutate the source text.
 */
export function stripMetadataMarkers(
  text: string,
  opts?: {
    stripInlineMeta?: boolean;
    stripDateEmojis?: boolean;
    stripTags?: boolean;
    stripWikilinks?: boolean;
    stripCheckboxes?: boolean;
  },
): string {
  let result = text;

  // Handle @{} markers - always strip these (they're not inside code blocks)
  result = result.replace(/@\{[^}]*\}/g, "");

  // Handle date emojis - these are metadata, not code, so strip globally
  if (opts?.stripDateEmojis) {
    result = result
      .replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, "")
      .replace(/➕\s*\d{4}-\d{2}-\d{2}/g, "")
      .replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, "")
      .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "")
      .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "")
      .replace(/❌\s*\d{4}-\d{2}-\d{2}/g, "");
  }

  // Strip checkbox prefixes from continuation lines (but not the first line)
  if (opts?.stripCheckboxes) {
    const lines = result.split("\n");
    const firstLine = lines[0] ?? "";
    const continuationLines = lines.slice(1).map((line) => line.replace(/^[-*]\s*\[[ x]\] /, ""));
    result = [firstLine, ...continuationLines].join("\n");
  }

  // Process line-by-line to preserve fenced code blocks AND strip #tags/wikilinks when OUTSIDE code blocks.
  //
  // IMPORTANT: This is the KEY FIX - #tags and [[wikilinks]] must be stripped INSIDE this
  // line-by-line loop so they are skipped when we're inside a fenced code block (``` or ~~~).
  // Previously, the tag stripping happened globally BEFORE this loop, which caused
  // `#include <iostream>` inside code blocks to become `<iostream>`.
  let inFencedCode = false;
  result = result
    .split("\n")
    .map((line) => {
      const isFenceLine = /^[ \t]*[`~]{3,}/.test(line);

      if (isFenceLine) {
        // Toggle state for subsequent lines; fence line itself always passes through verbatim.
        inFencedCode = !inFencedCode;
        return line;
      }

      if (inFencedCode) {
        // Code block interior: preserve completely — no whitespace collapsing.
        // Collapsing spaces here destroys indentation-sensitive languages (Python,
        // YAML, etc.) and is the direct cause of "massive spaces" in the rendered output.
        return line;
      }

      // Outside code blocks: strip #tags and [[wikilinks]] here (after fence detection)
      let processed = line;

      // Handle #tags - optionally strip (only when outside fenced code blocks)
      if (opts?.stripTags !== false) {
        processed = processed.replace(/#(\w[\w-]*)/g, "");
      }

      // Handle [[wikilinks]] - optionally strip (only when outside fenced code blocks)
      if (opts?.stripWikilinks !== false) {
        processed = processed.replace(/\[\[[^\]]*\]\]/g, "");
      }

      // Handle inline metadata (Dataview-style) - only when outside fenced code blocks
      if (opts?.stripInlineMeta) {
        processed = processed
          .replace(/\[[^\]::]+::\s*[^\]]*\]/g, "")
          .replace(/\([^)(::]+::\s*[^)]*\)/g, "");
      }

      // Collapse interior whitespace
      const leadingMatch = processed.match(/^([ \t]*)/);
      const leading = leadingMatch ? leadingMatch[1] : "";
      const rest = processed.slice(leading.length);
      return leading + rest.replace(/[ \t]+/g, " ");
    })
    .join("\n")
    .trim();

  return result;
}

/** Color palette for tag badges — chosen for readability on both light/dark themes. */
const TAG_COLORS = [
  "#e06c75",
  "#e5c07b",
  "#98c379",
  "#56b6c2",
  "#61afef",
  "#c678dd",
  "#d19a66",
  "#be5046",
  "#abb2bf",
  "#5c6370",
];

/**
 * Compute a consistent color for a tag name using djb2 hash.
 */
function getHashColor(tag: string): string {
  let hash = 5381;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 33) ^ tag.charCodeAt(i);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]!;
}

/**
 * Get tag color - first checks custom tagColors, falls back to hash-based color.
 */
function getTagColor(
  tag: string,
  tagColors?: TagColor[],
): { backgroundColor: string; color: string } {
  // Check custom tag-colors first
  if (tagColors && tagColors.length > 0) {
    const custom = tagColors.find((tc) => tc.tagKey === tag);
    if (custom) {
      return {
        backgroundColor: custom.color,
        color: custom.backgroundColor || "#fff",
      };
    }
  }
  // Fallback to hash-based color
  const hashColor = getHashColor(tag);
  return { backgroundColor: hashColor, color: "#fff" };
}

/**
 * Determine the due-date urgency class based on days until due.
 * - due-far: more than 3 days away (green)
 * - due-soon: 0–3 days away (yellow)
 * - due-overdue: past due (red)
 */
/** Returns a CSS class indicating due-date urgency (overdue, soon, or far). */
function getDueDateClass(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dateStr}T00:00:00`);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "due-overdue";
  if (diffDays <= 3) return "due-soon";
  return "due-far";
}

/** Renders a sortable card with metadata display, inline editing, and action menu. */
export function Card({
  card,
  columnId,
  cardIndex = 0,
  dateFormat = "YYYY-MM-DD",
  timeFormat = "HH:mm",
  dateDisplayFormat = "YYYY-MM-DD",
  showCheckboxes = true,
  moveDates = false,
  moveTags = false,
  showRelativeDate = false,
  dateColors = [],
  tagColors = [],
  tagSort = [],
  tagAction = "obsidian",
  onTagFilter,
  inlineMetadataPosition = "body",
  moveTaskMetadata = false,
  metadataKeys = [],
  isOverlay = false,
  onUpdate,
  onDelete,
  onToggle,
  onArchiveCard,
  onInsertCard,
  onMoveCard,
  onAddBlockId: _onAddBlockId,
  onNewNoteFromCard,
  onSplitCard,
  onDuplicateCard,
  boardColumns = [],
  searchDimmed = false,
}: CardProps): React.ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [insertPosition, setInsertPosition] = useState<"before" | "after" | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const dropdown = usePortalDropdown();
  const { metadata } = card;

  // Sort tags according to tagSort setting
  const sortedTags = useMemo(() => {
    if (!tagSort || tagSort.length === 0) return metadata.tags;
    const sortOrder = new Map(tagSort.map((ts, i) => [ts.tag, i]));
    return [...metadata.tags].sort((a, b) => {
      const aIdx = sortOrder.get(a);
      const bIdx = sortOrder.get(b);
      if (aIdx != null && bIdx != null) return aIdx - bIdx;
      if (aIdx != null) return -1;
      if (bIdx != null) return 1;
      return a.localeCompare(b);
    });
  }, [metadata.tags, tagSort]);

  // Handlers for date/time picker dialogs
  const handleDateSelect = useCallback(
    (date: string) => {
      setShowDatePicker(false);
      postMessage({ type: "ADD_DATE", cardId: card.id, columnId, date });
    },
    [card.id, columnId],
  );

  const handleTimeSelect = useCallback(
    (time: string) => {
      setShowTimePicker(false);
      postMessage({ type: "ADD_TIME", cardId: card.id, columnId, time });
    },
    [card.id, columnId],
  );

  // Sortable hooks — skip when rendering in DragOverlay or editing
  const sortable = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", cardId: card.id, columnId, index: cardIndex },
    disabled: isOverlay || isEditing,
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = isOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const taskDateEntries: Array<[string, string | null]> = [
    ["\u{1F6EB}", metadata.startDate], // 🛫
    ["\u2795", metadata.createdDate], // ➕
    ["\u23F3", metadata.scheduledDate], // ⏳
    ["\u{1F4C5}", metadata.dueDate], // 📅
    ["\u2705", metadata.doneDate], // ✅
    ["\u274C", metadata.cancelledDate], // ❌
  ];

  const hasMetadata =
    metadata.dueDates.length > 0 ||
    metadata.times.length > 0 ||
    metadata.tags.length > 0 ||
    metadata.wikilinks.length > 0 ||
    (moveDates && taskDateEntries.some(([, d]) => d != null)) ||
    (moveTaskMetadata && taskDateEntries.some(([, d]) => d != null)) ||
    (inlineMetadataPosition === "footer" && metadata.inlineMetadata.length > 0) ||
    (inlineMetadataPosition === "metadata-table" && metadata.inlineMetadata.length > 0) ||
    metadata.recurrence != null ||
    metadata.blockId != null;

  const hasWikilinks = metadata.wikilinks.length > 0;

  // card.text is already stripped of @{} markers, #tags, [[wikilinks]], and inline metadata
  // by the parser. Still need to:
  // - strip date emojis (when moveDates) - they weren't being stripped by parser
  // - strip checkboxes from continuation lines
  const displayText = stripMetadataMarkers(card.text, {
    stripDateEmojis: moveDates,
    stripCheckboxes: true,
  });

  const classNames = [
    "card",
    isDragging && !isOverlay ? "dragging" : "",
    isOverlay ? "drag-overlay" : "",
    isEditing ? "editing" : "",
    searchDimmed ? "search-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleStartEdit = useCallback(() => {
    dropdown.close();
    setIsEditing(true);
  }, [dropdown]);

  const handleConfirmEdit = useCallback(
    (newText: string) => {
      setIsEditing(false);
      if (onUpdate && newText !== card.text) {
        onUpdate(card.id, columnId, newText);
      }
    },
    [onUpdate, card.id, card.text, columnId],
  );

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleDelete = useCallback(() => {
    dropdown.close();
    if (onDelete) {
      onDelete(card.id, columnId);
    }
  }, [onDelete, card.id, columnId, dropdown]);

  const handleArchive = useCallback(() => {
    dropdown.close();
    if (onArchiveCard) {
      onArchiveCard(card.id, columnId);
    }
  }, [onArchiveCard, card.id, columnId, dropdown]);

  const handleCopyItem = useCallback(() => {
    dropdown.close();
    navigator.clipboard.writeText(card.rawText).catch(() => {
      // Silently ignore clipboard errors
    });
  }, [card.rawText, dropdown]);

  const handleNewNoteFromCard = useCallback(() => {
    dropdown.close();
    if (onNewNoteFromCard) {
      onNewNoteFromCard(card.id, columnId);
    }
  }, [onNewNoteFromCard, card.id, columnId, dropdown]);

  const handleSplitCard = useCallback(() => {
    dropdown.close();
    if (onSplitCard) {
      onSplitCard(card.id, columnId);
    }
  }, [onSplitCard, card.id, columnId, dropdown]);

  const handleDuplicateCard = useCallback(() => {
    dropdown.close();
    if (onDuplicateCard) {
      onDuplicateCard(card.id, columnId);
    }
  }, [onDuplicateCard, card.id, columnId, dropdown]);

  const handleOpenLinkedNote = useCallback(
    (link: string) => {
      dropdown.close();
      postMessage({ type: "OPEN_FILE", path: link });
    },
    [dropdown],
  );

  const handleInsertBefore = useCallback(() => {
    dropdown.close();
    setInsertPosition("before");
  }, [dropdown]);

  const handleInsertAfter = useCallback(() => {
    dropdown.close();
    setInsertPosition("after");
  }, [dropdown]);

  const handleInsertConfirm = useCallback(
    (text: string) => {
      if (text.trim() && onInsertCard && insertPosition) {
        onInsertCard(columnId, text.trim(), insertPosition, card.id);
      }
      setInsertPosition(null);
    },
    [onInsertCard, columnId, card.id, insertPosition],
  );

  const handleInsertCancel = useCallback(() => {
    setInsertPosition(null);
  }, []);

  const handleMoveToTop = useCallback(() => {
    dropdown.close();
    if (onMoveCard) {
      onMoveCard(card.id, columnId, columnId, 0);
    }
  }, [onMoveCard, card.id, columnId, dropdown]);

  const handleMoveToBottom = useCallback(() => {
    dropdown.close();
    if (onMoveCard) {
      const currentCol = boardColumns.find((c) => c.id === columnId);
      const lastIndex = currentCol ? Math.max(0, currentCol.cardCount - 1) : 0;
      onMoveCard(card.id, columnId, columnId, lastIndex);
    }
  }, [onMoveCard, card.id, columnId, boardColumns, dropdown]);

  const handleMoveToList = useCallback(
    (targetColumnId: string) => {
      dropdown.close();
      if (onMoveCard) {
        onMoveCard(card.id, columnId, targetColumnId, 0);
      }
    },
    [onMoveCard, card.id, columnId, dropdown],
  );

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

  if (insertPosition) {
    return (
      <div
        ref={isOverlay ? undefined : setNodeRef}
        className={classNames}
        style={style}
        data-card-id={card.id}
        data-column-id={columnId}
      >
        <InlineEdit
          defaultValue=""
          placeholder={`New card (${insertPosition})...`}
          onConfirm={handleInsertConfirm}
          onCancel={handleInsertCancel}
        />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div
        ref={isOverlay ? undefined : setNodeRef}
        className={classNames}
        style={style}
        data-card-id={card.id}
        data-column-id={columnId}
      >
        <InlineEdit
          defaultValue={getEditableText(card.rawText)}
          placeholder="Card text..."
          onConfirm={handleConfirmEdit}
          onCancel={handleCancelEdit}
        />
      </div>
    );
  }

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      className={classNames}
      style={style}
      data-card-id={card.id}
      data-column-id={columnId}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
    >
      <div className="card-body">
        <input
          type="checkbox"
          className={`card-checkbox${!showCheckboxes ? " hidden" : ""}`}
          checked={card.checked}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggle?.(card.id, columnId);
          }}
          readOnly
        />
        {metadata.priority != null && PriorityEmoji[metadata.priority] && (
          <span className="priority-indicator">{PriorityEmoji[metadata.priority]}</span>
        )}
        <MarkdownRenderer
          content={displayText}
          className={`card-text${card.checked ? " checked" : ""}`}
          onTagClick={(tag) => {
            if (tagAction === "kanban" && onTagFilter) {
              onTagFilter(tag);
            } else if (tagAction === "obsidian") {
              postMessage({ type: "SEARCH_TAG", tag });
            }
          }}
        />
        {!isOverlay && (
          <div className="card-menu">
            <button
              ref={dropdown.triggerRef}
              className="card-menu-trigger"
              onClick={handleMenuToggle}
              aria-label="Card actions"
            >
              <MoreHorizontal size={16} />
            </button>
            <PortalDropdown
              isOpen={dropdown.isOpen}
              position={dropdown.position}
              onClose={dropdown.close}
              dropdownClassName="card-menu-dropdown"
            >
              <button className="card-menu-item" onClick={handleStartEdit}>
                <Pencil size={14} />
                Edit
              </button>
              <button className="card-menu-item" onClick={handleCopyItem}>
                <Copy size={14} />
                Copy Item
              </button>
              <button className="card-menu-item" onClick={handleNewNoteFromCard}>
                <FilePlus size={14} />
                New note from card
              </button>
              <button className="card-menu-item" onClick={handleSplitCard}>
                <Scissors size={14} />
                Split card
              </button>
              <button className="card-menu-item" onClick={handleDuplicateCard}>
                <Layers size={14} />
                Duplicate card
              </button>
              <div className="card-menu-separator" />
              <button className="card-menu-item" onClick={handleInsertBefore}>
                <ArrowUp size={14} />
                Insert card before
              </button>
              <button className="card-menu-item" onClick={handleInsertAfter}>
                <ArrowDown size={14} />
                Insert card after
              </button>
              <div className="card-menu-separator" />
              <button className="card-menu-item" onClick={handleMoveToTop}>
                <ArrowUp size={14} />
                Move to top
              </button>
              <button className="card-menu-item" onClick={handleMoveToBottom}>
                <ArrowDown size={14} />
                Move to bottom
              </button>
              <div className="card-menu-separator" />
              {boardColumns.filter((c) => c.id !== columnId).length > 0 && (
                <>
                  <div className="card-menu-label">Move to list</div>
                  {boardColumns
                    .filter((c) => c.id !== columnId)
                    .map((col) => (
                      <button
                        key={`move-to-${col.id}`}
                        className="card-menu-item card-menu-subitem"
                        onClick={() => handleMoveToList(col.id)}
                      >
                        <ChevronRight size={14} />
                        {col.title}
                      </button>
                    ))}
                  <div className="card-menu-separator" />
                </>
              )}
              {hasWikilinks &&
                metadata.wikilinks.map((link) => (
                  <button
                    key={`open-${link}`}
                    className="card-menu-item"
                    onClick={() => handleOpenLinkedNote(link)}
                  >
                    <FileText size={14} />
                    Open: {link}
                  </button>
                ))}
              <div className="card-menu-separator" />
              <button
                className="card-menu-item"
                onClick={() => {
                  dropdown.close();
                  setShowDatePicker(true);
                }}
              >
                <Calendar size={14} />
                Add Date
              </button>
              <button
                className="card-menu-item"
                onClick={() => {
                  dropdown.close();
                  postMessage({ type: "REMOVE_DATE", cardId: card.id, columnId });
                }}
              >
                <CalendarX size={14} />
                Remove Date
              </button>
              <button
                className="card-menu-item"
                onClick={() => {
                  dropdown.close();
                  setShowTimePicker(true);
                }}
              >
                <Clock size={14} />
                Add Time
              </button>
              <button
                className="card-menu-item"
                onClick={() => {
                  dropdown.close();
                  postMessage({ type: "REMOVE_TIME", cardId: card.id, columnId });
                }}
              >
                <TimerOff size={14} />
                Remove Time
              </button>
              <button className="card-menu-item" onClick={handleArchive}>
                <Archive size={14} />
                Archive
              </button>
              <button className="card-menu-item card-menu-item-danger" onClick={handleDelete}>
                <Trash2 size={14} />
                Delete
              </button>
            </PortalDropdown>
          </div>
        )}
      </div>
      {hasMetadata && (
        <div className="card-metadata">
          {/* Task date emojis — 🛫➕⏳📅✅❌ — shown when moveDates or moveTaskMetadata is true */}
          {(moveDates || moveTaskMetadata) &&
            taskDateEntries.map(
              ([emoji, dateVal]) =>
                dateVal && (
                  <span
                    key={`taskdate-${emoji}`}
                    className="metadata-chip task-date"
                    style={(() => {
                      const colors = getDateColor(dateVal, dateColors);
                      return colors ?? {};
                    })()}
                  >
                    {emoji}{" "}
                    {showRelativeDate
                      ? formatRelativeDate(dateVal, dateDisplayFormat)
                      : formatDate(dateVal, dateDisplayFormat)}
                  </span>
                ),
            )}

          {/* Legacy due date chips from @{YYYY-MM-DD} markers */}
          {metadata.dueDates.map((d) => (
            <span
              key={`date-${d}`}
              className={`metadata-chip ${getDueDateClass(d)}`}
              style={(() => {
                const colors = getDateColor(d, dateColors);
                return colors ?? {};
              })()}
            >
              📅{" "}
              {showRelativeDate
                ? formatRelativeDate(d, dateDisplayFormat)
                : formatDate(d, dateFormat)}
            </span>
          ))}

          {/* Time chips from @{HH:mm} markers */}
          {metadata.times.map((t) => (
            <span key={`time-${t}`} className="metadata-chip">
              🕐 {formatTime(t, timeFormat)}
            </span>
          ))}

          {/* Tag badges — moveTags controls position (footer vs inline) */}
          {metadata.tags.length > 0 &&
            !moveTags &&
            sortedTags.map((tag) => (
              <span
                key={`tag-${tag}`}
                className="metadata-chip tag-badge"
                style={getTagColor(tag, tagColors)}
                onClick={() => {
                  if (tagAction === "kanban" && onTagFilter) {
                    onTagFilter(tag);
                  } else if (tagAction === "obsidian") {
                    postMessage({ type: "SEARCH_TAG", tag });
                  }
                }}
                role={tagAction === "kanban" || tagAction === "obsidian" ? "button" : undefined}
                tabIndex={tagAction === "kanban" || tagAction === "obsidian" ? 0 : undefined}
              >
                #{tag}
              </span>
            ))}

          {/* Wikilink chips */}
          {metadata.wikilinks.map((link) => (
            <span key={`link-${link}`} className="metadata-chip">
              🔗 {link}
            </span>
          ))}

          {/* Recurrence display */}
          {metadata.recurrence && (
            <span className="metadata-chip recurrence">🔁 {metadata.recurrence}</span>
          )}

          {/* Dataview inline metadata — rendered as chips when position is 'footer' */}
          {inlineMetadataPosition === "footer" &&
            metadata.inlineMetadata.map((m) => (
              <span key={`inline-${m.key}`} className="metadata-chip inline-meta">
                {m.key}: {m.value}
              </span>
            ))}

          {/* Metadata table — shown when inlineMetadataPosition is 'metadata-table' */}
          {inlineMetadataPosition === "metadata-table" && metadata.inlineMetadata.length > 0 && (
            <MetadataTable items={metadata.inlineMetadata} metadataKeys={metadataKeys} />
          )}

          {/* Block ID — monospace muted display */}
          {metadata.blockId && <span className="metadata-chip block-id">^{metadata.blockId}</span>}

          {/* Tag badges in footer when moveTags is true */}
          {metadata.tags.length > 0 && moveTags && (
            <div className="card-footer-tags">
              {sortedTags.map((tag) => (
                <span
                  key={`tag-footer-${tag}`}
                  className="metadata-chip tag-badge"
                  style={getTagColor(tag, tagColors)}
                  onClick={() => {
                    if (tagAction === "kanban" && onTagFilter) {
                      onTagFilter(tag);
                    } else if (tagAction === "obsidian") {
                      postMessage({ type: "SEARCH_TAG", tag });
                    }
                  }}
                  role={tagAction === "kanban" || tagAction === "obsidian" ? "button" : undefined}
                  tabIndex={tagAction === "kanban" || tagAction === "obsidian" ? 0 : undefined}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Date picker dialog */}
      {showDatePicker && (
        <div className="date-picker-overlay" onClick={() => setShowDatePicker(false)}>
          <div className="date-picker-dialog" onClick={(e) => e.stopPropagation()}>
            <DatePicker
              onSelect={handleDateSelect}
              onCancel={() => setShowDatePicker(false)}
              value={metadata.dueDates[0] ?? ""}
            />
          </div>
        </div>
      )}

      {/* Time picker dialog */}
      {showTimePicker && (
        <div className="time-picker-overlay" onClick={() => setShowTimePicker(false)}>
          <div className="time-picker-dialog" onClick={(e) => e.stopPropagation()}>
            <input
              type="time"
              value={metadata.times[0] ?? ""}
              onChange={(e) => handleTimeSelect(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTimeSelect((e.target as HTMLInputElement).value);
                if (e.key === "Escape") setShowTimePicker(false);
              }}
            />
            <div className="time-picker-actions">
              <button onClick={() => setShowTimePicker(false)}>Cancel</button>
              <button
                onClick={() =>
                  handleTimeSelect(
                    (document.querySelector('input[type="time"]') as HTMLInputElement)?.value ?? "",
                  )
                }
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
