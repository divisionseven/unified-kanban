// ─── TableView Component Tests ─────────────────────────────────────────────

import { render, screen, fireEvent } from "@testing-library/react";
import type { BoardState } from "../../../src/parser/types.ts";
import { TableView } from "../components/TableView.js";

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

describe("TableView — basic rendering", () => {
  it("renders table headers", () => {
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
    render(
      <TableView
        board={board}
        dateFormat="YYYY-MM-DD"
        dateDisplayFormat="YYYY-MM-DD"
        showCheckboxes={true}
        moveDates={false}
        moveTags={false}
        showRelativeDate={false}
        dateColors={[]}
        inlineMetadataPosition="body"
      />,
    );
    expect(screen.getByText("List")).toBeInTheDocument();
    expect(screen.getByText("Card")).toBeInTheDocument();
  });

  it("renders cards in table rows", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "Test task",
              rawText: "- [ ] Test task",
              checked: false,
              metadata: { ...emptyMetadata, tags: ["work"], dueDate: "2026-04-01" },
            },
          ],
          rawContent: "- [ ] Test task",
        },
      ],
    });
    render(
      <TableView
        board={board}
        dateFormat="YYYY-MM-DD"
        dateDisplayFormat="YYYY-MM-DD"
        showCheckboxes={true}
        moveDates={false}
        moveTags={false}
        showRelativeDate={false}
        dateColors={[]}
        inlineMetadataPosition="body"
      />,
    );
    expect(screen.getByText("Test task")).toBeInTheDocument();
    expect(screen.getByText("Todo")).toBeInTheDocument();
  });

  it("shows empty message when no cards", () => {
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
    render(
      <TableView
        board={board}
        dateFormat="YYYY-MM-DD"
        dateDisplayFormat="YYYY-MM-DD"
        showCheckboxes={true}
        moveDates={false}
        moveTags={false}
        showRelativeDate={false}
        dateColors={[]}
        inlineMetadataPosition="body"
      />,
    );
    expect(screen.getByText("No cards to display")).toBeInTheDocument();
  });
});

// ─── Column Data ───────────────────────────────────────────────────────────

describe("TableView — column data", () => {
  it("displays tags in tags column", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "Task with tags",
              rawText: "- [ ] Task with tags",
              checked: false,
              metadata: { ...emptyMetadata, tags: ["work", "urgent"] },
            },
          ],
          rawContent: "- [ ] Task with tags",
        },
      ],
    });
    render(
      <TableView
        board={board}
        dateFormat="YYYY-MM-DD"
        dateDisplayFormat="YYYY-MM-DD"
        showCheckboxes={true}
        moveDates={false}
        moveTags={false}
        showRelativeDate={false}
        dateColors={[]}
        inlineMetadataPosition="body"
      />,
    );
    expect(screen.getByText("work")).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument();
  });

  it("displays due date", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "Task with date",
              rawText: "- [ ] Task with date",
              checked: false,
              metadata: { ...emptyMetadata, dueDate: "2026-04-15" },
            },
          ],
          rawContent: "- [ ] Task with date",
        },
      ],
    });
    render(
      <TableView
        board={board}
        dateFormat="YYYY-MM-DD"
        dateDisplayFormat="YYYY-MM-DD"
        showCheckboxes={true}
        moveDates={false}
        moveTags={false}
        showRelativeDate={false}
        dateColors={[]}
        inlineMetadataPosition="body"
      />,
    );
    expect(screen.getByText("2026-04-15")).toBeInTheDocument();
  });

  it("displays priority label", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "High priority task",
              rawText: "- [ ] High priority task",
              checked: false,
              metadata: { ...emptyMetadata, priority: 1 },
            },
          ],
          rawContent: "- [ ] High priority task",
        },
      ],
    });
    render(
      <TableView
        board={board}
        dateFormat="YYYY-MM-DD"
        dateDisplayFormat="YYYY-MM-DD"
        showCheckboxes={true}
        moveDates={false}
        moveTags={false}
        showRelativeDate={false}
        dateColors={[]}
        inlineMetadataPosition="body"
      />,
    );
    expect(screen.getByText("High")).toBeInTheDocument();
  });
});

// ─── Inline Metadata Columns ─────────────────────────────────────────────

describe("TableView — inline metadata", () => {
  it("creates columns for inline metadata keys", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-1",
              text: "Task with metadata",
              rawText: "- [ ] Task with metadata",
              checked: false,
              metadata: {
                ...emptyMetadata,
                inlineMetadata: [
                  { key: "estimatedTime", value: "2h", raw: "estimatedTime:: 2h" },
                  { key: "reporter", value: "alice", raw: "reporter:: alice" },
                ],
              },
            },
          ],
          rawContent: "- [ ] Task with metadata",
        },
      ],
    });
    render(
      <TableView
        board={board}
        dateFormat="YYYY-MM-DD"
        dateDisplayFormat="YYYY-MM-DD"
        showCheckboxes={true}
        moveDates={false}
        moveTags={false}
        showRelativeDate={false}
        dateColors={[]}
        inlineMetadataPosition="body"
      />,
    );
    expect(screen.getByText("estimatedTime")).toBeInTheDocument();
    expect(screen.getByText("reporter")).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });
});

// ─── Sorting ─────────────────────────────────────────────────────────────

describe("TableView — sorting", () => {
  it("toggles sort on column header click", () => {
    const board = createTestBoard({
      columns: [
        {
          id: "todo",
          title: "Todo",
          complete: false,
          cards: [
            {
              id: "card-b",
              text: "Beta task",
              rawText: "- [ ] Beta task",
              checked: false,
              metadata: emptyMetadata,
            },
            {
              id: "card-a",
              text: "Alpha task",
              rawText: "- [ ] Alpha task",
              checked: false,
              metadata: emptyMetadata,
            },
          ],
          rawContent: "- [ ] Beta task\n- [ ] Alpha task",
        },
      ],
    });
    render(
      <TableView
        board={board}
        dateFormat="YYYY-MM-DD"
        dateDisplayFormat="YYYY-MM-DD"
        showCheckboxes={true}
        moveDates={false}
        moveTags={false}
        showRelativeDate={false}
        dateColors={[]}
        inlineMetadataPosition="body"
      />,
    );
    const cardHeader = screen.getByText("Card");
    fireEvent.click(cardHeader);
    // First click sorts ascending (↑)
    expect(cardHeader).toHaveTextContent("Card ↑");
    fireEvent.click(cardHeader);
    // Second click sorts descending (↓)
    expect(cardHeader).toHaveTextContent("Card ↓");
  });
});

// ─── Checkbox Toggle ─────────────────────────────────────────────────────

describe("TableView — checkbox toggle", () => {
  it("calls onToggleCard when checkbox is clicked", () => {
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
              metadata: emptyMetadata,
            },
          ],
          rawContent: "- [ ] Task",
        },
      ],
    });
    const onToggleCard = vi.fn();
    render(
      <TableView
        board={board}
        dateFormat="YYYY-MM-DD"
        dateDisplayFormat="YYYY-MM-DD"
        showCheckboxes={true}
        moveDates={false}
        moveTags={false}
        showRelativeDate={false}
        dateColors={[]}
        inlineMetadataPosition="body"
        onToggleCard={onToggleCard}
      />,
    );
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onToggleCard).toHaveBeenCalledWith("card-1", "todo");
  });
});
