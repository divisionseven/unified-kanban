# Security Policy

## Supported Versions

Only the latest version of Unified Kanban is supported with security updates.

| Version | Supported          |
|---------|--------------------|
| Latest  | :white_check_mark: |
| Older   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Unified Kanban, please report it responsibly. **Do not open a public GitHub issue for security vulnerabilities.**

### How to Report

**Option 1: GitHub Security Advisories (preferred)**

1. Go to the repository's [Security Advisories](../../security/advisories) page
2. Click **"Report a vulnerability"**
3. Fill in the details and submit

**Option 2: Email**

Send an email to the maintainer with the subject line `SECURITY: Unified Kanban Vulnerability Report`.

### What to Include

Please include the following in your report:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** — what an attacker could achieve
- **Affected versions** (if known)
- **Suggested fix** (if you have one)

### What to Expect

- **Acknowledgment** within 48 hours of the report
- **Assessment** of the vulnerability and its severity
- **Timeline** for a fix, communicated to you directly
- **Credit** in the security advisory (unless you prefer to remain anonymous)

### Scope

The following are in scope for security reports:

- Code injection via malicious markdown files
- Cross-site scripting (XSS) in the webview
- Content Security Policy (CSP) bypasses
- Path traversal or arbitrary file access
- Dependency vulnerabilities with exploitable attack vectors

The following are **out of scope**:

- Issues in third-party dependencies (report those upstream)
- Denial of service via extremely large files (this is a known limitation)
- Social engineering attacks

## Security Design

Unified Kanban follows VS Code extension security best practices:

- **CSP-safe webview loading** — scripts are injected with a cryptographic nonce, generated per-webview creation
- **Sandboxed webview** — the board renderer runs in a sandboxed Chromium iframe with no Node.js access
- **Opt-in editor** (`priority: "option"`) — does not automatically open arbitrary `.md` files
- **No network requests** — the extension operates entirely locally; no data leaves your machine
