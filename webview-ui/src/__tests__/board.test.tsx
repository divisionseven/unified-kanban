// ─── Board Component Tests ──────────────────────────────────────────────────

import { render, screen, fireEvent } from "@testing-library/react";
import type { BoardState } from "../../../src/parser/types.ts";
import { Board } from "../components/Board.js";

/**
 * Helper to create a minimal BoardState for testing.
 */
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
    cssClasses: [],
    ...overrides,
  };
}

// ─── Column Rendering ───────────────────────────────────────────────────────

describe("Board — column rendering", () => {
  it("renders all columns from board state", () => {
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
        {
          id: "done",
          title: "Done",
          complete: true,
          cards: [],
          rawContent: "**Complete**",
        },
      ],
    });

    render(<Board board={board} settings={board.settings} />);

    expect(screen.getByText("Todo")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders zero columns without crashing", () => {
    const board = createTestBoard({ columns: [] });
    render(<Board board={board} settings={board.settings} />);
    // Should not throw — just shows the add column button
    expect(screen.getByText("+ Add column")).toBeInTheDocument();
  });
});

// ─── Card Rendering ─────────────────────────────────────────────────────────

describe("Board — card rendering", () => {
  it("renders all cards within each column", () => {
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
            },
            {
              id: "card-2",
              text: "Second task",
              rawText: "- [ ] Second task",
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
            },
          ],
          rawContent: "- [ ] First task\n- [ ] Second task",
        },
      ],
    });

    render(<Board board={board} settings={board.settings} />);

    expect(screen.getByText("First task")).toBeInTheDocument();
    expect(screen.getByText("Second task")).toBeInTheDocument();
  });

  it("shows card count in column header", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "Task",
              rawText: "- [ ] Task",
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
            },
          ],
          rawContent: "- [ ] Task",
        },
      ],
    });

    render(<Board board={board} settings={board.settings} />);
    // Column count element
    const count = screen.getByText("1");
    expect(count).toBeInTheDocument();
  });
});

// ─── Column Management Operations ───────────────────────────────────────────

describe("Board — column management", () => {
  it("shows add column button", () => {
    const board = createTestBoard();
    render(<Board board={board} settings={board.settings} />);
    expect(screen.getByText("+ Add column")).toBeInTheDocument();
  });

  it("renders settings toggle button", () => {
    const board = createTestBoard();
    render(<Board board={board} settings={board.settings} />);
    const settingsBtn = screen.getByRole("button", { name: "Board settings" });
    expect(settingsBtn).toBeInTheDocument();
  });

  it("shows complete badge on complete columns", () => {
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

    render(<Board board={board} settings={board.settings} />);
    // The complete badge (✓) should be present
    expect(screen.getByText("✓")).toBeInTheDocument();
  });
});

// ─── Empty Column Display ───────────────────────────────────────────────────

describe("Board — empty column display", () => {
  it("shows 'No cards' message for empty columns", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "empty",
          title: "Empty",
          complete: false,
          cards: [],
          rawContent: "",
        },
      ],
    });

    render(<Board board={board} settings={board.settings} />);
    expect(screen.getByText("No cards")).toBeInTheDocument();
  });
});

// ─── Board Header Toolbar ─────────────────────────────────────────────────

describe("Board — header toolbar", () => {
  it("renders all 6 toolbar buttons by default", () => {
    const board = createTestBoard();
    render(<Board board={board} settings={board.settings} />);
    expect(screen.getByRole("button", { name: "Board settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search cards" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open as markdown" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive completed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add list" })).toBeInTheDocument();
  });

  it("hides settings button when show-board-settings is false", () => {
    const board = createTestBoard({
      settings: { "kanban-plugin": "basic", "show-board-settings": false },
    });
    render(<Board board={board} settings={board.settings} />);
    expect(screen.queryByRole("button", { name: "Board settings" })).not.toBeInTheDocument();
  });

  it("hides search button when show-search is false", () => {
    const board = createTestBoard({
      settings: { "kanban-plugin": "basic", "show-search": false },
    });
    render(<Board board={board} settings={board.settings} />);
    expect(screen.queryByRole("button", { name: "Search cards" })).not.toBeInTheDocument();
  });

  it("hides view switcher when show-set-view is false", () => {
    const board = createTestBoard({
      settings: { "kanban-plugin": "basic", "show-set-view": false },
    });
    render(<Board board={board} settings={board.settings} />);
    expect(screen.queryByRole("button", { name: "Switch view" })).not.toBeInTheDocument();
  });

  it("hides open-as-markdown when show-view-as-markdown is false", () => {
    const board = createTestBoard({
      settings: { "kanban-plugin": "basic", "show-view-as-markdown": false },
    });
    render(<Board board={board} settings={board.settings} />);
    expect(screen.queryByRole("button", { name: "Open as markdown" })).not.toBeInTheDocument();
  });

  it("hides archive button when show-archive-all is false", () => {
    const board = createTestBoard({
      settings: { "kanban-plugin": "basic", "show-archive-all": false },
    });
    render(<Board board={board} settings={board.settings} />);
    expect(screen.queryByRole("button", { name: "Archive completed" })).not.toBeInTheDocument();
  });

  it("hides add-list button when show-add-list is false", () => {
    const board = createTestBoard({
      settings: { "kanban-plugin": "basic", "show-add-list": false },
    });
    render(<Board board={board} settings={board.settings} />);
    expect(screen.queryByRole("button", { name: "Add list" })).not.toBeInTheDocument();
  });
});

