# Contributing to Unified Kanban

Thank you for your interest in contributing to Unified Kanban! This guide covers everything you need to get started.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [VS Code](https://code.visualstudio.com/)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd unified-kanban

# Install root dependencies (extension host)
npm install

# Install webview dependencies (separate package)
cd webview-ui && npm install && cd ..
```

### Building

```bash
npm run build           # Full build: webview (Vite) + extension (tsc)
npm run build:webview   # Webview only (Vite)
npm run build:extension # Extension host only (tsc)
npm run check           # Type-check only (tsc --noEmit) — always run before submitting
```

### Testing

```bash
npm test                                  # Run all tests once (vitest run)
npm run test:watch                        # Watch mode
npx vitest run src/parser/parse.test.ts   # Single test file
npx vitest run -t "test name"             # Single test by name
```

All tests must pass before submitting changes.

### Development Workflow

The extension uses a two-process architecture: the extension host (Node.js) and the webview (React in a sandboxed iframe). During development, run these in separate terminals:

```bash
# Terminal 1: Vite dev server for webview Hot Module Replacement
cd webview-ui && npm run dev

# Terminal 2: Watch extension host TypeScript compilation
npm run watch
```

Then in VS Code, press **F5** to launch the Extension Development Host. Open any `.md` file, right-click, and select **"Open With..." → "Kanban Board"**.

## Code Style

This project uses TypeScript (strict mode) with React 18 in the webview. Key conventions:

### Formatting

- 2-space indentation
- Double quotes for strings
- Semicolons always
- Trailing commas in multi-line arguments and objects
- ~100 character line length (informal)

### Imports

- Group order: Node stdlib → third-party → local (blank line between groups)
- Type-only imports: `import type { BoardState } from "./types.js"`
- Local imports must use `.js` extension (ESM resolution): `"./parser/index.js"`

### Types

- Explicit return types on all exported functions
- Interfaces for data shapes, PascalCase, no `I` prefix
- Prefer `unknown` over `any`; avoid `any`
- `readonly` modifier for constructor params and constants

### Naming

| Scope          | Convention                             |
| -------------- | -------------------------------------- |
| Files          | PascalCase components, camelCase utils |
| Classes        | PascalCase                             |
| Interfaces     | PascalCase, no `I` prefix              |
| Functions/vars | camelCase                              |
| Constants      | UPPER_SNAKE_CASE                       |
| React hooks    | `use` prefix (`useBoardState`)         |
| Event handlers | `handle` prefix (`handleDragEnd`)      |
| Unused params  | prefix with `_` (`_uri`)               |

### Error Handling

- try/catch with silent fallback — send a failure result, never log to console
- Guard clauses for null/invalid state, early return
- Optional chaining for safe access

### Documentation

- JSDoc block comments on all exported functions, interfaces, and significant internals
- Google-style docstrings

## Architecture Overview

```
src/
  extension.ts              # Entry: activate / deactivate
  KanbanEditorProvider.ts   # Custom editor provider (registers webview)
  messages.ts               # Host ↔ webview message protocol
  parser/
    index.ts                # Public barrel export
    types.ts                # Board, Column, Card interfaces
    parse.ts                # Markdown → BoardState
    serialize.ts            # BoardState → Markdown
    __fixtures__/           # Test fixture .md files

webview-ui/                 # Separate package, React + Vite
  src/
    App.tsx
    components/
    hooks/
    styles/

dist/                       # Build output (both extension + parser)
```

- **Extension host** — CommonJS, compiled via `tsconfig.extension.json` → `dist/`
- **Parser library** — ESM, compiled via `tsconfig.json`, exported as `./parser`
- **Webview** — ESM, bundled by Vite, separate `package.json`

## Changelog Entries

This project uses a file-per-entry changelog system. Every completed change gets its own immutable file:

```
changelog/entries/changelog.YYYYMMDD_HHMMSS.md
```

### Creating an entry

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cat > changelog/entries/changelog.${TIMESTAMP}.md << 'EOF'
## [Date] - [Brief Description]

### Overview
[One-paragraph summary]

### Changes Made
- **File**: `path/to/file.ts`
  - Description of change
  - Impact: What this affects

### Files Modified
| File | Change Type | Description |
|------|-------------|-------------|
| ... | ... | ... |

### Testing
- Tests passing: X/Y

### Impact
- Performance: [Any changes]
- Functionality: [What users will notice]
- Breaking: [Any breaking changes]
EOF
```

### Rules

- **Always create new files** — never modify existing changelog entries
- **Filename format**: `changelog.<TIMESTAMP>.md` — never use generic names
- **Bug fix entries** must include: root cause, fix mechanism, regression test name, and callers verified
- Entries are immutable once created

## Pull Request Expectations

1. **Run checks before submitting:**
   - `npm run check` — no type errors
   - `npm test` — all tests passing

2. **Create a changelog entry** for your change in `changelog/entries/`

3. **Write tests** for new functionality. Tests live next to source: `src/**/*.test.ts`

4. **Keep PRs focused** — one logical change per PR

5. **Follow the code style** described above

6. **No AI/agent references** in code, comments, commit messages, or documentation. Write as if by a human engineering team.

## Reporting Issues


- Use [GitHub Issues](https://github.com/unified-kanban/vscode-kanban/issues) for bug reports and feature requests
- Include steps to reproduce, expected behavior, and actual behavior
- Include VS Code version and extension version
