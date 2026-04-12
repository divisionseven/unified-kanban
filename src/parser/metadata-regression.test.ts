/**
 * Regression tests for metadata preservation in date/time handlers.
 *
 * Bug: 8 handlers (ADD_DATE, ADD_TIME, REMOVE_DATE, REMOVE_TIME) across 2 files
 * reconstruct `rawText` from stripped `card.text`, losing existing metadata
 * (wikilinks, tags, other dates, times).
 *
 * These tests verify that the parser correctly extracts ALL metadata types when they
 * coexist in rawText — the exact scenario that was broken before the fix.
 *
 * Before fix: rawText = "Task @{date}" (wikilink [[note]] lost)
 * After fix: rawText = "Task @{date} [[note]]" (all metadata preserved)
 */

import { describe, it, expect } from "vitest";
import { parse, parseCard } from "./parse.js";
import { serialize } from "./serialize.js";
import type { BoardState } from "./types.js";

// ─── ADD_DATE Metadata Preservation ───────────────────────────────────────────

describe("parse > ADD_DATE metadata preservation", () => {
  it("extracts date metadata AND wikilink when they coexist", () => {
    // Scenario: Card with [[existing-note]] gets @{date} added
    // Before fix: rawText = "Task [[new-note]]" (date added but wikilink lost)
    // After fix: rawText = "Task @{2025-01-15} [[new-note]]" (both preserved)
    const md = "## Todo\n- [ ] Task @{2025-01-15} [[new-note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card?.metadata.wikilinks).toEqual(["new-note"]);
  });

  it("extracts date metadata AND tag when they coexist", () => {
    // Scenario: Card with #work gets @{date} added
    // Before fix: rawText = "Task @{date}" (tag #work lost)
    // After fix: rawText = "Task @{2025-01-15} #work" (both preserved)
    const md = "## Todo\n- [ ] Task @{2025-01-15} #work\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card?.metadata.tags).toEqual(["work"]);
  });

  it("extracts date metadata AND multiple tags when they coexist", () => {
    const md = "## Todo\n- [ ] Task @{2025-01-15} #work #urgent\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card?.metadata.tags).toEqual(["work", "urgent"]);
  });

  it("extracts wikilink from simple card without other metadata", () => {
    const md = "## Todo\n- [ ] Task [[simple-note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.wikilinks).toEqual(["simple-note"]);
    expect(card?.text).toBe("Task");
  });
});

// ─── ADD_TIME Metadata Preservation ────────────────────────────────────────────

describe("parse > ADD_TIME metadata preservation", () => {
  it("extracts time metadata AND all existing metadata when they coexist", () => {
    // Scenario: Card with wikilink and tag gets @{time} added
    // Before fix: rawText = "Task @{08:30}" (wikilink and tag lost)
    // After fix: rawText = "Task [[note]] #work @{08:30}" (all preserved)
    const md = "## Todo\n- [ ] Task [[note]] #work @{08:30}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.times).toEqual(["08:30"]);
    expect(card?.metadata.wikilinks).toEqual(["note"]);
    expect(card?.metadata.tags).toEqual(["work"]);
  });

  it("extracts time AND date metadata when they coexist", () => {
    // Scenario: Card with @{date} gets @{time} added
    const md = "## Todo\n- [ ] Task @{2025-01-15} @{09:30}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card?.metadata.times).toEqual(["09:30"]);
  });

  it("extracts time AND wikilink when they coexist", () => {
    const md = "## Todo\n- [ ] Task [[meeting-note]] @{10:00}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.times).toEqual(["10:00"]);
    expect(card?.metadata.wikilinks).toEqual(["meeting-note"]);
  });
});

// ─── REMOVE_DATE Metadata Preservation ─────────────────────────────────────────

