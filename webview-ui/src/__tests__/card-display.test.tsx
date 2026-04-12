// ─── Card Display Enhancement Tests (Phase 3) ─────────────────────────────

import { render, screen } from "@testing-library/react";
import type { Card as CardType } from "../../../src/parser/types.ts";
import { Card } from "../components/Card.js";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import relativeTime from "dayjs/plugin/relativeTime.js";

dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);

/**
 * Helper to create a minimal CardType for testing.
 * All metadata fields included to satisfy the CardMetadata interface.
 */
function createTestCard(overrides: Partial<CardType> = {}): CardType {
  return {
    id: "test-card",
    text: "Test card",
    rawText: "- [ ] Test card",
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

// ─── formatRelativeDate (via rendered output) ──────────────────────────────

describe("formatRelativeDate", () => {
  it("shows 'Today' for today's date", () => {
    const today = dayjs().format("YYYY-MM-DD");
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: today };
    render(<Card card={{ ...card, metadata }} columnId="col" moveDates showRelativeDate />);
    expect(screen.getByText(/Today/)).toBeInTheDocument();
  });

  it("shows 'Tomorrow' for tomorrow's date", () => {
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: tomorrow };
    render(<Card card={{ ...card, metadata }} columnId="col" moveDates showRelativeDate />);
    expect(screen.getByText(/Tomorrow/)).toBeInTheDocument();
  });

  it("shows 'Yesterday' for yesterday's date", () => {
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: yesterday };
    render(<Card card={{ ...card, metadata }} columnId="col" moveDates showRelativeDate />);
    expect(screen.getByText(/Yesterday/)).toBeInTheDocument();
  });

  it("shows 'In N days' for future dates within 7 days", () => {
    const future = dayjs().add(3, "day").format("YYYY-MM-DD");
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: future };
    render(<Card card={{ ...card, metadata }} columnId="col" moveDates showRelativeDate />);
    expect(screen.getByText(/In 3 days/)).toBeInTheDocument();
  });

  it("shows 'N days ago' for past dates within 7 days", () => {
    const past = dayjs().subtract(5, "day").format("YYYY-MM-DD");
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: past };
    render(<Card card={{ ...card, metadata }} columnId="col" moveDates showRelativeDate />);
    expect(screen.getByText(/5 days ago/)).toBeInTheDocument();
  });

  it("falls back to formatted date for dates >30 days away", () => {
    const farFuture = dayjs().add(60, "day").format("YYYY-MM-DD");
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: farFuture };
    render(
      <Card
        card={{ ...card, metadata }}
        columnId="col"
        moveDates
        showRelativeDate
        dateDisplayFormat="YYYY-MM-DD"
      />,
    );
    // Should show dayjs relativeTime output like "in 2 months"
    const chip = screen.getByText(/🛫/);
    expect(chip.textContent).toMatch(/(in \d|a few|a month|months)/);
  });
});

// ─── getDateColor (via rendered inline styles) ─────────────────────────────

describe("getDateColor", () => {
  const FIXED_MS = new Date("2026-04-02T12:00:00").getTime();
  let dateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_MS));
    // Also spy on Date.now directly — dnd-kit or jsdom may bypass fake timers
    dateSpy = vi.spyOn(Date, "now").mockReturnValue(FIXED_MS);
  });

  afterEach(() => {
    dateSpy.mockRestore();
    vi.useRealTimers();
  });

  it("applies backgroundColor when date matches isBefore with distance", () => {
    // Fixed "now" = 2026-04-02, so -10 days = 2026-03-23 → 10 days before now
    // The isBefore rule with distance=7, direction=before matches dates more than
    // 7 days in the past. We assert on the STYLE (backgroundColor), not the
    // relative text, because the text depends on dayjs internals which may not
    // respect vi.setSystemTime in jsdom.
    const farPast = dayjs().subtract(10, "day").format("YYYY-MM-DD");
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: farPast };
    const dateColors = [
      {
        isBefore: true,
        distance: 7,
        unit: "days" as const,
        direction: "before" as const,
        backgroundColor: "#00ff00",
      },
    ];
    render(
      <Card
        card={{ ...card, metadata }}
        columnId="col"
        moveDates
        showRelativeDate
        dateColors={dateColors}
      />,
    );
    // Find the task-date chip by class, not by relative text
    const chip = document.querySelector(".metadata-chip.task-date");
    expect(chip).not.toBeNull();
    expect(chip).toHaveStyle({ backgroundColor: "#00ff00" });
  });

  it("applies style when date matches isAfter with distance", () => {
    // Fixed "now" = 2026-04-02, so +10 days = 2026-04-12 → 10 days after now
    // The isAfter rule with distance=7, direction=after matches dates more than
    // 7 days in the future. We assert on the STYLE (color), not the relative
    // text, because the text depends on dayjs internals which may not respect
    // vi.setSystemTime in jsdom.
    const farFuture = dayjs().add(10, "day").format("YYYY-MM-DD");
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: farFuture };
    const dateColors = [
      {
        isAfter: true,
        distance: 7,
        unit: "days" as const,
        direction: "after" as const,
        color: "#0000ff",
      },
    ];
    render(
      <Card
        card={{ ...card, metadata }}
        columnId="col"
        moveDates
        showRelativeDate
        dateColors={dateColors}
      />,
    );
    // Find the task-date chip by class, not by relative text
    const chip = document.querySelector(".metadata-chip.task-date");
    expect(chip).not.toBeNull();
    expect(chip).toHaveStyle({ color: "#0000ff" });
  });

  it("returns null (no style) when no rule matches", () => {
    const futureDate = dayjs().add(3, "day").format("YYYY-MM-DD");
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: futureDate };
    const dateColors = [{ isToday: true, color: "#ff0000" }];
    render(
      <Card
        card={{ ...card, metadata }}
        columnId="col"
        moveDates
        showRelativeDate
        dateColors={dateColors}
      />,
    );
    const chip = screen.getByText(/In 3 days/).closest(".metadata-chip");
    expect(chip).not.toHaveStyle({ color: "#ff0000" });
  });

  it("uses first matching rule when multiple rules could match", () => {
    const today = dayjs().format("YYYY-MM-DD");
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: today };
    const dateColors = [
      { isToday: true, color: "#ff0001" },
      { isToday: true, color: "#00ff00" },
    ];
    render(
      <Card
        card={{ ...card, metadata }}
        columnId="col"
        moveDates
        showRelativeDate
        dateColors={dateColors}
      />,
    );
    const chip = screen.getByText(/Today/).closest(".metadata-chip");
    expect(chip).toHaveStyle({ color: "#ff0001" });
  });
});

