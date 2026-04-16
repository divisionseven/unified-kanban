# Frequently Asked Questions

## Quick Start

### How do I open a kanban board?

**Recommended use:** This extension is designed to open existing kanban boards — either boards you created with this extension or with the Obsidian kanban plugin. These files contain YAML frontmatter with `kanban-plugin: basic`.

1. Right-click any `.md` kanban file in the Explorer
2. Select **Open With...** → **Kanban Board**

Or use the Command Palette:

- **Kanban: New Board** — creates a new kanban board with all required frontmatter

**What about regular `.md` files?**
If you open a non-kanban `.md` file, the extension will attempt to render any `##` headings as lists and `- [ ]` items as cards. However, anything else in the file will be ignored. If you change any board settings, the extension will automatically add the required settings footer to your document.

**Compatibility note:** While Unified Kanban is flexible about the YAML frontmatter section being included, the Obsidian kanban plugin requires proper YAML frontmatter to recognise the document as a kanban board. Any new boards created using this extension will include **all** required fields to work perfectly in both Obsidian and here.

### What's the fastest way to create a new board?

Press `Ctrl+Shift+N` / `Cmd+Shift+N` to create a new kanban board from a template. The board will include the required YAML frontmatter and sample columns.

### How do I save changes?

Changes are saved automatically as you make them. Each drag-and-drop, edit, or reordering operation immediately updates the markdown file on disk.

---

## Installation & Setup

### How do I install the extension?

