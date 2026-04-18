# Release Process

This document describes the release workflow for Unified Kanban.

## Overview

The project uses a tag-based release pipeline:

1. **Commit validation** — commitlint (advisory) checks conventional commits
2. **Version bump** — Manual version bump in `pyproject.toml`
3. **Tag push** — Git tag triggers GitHub Actions to publish to npm

## Commit Message Format

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]
[optional footer(s)]
```

### Types

| Type       | Description                              |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `docs`     | Documentation only                       |
| `style`    | Code style (formatting, no logic change) |
| `refactor` | Code refactoring                         |
| `perf`     | Performance improvement                  |
| `test`     | Adding/updating tests                    |
| `chore`    | Maintenance                              |

### Examples

```bash
feat(parser): add support for date aliases

fix(webview): resolve card selection clearing on column switch

chore(release): bump version to 0.8.0
```

## Release Workflow

### 1. Ensure CHANGELOG.md is Updated

All changes since the last release must be documented under `## [Unreleased]`:

```markdown
## [Unreleased]

### Added

- New feature description

### Fixed

- Bug fix description
```

### 2. Bump the Version

Update the version in `pyproject.toml`:

```toml
[project]
version = "0.8.0"
```

Then commit the version bump:

```bash
git add pyproject.toml CHANGELOG.md
git commit -m "chore(release): bump version to 0.8.0"
```

### 3. Tag the Release

Create and push the tag:

```bash
git tag -a v0.8.0 -m "Release 0.8.0"
git push origin v0.8.0
```

GitHub Actions will automatically publish to npm.

## Version Increment

| Change                    | Increment                 |
| ------------------------- | ------------------------- |
| `feat:` commit            | Minor (`0.7.0` → `0.8.0`) |
| `fix:` commit             | Patch (`0.7.0` → `0.7.1`) |
| `BREAKING CHANGE:` footer | Major (`0.7.0` → `1.0.0`) |

## Security Scanning

[Dependabot](https://docs.github.com/en/code-security/dependabot) scans dependencies weekly and opens PRs for:

- Security vulnerabilities
- Outdated dependency versions

PRs are auto-merged when CI passes.

## Troubleshooting

### Commit Message Advisory

commitlint is advisory (non-blocking). While conventional commits are recommended, they are not enforced. The release process works regardless of commit message format.

### npm Publish Fails

Check the workflow logs for specific errors. Common issues:

- Version already published
- Authentication token expired
