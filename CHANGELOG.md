# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

- Fixed tag duplication on card move - tags in indented continuation lines were being repeated multiple times when cards were moved between columns due to incorrect section header detection in the serializer

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
