// ─── stripMetadataMarkers Regression Tests — Indentation Preservation ──────

import { stripMetadataMarkers } from "../components/Card.js";

// ─── Root Cause: regex /[ \t]+/g destroyed all indentation ─────────────────

describe("stripMetadataMarkers — indentation preservation", () => {
  it("preserves 2-space continuation indent in fenced code blocks", () => {
    const input = "Task with code\n  ```\n  line1\n  line2\n  ```";
    const result = stripMetadataMarkers(input);
    expect(result).toContain("  ```");
    expect(result).toContain("  line1");
    expect(result).toContain("  line2");
    expect(result).toContain("  ```");
  });

  it("preserves 6-space continuation indent in fenced code blocks", () => {
    const input = "Task\n      ```\n      const x = 1;\n      ```";
    const result = stripMetadataMarkers(input);
    expect(result).toContain("      ```");
    expect(result).toContain("      const x = 1;");
    expect(result).toContain("      ```");
  });

  it("preserves nested indentation inside code blocks (JavaScript object)", () => {
    const input =
      "Config object\n  ```\n  const config = {\n    name: 'app',\n    port: 3000,\n  };\n  ```";
    const result = stripMetadataMarkers(input);
    expect(result).toContain("  const config = {");
    expect(result).toContain("    name: 'app',");
    expect(result).toContain("    port: 3000,");
    expect(result).toContain("  };");
  });

  it("preserves tab characters inside code blocks", () => {
    const input = "Tabbed code\n\t```\n\tfunction foo() {\n\t\treturn 42;\n\t}\n\t```";
    const result = stripMetadataMarkers(input);
    expect(result).toContain("\t```");
    expect(result).toContain("\tfunction foo() {");
    expect(result).toContain("\t\treturn 42;");
    expect(result).toContain("\t}");
    expect(result).toContain("\t```");
  });

  it("preserves Python 4-space indentation in code blocks", () => {
    const input =
      "Python code\n  ```\n  def greet(name):\n      if name:\n          return f'Hello {name}'\n      return 'Hello'\n  ```";
    const result = stripMetadataMarkers(input);
    expect(result).toContain("  def greet(name):");
    expect(result).toContain("      if name:");
    expect(result).toContain("          return f'Hello {name}'");
    expect(result).toContain("      return 'Hello'");
  });

  it("preserves indentation while still collapsing multiple spaces between words", () => {
    const input = "Task with   extra   spaces\n  ```\n  code  with  spaces\n  ```";
    const result = stripMetadataMarkers(input);
    // Leading indentation preserved
    expect(result).toContain("  ```");
    // Code block interior preserves ALL whitespace (including multiple spaces between words)
    expect(result).toContain("  code  with  spaces");
    // Original multi-space in first line collapsed (outside code block)
    expect(result).toContain("Task with extra spaces");
  });
});

// ─── Existing behavior must not regress ─────────────────────────────────────

describe("stripMetadataMarkers — existing behavior", () => {
  it("strips @{} markers", () => {
    const result = stripMetadataMarkers("Task @{2025-01-01}");
    expect(result).toBe("Task");
  });

  it("strips #tags by default", () => {
    const result = stripMetadataMarkers("Task #feature");
    expect(result).toBe("Task");
  });

  it("preserves #tags when stripTags is false", () => {
    const result = stripMetadataMarkers("Task #feature", { stripTags: false });
    expect(result).toBe("Task #feature");
  });

  it("strips [[wikilinks]] by default", () => {
    const result = stripMetadataMarkers("Task [[Some Note]]");
    expect(result).toBe("Task");
  });

  it("preserves [[wikilinks]] when stripWikilinks is false", () => {
    const result = stripMetadataMarkers("Task [[Some Note]]", { stripWikilinks: false });
    expect(result).toBe("Task [[Some Note]]");
  });

  it("strips inline metadata [key:: value] when stripInlineMeta is true", () => {
    const result = stripMetadataMarkers("Task [priority:: high]", { stripInlineMeta: true });
    expect(result).toBe("Task");
  });

  it("strips date emojis when stripDateEmojis is true", () => {
    const result = stripMetadataMarkers("Task 📅 2025-01-01", { stripDateEmojis: true });
    expect(result).toBe("Task");
  });

  it("strips checkbox prefixes from continuation lines when stripCheckboxes is true", () => {
    const input = "First line\n- [ ] Second line\n- [x] Third line";
    const result = stripMetadataMarkers(input, { stripCheckboxes: true });
    expect(result).toBe("First line\nSecond line\nThird line");
  });

  it("handles empty string", () => {
    const result = stripMetadataMarkers("");
    expect(result).toBe("");
  });

  it("handles single-line input without indentation", () => {
    const result = stripMetadataMarkers("Simple task");
    expect(result).toBe("Simple task");
  });

  it("collapses multiple spaces within a single line", () => {
    const result = stripMetadataMarkers("Task   with    multiple     spaces");
    expect(result).toBe("Task with multiple spaces");
  });
});
