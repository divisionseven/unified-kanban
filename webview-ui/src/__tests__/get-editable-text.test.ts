// ─── getEditableText Tests — Edit Mode Metadata Visibility ────────────────────

import { getEditableText } from "../components/Card.js";

// ─── Root Cause: edit mode used card.text instead of card.rawText ─────────────
// The getEditableText function strips the checkbox prefix so the edit textarea
// shows metadata that would otherwise be stripped by the display-layer parser.
// This file tests that getEditableText correctly:
// - Strips checkbox prefixes
// - Preserves all metadata markers (#tag, @{date}, [[link]])
// - Handles multi-line card content

describe("getEditableText — checkbox prefix stripping", () => {
  it("strips unchecked checkbox prefix", () => {
    const input = "- [ ] Task text";
    const result = getEditableText(input);
    expect(result).toBe("Task text");
  });

  it("strips checked checkbox prefix", () => {
    const input = "- [x] Task text";
    const result = getEditableText(input);
    expect(result).toBe("Task text");
  });

  it("preserves metadata markers in output", () => {
    const input = "- [ ] Task #tag @{2025-01-15} [[link]]";
    const result = getEditableText(input);
    expect(result).toBe("Task #tag @{2025-01-15} [[link]]");
  });

  it("handles multi-line cards preserving continuation indent", () => {
    const input = "- [ ] Task\n  continuation";
    const result = getEditableText(input);
    expect(result).toBe("Task\n  continuation");
  });

  it("handles multi-line cards with metadata markers", () => {
    const input = "- [x] Task\n  #tag @{2025-01-15}";
    const result = getEditableText(input);
    expect(result).toBe("Task\n  #tag @{2025-01-15}");
  });
});

describe("getEditableText — edge cases", () => {
  it("handles text without checkbox prefix", () => {
    const input = "Plain text without prefix";
    const result = getEditableText(input);
    expect(result).toBe("Plain text without prefix");
  });

  it("handles empty string", () => {
    const input = "";
    const result = getEditableText(input);
    expect(result).toBe("");
  });

  it("handles wikilink with spaces", () => {
    const input = "- [ ] Task [[My Note Link]]";
    const result = getEditableText(input);
    expect(result).toBe("Task [[My Note Link]]");
  });

  it("handles multiple tags", () => {
    const input = "- [ ] Task #tag1 #tag2 #tag3";
    const result = getEditableText(input);
    expect(result).toBe("Task #tag1 #tag2 #tag3");
  });

  it("handles dataview inline metadata", () => {
    const input = "- [ ] Task [priority:: high] [due:: 2025-01-15]";
    const result = getEditableText(input);
    expect(result).toBe("Task [priority:: high] [due:: 2025-01-15]");
  });
});