// ─── Priority Display ─────────────────────────────────────────────────────

describe("Card — priority display", () => {
  it("renders 🔺 for priority 0 (highest)", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 0 },
    });
    render(<Card card={card} columnId="col" />);
    expect(screen.getByText("\u{1F53A}")).toBeInTheDocument();
  });

  it("renders ⏫ for priority 1 (high)", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 1 },
    });
    render(<Card card={card} columnId="col" />);
    expect(screen.getByText("\u{26EB}")).toBeInTheDocument();
  });

  it("renders 🔼 for priority 2 (medium)", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 2 },
    });
    render(<Card card={card} columnId="col" />);
    expect(screen.getByText("\u{1F53C}")).toBeInTheDocument();
  });

  it("renders 🔽 for priority 4 (low)", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 4 },
    });
    render(<Card card={card} columnId="col" />);
    expect(screen.getByText("\u{1F53D}")).toBeInTheDocument();
  });

  it("renders ⏬ for priority 5 (lowest)", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 5 },
    });
    render(<Card card={card} columnId="col" />);
    expect(screen.getByText("\u{23EC}")).toBeInTheDocument();
  });

  it("does not render priority indicator for priority 3 (normal)", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 3 },
    });
    render(<Card card={card} columnId="col" />);
    expect(screen.queryByText("\u{1F53A}")).not.toBeInTheDocument();
    expect(screen.queryByText("\u{26EB}")).not.toBeInTheDocument();
    expect(screen.queryByText("\u{1F53C}")).not.toBeInTheDocument();
  });

  it("does not render priority indicator when priority is null", () => {
    const card = createTestCard();
    render(<Card card={card} columnId="col" />);
    const indicator = document.querySelector(".priority-indicator");
    expect(indicator).not.toBeInTheDocument();
  });
});

// ─── Checkbox Visibility ──────────────────────────────────────────────────

describe("Card — checkbox visibility", () => {
  it("shows checkbox when showCheckboxes is true (default)", () => {
    const card = createTestCard();
    render(<Card card={card} columnId="col" />);
    const checkbox = document.querySelector(".card-checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toHaveClass("hidden");
  });

  it("hides checkbox when showCheckboxes is false", () => {
    const card = createTestCard();
    render(<Card card={card} columnId="col" showCheckboxes={false} />);
    const checkbox = document.querySelector(".card-checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveClass("hidden");
  });
});

// ─── Inline Metadata Footer ───────────────────────────────────────────────

describe("Card — inline metadata footer", () => {
  it("renders inline metadata chips when position is 'footer'", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [
          { key: "priority", value: "high", raw: "[priority:: high]" },
          { key: "effort", value: "3", raw: "[effort:: 3]" },
        ],
      },
    });
    render(<Card card={card} columnId="col" inlineMetadataPosition="footer" />);
    expect(screen.getByText(/priority: high/)).toBeInTheDocument();
    expect(screen.getByText(/effort: 3/)).toBeInTheDocument();
  });

  it("does not render inline metadata when position is 'body' (default)", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [{ key: "priority", value: "high", raw: "[priority:: high]" }],
      },
    });
    render(<Card card={card} columnId="col" />);
    expect(screen.queryByText(/priority: high/)).not.toBeInTheDocument();
  });

  it("applies inline-meta CSS class to metadata chips", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [{ key: "status", value: "wip", raw: "[status:: wip]" }],
      },
    });
    render(<Card card={card} columnId="col" inlineMetadataPosition="footer" />);
    const chip = screen.getByText(/status: wip/).closest(".metadata-chip");
    expect(chip).toHaveClass("inline-meta");
  });
});

