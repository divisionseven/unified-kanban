/**
 * Extracted metadata from a card's inline markers.
 *
 * Sources (project-scope.md):
 * - dueDates: lines 28, 30 — @{YYYY-MM-DD}
 * - times: line 31 — @{HH:mm}
 * - tags: line 33 — #tag (not headings, extracted from card text)
 * - wikilinks: line 34 — [[wikilink]]
 */
export interface CardMetadata {
  /** Extracted from @{YYYY-MM-DD} markers */
  dueDates: string[];
  /** Extracted from @{HH:mm} markers */
  times: string[];
  /** Extracted from #tag markers (excludes matches inside backtick code spans) */
  tags: string[];
  /** Extracted from [[wikilink]] markers */
  wikilinks: string[];
  /** Priority from Obsidian Tasks emoji (0=highest, 5=lowest, null=none) */
  priority: number | null;
  /** Start date from 🛫 YYYY-MM-DD */
  startDate: string | null;
  /** Created date from ➕ YYYY-MM-DD */
  createdDate: string | null;
  /** Scheduled date from ⏳ YYYY-MM-DD */
  scheduledDate: string | null;
  /** Due date from 📅 YYYY-MM-DD (canonical, separate from dueDates array) */
  dueDate: string | null;
  /** Done date from ✅ YYYY-MM-DD */
  doneDate: string | null;
  /** Cancelled date from ❌ YYYY-MM-DD */
  cancelledDate: string | null;
  /** Recurrence from 🔁 every week */
  recurrence: string | null;
  /** Depends on from ⛔ id */
  dependsOn: string | null;
  /** Block ID from 🆔 id or ^abc123 */
  blockId: string | null;
  /** Dataview inline metadata fields [key:: value] or (key:: value) */
  inlineMetadata: Array<{ key: string; value: string; raw: string }>;
  /** Dates from @[[YYYY-MM-DD]] wikilink syntax */
  wikilinkDates: string[];
  /** Dates from @[YYYY-MM-DD](path) markdown link syntax */
  mdNoteDates: Array<{ date: string; path: string }>;
}

/**
 * A single kanban card parsed from a `- [ ]` or `- [x]` list item.
 *
 * Source: project-scope.md lines 22–23 (checkbox syntax), line 50 (activation signal)
 */
export interface Card {
  /** Deterministic ID: djb2 hash of rawText */
  id: string;
  /** Zero-based line index within the column's rawContent where this card was found during parsing */
  lineIndex?: number;
  /** Card title with metadata markers stripped */
  text: string;
  /** Original line content, unmodified — critical for round-trip fidelity */
  rawText: string;
  /** true = [x] (completed), false = [ ] (open) */
  checked: boolean;
  /** Structured metadata extracted from card text */
  metadata: CardMetadata;
}

/**
 * A kanban column parsed from a `## Heading` section.
 *
 * Source: project-scope.md line 51 (## Heading = column)
 */
export interface Column {
  /** Deterministic ID: slugified heading text (lowercase, non-alphanumeric → '-') */
  id: string;
  /** Heading text as-is (without the ## prefix) */
  title: string;
  /** true if **Complete** marker present above cards (lines 39–40) */
  complete: boolean;
  /** Cards in this column */
  cards: Card[];
  /**
   * Raw content between this heading and the next (or end of body).
   * Preserved verbatim for byte-identical round-trip serialization.
   * Includes blank lines, **Complete** markers, card lines, etc.
   */
  rawContent: string;
}

/**
 * Tag color rule for styling specific tags on cards.
 */
export interface TagColor {
  tagKey: string;
  color: string;
  backgroundColor: string;
}

/**
 * Tag sort rule for ordering tags on cards.
 */
export interface TagSort {
  tag: string;
}

/**
 * Date color rule for styling cards based on date proximity.
 */
export interface DateColor {
  isToday?: boolean;
  isBefore?: boolean;
  isAfter?: boolean;
  distance?: number;
  unit?: "hours" | "days" | "weeks" | "months";
  direction?: "before" | "after";
  color?: string;
  backgroundColor?: string;
}

/**
 * Data key definition for inline metadata display.
 */
export interface DataKey {
  metadataKey: string;
  label: string;
  shouldHideLabel: boolean;
  containsMarkdown: boolean;
}

/**
 * Board-level settings from the `%% kanban:settings ... %%` block
 * or from YAML frontmatter.
 *
 * Source: project-scope.md lines 42–46 (settings block format)
 */
export interface BoardSettings {
  "kanban-plugin": string;
  // Board Format & Display
  "show-checkboxes"?: boolean;
  "new-line-trigger"?: "enter" | "shift-enter";
  "new-card-insertion-method"?: "prepend" | "prepend-compact" | "append";
  "hide-card-count"?: boolean;
  "lane-width"?: number;
  "full-list-lane-width"?: boolean;
  "show-title"?: boolean;
  "custom-title"?: string;
  "list-collapse"?: boolean[];
  // Appearance
  "accent-color"?: string;
  "table-sizing"?: Record<string, number>;
  // Tags
  "move-tags"?: boolean;
  "tag-action"?: "kanban" | "obsidian";
  "tag-colors"?: TagColor[];
  "tag-sort"?: TagSort[];
  // Date & Time
  "move-dates"?: boolean;
  "date-trigger"?: string;
  "time-trigger"?: string;
  "date-format"?: string;
  "date-display-format"?: string;
  "time-format"?: string;
  "date-time-display-format"?: string;
  "show-relative-date"?: boolean;
  "date-picker-week-start"?: number;
  "date-colors"?: DateColor[];
  // Archive
  "archive-with-date"?: boolean;
  "append-archive-date"?: boolean;
  "archive-date-separator"?: string;
  "archive-date-format"?: string;
  "max-archive-size"?: number;
  // Inline Metadata
  "inline-metadata-position"?: "body" | "footer" | "metadata-table";
  "move-task-metadata"?: boolean;
  "metadata-keys"?: DataKey[];
  // Note Creation
  "new-note-template"?: string;
  "new-note-folder"?: string;
  // Header Button Visibility
  "show-add-list"?: boolean;
  "show-archive-all"?: boolean;
  "show-view-as-markdown"?: boolean;
  "show-board-settings"?: boolean;
  "show-search"?: boolean;
  "show-set-view"?: boolean;
  /** Preserve unknown keys verbatim for forward compatibility */
  [key: string]: unknown;
}

/**
 * Top-level state of a parsed kanban board.
 *
 * Source: project-scope.md lines 18–58 (full format spec)
 */
export interface BoardState {
  /** Raw YAML frontmatter content (between --- delimiters, not including them) */
  frontmatter: string;
  /** Full frontmatter block including --- delimiters */
  frontmatterRaw: string;
  /** Parsed columns */
  columns: Column[];
  /** Parsed settings, or null if no settings block present */
  settings: BoardSettings | null;
  /** Full settings block including %% markers, null if absent */
  settingsRaw: string | null;
  /**
   * Pre-heading preamble content (everything before the first ## heading
   * that isn't frontmatter). Captured for round-trip serialization fidelity.
   */
  rawBody: string;
  /** Cards parsed from the archive section (below *** \n ## Archive) */
  archiveCards: Card[];
  /** Raw content of the archive section, empty string if absent */
  archiveRawContent: string;
  /** CSS classes from frontmatter (cssclasses array + cssclass single) */
  cssClasses: string[];
}
