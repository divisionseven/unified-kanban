# Features

Unified Kanban provides 22 features for managing your project boards in VS Code, fully compatible with the Obsidian Kanban markdown format. Whether you're organizing tasks, tracking projects, or managing workflows, these tools give you complete control over your kanban boards with seamless round-trip fidelity.

---

## Board Management

- **Column management** — Add, rename (double-click), delete, reorder, and toggle column completion
- **Column context menu** — 12 items: Sort by text/date/tags/priority/metadata, Archive completed cards, Archive column, Insert list before/after, Toggle complete
- **Board header toolbar** — Settings, View Switcher, Search, Markdown, Archive All, Add List buttons

---

## Card Operations

- **Drag-and-drop** — Reorder cards within and between columns, reorder columns, with optimistic UI and automatic revert-on-failure
- **Inline editing** — Click to edit cards directly, add new cards to any column, delete cards
- **Card context menu** — 14 items: Copy link, Insert before/after, Move to top/bottom, Move to list (cross-column), Add block ID, Delete, Archive, Duplicate, Edit
- **Advanced card features** — Create new note from card (with template/folder), split multi-line cards, duplicate card
- **Auto-check** cards when moved to a "Complete" column

---

## View Modes

- **Three view modes** — Board view (default), Table view (sortable, resizable columns), and List view (collapsible, full-width cards) — persisted across sessions

---

## Rich Content

- **Extended inline syntax** — Obsidian Tasks emoji shorthand (priority: 🔺⏫🔼🔽⏬, dates: 🛫➕⏳📅✅❌), Dataview inline metadata (`[key:: value]` and `(key:: value)`), block IDs (🆔 emoji and ^caret forms), wikilink dates (`@[[YYYY-MM-DD]]`), markdown note dates, recurrence (🔁), and dependsOn (⛔)
- **Smart metadata** — `#tags` with custom-colored badges, `@{dates}` with urgency coloring, `[[wikilinks]]` with open action, inline metadata footer rendering
- **Native date picker** — WeekStart configuration, Add/Remove Date and Time, input validation (YYYY-MM-DD, HH:mm)
- **Tag enhancements** — Custom tag colors, custom sort order, configurable click behavior, tags moved to footer
- **Metadata display** — Three position modes (body, footer, metadata-table), configurable key filtering

---

## Customization

- **CSS customization** — CSS classes from frontmatter applied to board root
- **Keyboard shortcuts** — Ctrl+Shift+A (archive card), Ctrl+Shift+, (settings), Ctrl+Shift+K (toggle view)
- **Settings panel** — 30+ typed settings (lane width, date/time format, tag behavior, archive config, metadata display, and more) persisted per-board
- **Status bar** — Per-column card counts
- **Theme-aware** — Follows VS Code dark/light theme via CSS custom properties

---

## Workflow

- **Client-side search** — Real-time card search with dimming of non-matching cards
- **Archive system** — Single card archiving, configurable date stamping, archive size limiting
- **Round-trip fidelity** — Byte-identical serialization preserves existing markdown structure
