# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Fixed

- Fix `release.yml` logo path to resolve release header logo image not displaying correctly

### Changed

- Change README to use dynamic release version badge instead of static version badge

---

## [0.7.2] - 2026-04-19

### Added

- Add validation scripts for version consistency (`.github/scripts/check-version.py`)
- Add changelog extraction script for proper release notes (`.github/scripts/extract-changelog.py`)
- Add build-release-notes.py for professional GitHub Release body with logo and commit history
- Add pre-release tag support in CI workflow
- Add GH social preview banner to repo assets

### Changed

- Restructure and enhance publish workflow (now `release.yml`) with 5-job pipeline (validation gate before release)
- Improve project description in `package.json` for consistency on VSC Marketplace
- Enhance root README

### Removed

- Remove `update-version-badge.yml` workflow

### Fixed

- Fix release.yml vsce packaging failure by removing invalid --version flag from vsce package command
- Pin vsce to version 3.3.2 to avoid silent failure bugs in newer versions
- Add package content validation to catch silent vsce failures early

---

## [0.7.1] - 2026-04-18

### Added

- Add commitlint (advisory) with conventional commits for commit message validation
- Add Dependabot for dependency vulnerability scanning

### Changed

- Update publish.yml with version verification step

---

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