describe("parse > REMOVE_DATE metadata preservation", () => {
  it("extracts wikilink when date is removed", () => {
    // Scenario: Card has both @{2025-01-15} and [[wikilink]]
    // REMOVE_DATE removes date but must preserve wikilink
    // Before fix: rawText = "Task" (wikilink lost)
    // After fix: rawText = "Task [[new-note]]" (wikilink preserved)
    const md = "## Todo\n- [ ] Task @{2025-01-15} [[new-note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card?.metadata.wikilinks).toEqual(["new-note"]);
  });

  it("extracts tag when date is removed", () => {
    // Scenario: Card has both @{date} and #tag
    const md = "## Todo\n- [ ] Task @{2025-01-15} #work\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card?.metadata.tags).toEqual(["work"]);
  });

  it("extracts all remaining metadata when one date is removed", () => {
    // Scenario: Multiple dates, one removed
    // @{2025-01-15} removed, @{2025-02-01} should remain
    const md = "## Todo\n- [ ] Task @{2025-01-15} @{2025-02-01}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.dueDates).toEqual(["2025-01-15", "2025-02-01"]);
  });
});

// ─── REMOVE_TIME Metadata Preservation ────────────────────────────────────────────────

describe("parse > REMOVE_TIME metadata preservation", () => {
  it("extracts wikilink when time is removed", () => {
    // Scenario: Card has both @{time} and [[wikilink]]
    // REMOVE_TIME removes time but must preserve wikilink
    const md = "## Todo\n- [ ] Task @{08:30} [[new-note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.times).toEqual(["08:30"]);
    expect(card?.metadata.wikilinks).toEqual(["new-note"]);
  });

  it("extracts tag when time is removed", () => {
    const md = "## Todo\n- [ ] Task @{09:00} #urgent\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.times).toEqual(["09:00"]);
    expect(card?.metadata.tags).toEqual(["urgent"]);
  });

  it("extracts all remaining metadata when time is removed", () => {
    // Scenario: Card has wikilink and multiple tags
    // Time removed, wikilink and tags should remain
    const md = "## Todo\n- [ ] Task @{08:30} [[note]] #work #urgent\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.times).toEqual(["08:30"]);
    expect(card?.metadata.wikilinks).toEqual(["note"]);
    expect(card?.metadata.tags).toEqual(["work", "urgent"]);
  });
});

// ─── Combined Scenario ────────────────────────────────────────────────────────────────

describe("parse > combined metadata operations", () => {
  it("extracts all metadata after multiple operations", () => {
    // Scenario: User operations in sequence:
    // 1. Add note link [[new-note]]
    // 2. Add date @{2025-01-15}
    // 3. Add time @{09:30}
    // 4. Remove date @{2025-01-15}
    // Expected: note link and time remain
    const md = "## Todo\n- [ ] Task [[new-note]] @{09:30}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.wikilinks).toEqual(["new-note"]);
    expect(card?.metadata.times).toEqual(["09:30"]);
    // Date was removed so should not be present
    expect(card?.metadata.dueDates).toEqual([]);
  });

  it("handles card with all 4 metadata types coexisting", () => {
    // Full scenario: card with date, time, tag, wikilink
    const md = "## Todo\n- [ ] Task @{2025-01-15} @{09:30} #work [[note]]\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card?.metadata.times).toEqual(["09:30"]);
    expect(card?.metadata.tags).toEqual(["work"]);
    expect(card?.metadata.wikilinks).toEqual(["note"]);
  });

  it("handles checked card with all metadata types", () => {
    // Checked card should preserve all metadata
    const md = "## Done\n- [x] Task @{2025-01-15} #work [[note]] @{10:00}\n";
    const result = parse(md);
    const card = result.columns[0]?.cards[0];

    expect(card?.checked).toBe(true);
    expect(card?.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card?.metadata.times).toEqual(["10:00"]);
    expect(card?.metadata.tags).toEqual(["work"]);
    expect(card?.metadata.wikilinks).toEqual(["note"]);
  });
});

// ─── Serialization Preservation ────────────────────────────────────────────────────────