// ─── Block ID Display ─────────────────────────────────────────────────────

describe("Card — block ID display", () => {
  it("renders block ID when present", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, blockId: "abc123" },
    });
    render(<Card card={card} columnId="col" />);
    expect(screen.getByText("^abc123")).toBeInTheDocument();
  });

  it("does not render block ID section when null", () => {
    const card = createTestCard();
    render(<Card card={card} columnId="col" />);
    expect(screen.queryByText(/^\^/)).not.toBeInTheDocument();
  });

  it("applies block-id CSS class", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, blockId: "myblock" },
    });
    render(<Card card={card} columnId="col" />);
    const chip = screen.getByText("^myblock").closest(".metadata-chip");
    expect(chip).toHaveClass("block-id");
  });
});

// ─── Task Date Emojis ─────────────────────────────────────────────────────

describe("Card — task date emojis", () => {
  it("renders task dates when moveDates is true", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        startDate: "2026-04-01",
        dueDate: "2026-04-15",
      },
    });
    render(<Card card={card} columnId="col" moveDates />);
    expect(screen.getByText(/🛫/)).toBeInTheDocument();
    expect(screen.getByText(/📅/)).toBeInTheDocument();
  });

  it("does not render task dates when moveDates is false (default)", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        startDate: "2026-04-01",
      },
    });
    render(<Card card={card} columnId="col" />);
    expect(screen.queryByText(/🛫/)).not.toBeInTheDocument();
  });
});

// ─── Recurrence Display ───────────────────────────────────────────────────

describe("Card — recurrence display", () => {
  it("renders recurrence when present", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, recurrence: "every week" },
    });
    render(<Card card={card} columnId="col" />);
    expect(screen.getByText(/🔁 every week/)).toBeInTheDocument();
  });

  it("does not render recurrence when null", () => {
    const card = createTestCard();
    render(<Card card={card} columnId="col" />);
    expect(screen.queryByText(/🔁/)).not.toBeInTheDocument();
  });
});

// ─── Edge Case: Invalid & Empty Inputs ─────────────────────────────────────

describe("formatRelativeDate — invalid date", () => {
  it("returns raw string instead of crashing for invalid date", () => {
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: "garbage" };
    render(<Card card={{ ...card, metadata }} columnId="col" moveDates showRelativeDate />);
    // formatRelativeDate should return "garbage" as-is, not throw
    expect(screen.getByText(/garbage/)).toBeInTheDocument();
  });
});

describe("getDateColor — invalid date", () => {
  it("returns null (no crash) when date string is invalid", () => {
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: "invalid" };
    const dateColors = [{ isToday: true, color: "#ff0000" }];
    render(<Card card={{ ...card, metadata }} columnId="col" moveDates dateColors={dateColors} />);
    // getDateColor returns null for invalid dates, so no color style applied
    const chip = screen.getByText(/invalid/).closest(".metadata-chip");
    expect(chip).not.toHaveStyle({ color: "#ff0000" });
  });
});

describe("getDateColor — empty dateColors array", () => {
  it("renders with no color style when dateColors is empty", () => {
    const today = dayjs().format("YYYY-MM-DD");
    const card = createTestCard();
    const metadata = { ...card.metadata, startDate: today };
    render(<Card card={{ ...card, metadata }} columnId="col" moveDates dateColors={[]} />);
    // With empty dateColors, getDateColor returns null — no inline style attribute
    const chip = screen.getByText(/🛫/).closest(".metadata-chip");
    expect(chip?.getAttribute("style")).toBeFalsy();
  });
});

// ─── DragOverlay Display ───────────────────────────────────────────────────

describe("Card — DragOverlay display", () => {
  it("renders drag-overlay class, no menu, but metadata still visible", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        startDate: "2026-04-01",
        tags: ["important"],
      },
    });
    render(<Card card={card} columnId="col" moveDates isOverlay />);
    // Should have drag-overlay class
    const cardEl = document.querySelector(".card");
    expect(cardEl).toHaveClass("drag-overlay");
    // Menu button should NOT be rendered
    expect(screen.queryByLabelText("Card actions")).not.toBeInTheDocument();
    // Metadata (task date + tag) should still be visible
    expect(screen.getByText(/🛫/)).toBeInTheDocument();
    expect(screen.getByText(/#important/)).toBeInTheDocument();
  });
});
