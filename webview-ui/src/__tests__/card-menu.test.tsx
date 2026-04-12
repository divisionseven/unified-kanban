// ─── Card Context Menu Tests (Phase 4) ────────────────────────────────────

import { render, screen, fireEvent } from "@testing-library/react";
import type { Card as CardType } from "../../../src/parser/types.ts";
import { Card } from "../components/Card.js";

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

/**
 * Helper to open the card dropdown menu.
 */
function openMenu(cardEl: HTMLElement): void {
  const trigger = cardEl.querySelector(".card-menu-trigger") as HTMLElement;
  fireEvent.click(trigger);
}

// ─── Menu Rendering ────────────────────────────────────────────────────────

describe("Card — context menu items", () => {
  it("renders all menu items for a card with wikilinks", () => {
    const card = createTestCard({
      id: "card-1",
      metadata: {
        ...createTestCard().metadata,
        wikilinks: ["MyNote"],
      },
    });

    render(
      <Card
        card={card}
        columnId="col-1"
        boardColumns={boardColumns}
        onInsertCard={vi.fn()}
        onMoveCard={vi.fn()}
        onAddBlockId={vi.fn()}
      />,
    );

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    // 10 action buttons (including "Open: MyNote" wikilink item) + 4 date/time items
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Copy Item")).toBeInTheDocument();
    expect(screen.getByText("Insert card before")).toBeInTheDocument();
    expect(screen.getByText("Insert card after")).toBeInTheDocument();
    expect(screen.getByText("Move to top")).toBeInTheDocument();
    expect(screen.getByText("Move to bottom")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Open: MyNote")).toBeInTheDocument();
    expect(screen.getByText("Add Date")).toBeInTheDocument();
    expect(screen.getByText("Remove Date")).toBeInTheDocument();
    expect(screen.getByText("Add Time")).toBeInTheDocument();
    expect(screen.getByText("Remove Time")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();

    // 5 separator dividers (added one more for date/time section)
    const separators = document.querySelectorAll(".card-menu-separator");
    expect(separators.length).toBe(5);

    // "Move to list" label
    expect(screen.getByText("Move to list")).toBeInTheDocument();

    // Total rendered elements: 17 menu-item buttons + 6 separators = 23
    const dropdown = document.querySelector(".card-menu-dropdown") as HTMLElement;
    const menuItems = dropdown.querySelectorAll(".card-menu-item, .card-menu-separator");
    expect(menuItems.length).toBe(23);
  });

  it("shows 'Move to list' label when other columns exist", () => {
    const card = createTestCard();

    render(<Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={vi.fn()} />);

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    expect(screen.getByText("Move to list")).toBeInTheDocument();
  });

  it("hides 'Move to list' section when only one column", () => {
    const card = createTestCard();

    render(
      <Card
        card={card}
        columnId="col-1"
        boardColumns={[{ id: "col-1", title: "Todo", cardCount: 1 }]}
        onMoveCard={vi.fn()}
      />,
    );

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    expect(screen.queryByText("Move to list")).not.toBeInTheDocument();
  });

  it("shows other column names as move targets", () => {
    const card = createTestCard();

    render(<Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={vi.fn()} />);

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("does not show current column in move-to-list", () => {
    const card = createTestCard();

    render(<Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={vi.fn()} />);

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    // "Todo" should not appear as a move target (it's the current column)
    const moveTargets = screen.queryAllByText("Todo");
    // "Todo" should not appear as a button in the move-to-list section
    expect(moveTargets.length).toBe(0);
  });
});

// ─── Insert Card Behavior ──────────────────────────────────────────────────

describe("Card — insert card", () => {
  it("shows InlineEdit when clicking 'Insert card before'", () => {
    const card = createTestCard();

    render(
      <Card card={card} columnId="col-1" boardColumns={boardColumns} onInsertCard={vi.fn()} />,
    );

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    const insertBeforeBtn = screen.getByText("Insert card before");
    fireEvent.click(insertBeforeBtn);

    // Should show InlineEdit with appropriate placeholder
    expect(screen.getByPlaceholderText("New card (before)...")).toBeInTheDocument();
  });

  it("calls onInsertCard with position='before' on confirm", () => {
    const card = createTestCard({ id: "ref-card" });
    const onInsertCard = vi.fn();

    render(
      <Card card={card} columnId="col-1" boardColumns={boardColumns} onInsertCard={onInsertCard} />,
    );

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    fireEvent.click(screen.getByText("Insert card before"));

    const input = screen.getByPlaceholderText("New card (before)...") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "New inserted card" } });
    // Simulate Enter key confirmation
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onInsertCard).toHaveBeenCalledWith("col-1", "New inserted card", "before", "ref-card");
  });

  it("shows InlineEdit when clicking 'Insert card after'", () => {
    const card = createTestCard();

    render(
      <Card card={card} columnId="col-1" boardColumns={boardColumns} onInsertCard={vi.fn()} />,
    );

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    fireEvent.click(screen.getByText("Insert card after"));

    expect(screen.getByPlaceholderText("New card (after)...")).toBeInTheDocument();
  });
});

