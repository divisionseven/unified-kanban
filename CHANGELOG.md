# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-04-16

### Added

- Add husky and lint-staged for pre-commit hook and staged file formatting

### Changed

- Restructure README.md with reference-style link aliases
- Move banner.png to `docs/assets/brand/` for better asset organization
- Add demo GIFs and screenshots to "See It In Action" section
- Add table of contents and reorganize sections
- Update `.vscodeignore` with improved file patterns
- Improve GitHub Actions publish workflow
- Update pull request template
- Update FAQ with correct GitHub repository URLs

### Fixed

- Improve markdown formatting on edit/creation events
- Add blank space above H2 card headers to silence markdown linter warnings

### Removed

- Remove test-board.md fixture

---

## [Unreleased]

### Added

- Add commitlint (advisory) with conventional commits for commit message validation
- Add Dependabot for dependency vulnerability scanning

### Changed

- Update publish.yml with version verification step

---

## [0.6.1] - 2026-04-11

### Added

- 350 comprehensive tests for webview-ui components and hooks
- DatePicker.tsx tests (0% → 100% coverage)
- useBoardState.ts hook tests (11% → 72% coverage)
- SettingsPanel.tsx tests (47% → 90% coverage)
- MarkdownRenderer.tsx tests (45% → 75% coverage)
- useVSCodeAPI.ts tests (50% → 100% coverage)
- InlineEdit.tsx tests (54% → 100% coverage)
- TableView.tsx tests (61% → 71% coverage)
- Card.tsx tests (67% → 68% coverage)
- Column.tsx tests (71% → 89% coverage)
- Board.tsx tests (77% → 93% coverage)

### Changed

- Webview test coverage: 44% → 86%

### Fixed

- Accent color not resetting to default when field is cleared
