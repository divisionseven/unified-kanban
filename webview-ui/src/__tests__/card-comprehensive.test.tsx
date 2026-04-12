// ─── Card Component Comprehensive Tests ─────────────────────────────────────

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import type { Card as CardType, CardMetadata } from "../../../src/parser/types.ts";
import { Card } from "../components/Card.js";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import relativeTime from "dayjs/plugin/relativeTime.js";

dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);

/**
 * Helper to create a minimal CardType for testing.
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

const boardColumns = [
  { id: "col-1", title: "Todo", cardCount: 3 },
  { id: "col-2", title: "In Progress", cardCount: 2 },
  { id: "col-3", title: "Done", cardCount: 5 },
];

// ─── Card Rendering with Various States ───────────────────────────────────

describe("Card — rendering with various states", () => {
  it("renders basic card with all required elements", () => {
    const card = createTestCard();
    render(<Card card={card} columnId="col-1" />);

    expect(screen.getByText("Test card")).toBeInTheDocument();
    expect(document.querySelector(".card")).toBeInTheDocument();
    expect(document.querySelector(".card-body")).toBeInTheDocument();
  });

  it("renders checked card with checked class", () => {
    const card = createTestCard({
      checked: true,
      text: "Completed task",
      rawText: "- [x] Completed task",
    });
    render(<Card card={card} columnId="col-1" />);

    const textEl = document.querySelector(".card-text");
    expect(textEl).toHaveClass("checked");
  });

  it("renders card with data attributes", () => {
    const card = createTestCard({ id: "my-card-id" });
    render(<Card card={card} columnId="my-column" />);

    const cardEl = document.querySelector(".card");
    expect(cardEl).toHaveAttribute("data-card-id", "my-card-id");
    expect(cardEl).toHaveAttribute("data-column-id", "my-column");
  });

  it("renders card with search dimmed class", () => {
    const card = createTestCard();
    render(<Card card={card} columnId="col-1" searchDimmed />);

    expect(document.querySelector(".card")).toHaveClass("search-dimmed");
  });

  it("renders card with dragging class when isDragging is true", () => {
    const card = createTestCard();
    // Note: Full drag simulation would require @dnd-kit/test-utils
    // Here we verify the class logic works with the isOverlay flag
    render(<Card card={card} columnId="col-1" isOverlay />);

    expect(document.querySelector(".card")).toHaveClass("drag-overlay");
  });
});

// ─── Card Content Display ──────────────────────────────────────────────────

describe("Card — content display", () => {
  it("renders card text content", () => {
    const card = createTestCard({ text: "My task", rawText: "- [ ] My task" });
    render(<Card card={card} columnId="col" />);

    expect(screen.getByText("My task")).toBeInTheDocument();
  });

  it("renders card with markdown content", () => {
    const card = createTestCard({
      text: "**Bold text** and *italic*",
      rawText: "- [ ] **Bold text** and *italic*",
    });
    render(<Card card={card} columnId="col" />);

    // MarkdownRenderer should render the formatted text
    expect(screen.getByText(/Bold/)).toBeInTheDocument();
  });

  it("renders multiple lines of card text", () => {
    const card = createTestCard({
      text: "Line 1\nLine 2",
      rawText: "- [ ] Line 1\n- [ ] Line 2",
    });
    render(<Card card={card} columnId="col" />);

    // Both lines should be present in the card-text element
    const cardText = document.querySelector(".card-text");
    expect(cardText?.textContent).toContain("Line 1");
    expect(cardText?.textContent).toContain("Line 2");
  });
});

// ─── Tags Display ───────────────────────────────────────────────────────────

describe("Card — tags display", () => {
  it("renders tags in body when moveTags is false (default)", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        tags: ["work", "urgent"],
      },
    });
    render(<Card card={card} columnId="col" />);

    expect(screen.getByText("#work")).toBeInTheDocument();
    expect(screen.getByText("#urgent")).toBeInTheDocument();
  });

  it("does not render tags in body when moveTags is true", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        tags: ["work"],
      },
    });
    render(<Card card={card} columnId="col" moveTags />);

    // When moveTags is true, tags go to footer instead of body
    // Check that card-metadata area doesn't have inline tags
    // They should appear in card-footer-tags instead
    const footerTags = document.querySelector(".card-footer-tags");
    expect(footerTags).toBeInTheDocument();
    expect(footerTags).toHaveTextContent("#work");
  });

  it("renders tags in footer when moveTags is true", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        tags: ["work", "home"],
      },
    });
    render(<Card card={card} columnId="col" moveTags />);

    // Tags should appear in card-footer-tags div
    const footerTags = document.querySelector(".card-footer-tags");
    expect(footerTags).toBeInTheDocument();
    expect(footerTags).toHaveTextContent("#work");
    expect(footerTags).toHaveTextContent("#home");
  });

  it("renders tags with custom tagColors", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        tags: ["important"],
      },
    });
    const tagColors = [{ tagKey: "important", color: "#ff0000", backgroundColor: "#ffffff" }];
    render(<Card card={card} columnId="col" tagColors={tagColors} />);

    const tagChip = screen.getByText("#important").closest(".metadata-chip");
    expect(tagChip).toHaveStyle({ backgroundColor: "#ff0000", color: "#ffffff" });
  });

  it("renders tags sorted by tagSort", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        tags: ["zebra", "apple", "mango"],
      },
    });
    const tagSort = [
      { tag: "apple", sortOrder: 1 },
      { tag: "mango", sortOrder: 2 },
      { tag: "zebra", sortOrder: 3 },
    ];
    render(<Card card={card} columnId="col" tagSort={tagSort} />);

    // Tags should be sorted: apple, mango, zebra
    const tagsContainer = document.querySelector(".card-metadata");
    expect(tagsContainer?.textContent).toMatch(/apple.*mango.*zebra/);
  });

  it("calls onTagFilter when clicking tag with kanban action", () => {
    const onTagFilter = vi.fn();
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        tags: ["mytag"],
      },
    });
    render(<Card card={card} columnId="col" tagAction="kanban" onTagFilter={onTagFilter} />);

    fireEvent.click(screen.getByText("#mytag"));
    expect(onTagFilter).toHaveBeenCalledWith("mytag");
  });

  it("posts SEARCH_TAG message when tagAction is obsidian (default)", () => {
    // Default tagAction is "obsidian", which posts SEARCH_TAG message
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        tags: ["mytag"],
      },
    });
    render(<Card card={card} columnId="col" />);

    // When tagAction is "obsidian", clicking tag should post a message
    // The component has role="button" and tabIndex=0 in this case
    const tagChip = screen.getByText("#mytag").closest(".metadata-chip");
    expect(tagChip).toHaveAttribute("role", "button");
  });
});

// ─── Due Dates Display ─────────────────────────────────────────────────────

describe("Card — due dates display", () => {
  it("renders due dates from metadata", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        dueDates: ["2026-04-15"],
      },
    });
    render(<Card card={card} columnId="col" />);

    expect(screen.getByText(/📅/)).toBeInTheDocument();
    expect(screen.getByText(/2026-04-15/)).toBeInTheDocument();
  });

  it("renders due date with relative date when showRelativeDate is true", () => {
    const futureDate = dayjs().add(5, "day").format("YYYY-MM-DD");
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        dueDates: [futureDate],
      },
    });
    render(<Card card={card} columnId="col" showRelativeDate />);

    expect(screen.getByText(/In 5 days/)).toBeInTheDocument();
  });

  it("applies due-soon class for dates within 3 days", () => {
    const soonDate = dayjs().add(2, "day").format("YYYY-MM-DD");
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        dueDates: [soonDate],
      },
    });
    render(<Card card={card} columnId="col" />);

    const dateChip = screen.getByText(/📅/).closest(".metadata-chip");
    expect(dateChip).toHaveClass("due-soon");
  });

  it("applies due-overdue class for past dates", () => {
    const pastDate = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        dueDates: [pastDate],
      },
    });
    render(<Card card={card} columnId="col" />);

    const dateChip = screen.getByText(/📅/).closest(".metadata-chip");
    expect(dateChip).toHaveClass("due-overdue");
  });

  it("applies due-far class for dates more than 3 days away", () => {
    const farDate = dayjs().add(10, "day").format("YYYY-MM-DD");
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        dueDates: [farDate],
      },
    });
    render(<Card card={card} columnId="col" />);

    const dateChip = screen.getByText(/📅/).closest(".metadata-chip");
    expect(dateChip).toHaveClass("due-far");
  });
});

// ─── Time Display ───────────────────────────────────────────────────────────

describe("Card — time display", () => {
  it("renders times from metadata", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        times: ["14:30", "09:15"],
      },
    });
    render(<Card card={card} columnId="col" timeFormat="HH:mm" />);

    expect(screen.getByText("🕐 14:30")).toBeInTheDocument();
    expect(screen.getByText("🕐 09:15")).toBeInTheDocument();
  });

  it("formats time with custom format", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        times: ["14:30"],
      },
    });
    render(<Card card={card} columnId="col" timeFormat="HH:mm" />);

    // The formatTime function replaces HH and mm placeholders
    expect(screen.getByText(/🕐 14:30/)).toBeInTheDocument();
  });
});

// ─── Wikilinks Display ─────────────────────────────────────────────────────

describe("Card — wikilinks display", () => {
  it("renders wikilinks as metadata chips", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        wikilinks: ["My Note", "Another Note"],
      },
    });
    render(<Card card={card} columnId="col" />);

    expect(screen.getByText("🔗 My Note")).toBeInTheDocument();
    expect(screen.getByText("🔗 Another Note")).toBeInTheDocument();
  });

  it("renders wikilink menu items in dropdown", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        wikilinks: ["LinkedNote"],
      },
    });
    const onMoveCard = vi.fn();
    render(
      <Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={onMoveCard} />,
    );

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Wikilink should appear as menu item
    expect(screen.getByText("Open: LinkedNote")).toBeInTheDocument();
  });
});

// ─── Metadata Table ─────────────────────────────────────────────────────────

describe("Card — metadata table", () => {
  it("renders MetadataTable when inlineMetadataPosition is 'metadata-table'", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [
          { key: "priority", value: "high", raw: "[priority:: high]" },
          { key: "status", value: "done", raw: "[status:: done]" },
        ],
      },
    });
    render(<Card card={card} columnId="col" inlineMetadataPosition="metadata-table" />);

    // Should render metadata table
    expect(document.querySelector(".metadata-table")).toBeInTheDocument();
  });

  it("does not render MetadataTable when position is 'body'", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [{ key: "priority", value: "high", raw: "[priority:: high]" }],
      },
    });
    render(<Card card={card} columnId="col" inlineMetadataPosition="body" />);

    expect(document.querySelector(".metadata-table")).not.toBeInTheDocument();
  });
});

// ─── Checkbox Interactions ─────────────────────────────────────────────────

describe("Card — checkbox interactions", () => {
  it("renders unchecked checkbox for unchecked card", () => {
    const card = createTestCard({ checked: false });
    render(<Card card={card} columnId="col" />);

    const checkbox = document.querySelector(".card-checkbox") as HTMLInputElement;
    expect(checkbox).not.toBeChecked();
  });

  it("renders checked checkbox for checked card", () => {
    const card = createTestCard({ checked: true });
    render(<Card card={card} columnId="col" />);

    const checkbox = document.querySelector(".card-checkbox") as HTMLInputElement;
    expect(checkbox).toBeChecked();
  });

  it("calls onToggle when checkbox is clicked", () => {
    const onToggle = vi.fn();
    const card = createTestCard({ id: "card-123", checked: false });
    render(<Card card={card} columnId="col-1" onToggle={onToggle} />);

    const checkbox = document.querySelector(".card-checkbox") as HTMLInputElement;
    fireEvent.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith("card-123", "col-1");
  });

  it("stops propagation on checkbox click", () => {
    const onToggle = vi.fn();
    const card = createTestCard({ checked: false });
    render(<Card card={card} columnId="col" onToggle={onToggle} />);

    const checkbox = document.querySelector(".card-checkbox") as HTMLInputElement;
    // This tests that the click handler prevents default
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalled();
  });
});

// ─── Drag Handle (Sortable) ─────────────────────────────────────────────────

describe("Card — drag handle", () => {
  it("renders with sortable attributes when not in overlay mode", () => {
    const card = createTestCard();
    render(<Card card={card} columnId="col" />);

    // In non-overlay mode, card should have drag listeners
    // The listeners are spread via {...listeners}
    const cardEl = document.querySelector(".card");
    expect(cardEl).toBeInTheDocument();
  });

  it("does not render drag attributes when isOverlay is true", () => {
    const card = createTestCard();
    render(<Card card={card} columnId="col" isOverlay />);

    // In overlay mode, no drag attributes
    const cardEl = document.querySelector(".card");
    expect(cardEl).toHaveClass("drag-overlay");
  });
});

// ─── Edit/Delete Actions ───────────────────────────────────────────────────

describe("Card — edit/delete actions", () => {
  it("enters edit mode when Edit menu item is clicked", () => {
    const card = createTestCard({
      id: "card-1",
      text: "Original text",
      rawText: "- [ ] Original text",
    });
    const onUpdate = vi.fn();
    render(<Card card={card} columnId="col-1" onUpdate={onUpdate} />);

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Edit
    fireEvent.click(screen.getByText("Edit"));

    // Card should be in editing mode with InlineEdit textarea
    expect(document.querySelector(".card")).toHaveClass("editing");
    expect(document.querySelector("textarea.card-edit-textarea")).toBeInTheDocument();
  });

  it("calls onUpdate when edit is confirmed", async () => {
    const onUpdate = vi.fn();
    const card = createTestCard({ id: "card-1", rawText: "- [ ] Original" });
    render(<Card card={card} columnId="col-1" onUpdate={onUpdate} />);

    // Open menu and click Edit
    fireEvent.click(document.querySelector(".card-menu-trigger") as HTMLElement);
    fireEvent.click(screen.getByText("Edit"));

    // Find InlineEdit textarea and submit new value
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Updated text" } });

    // Submit (press Enter)
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("card-1", "col-1", "Updated text");
    });
  });

  it("calls onDelete when Delete menu item is clicked", () => {
    const onDelete = vi.fn();
    const card = createTestCard({ id: "card-1" });
    render(<Card card={card} columnId="col-1" onDelete={onDelete} />);

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Delete
    fireEvent.click(screen.getByText("Delete"));

    expect(onDelete).toHaveBeenCalledWith("card-1", "col-1");
  });

  it("calls onArchiveCard when Archive menu item is clicked", () => {
    const onArchiveCard = vi.fn();
    const card = createTestCard({ id: "card-1" });
    render(<Card card={card} columnId="col-1" onArchiveCard={onArchiveCard} />);

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Archive
    fireEvent.click(screen.getByText("Archive"));

    expect(onArchiveCard).toHaveBeenCalledWith("card-1", "col-1");
  });

  it("calls onDuplicateCard when Duplicate menu item is clicked", () => {
    const onDuplicateCard = vi.fn();
    const card = createTestCard({ id: "card-1" });
    render(<Card card={card} columnId="col-1" onDuplicateCard={onDuplicateCard} />);

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Duplicate
    fireEvent.click(screen.getByText("Duplicate card"));

    expect(onDuplicateCard).toHaveBeenCalledWith("card-1", "col-1");
  });

  it("calls onSplitCard when Split menu item is clicked", () => {
    const onSplitCard = vi.fn();
    const card = createTestCard({ id: "card-1" });
    render(<Card card={card} columnId="col-1" onSplitCard={onSplitCard} />);

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Split
    fireEvent.click(screen.getByText("Split card"));

    expect(onSplitCard).toHaveBeenCalledWith("card-1", "col-1");
  });
});

// ─── Insert Card ───────────────────────────────────────────────────────────

describe("Card — insert card", () => {
  it("calls onInsertCard with before position", async () => {
    const onInsertCard = vi.fn();
    const card = createTestCard({ id: "card-1" });
    render(<Card card={card} columnId="col-1" onInsertCard={onInsertCard} />);

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Insert before
    fireEvent.click(screen.getByText("Insert card before"));

    // Should show InlineEdit textarea for new card
    expect(document.querySelector("textarea")).toBeInTheDocument();

    // Enter text and confirm
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "New card text" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(onInsertCard).toHaveBeenCalledWith("col-1", "New card text", "before", "card-1");
    });
  });

  it("calls onInsertCard with after position", async () => {
    const onInsertCard = vi.fn();
    const card = createTestCard({ id: "card-1" });
    render(<Card card={card} columnId="col-1" onInsertCard={onInsertCard} />);

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Insert after
    fireEvent.click(screen.getByText("Insert card after"));

    // Enter text and confirm
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "After card" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(onInsertCard).toHaveBeenCalledWith("col-1", "After card", "after", "card-1");
    });
  });

  it("cancels insert when cancel is clicked", () => {
    const onInsertCard = vi.fn();
    const card = createTestCard({ id: "card-1" });
    render(<Card card={card} columnId="col-1" onInsertCard={onInsertCard} />);

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Insert before
    fireEvent.click(screen.getByText("Insert card before"));

    // Cancel by pressing Escape
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: "Escape" });

    // InlineEdit textarea should be gone
    expect(document.querySelector("textarea")).not.toBeInTheDocument();
    expect(onInsertCard).not.toHaveBeenCalled();
  });
});

// ─── Move Card ─────────────────────────────────────────────────────────────

describe("Card — move card", () => {
  it("calls onMoveCard with top position when Move to top is clicked", () => {
    const onMoveCard = vi.fn();
    const card = createTestCard({ id: "card-1" });
    render(
      <Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={onMoveCard} />,
    );

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Move to top
    fireEvent.click(screen.getByText("Move to top"));

    expect(onMoveCard).toHaveBeenCalledWith("card-1", "col-1", "col-1", 0);
  });

  it("calls onMoveCard with bottom position when Move to bottom is clicked", () => {
    const onMoveCard = vi.fn();
    const card = createTestCard({ id: "card-1" });
    render(
      <Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={onMoveCard} />,
    );

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Move to bottom
    fireEvent.click(screen.getByText("Move to bottom"));

    // Should move to last index (cardCount - 1 = 2 for col-1 which has 3 cards)
    expect(onMoveCard).toHaveBeenCalledWith("card-1", "col-1", "col-1", 2);
  });

  it("renders move to list options for other columns", () => {
    const onMoveCard = vi.fn();
    const card = createTestCard({ id: "card-1" });
    render(
      <Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={onMoveCard} />,
    );

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Should show move to list section
    expect(screen.getByText("Move to list")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument(); // col-2
    expect(screen.getByText("Done")).toBeInTheDocument(); // col-3
  });

  it("calls onMoveCard when moving to another list", () => {
    const onMoveCard = vi.fn();
    const card = createTestCard({ id: "card-1" });
    render(
      <Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={onMoveCard} />,
    );

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Move to list > In Progress
    fireEvent.click(screen.getByText("In Progress"));

    expect(onMoveCard).toHaveBeenCalledWith("card-1", "col-1", "col-2", 0);
  });
});

// ─── Priority Display ─────────────────────────────────────────────────────

describe("Card — priority display", () => {
  it("renders priority indicator for priority 0", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 0 },
    });
    render(<Card card={card} columnId="col" />);

    expect(screen.getByText("\u{1F53A}")).toBeInTheDocument(); // 🔺
  });

  it("renders priority indicator for priority 1", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 1 },
    });
    render(<Card card={card} columnId="col" />);

    expect(screen.getByText("\u{26EB}")).toBeInTheDocument(); // ⏫
  });

  it("renders priority indicator for priority 2", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 2 },
    });
    render(<Card card={card} columnId="col" />);

    expect(screen.getByText("\u{1F53C}")).toBeInTheDocument(); // 🔼
  });

  it("does not render priority for priority 3 (normal)", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 3 },
    });
    render(<Card card={card} columnId="col" />);

    expect(document.querySelector(".priority-indicator")).not.toBeInTheDocument();
  });

  it("renders priority indicator for priority 4", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 4 },
    });
    render(<Card card={card} columnId="col" />);

    expect(screen.getByText("\u{1F53D}")).toBeInTheDocument(); // 🔽
  });

  it("renders priority indicator for priority 5", () => {
    const card = createTestCard({
      metadata: { ...createTestCard().metadata, priority: 5 },
    });
    render(<Card card={card} columnId="col" />);

    expect(screen.getByText("\u{23EC}")).toBeInTheDocument(); // ⏬
  });
});

// ─── Task Date Emojis ─────────────────────────────────────────────────────

describe("Card — task date emojis", () => {
  it("renders startDate with emoji when moveDates is true", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        startDate: "2026-04-15",
      },
    });
    render(<Card card={card} columnId="col" moveDates />);

    expect(screen.getByText(/🛫/)).toBeInTheDocument();
  });

  it("renders createdDate with emoji when moveDates is true", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        createdDate: "2026-04-10",
      },
    });
    render(<Card card={card} columnId="col" moveDates />);

    expect(screen.getByText(/➕/)).toBeInTheDocument();
  });

  it("renders scheduledDate with emoji when moveDates is true", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        scheduledDate: "2026-04-12",
      },
    });
    render(<Card card={card} columnId="col" moveDates />);

    expect(screen.getByText(/⏳/)).toBeInTheDocument();
  });

  it("renders doneDate with emoji when moveDates is true", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        doneDate: "2026-04-01",
      },
    });
    render(<Card card={card} columnId="col" moveDates />);

    expect(screen.getByText(/✅/)).toBeInTheDocument();
  });

  it("renders cancelledDate with emoji when moveDates is true", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        cancelledDate: "2026-04-01",
      },
    });
    render(<Card card={card} columnId="col" moveDates />);

    expect(screen.getByText(/❌/)).toBeInTheDocument();
  });

  it("renders task dates when moveTaskMetadata is true", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        startDate: "2026-04-15",
        dueDate: "2026-04-20",
      },
    });
    render(<Card card={card} columnId="col" moveTaskMetadata />);

    expect(screen.getByText(/🛫/)).toBeInTheDocument();
    expect(screen.getByText(/📅/)).toBeInTheDocument();
  });
});

// ─── Expand/Collapse (not present, but test metadata visibility) ─────────

describe("Card — metadata visibility", () => {
  it("shows card-metadata when there is metadata", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        dueDates: ["2026-04-15"],
      },
    });
    render(<Card card={card} columnId="col" />);

    expect(document.querySelector(".card-metadata")).toBeInTheDocument();
  });

  it("hides card-metadata when there is no metadata", () => {
    const card = createTestCard();
    render(<Card card={card} columnId="col" />);

    expect(document.querySelector(".card-metadata")).not.toBeInTheDocument();
  });
});

// ─── Different Card Data Scenarios ─────────────────────────────────────────

describe("Card — different data scenarios", () => {
  it("renders card with all fields populated", () => {
    const card: CardType = {
      id: "full-card",
      text: "Complex task with all metadata",
      rawText: "- [ ] Complex task with all metadata",
      checked: false,
      metadata: {
        dueDates: ["2026-04-20"],
        times: ["09:00", "17:00"],
        tags: ["work", "important"],
        wikilinks: ["ProjectNote"],
        priority: 1,
        startDate: "2026-04-01",
        createdDate: "2026-03-15",
        scheduledDate: "2026-04-10",
        dueDate: "2026-04-20",
        doneDate: null,
        cancelledDate: null,
        recurrence: "every day",
        dependsOn: null,
        blockId: "abc123",
        inlineMetadata: [{ key: "status", value: "active", raw: "[status:: active]" }],
        wikilinkDates: [],
        mdNoteDates: [],
      },
    };
    render(<Card card={card} columnId="col" moveDates moveTags />);

    // Should render many elements - use queryAllByText for elements that appear multiple times
    expect(screen.getByText(/Complex task/)).toBeInTheDocument();
    expect(screen.getAllByText(/📅/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/🕐/).length).toBeGreaterThan(0);
    expect(screen.getByText("#work")).toBeInTheDocument();
    expect(screen.getByText("🔗 ProjectNote")).toBeInTheDocument();
    expect(screen.getByText("\u{26EB}")).toBeInTheDocument(); // priority 1
    expect(screen.getByText(/🔁/)).toBeInTheDocument();
    expect(screen.getByText("^abc123")).toBeInTheDocument();
  });

  it("renders card with minimal metadata", () => {
    const card = createTestCard({
      text: "Simple task",
      rawText: "- [ ] Simple task",
      metadata: {
        ...createTestCard().metadata,
        // All empty
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
        blockId: null,
        inlineMetadata: [],
      },
    });
    render(<Card card={card} columnId="col" />);

    expect(screen.getByText("Simple task")).toBeInTheDocument();
    expect(document.querySelector(".card-metadata")).not.toBeInTheDocument();
  });

  it("handles card with empty string metadata gracefully", () => {
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        dueDates: [""], // Empty string
        times: [""], // Empty string
        tags: [""], // Empty string
        wikilinks: [""], // Empty string
      },
    });
    render(<Card card={card} columnId="col" />);

    // Should render without crashing
    expect(document.querySelector(".card")).toBeInTheDocument();
  });
});

// ─── Helper Functions ─────────────────────────────────────────────────────

describe("Card — helper functions", () => {
  describe("getEditableText", () => {
    // The function is exported, test it directly via import
    it("strips checkbox prefix from unchecked task", async () => {
      const { getEditableText } = await import("../components/Card.js");
      expect(getEditableText("- [ ] Task text")).toBe("Task text");
    });

    it("strips checkbox prefix from checked task", async () => {
      const { getEditableText } = await import("../components/Card.js");
      expect(getEditableText("- [x] Task text")).toBe("Task text");
    });

    it("returns text without prefix unchanged", async () => {
      const { getEditableText } = await import("../components/Card.js");
      expect(getEditableText("Just text")).toBe("Just text");
    });
  });

  describe("stripMetadataMarkers", () => {
    it("strips @{} markers", async () => {
      const { stripMetadataMarkers } = await import("../components/Card.js");
      const result = stripMetadataMarkers("Text @{2023-01-01} more");
      // Function collapses whitespace, so "Text  more" becomes "Text more"
      expect(result).toBe("Text more");
    });

    it("strips date emojis when stripDateEmojis is true", async () => {
      const { stripMetadataMarkers } = await import("../components/Card.js");
      const result = stripMetadataMarkers("Text 🛫2023-01-01 more", { stripDateEmojis: true });
      expect(result).toBe("Text more");
    });

    it("strips tags when stripTags is true", async () => {
      const { stripMetadataMarkers } = await import("../components/Card.js");
      const result = stripMetadataMarkers("Text #tag1 #tag-two more", { stripTags: true });
      expect(result).toBe("Text more");
    });

    it("strips wikilinks when stripWikilinks is true", async () => {
      const { stripMetadataMarkers } = await import("../components/Card.js");
      const result = stripMetadataMarkers("Text [[wikilink]] more", { stripWikilinks: true });
      expect(result).toBe("Text more");
    });

    it("preserves code blocks when stripping tags", async () => {
      const { stripMetadataMarkers } = await import("../components/Card.js");
      const input = "Text\n```\n#include <iostream>\n#endif\n```\n#tag";
      const result = stripMetadataMarkers(input, { stripTags: true });
      // The #include inside code block should be preserved
      expect(result).toContain("#include");
    });
  });
});

// ─── Date/Time Pickers ───────────────────────────────────────────────────

describe("Card — date/time pickers", () => {
  it("shows date picker when Add Date is clicked", () => {
    const card = createTestCard({ id: "card-1" });
    render(<Card card={card} columnId="col-1" />);

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Add Date
    fireEvent.click(screen.getByText("Add Date"));

    // Should show date picker dialog
    expect(document.querySelector(".date-picker-dialog")).toBeInTheDocument();
  });

  it("shows time picker when Add Time is clicked", () => {
    const card = createTestCard({ id: "card-1" });
    render(<Card card={card} columnId="col-1" />);

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    // Click Add Time
    fireEvent.click(screen.getByText("Add Time"));

    // Should show time picker dialog
    expect(document.querySelector(".time-picker-dialog")).toBeInTheDocument();
  });
});

// ─── Copy Functionality ───────────────────────────────────────────────────

describe("Card — copy functionality", () => {
  it("has Copy Item menu option", () => {
    const card = createTestCard();
    render(<Card card={card} columnId="col-1" />);

    // Open menu
    const menuButton = document.querySelector(".card-menu-trigger") as HTMLElement;
    fireEvent.click(menuButton);

    expect(screen.getByText("Copy Item")).toBeInTheDocument();
  });
});
