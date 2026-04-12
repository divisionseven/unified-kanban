// ─── ListView Component Tests ─────────────────────────────────────────────

import { render, screen, fireEvent } from "@testing-library/react";
import type { BoardState } from "../../../src/parser/types.ts";
import { ListView } from "../components/ListView.js";

function createTestBoard(overrides: Partial<BoardState> = {}): BoardState {
  return {
    frontmatter: "",
    frontmatterRaw: "---\nkanban-plugin: basic\n---",
    columns: [],
    settings: { "kanban-plugin": "basic" },
    settingsRaw: null,
    rawBody: "",
    archiveCards: [],
    archiveRawContent: "",
    ...overrides,
  };
}

const emptyMetadata = {
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
};

// ─── Basic Rendering ───────────────────────────────────────────────────────

describe("ListView — basic rendering", () => {
  it("renders list view container when viewMode is list", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [],
          rawContent: "",
        },
        {
          id: "done",
          title: "Done",
          complete: true,
          cards: [],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} />);

    expect(screen.getByText("Todo")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders all columns stacked vertically", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "col-1",
          title: "Column One",
          complete: false,
          cards: [],
          rawContent: "",
        },
        {
          id: "col-2",
          title: "Column Two",
          complete: false,
          cards: [],
          rawContent: "",
        },
        {
          id: "col-3",
          title: "Column Three",
          complete: false,
          cards: [],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} />);

    const listColumns = document.querySelectorAll(".list-column");
    expect(listColumns).toHaveLength(3);
  });

  it("renders cards as full-width list items", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "First task",
              rawText: "- [ ] First task",
              checked: false,
              metadata: { ...emptyMetadata },
            },
            {
              id: "card-2",
              text: "Second task",
              rawText: "- [ ] Second task",
              checked: false,
              metadata: { ...emptyMetadata },
            },
          ],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} />);

    expect(screen.getByText("First task")).toBeInTheDocument();
    expect(screen.getByText("Second task")).toBeInTheDocument();

    const cardWrappers = document.querySelectorAll(".list-card-wrapper");
    expect(cardWrappers).toHaveLength(2);
  });
});

// ─── Column Collapse ───────────────────────────────────────────────────────

describe("ListView — column collapse", () => {
  it("renders column collapse toggle buttons", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} />);

    const toggleButtons = document.querySelectorAll(".list-column-toggle");
    expect(toggleButtons).toHaveLength(1);
  });

  it("toggles column collapse state on button click", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} />);

    const toggleButton = document.querySelector(".list-column-toggle") as HTMLButtonElement;
    expect(toggleButton).not.toBeNull();

    // Initially expanded (▾ icon)
    expect(toggleButton.textContent).toBe("▾");

    // Click to collapse
    fireEvent.click(toggleButton);

    // Now collapsed (▸ icon)
    const toggleButtonAfter = document.querySelector(".list-column-toggle") as HTMLButtonElement;
    expect(toggleButtonAfter.textContent).toBe("▸");

    // Content should be hidden
    const content = document.querySelector(".list-column-content");
    expect(content).toHaveClass("collapsed");
  });

  it("initializes collapsed state from listCollapse setting", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [],
          rawContent: "",
        },
        {
          id: "in-progress",
          title: "In Progress",
          complete: false,
          cards: [],
          rawContent: "",
        },
      ],
    });

    // First column collapsed, second expanded
    render(<ListView board={board} listCollapse={[true, false]} />);

    const toggleButtons = document.querySelectorAll(".list-column-toggle");
    expect(toggleButtons[0]).toHaveTextContent("▸"); // Collapsed
    expect(toggleButtons[1]).toHaveTextContent("▾"); // Expanded
  });
});

// ─── Settings Application ───────────────────────────────────────────────────

describe("ListView — settings application", () => {
  it("applies full-list-lane-width setting", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} fullListLaneWidth={true} />);

    const column = document.querySelector(".list-column");
    expect(column).toHaveClass("full-width");
  });

  it("does not apply full-width class when setting is false", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} fullListLaneWidth={false} />);

    const column = document.querySelector(".list-column");
    expect(column).not.toHaveClass("full-width");
  });
});

// ─── Drag and Drop ─────────────────────────────────────────────────────────

describe("ListView — drag and drop", () => {
  it("renders sortable context for cards", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "Task 1",
              rawText: "- [ ] Task 1",
              checked: false,
              metadata: { ...emptyMetadata },
            },
            {
              id: "card-2",
              text: "Task 2",
              rawText: "- [ ] Task 2",
              checked: false,
              metadata: { ...emptyMetadata },
            },
          ],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} />);

    // Cards should be rendered within a sortable context
    const cardWrappers = document.querySelectorAll(".list-card-wrapper");
    expect(cardWrappers).toHaveLength(2);
  });

  it("renders columns as sortable items", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} />);

    // List columns should have sortable attributes
    const listColumn = document.querySelector(".list-column");
    expect(listColumn).not.toBeNull();
  });
});

// ─── Card Rendering with Metadata ─────────────────────────────────────────

describe("ListView — card rendering with metadata", () => {
  it("renders cards with checkboxes when showCheckboxes is true", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "Task with checkbox",
              rawText: "- [ ] Task with checkbox",
              checked: false,
              metadata: { ...emptyMetadata },
            },
          ],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} showCheckboxes={true} />);

    // Checkbox should be present and visible
    const checkbox = document.querySelector(".card-checkbox:not(.hidden)");
    expect(checkbox).toBeInTheDocument();
  });

  it("renders cards with hidden checkbox when showCheckboxes is false", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "Task without checkbox",
              rawText: "- [ ] Task without checkbox",
              checked: false,
              metadata: { ...emptyMetadata },
            },
          ],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} showCheckboxes={false} />);

    // Checkbox should have hidden class (not in DOM without the hidden class)
    const checkbox = document.querySelector(".card-checkbox.hidden");
    expect(checkbox).toBeInTheDocument();
  });
});

// ─── Empty States ───────────────────────────────────────────────────────────

describe("ListView — empty states", () => {
  it("renders empty message when column has no cards", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} />);

    expect(screen.getByText("No cards")).toBeInTheDocument();
  });

  it("renders completed column badge", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "done",
          title: "Done",
          complete: true,
          cards: [],
          rawContent: "**Complete**",
        },
      ],
    });

    render(<ListView board={board} />);

    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("renders card count in header", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "Task 1",
              rawText: "- [ ] Task 1",
              checked: false,
              metadata: { ...emptyMetadata },
            },
            {
              id: "card-2",
              text: "Task 2",
              rawText: "- [ ] Task 2",
              checked: false,
              metadata: { ...emptyMetadata },
            },
          ],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} hideCardCount={false} />);

    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("hides card count when hideCardCount is true", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "Task 1",
              rawText: "- [ ] Task 1",
              checked: false,
              metadata: { ...emptyMetadata },
            },
          ],
          rawContent: "",
        },
      ],
    });

    render(<ListView board={board} hideCardCount={true} />);

    expect(screen.queryByText("(1)")).not.toBeInTheDocument();
  });
});
