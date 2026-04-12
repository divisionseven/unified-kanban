// ─── Metadata Display Enhancement Tests (Phase 13) ───────────────────────────

import { render, screen } from "@testing-library/react";
import type { Card as CardType } from "../../../src/parser/types.ts";
import type { DataKey } from "../../../src/parser/types.ts";
import { Card } from "../components/Card.js";

/**
 * Helper to create a minimal CardType for testing.
 * After the parser-layer stripping fix, card.text is stripped of @{} markers,
 * #tags, [[wikilinks]], and inline metadata. Use rawText for the full original.
 */
function createTestCard(overrides: Partial<CardType> = {}): CardType {
  return {
    id: "test-card",
    text: "Test card", // text is stripped of metadata
    rawText: "- [ ] Test card", // rawText preserves full original
    checked: false,
    metadata: {
      dueDates: [],
      times: [],
      tags: [],
      wikilinks: [],
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
    ...overrides,
  };
}

// ─── inlineMetadataPosition: body (default) ───────────────────────────────────

describe("inlineMetadataPosition='body' (default)", () => {
  it("renders metadata inline with text", () => {
    const card = createTestCard({
      text: "Task with [priority:: high] metadata",
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [{ key: "priority", value: "high", raw: "[priority:: high]" }],
      },
    });
    render(<Card card={card} columnId="col" inlineMetadataPosition="body" />);
    // Metadata should be visible in text when position is "body"
    expect(screen.getByText(/Task with/)).toBeInTheDocument();
  });
});

// ─── inlineMetadataPosition: footer ──────────────────────────────────────────

describe("inlineMetadataPosition='footer'", () => {
  it("renders metadata as chips in footer", () => {
    const card = createTestCard({
      text: "Task with priority metadata",
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [{ key: "priority", value: "high", raw: "[priority:: high]" }],
      },
    });
    render(<Card card={card} columnId="col" inlineMetadataPosition="footer" />);
    // Should show the metadata chip in footer
    expect(screen.getByText(/priority: high/)).toBeInTheDocument();
  });

  it("strips inline metadata from card text when position is footer", () => {
    const card = createTestCard({
      text: "Task here", // inline metadata already stripped from text by parser
      rawText: "- [ ] Task [status:: done] here", // rawText preserves full original
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [{ key: "status", value: "done", raw: "[status:: done]" }],
      },
    });
    render(<Card card={card} columnId="col" inlineMetadataPosition="footer" />);
    // Card text should not contain the inline metadata markers
    expect(screen.getByText(/^Task here$/)).toBeInTheDocument();
  });
});

// ─── inlineMetadataPosition: metadata-table ───────────────────────────────────

describe("inlineMetadataPosition='metadata-table'", () => {
  it("renders MetadataTable component when position is 'metadata-table'", () => {
    const card = createTestCard({
      text: "Task with metadata",
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [
          { key: "priority", value: "high", raw: "[priority:: high]" },
          { key: "status", value: "done", raw: "[status:: done]" },
        ],
      },
    });
    render(<Card card={card} columnId="col" inlineMetadataPosition="metadata-table" />);
    // Should render the table with both metadata items
    expect(screen.getByText("priority")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("done")).toBeInTheDocument();
  });

  it("filters metadata based on metadataKeys configuration", () => {
    const metadataKeys: DataKey[] = [
      {
        metadataKey: "priority",
        label: "Priority",
        shouldHideLabel: false,
        containsMarkdown: false,
      },
    ];
    const card = createTestCard({
      text: "Task",
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [
          { key: "priority", value: "high", raw: "[priority:: high]" },
          { key: "status", value: "done", raw: "[status:: done]" },
        ],
      },
    });
    render(
      <Card
        card={card}
        columnId="col"
        inlineMetadataPosition="metadata-table"
        metadataKeys={metadataKeys}
      />,
    );
    // Only priority should show
    expect(screen.getByText("priority")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    // status should not be in the document
    expect(screen.queryByText("status")).not.toBeInTheDocument();
  });
});

// ─── moveTaskMetadata prop ───────────────────────────────────────────────────

describe("moveTaskMetadata", () => {
  it("shows task emoji dates in footer when moveTaskMetadata is true", () => {
    const card = createTestCard({
      text: "Task with dates",
      metadata: {
        ...createTestCard().metadata,
        startDate: "2025-01-15",
        dueDate: "2025-01-20",
      },
    });
    render(<Card card={card} columnId="col" moveTaskMetadata dateDisplayFormat="YYYY-MM-DD" />);
    // Task date emojis should appear in footer
    expect(screen.getByText(/🛫/)).toBeInTheDocument();
    expect(screen.getByText(/2025-01-15/)).toBeInTheDocument();
  });

  it("hides task emoji dates from footer when moveTaskMetadata is false", () => {
    const card = createTestCard({
      text: "Task with dates",
      metadata: {
        ...createTestCard().metadata,
        startDate: "2025-01-15",
        dueDate: "2025-01-20",
      },
    });
    render(
      <Card card={card} columnId="col" moveTaskMetadata={false} dateDisplayFormat="YYYY-MM-DD" />,
    );
    // Task date emojis should not appear in footer when moveTaskMetadata is false
    expect(screen.queryByText(/🛫/)).not.toBeInTheDocument();
  });
});

// ─── metadataKeys filtering ───────────────────────────────────────────────────

describe("metadataKeys filtering", () => {
  it("filters which metadata fields display in metadata-table position", () => {
    const metadataKeys: DataKey[] = [
      {
        metadataKey: "assigned",
        label: "Assigned",
        shouldHideLabel: false,
        containsMarkdown: false,
      },
    ];
    const card = createTestCard({
      text: "Task",
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [
          { key: "assigned", value: "John", raw: "[assigned:: John]" },
          { key: "estimated", value: "2h", raw: "[estimated:: 2h]" },
        ],
      },
    });
    render(
      <Card
        card={card}
        columnId="col"
        inlineMetadataPosition="metadata-table"
        metadataKeys={metadataKeys}
      />,
    );
    // Only assigned should show in the table
    expect(screen.getByText("assigned")).toBeInTheDocument();
    expect(screen.getByText("John")).toBeInTheDocument();
    // estimated should not appear in the table
    expect(screen.queryByText("estimated")).not.toBeInTheDocument();
  });
});
