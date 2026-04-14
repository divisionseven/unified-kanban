<div align="center">
  <img src="docs/assets/banner.png" alt="Unified Kanban" width="250">

# Unified Kanban

### Unifying kanban syntax for markdown — the same board format across Obsidian and VS Code

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code%20Extension-Unified%20Kanban-8A2BE2?style=plastic&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=divisionseven.unified-kanban)
[![VS Code](https://img.shields.io/badge/VS%20Code%20Version-1.85+-8A2BE2?style=plastic)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-8A2BE2?style=plastic&logo=typescript&logoColor=white)](https://github.com/divisionseven/unified-kanban)
[![React](https://img.shields.io/badge/React-18.x-8A2BE2?style=plastic&logo=react&logoColor=white)](https://github.com/divisionseven/unified-kanban)
[![Coverage](https://img.shields.io/badge/Coverage-90%25-8A2BE2?style=plastic&logo=codecov&logoColor=white)](https://github.com/divisionseven/unified-kanban)
[![Tests](https://img.shields.io/badge/tests-484_passing-8A2BE2.svg?logo=vitest&logoColor=white&style=plastic)](https://vitest.dev/)

[![Version](https://img.shields.io/badge/Version-0.6.1-black.svg?style=plastic)](https://github.com/divisionseven/unified-kanban)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg?style=plastic)](LICENSE)

</div>

## Why Unified Kanban?

Every markdown kanban extension on VS Code invents its own incompatible syntax. Switching tools means rewriting your boards from scratch. The [Obsidian Kanban](https://github.com/obsidian-community/obsidian-kanban) plugin has emerged as the de facto standard — battle-tested and widely adopted. **Unified Kanban** bridges the gap, bringing that proven format to VS Code so your boards work identically in both editors. One syntax, everywhere.

## Installation

Install from the VS Code Marketplace:

1. Open the **Extensions** sidebar (`Ctrl`+`Shift`+`X` / `Cmd`+`Shift`+`X`)
2. Search for **Unified Kanban**
3. Click **Install**

Or use Quick Open (`Ctrl`+`P` / `Cmd`+`P`):

```bash
ext install unified-kanban
```

## Getting Started

### Opening a Board

**Recommended use:** This extension is designed to work with markdown kanban boards — either boards you created with this extension or with the [obsidian-kanban plugin](https://github.com/obsidian-community/obsidian-kanban). These files contain YAML frontmatter with `kanban-plugin: basic`.

1. Right-click any `.md` kanban file in the Explorer
2. Select **Open With...** → **Kanban Board**

Or use the Command Palette:

- **Kanban: New Board** — creates a new kanban board with all required frontmatter

**What about regular `.md` files?**
If you open a non-kanban `.md` file, the extension will attempt to render any `##` headings as lists and `- [ ]` items as cards. However, anything else in the file will be ignored. If you change any board settings, the extension will automatically add the required settings footer to your document.

**Compatibility note:** While Unified Kanban is flexible about the YAML frontmatter section being included, the Obsidian kanban plugin requires proper YAML frontmatter to recognise the document as a kanban board. Any new boards created using this extension will include **all** required fields to work perfectly in both Obsidian and here.

## Screenshots

<!-- TODO: Add screenshots -->
<!--
Required screenshots:
1. Board view showing columns and cards - capture the main kanban board with at least 3 columns
2. Card detail view - show a card expanded with tags, dates, and metadata visible
3. Settings panel - show the settings/configuration UI

Place images in: docs/assets/
Recommended format: PNG, 1200px width for good readability
-->

### The Markdown Format

Unified Kanban uses the same markdown format as the popular [obsidian-kanban plugin](https://github.com/obsidian-community/obsidian-kanban). Using this extension, your boards are now seamlessly portable between Obsidian and VS Code.

```markdown
---
kanban-plugin: basic
---

## Todo

- [ ] Task one #tag @{2025-04-15}
- [ ] Task two [[linked-note]]

## In Progress

- [ ] Task three

## Done

**Complete**

- [x] Done task

%% kanban:settings
{"kanban-plugin":"basic","lane-width":270,"date-format":"YYYY-MM-DD","time-format":"HH:mm"}
%%
```

**Format rules:**

- YAML frontmatter must include `kanban-plugin: basic`
- Each `##` heading becomes a list
- `- [ ]` for open cards, `- [x]` for completed cards
- `#tag-name` — rendered as colored badges
- `@{YYYY-MM-DD}` — rendered as urgency-colored chips
- `[[note-name]]` — clickable to open linked notes
- `%% kanban:settings %%` — per-board settings (JSON)
- `**Complete**` — marks the archive section for done cards

## Features

Unified Kanban includes 22 features for your project boards:

- **Drag-and-drop** — Reorder cards and columns with intuitive drag interactions
- **Three view modes** — Board, Table, and List views to match your workflow
- **Rich content** — Tags, dates, wikilinks, and custom metadata with inline editing
- **Per-board settings** — 30+ customization options including themes, dates, and behavior
- **Theme-aware design** — Works with light and dark themes with round-trip fidelity
- **Archive system** — Organize completed cards with date-stamped archives

[View all 20+ features →](docs/FEATURES.md)

## Settings

Per-board settings are configured via the gear icon in the board toolbar and stored in the markdown file's `%% kanban:settings %%` block:

| Setting                   | Default      | Description                                                     |
| ------------------------- | ------------ | --------------------------------------------------------------- |
| `lane-width`              | `270`        | Column width in pixels (150–600)                                |
| `date-format`             | `YYYY-MM-DD` | Display format for dates                                        |
| `time-format`             | `HH:mm`      | Display format for times                                        |
| `prepend-new-cards`       | `false`      | Add new cards to the top of a column instead of the bottom      |
| `show-checkboxes`         | `true`       | Show checkboxes on cards                                        |
| `new-card-insertion`      | `append`     | How new cards are inserted (prepend, prepend-compact, append)   |
| `hide-card-count`         | `false`      | Hide the card count badge on column headers                     |
| `move-tags`               | `true`       | Extract tags from card text and display as metadata             |
| `tag-action`              | `obsidian`   | Tag click behavior: `kanban` (filter) or `obsidian` (search)    |
| `move-dates`              | `true`       | Extract dates from card text and display as metadata            |
| `date-trigger`            | `@`          | Character that triggers date autocomplete                       |
| `time-trigger`            | `@`          | Character that triggers time autocomplete                       |
| `date-display-format`     | `YYYY-MM-DD` | Format for displaying dates on cards                            |
| `show-relative-date`      | `false`      | Show dates as relative (e.g., "in 3 days")                      |
| `link-date-to-daily-note` | `false`      | Make date metadata link to daily notes                          |
| `date-picker-week-start`  | `1`          | Day the date picker starts on (0=Sunday, 1=Monday)              |
| `archive-with-date`       | `false`      | Add a date stamp when archiving cards                           |
| `append-archive-date`     | `false`      | Append date to end of archived card text                        |
| `archive-date-separator`  | ` `          | Separator between card text and archive date                    |
| `archive-date-format`     | `YYYY-MM-DD` | Date format for archive date stamps                             |
| `max-archive-size`        | `-1`         | Maximum cards in archive (-1 for unlimited)                     |
| `metadata-position`       | `body`       | Where to display inline metadata (body, footer, metadata-table) |
| `move-task-metadata`      | `true`       | Extract Obsidian Tasks metadata from card text                  |
| `new-note-template`       | `""`         | Template content for new notes created from cards               |
| `new-note-folder`         | `""`         | Folder path for new notes created from cards                    |
| `show-add-list`           | `true`       | Show the "Add List" button in the board header                  |
| `show-archive-all`        | `true`       | Show the "Archive All" button in the board header               |
| `show-view-as-markdown`   | `true`       | Show the "View as Markdown" button in the board header          |
| `show-board-settings`     | `true`       | Show the board settings button in the board header              |
| `show-search`             | `true`       | Show the search button in the board header                      |
| `show-set-view`           | `true`       | Show the set view button in the board header                    |
| `show-title`              | `true`       | Show the board title (filename or custom)                       |
| `custom-title`            | `""`         | Custom title to display (overrides filename when set)           |

## Commands

| Command                    | Title                       | Description                                     |
| -------------------------- | --------------------------- | ----------------------------------------------- |
| `kanban.newBoard`          | Kanban: New Board           | Create a new kanban board from template         |
| `kanban.openAsText`        | Kanban: Open as Text        | Reopen the current board as plain markdown      |
| `kanban.archiveDoneCards`  | Kanban: Archive Done Cards  | Move all completed cards to the archive section |
| `kanban.toggleKanbanView`  | Kanban: Toggle Kanban View  | Toggle between kanban board and text view       |
| `kanban.convertToKanban`   | Kanban: Convert to Kanban   | Convert the current file to kanban format       |
| `kanban.addKanbanLane`     | Kanban: Add Kanban Lane     | Add a new lane to the current board             |
| `kanban.viewBoard`         | Kanban: View as Board       | Switch to board view                            |
| `kanban.viewTable`         | Kanban: View as Table       | Switch to table view                            |
| `kanban.viewList`          | Kanban: View as List        | Switch to list view                             |
| `kanban.openBoardSettings` | Kanban: Open Board Settings | Open the board settings panel                   |

## FAQ

For additional questions and solutions, see the [FAQ documentation](docs/FAQ.md).

### How do I exclude kanban files from markdown linters?

Since kanban files use non-standard markdown syntax, linters may flag them with errors. For full instructions on configuring your specific linter, see the [FAQ documentation](docs/FAQ.md).

**Quick patterns that work:**

- Use filename patterns (e.g., `*board*.md`, `*-kanban.md`)
- Exclude the kanban directory (e.g., `kanban/`, `boards/`)

### Recommended Workflow

**Creating a new board:**

1. Use **Kanban: New Board** from the Command Palette
2. This creates a new `.md` file with all required YAML frontmatter (`kanban-plugin: basic`)
3. The file is ready to use in both this extension and Obsidian

**Opening an existing board:**

- Right-click any `.md` file with `kanban-plugin: basic` frontmatter in the Explorer
- Select **Open With...** → **Kanban Board**
- The board will render with all kanban features

**What if I open a regular `TODO.md` or other markdown document (without YAML frontmatter)?**

- The extension will attempt to render `##` headings as columns and `- [ ]` items as cards
- Anything else in the file will be ignored
- If you change any board settings, the extension will automatically add the required settings footer to your document
- However, many features (settings, archive, etc.) may require the proper frontmatter to be added

## Troubleshooting

Having issues? Check the [FAQ](docs/FAQ.md) for common questions and solutions.

## Support & Community

[![GitHub issues](https://img.shields.io/github/issues/divisionseven/unified-kanban?color=8A2BE2&style=plastic)](https://github.com/divisionseven/unified-kanban/issues)
[![GitHub discussions](https://img.shields.io/github/discussions/divisionseven/unified-kanban?color=8A2BE2&style=plastic)](https://github.com/divisionseven/unified-kanban/discussions)

- [Report issues](https://github.com/divisionseven/unified-kanban/issues)
- [Join discussions](https://github.com/divisionseven/unified-kanban/discussions)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and how to submit changes.

## License

Unified Kanban is distributed under the [MIT License](LICENSE)

## Acknowledgments

- [Obsidian](https://obsidian.md) — the amazing note-taking app that inspired this project
- [obsidian-kanban](https://github.com/obsidian-community/obsidian-kanban) — the established markdown format that makes this project possible
- [dnd-kit](https://github.com/clauderic/dnd-kit) — drag-and-drop library
- [Lucide](https://lucide.dev) — beautiful open-source icons
- [VS Code Extension API](https://code.visualstudio.com/api) — documentation and samples

## Disclaimer

> Unified Kanban is not affiliated with [Obsidian](https://obsidian.md) or with the [obsidian-kanban](https://github.com/obsidian-community/obsidian-kanban) plugin.