// ─── Search / Filter ──────────────────────────────────────────────────────

describe("Board — search filter", () => {
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

  const boardWithCards = () =>
    createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "Buy groceries",
              rawText: "- [ ] Buy groceries",
              checked: false,
              metadata: emptyMetadata,
            },
            {
              id: "card-2",
              text: "Write report",
              rawText: "- [ ] Write report",
              checked: false,
              metadata: emptyMetadata,
            },
          ],
          rawContent: "- [ ] Buy groceries\n- [ ] Write report",
        },
      ],
    });

  it("dims non-matching cards when search is active", () => {
    const board = boardWithCards();
    const { container } = render(<Board board={board} settings={board.settings} />);
    // Open search
    fireEvent.click(screen.getByRole("button", { name: "Search cards" }));
    // Type query
    const input = screen.getByPlaceholderText("Filter cards...");
    fireEvent.change(input, { target: { value: "groceries" } });
    // Card matching should not be dimmed, non-matching should be dimmed
    const cards = container.querySelectorAll(".card");
    expect(cards.length).toBe(2);
    const dimmed = container.querySelectorAll(".card.search-dimmed");
    expect(dimmed.length).toBe(1);
    expect(cards[0]).not.toHaveClass("search-dimmed");
    expect(cards[1]).toHaveClass("search-dimmed");
  });

  it("clears search and removes dimming when clear button is clicked", () => {
    const board = boardWithCards();
    render(<Board board={board} settings={board.settings} />);
    fireEvent.click(screen.getByRole("button", { name: "Search cards" }));
    const input = screen.getByPlaceholderText("Filter cards...");
    fireEvent.change(input, { target: { value: "groceries" } });
    // Clear
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.queryByPlaceholderText("Filter cards...")).not.toBeInTheDocument();
  });

  it("performs case-insensitive matching", () => {
    const board = boardWithCards();
    const { container } = render(<Board board={board} settings={board.settings} />);
    fireEvent.click(screen.getByRole("button", { name: "Search cards" }));
    const input = screen.getByPlaceholderText("Filter cards...");
    fireEvent.change(input, { target: { value: "GROCERIES" } });
    // Buy groceries should match (case-insensitive)
    const dimmed = container.querySelectorAll(".card.search-dimmed");
    expect(dimmed.length).toBe(1); // Only "Write report" is dimmed
  });

  it("dims no cards when search is opened but query is empty", () => {
    const board = boardWithCards();
    const { container } = render(<Board board={board} settings={board.settings} />);
    // Open search but type nothing
    fireEvent.click(screen.getByRole("button", { name: "Search cards" }));
    // Empty query → matchingCardIds is null → no dimming
    const dimmed = container.querySelectorAll(".card.search-dimmed");
    expect(dimmed.length).toBe(0);
  });

  it("dims all cards when search matches nothing", () => {
    const board = boardWithCards();
    const { container } = render(<Board board={board} settings={board.settings} />);
    fireEvent.click(screen.getByRole("button", { name: "Search cards" }));
    const input = screen.getByPlaceholderText("Filter cards...");
    fireEvent.change(input, { target: { value: "zzz_no_match_zzz" } });
    // Empty Set → all cards dimmed
    const cards = container.querySelectorAll(".card");
    const dimmed = container.querySelectorAll(".card.search-dimmed");
    expect(dimmed.length).toBe(cards.length);
  });

  it("shows no clear button when search query is empty", () => {
    const board = boardWithCards();
    render(<Board board={board} settings={board.settings} />);
    fireEvent.click(screen.getByRole("button", { name: "Search cards" }));
    // Empty query → clear button should not appear (only shown when searchQuery is truthy)
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });
});