// ─── Move Behavior ─────────────────────────────────────────────────────────

describe("Card — move to top/bottom", () => {
  it("calls onMoveCard with index 0 for 'Move to top'", () => {
    const card = createTestCard({ id: "move-card" });
    const onMoveCard = vi.fn();

    render(
      <Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={onMoveCard} />,
    );

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    fireEvent.click(screen.getByText("Move to top"));

    expect(onMoveCard).toHaveBeenCalledWith("move-card", "col-1", "col-1", 0);
  });

  it("calls onMoveCard with last index for 'Move to bottom'", () => {
    const card = createTestCard({ id: "move-card" });
    const onMoveCard = vi.fn();

    render(
      <Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={onMoveCard} />,
    );

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    fireEvent.click(screen.getByText("Move to bottom"));

    // col-1 has cardCount=3, so lastIndex = 2
    expect(onMoveCard).toHaveBeenCalledWith("move-card", "col-1", "col-1", 2);
  });

  it("calls onMoveCard with target column for 'Move to list'", () => {
    const card = createTestCard({ id: "move-card" });
    const onMoveCard = vi.fn();

    render(
      <Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={onMoveCard} />,
    );

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    fireEvent.click(screen.getByText("In Progress"));

    expect(onMoveCard).toHaveBeenCalledWith("move-card", "col-1", "col-2", 0);
  });
});

// ─── CSS Classes ───────────────────────────────────────────────────────────

describe("Card — menu CSS classes", () => {
  it("applies separator class to divider elements", () => {
    const card = createTestCard();

    render(<Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={vi.fn()} />);

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    const separators = document.querySelectorAll(".card-menu-separator");
    expect(separators.length).toBeGreaterThanOrEqual(3);
  });

  it("applies danger class to Delete button", () => {
    const card = createTestCard();

    render(<Card card={card} columnId="col-1" boardColumns={boardColumns} onDelete={vi.fn()} />);

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    const deleteBtn = screen.getByText("Delete");
    expect(deleteBtn).toHaveClass("card-menu-item-danger");
  });

  it("applies subitem class to column move targets", () => {
    const card = createTestCard();

    render(<Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={vi.fn()} />);

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    const inProgressBtn = screen.getByText("In Progress");
    expect(inProgressBtn).toHaveClass("card-menu-subitem");
  });
});

// ─── Icon Rendering ───────────────────────────────────────────────────────────

describe("Card — menu icons", () => {
  it("renders icons for each menu item in the dropdown", () => {
    const card = createTestCard();

    render(
      <Card
        card={card}
        columnId="col-1"
        boardColumns={boardColumns}
        onInsertCard={vi.fn()}
        onMoveCard={vi.fn()}
        onAddBlockId={vi.fn()}
      />,
    );

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    const dropdown = document.querySelector(".card-menu-dropdown") as HTMLElement;
    const menuItems = dropdown.querySelectorAll(".card-menu-item");

    // Each menu item should contain an SVG icon
    menuItems.forEach((item) => {
      const svg = item.querySelector("svg");
      expect(svg).not.toBeNull();
    });
  });

  it("applies correct styling to menu item icons (size and layout)", () => {
    const card = createTestCard();

    render(<Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={vi.fn()} />);

    const cardEl = document.querySelector(".card") as HTMLElement;
    openMenu(cardEl);

    // Verify the first menu item has proper structure
    const editBtn = screen.getByText("Edit");
    expect(editBtn).toHaveClass("card-menu-item");

    // Check that the item has an SVG icon as a direct child (flexbox layout from CSS)
    const svg = editBtn.querySelector("svg");
    expect(svg).not.toBeNull();

    // Verify the SVG icon has lucide classes (standard icon library classes)
    // The CSS styling (.card-menu-item svg) applies to any svg inside .card-menu-item
    expect(svg?.classList.contains("lucide")).toBe(true);
  });
});