1. Open the **Extensions** sidebar (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Search for **Unified Kanban**
3. Click **Install**

Or use Quick Open (`Ctrl+P` / `Cmd+P`):

```bash
ext install unified-kanban
```

### What are the requirements?

- **VS Code** version 1.85.0 or later
- **Operating System**: macOS, Windows, or Linux

The extension is built on the VS Code Custom Editor API, which requires these minimum versions.

### Does it work with VS Code forks (Cursor, Windsurf, VSCodium)?

Yes. The extension uses standard VS Code APIs, so it should work with any VS Code-based editor:

- **Cursor** — Fully supported
- **Windsurf** — Fully supported
- **VSCodium** — Fully supported

Note: Some forks may have slight variations in their extension host implementation. If you encounter issues, try restarting the editor or reinstalling the extension.

---

## Getting Started

### How do I create a new kanban board?

1. Press `Ctrl+Shift+N` / `Cmd+Shift+N` to open the Command Palette with **Kanban: New Board** pre-selected
2. Or right-click in the Explorer and select **New File** with a `.md` extension
3. Add the required YAML frontmatter and format your board

### What does the markdown format look like?

The extension uses the same format as the [Obsidian Kanban plugin](https://github.com/obsidian-community/obsidian-kanban):

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
```

**Format rules:**

| Element     | Syntax                         | Description                       |
| ----------- | ------------------------------ | --------------------------------- |
| Frontmatter | `--- kanban-plugin: basic ---` | Required header (lines 1-3)       |
| Columns     | `## Column Name`               | Each H2 heading becomes a column  |
| Open cards  | `- [ ]`                        | Unchecked task                    |
| Done cards  | `- [x]`                        | Checked task                      |
| Tags        | `#tag-name`                    | Rendered as colored badges        |
| Dates       | `@{YYYY-MM-DD}`                | Rendered as urgency-colored chips |
| Links       | `[[note-name]]`                | Clickable wikilinks               |
| Archive     | `**Complete**`                 | Section for archived done cards   |
| Settings    | `%% kanban:settings %%`        | Per-board configuration           |

### How do I save changes?

All changes are saved automatically in real-time. There's no manual save operation—every edit, drag, or reorder action writes directly to the markdown file.

### Can I convert an existing markdown file to kanban format?

Yes. Open the file and run **Kanban: Convert to Kanban** from the Command Palette. This adds the required frontmatter and restructures the content into kanban format.

---

## Creating & Managing Cards/Columns

### How do I create a new card?

Click the **+** button at the bottom of any column, or press `Enter` while editing a card to create a new one below. The new card position is determined by the `newCardInsertionMethod` setting.

### How do I reorder cards?

Drag and drop cards to reorder them within a column, or drag them to a different column to move them. The order is saved immediately to the markdown file.

### How do I move cards between columns?

Drag a card to the header of another column. The card will move to that column and its status will be updated (open or done) based on the destination column.

### How do I create a new column?

Click **Add List** in the board header (or use `Ctrl+Shift+L` / `Cmd+Shift+L` with the board focused). A new column will appear with a default name that you can edit.

### How do I delete a column?

Hover over the column header and click the **...** menu, then select **Delete**. Cards in the column will need to be moved or archived first.

### How do I archive cards?

- **Single card**: Hover over the card and click the archive icon
- **All done cards**: Click **Archive All** in the board header (only appears when there are done cards in the "Done" column)

Archived cards are moved to the **Complete** section at the bottom of the board.

---

## Customization & Settings

### What settings are available?

The extension provides 30+ settings organized into categories:

**Global Settings** (VS Code preferences):

| Setting                         | Default      | Description                             |
| ------------------------------- | ------------ | --------------------------------------- |
| `kanban.defaultLaneWidth`       | `270`        | Default column width in pixels          |
| `kanban.defaultDateFormat`      | `YYYY-MM-DD` | Default date display format             |
| `kanban.defaultTimeFormat`      | `HH:mm`      | Default time display format             |
| `kanban.newCardInsertionMethod` | `append`     | Where new cards appear (prepend/append) |
| `kanban.showCheckboxes`         | `true`       | Display checkboxes on cards             |
| `kanban.moveTags`               | `true`       | Extract tags as metadata                |
| `kanban.tagAction`              | `obsidian`   | Tag click behavior (filter/search)      |
| `kanban.moveDates`              | `true`       | Extract dates as metadata               |
| `kanban.showRelativeDate`       | `false`      | Show relative dates ("in 3 days")       |

**Per-Board Settings** (gear icon in toolbar):

- `lane-width` — Column width (150-600px)
- `date-format` — Date display format
- `prepend-new-cards` — Add new cards to top
- `show-checkboxes` — Show/hide checkboxes
- `hide-card-count` — Hide column card counts
- `archive-with-date` — Add date stamps when archiving
- And 20+ more...

### Where are settings stored?

**Global settings**: VS Code's `settings.json` (User or Workspace level)

**Per-board settings**: Stored in the markdown file itself within the `%% kanban:settings %%` block:

```markdown
%% kanban:settings
{"kanban-plugin":"basic","lane-width":300,"date-format":"YYYY-MM-DD"}
%%
```

### Can I customize the appearance?

The extension is theme-aware and automatically adapts to your VS Code theme (light or dark). Per-board settings allow you to customize:

- Column width
- Date/time formats
- Checkbox visibility
- Card count badges

For additional styling, the extension uses VS Code's CSS variables for colors, ensuring consistency with your theme.

---

## Tags, Dates & Metadata

### How do I add tags?

Add `#tag-name` anywhere in a card's text. Multiple tags are supported: `#tag1 #tag2`.

Tags are extracted and displayed as colored badges above the card content. Clicking a tag either:

- Filters the board to show only cards with that tag (`kanban` mode)
- Opens Obsidian search (`obsidian` mode)

This behavior is controlled by the `tagAction` setting.

### How do dates work?

Add dates using the format `@{YYYY-MM-DD}` in card text. For example: `@{2025-04-15}`.

Dates are extracted and displayed as colored chips with urgency coloring:

- **Overdue** — Red (past dates)
- **Today** — Orange
- **Upcoming** — Yellow/green (future dates)

Configure the trigger character with `kanban.dateTrigger` (default `@`) and the display format with `kanban.dateDisplayFormat`.

### Can I use custom metadata?

Yes. The extension supports Obsidian inline metadata in card text:

```markdown
- [ ] Task with custom field :: value
```

This is displayed in the card's metadata section. Configure where metadata appears with `kanban.inlineMetadataPosition` (body, footer, or metadata-table).

### How do wikilinks work?

Use Obsidian-style wikilinks `[[note-name]]` to create clickable links. Clicking a link opens the note in VS Code (if it exists) or creates a new file.

---

## View Modes

### What view modes are available?

The extension provides three view modes:

1. **Board** — Classic kanban with columns and cards
2. **Table** — Spreadsheet-like view with columns as fields
3. **List** — Simple list of all cards across columns

### How do I switch between views?

- Use the **View As** dropdown in the board toolbar
- Or use Command Palette commands:
  - **Kanban: View as Board**
  - **Kanban: View as Table**
  - **Kanban: View as List**

### Can I filter cards?

Yes. Click the search icon in the board header to open the search panel. You can filter by:

- Card text content
- Tags
- Dates
- Metadata fields

---

## Keyboard Shortcuts

### What shortcuts are available?

| Shortcut     | macOS         | Windows/Linux  | Action                    |
| ------------ | ------------- | -------------- | ------------------------- |
| New Board    | `Cmd+Shift+N` | `Ctrl+Shift+N` | Create a new kanban board |
| Archive Done | `Cmd+Shift+A` | `Ctrl+Shift+A` | Archive all done cards    |
| Toggle View  | `Cmd+Shift+K` | `Ctrl+Shift+K` | Toggle kanban/text view   |
| Settings     | `Cmd+Shift+,` | `Ctrl+Shift+,` | Open board settings       |

These shortcuts work when the editor has focus. For a full list, check VS Code's Keyboard Shortcuts and search for "kanban".

---

## Common Issues & Troubleshooting

### Extension not loading

**Symptoms**: Opening a `.md` file doesn't show the kanban board view.

**Solutions**:

1. **Check extension is enabled**: Go to Extensions (`Ctrl+Shift+X`) and search for "Unified Kanban". Ensure it's enabled.

2. **Restart the extension host**: Run **Developer: Reload Window** from the Command Palette.

3. **Check the file has correct frontmatter**: The file must start with:

   ```markdown
   ---
   kanban-plugin: basic
   ---
   ```

4. **Verify VS Code version**: Ensure you're using VS Code 1.85.0 or later (`Code → About` on macOS).

### Webview not rendering

**Symptoms**: The kanban view shows a blank area or error message.

**Solutions**:

1. **Check for JavaScript errors**: Open DevTools (`Help → Toggle Developer Tools`) and check the Console tab for errors.

2. **Clear extension cache**: Run **Developer: Reload Window** to force a clean load.

3. **Check file permissions**: Ensure the markdown file is not read-only or on a network drive with restricted access.

4. **Disable other extensions**: Some extensions may conflict with the webview. Try disabling other custom editor extensions.

### Performance issues

**Symptoms**: Slow drag-and-drop, laggy interactions, or freezing.

**Solutions**:

1. **Check file size**: Very large boards (100+ cards) may be slower. Consider splitting into multiple board files.

2. **Disable animations**: In board settings, turn off animations if available.

3. **Close other VS Code windows**: Having multiple kanban boards open uses more memory.

4. **Check for conflicts**: Disable other extensions that modify markdown files.

### Linting / Red squiggles in kanban files

**Symptoms**: Markdown linters (markdownlint, ESLint, etc.) show errors or warnings in kanban files.

**Cause**: Kanban files use non-standard markdown syntax (YAML frontmatter, `%% settings %%` blocks, checkbox syntax) that triggers linter rules.

**Solutions**:

The extension works with the standard Obsidian Kanban format, which uses non-standard markdown syntax. Since linters filter by filename only (not content), use filename patterns to exclude kanban files.

**Filename patterns that work:**

| Pattern       | Matches                            |
| ------------- | ---------------------------------- |
| `*board*.md`  | `my-board.md`, `board-todo.md`     |
| `*-kanban.md` | `work-kanban.md`, `home-kanban.md` |
| `kanban/`     | Entire directory                   |

**Linter-specific configuration:**

- **markdownlint-cli2**: Add to `.markdownlintignore`:

  ```
  *board*.md
  *-kanban.md
  kanban/
  ```

- **ESLint (flat config)**: Add to `eslint.config.js`:

  ```javascript
  {
    ignores: ["**/*board*.md", "**/*-kanban.md", "kanban/**"];
  }
  ```

- **Vale**: Add to `.valeignore`:

  ```
  *board*.md
  *-kanban.md
  ```

- **remark-lint**: Add to `.remarkignore`:
  ```
  *board*.md
  *-kanban.md
  ```

**Tip**: Keep kanban files in a dedicated folder (e.g., `kanban/`) and exclude the entire directory.

### Other common issues

| Issue                  | Solution                                            |
| ---------------------- | --------------------------------------------------- |
| Changes not saving     | Check file is not read-only; verify disk space      |
| Tags not showing       | Ensure `moveTags` is enabled in settings            |
| Dates not showing      | Ensure `moveDates` is enabled; check date format    |
| Archive button missing | Add a **Done** column with `## Done` heading        |
| Card won't move        | Check the column isn't at maximum capacity (if set) |

---

## Getting Help

### How do I report a bug?

1. Check the [existing issues](https://github.com/divisionseven/unified-kanban/issues) to see if it's already reported
2. Create a new issue with:
   - VS Code version and OS
   - Steps to reproduce
   - Sample kanban file (if possible)
   - Error messages or screenshots

### How do I request a feature?

Open a [feature request](https://github.com/divisionseven/unified-kanban/discussions) on GitHub. Describe:

- The use case you're trying to solve
- How you'd like it to work
- Any alternatives you've considered

### Where can I discuss the extension?

Join the [GitHub Discussions](https://github.com/divisionseven/unified-kanban/discussions) for:

- Usage questions
- Feature ideas
- Sharing board configurations
- Community tips

### Is there a changelog?

Yes. See `CHANGELOG.md` for all version changes and updates.