// ─── View Switcher ────────────────────────────────────────────────────────

describe("Board — view switcher", () => {
  it("calls onSetView when a view is selected", () => {
    const board = createTestBoard();
    const onSetView = vi.fn();
    render(
      <Board board={board} settings={board.settings} viewMode="board" onSetView={onSetView} />,
    );
    // Open view switcher
    fireEvent.click(screen.getByRole("button", { name: "Switch view" }));
    // Click Table
    fireEvent.click(screen.getByText("Table", { exact: false }));
    expect(onSetView).toHaveBeenCalledWith("table");
  });

  it("shows active view label on the button", () => {
    const board = createTestBoard();
    render(<Board board={board} settings={board.settings} viewMode="table" />);
    expect(screen.getByRole("button", { name: "Switch view" })).toHaveTextContent("Table");
  });
});

// ─── CSS Classes from Frontmatter ────────────────────────────────────────────

describe("Board — CSS classes from frontmatter", () => {
  it("applies cssClasses to root wrapper", () => {
    const board = createTestBoard({
      cssClasses: ["custom-theme", "dark-mode"],
    });
    const { container } = render(<Board board={board} settings={board.settings} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("custom-theme");
    expect(root.className).toContain("dark-mode");
  });

  it("applies single cssclass to root wrapper", () => {
    const board = createTestBoard({
      cssClasses: ["single-class"],
    });
    const { container } = render(<Board board={board} settings={board.settings} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toBe("board-wrapper single-class");
  });

  it("does not add className when cssClasses is empty", () => {
    const board = createTestBoard({
      cssClasses: [],
    });
    const { container } = render(<Board board={board} settings={board.settings} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toBe("board-wrapper");
  });
});

// ─── Show Title Feature ───────────────────────────────────────────────────

describe("Board — show title", () => {
  it("renders title when showTitle=true (default)", () => {
    const board = createTestBoard({
      settings: { "kanban-plugin": "basic", "show-title": true },
    });
    render(<Board board={board} settings={board.settings} fileName="my-board.md" />);
    expect(screen.getByText("my-board.md")).toBeInTheDocument();
  });

  it("does NOT render title when showTitle=false", () => {
    const board = createTestBoard({
      settings: { "kanban-plugin": "basic", "show-title": false },
    });
    render(<Board board={board} settings={board.settings} fileName="my-board.md" />);
    expect(screen.queryByText("my-board.md")).not.toBeInTheDocument();
  });

  it("shows custom title when customTitle is set", () => {
    const board = createTestBoard({
      settings: {
        "kanban-plugin": "basic",
        "show-title": true,
        "custom-title": "My Custom Board Title",
      },
    });
    render(<Board board={board} settings={board.settings} fileName="my-board.md" />);
    expect(screen.getByText("My Custom Board Title")).toBeInTheDocument();
    expect(screen.queryByText("my-board.md")).not.toBeInTheDocument();
  });

  it("shows filename when no custom title (showTitle=true)", () => {
    const board = createTestBoard({
      settings: { "kanban-plugin": "basic", "show-title": true },
    });
    render(<Board board={board} settings={board.settings} fileName="notes.md" />);
    expect(screen.getByText("notes.md")).toBeInTheDocument();
  });

  it("custom title takes precedence over filename", () => {
    const board = createTestBoard({
      settings: {
        "kanban-plugin": "basic",
        "show-title": true,
        "custom-title": "Prefer Custom",
      },
    });
    render(<Board board={board} settings={board.settings} fileName="ignore.md" />);
    // Should show custom, not filename
    expect(screen.getByText("Prefer Custom")).toBeInTheDocument();
    expect(screen.queryByText("ignore.md")).not.toBeInTheDocument();
  });

  it("renders board-title class on title element", () => {
    const board = createTestBoard({
      settings: { "kanban-plugin": "basic", "show-title": true },
    });
    const { container } = render(
      <Board board={board} settings={board.settings} fileName="test.md" />,
    );
    const title = container.querySelector(".board-title");
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent("test.md");
  });

  it("hides title when showTitle is explicitly false with empty customTitle", () => {
    const board = createTestBoard({
      settings: { "kanban-plugin": "basic", "show-title": false, "custom-title": "" },
    });
    render(<Board board={board} settings={board.settings} fileName="test.md" />);
    expect(screen.queryByText("test.md")).not.toBeInTheDocument();
  });
});