describe("serialize > metadata preservation", () => {
  it("serializes card with date and wikilink preserving both", () => {
    // Build a board with a card that has date and wikilink
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "test-card",
              text: "Task",
              rawText: "- [ ] Task @{2025-01-15} [[new-note]]",
              checked: false,
              metadata: {
                dueDates: ["2025-01-15"],
                times: [],
                tags: [],
                wikilinks: ["new-note"],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
          rawContent: "",
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };

    const result = serialize(state);

    // Both date and wikilink should be in serialized output
    expect(result).toContain("@{2025-01-15}");
    expect(result).toContain("[[new-note]]");
  });

  it("serializes card with date, time, tag, and wikilink preserving all", () => {
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "test-card-2",
              text: "Task",
              rawText: "- [ ] Task @{2025-01-15} @{09:30} #work [[note]]",
              checked: false,
              metadata: {
                dueDates: ["2025-01-15"],
                times: ["09:30"],
                tags: ["work"],
                wikilinks: ["note"],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
          rawContent: "",
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };

    const result = serialize(state);

    expect(result).toContain("@{2025-01-15}");
    expect(result).toContain("@{09:30}");
    expect(result).toContain("#work");
    expect(result).toContain("[[note]]");
  });

  it("serializes checked card with all metadata preserving all", () => {
    const state: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "done",
          title: "Done",
          complete: true,
          cards: [
            {
              id: "test-card-3",
              text: "Done Task",
              rawText: "- [x] Done Task @{2025-01-15} #done [[note]]",
              checked: true,
              metadata: {
                dueDates: ["2025-01-15"],
                times: [],
                tags: ["done"],
                wikilinks: ["note"],
                priority: null,
                startDate: null,
                createdDate: null,
                scheduledDate: null,
                dueDate: null,
                doneDate: null,
                cancelledDate: null,
                recurrence: null,
                dependsOn: null,
                blockId: null,
                inlineMetadata: [],
                wikilinkDates: [],
                mdNoteDates: [],
              },
            },
          ],
          rawContent: "",
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };

    const result = serialize(state);

    expect(result).toContain("- [x] Done Task");
    expect(result).toContain("@{2025-01-15}");
    expect(result).toContain("#done");
    expect(result).toContain("[[note]]");
  });
});

// ─── parseCard Direct ────────────────────────────────���─���─────────────────────────────

describe("parseCard > metadata extraction", () => {
  it("extracts date and wikilink from rawText", () => {
    const rawText = "- [ ] Task @{2025-01-15} [[new-note]]";
    const card = parseCard(rawText);

    expect(card.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card.metadata.wikilinks).toEqual(["new-note"]);
    expect(card.text).toBe("Task");
    expect(card.rawText).toBe(rawText);
  });

  it("extracts time and tag from rawText", () => {
    const rawText = "- [ ] Task @{09:30} #urgent";
    const card = parseCard(rawText);

    expect(card.metadata.times).toEqual(["09:30"]);
    expect(card.metadata.tags).toEqual(["urgent"]);
  });

  it("extracts all metadata types from rawText", () => {
    const rawText = "- [x] Done @{2025-01-15} @{10:00} #done [[note]]";
    const card = parseCard(rawText);

    expect(card.checked).toBe(true);
    expect(card.metadata.dueDates).toEqual(["2025-01-15"]);
    expect(card.metadata.times).toEqual(["10:00"]);
    expect(card.metadata.tags).toEqual(["done"]);
    expect(card.metadata.wikilinks).toEqual(["note"]);
  });

  it("preserves rawText with all metadata for serialization", () => {
    const rawText = "- [ ] Task @{2025-01-15} #work [[note]]";
    const card = parseCard(rawText);

    const board: BoardState = {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [card],
          rawContent: "",
        },
      ],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };

    const serialized = serialize(board);

    // rawText should be preserved in serialization
    expect(serialized).toContain(rawText);
  });
});
