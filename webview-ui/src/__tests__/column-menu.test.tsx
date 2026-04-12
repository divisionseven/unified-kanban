// ─── Column Context Menu Tests (Phase 5) ─────────────────────────────────────

import { render, screen, fireEvent } from "@testing-library/react";
import type { Column as ColumnType, Card as CardType } from "../../../src/parser/types.ts";
import { Column } from "../components/Column.js";

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

/**
 * Helper to create a minimal ColumnType for testing.
 */
function createTestColumn(overrides: Partial<ColumnType> = {}): ColumnType {
  return {
    id: "test-col",
    title: "Test Column",
    complete: false,
    cards: [],
    rawContent: "",
    ...overrides,
  };
}

/**
 * Helper to open the column dropdown menu.
 */
function openColumnMenu(colEl: HTMLElement): void {
  const trigger = colEl.querySelector(".column-menu-trigger") as HTMLElement;
  fireEvent.click(trigger);
}

// ─── Menu Rendering ──────────────────────────────────────────────────────────

describe("Column — context menu items", () => {
  it("renders all menu items including new operations", () => {
    const column = createTestColumn();
    render(
      <Column
        column={column}
        onRenameColumn={vi.fn()}
        onDeleteColumn={vi.fn()}
        onToggleColumnComplete={vi.fn()}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    const colEl = document.querySelector(".column") as HTMLElement;
    openColumnMenu(colEl);

    expect(screen.getByText("Rename")).toBeInTheDocument();
    expect(screen.getByText("Archive completed cards")).toBeInTheDocument();
    expect(screen.getByText("Insert list before")).toBeInTheDocument();
    expect(screen.getByText("Insert list after")).toBeInTheDocument();
    expect(screen.getByText(/Sort by/)).toBeInTheDocument();
    expect(screen.getByText("Set as Completed Board")).toBeInTheDocument();
    expect(screen.getByText("Archive list")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();

    // 4 separators
    const separators = document.querySelectorAll(".column-menu-separator");
    expect(separators.length).toBe(4);
  });

  it("renders 'Remove Completed Status' for complete columns", () => {
    const column = createTestColumn({ complete: true });
    render(
      <Column
        column={column}
        onToggleColumnComplete={vi.fn()}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    const colEl = document.querySelector(".column") as HTMLElement;
    openColumnMenu(colEl);

    expect(screen.getByText("Remove Completed Status")).toBeInTheDocument();
  });
});

// ─── Sort Submenu ────────────────────────────────────────────────────────────

describe("Column — sort submenu", () => {
  it("renders sort submenu with fixed options and dynamic metadata keys", () => {
    const column = createTestColumn({
      cards: [
        createTestCard({
          id: "card-1",
          text: "Alpha",
          metadata: {
            ...createTestCard().metadata,
            inlineMetadata: [{ key: "effort", value: "3", raw: "[effort:: 3]" }],
          },
        }),
        createTestCard({
          id: "card-2",
          text: "Beta",
          metadata: {
            ...createTestCard().metadata,
            inlineMetadata: [{ key: "effort", value: "1", raw: "[effort:: 1]" }],
          },
        }),
      ],
    });

    render(
      <Column
        column={column}
        onSortColumn={vi.fn()}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);
    fireEvent.click(screen.getByText(/Sort by/));

    // Fixed sort options
    expect(screen.getByText("Card text A→Z")).toBeInTheDocument();
    expect(screen.getByText("Card text Z→A")).toBeInTheDocument();
    expect(screen.getByText("Date ↑")).toBeInTheDocument();
    expect(screen.getByText("Date ↓")).toBeInTheDocument();
    expect(screen.getByText("Tags A→Z")).toBeInTheDocument();
    expect(screen.getByText("Priority ↑")).toBeInTheDocument();

    // Dynamic metadata keys
    expect(screen.getByText("effort ↑")).toBeInTheDocument();
    expect(screen.getByText("effort ↓")).toBeInTheDocument();
  });

  it("renders no dynamic metadata sort options when cards have no inlineMetadata", () => {
    const column = createTestColumn({
      cards: [createTestCard({ metadata: { ...createTestCard().metadata, inlineMetadata: [] } })],
    });

    render(
      <Column
        column={column}
        onSortColumn={vi.fn()}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);
    fireEvent.click(screen.getByText(/Sort by/));

    // Only 6 fixed sort options, no dynamic keys
    const sortItems = document.querySelectorAll(".sort-submenu .column-menu-item");
    expect(sortItems.length).toBe(6);
  });

  it("calls onSortColumn when clicking a sort option", () => {
    const onSortColumn = vi.fn();
    const column = createTestColumn();

    render(
      <Column
        column={column}
        onSortColumn={onSortColumn}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);
    fireEvent.click(screen.getByText(/Sort by/));
    fireEvent.click(screen.getByText("Card text A→Z"));

    expect(onSortColumn).toHaveBeenCalledWith("test-col", "text", "asc");
  });
});

// ─── Archive Completed Cards ─────────────────────────────────────────────────

describe("Column — archive completed cards", () => {
  it("calls onArchiveColumnCards when clicking 'Archive completed cards'", () => {
    const onArchiveColumnCards = vi.fn();
    const column = createTestColumn();

    render(
      <Column
        column={column}
        onArchiveColumnCards={onArchiveColumnCards}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);
    fireEvent.click(screen.getByText("Archive completed cards"));

    expect(onArchiveColumnCards).toHaveBeenCalledWith("test-col");
  });
});

// ─── Insert Column ───────────────────────────────────────────────────────────

describe("Column — insert column", () => {
  it("shows InlineEdit when clicking 'Insert list before'", () => {
    const column = createTestColumn();

    render(
      <Column
        column={column}
        onInsertColumn={vi.fn()}
        onArchiveColumnCards={vi.fn()}
        onArchiveColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);
    fireEvent.click(screen.getByText("Insert list before"));

    expect(screen.getByPlaceholderText("New list title (before)...")).toBeInTheDocument();
  });

  it("calls onInsertColumn with position='after' on confirm", () => {
    const onInsertColumn = vi.fn();
    const column = createTestColumn();

    render(
      <Column
        column={column}
        onInsertColumn={onInsertColumn}
        onArchiveColumnCards={vi.fn()}
        onArchiveColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);
    fireEvent.click(screen.getByText("Insert list after"));

    const input = screen.getByPlaceholderText("New list title (after)...") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "New Column" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onInsertColumn).toHaveBeenCalledWith("New Column", "after", "test-col");
  });
});

// ─── Archive Column ──────────────────────────────────────────────────────────

describe("Column — archive column", () => {
  it("calls onArchiveColumn when clicking 'Archive list'", () => {
    const onArchiveColumn = vi.fn();
    const column = createTestColumn();

    render(
      <Column
        column={column}
        onArchiveColumn={onArchiveColumn}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);
    fireEvent.click(screen.getByText("Archive list"));

    expect(onArchiveColumn).toHaveBeenCalledWith("test-col");
  });
});

// ─── Delete with confirmation ────────────────────────────────────────────────

describe("Column — delete", () => {
  it("calls onDeleteColumn when clicking Delete on empty column", () => {
    const onDeleteColumn = vi.fn();
    const column = createTestColumn({ cards: [] });

    render(
      <Column
        column={column}
        onDeleteColumn={onDeleteColumn}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);
    fireEvent.click(screen.getByText("Delete"));

    expect(onDeleteColumn).toHaveBeenCalledWith("test-col");
  });

  it("asks confirmation when column has cards", () => {
    const onDeleteColumn = vi.fn();
    const column = createTestColumn({
      cards: [createTestCard({ id: "card-1" })],
    });

    render(
      <Column
        column={column}
        onDeleteColumn={onDeleteColumn}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);

    // Mock confirm to return false
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByText("Delete"));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDeleteColumn).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});

// ─── CSS Classes ─────────────────────────────────────────────────────────────

describe("Column — menu CSS classes", () => {
  it("applies danger class to Delete button", () => {
    const column = createTestColumn();

    render(
      <Column
        column={column}
        onDeleteColumn={vi.fn()}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);

    const deleteBtn = screen.getByText("Delete");
    expect(deleteBtn).toHaveClass("column-menu-item-danger");
  });

  it("does not apply danger class to Archive list button", () => {
    const column = createTestColumn();

    render(
      <Column
        column={column}
        onArchiveColumn={vi.fn()}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);

    const archiveBtn = screen.getByText("Archive list");
    expect(archiveBtn).not.toHaveClass("column-menu-item-danger");
  });

  it("applies subitem class to sort options in submenu", () => {
    const column = createTestColumn();

    render(
      <Column
        column={column}
        onSortColumn={vi.fn()}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
      />,
    );

    openColumnMenu(document.querySelector(".column") as HTMLElement);
    fireEvent.click(screen.getByText(/Sort by/));

    const textAsc = screen.getByText("Card text A→Z");
    expect(textAsc).toHaveClass("column-menu-subitem");
  });
});

// ─── Icon Rendering ───────────────────────────────────────────────────────────

describe("Column — menu icons", () => {
  it("renders icons for each menu item in the dropdown", () => {
    const column = createTestColumn();
    render(
      <Column
        column={column}
        onRenameColumn={vi.fn()}
        onDeleteColumn={vi.fn()}
        onToggleColumnComplete={vi.fn()}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    const colEl = document.querySelector(".column") as HTMLElement;
    openColumnMenu(colEl);

    const dropdown = document.querySelector(".column-menu-dropdown") as HTMLElement;
    const menuItems = dropdown.querySelectorAll(".column-menu-item");

    // Each menu item should contain an SVG icon
    menuItems.forEach((item) => {
      const svg = item.querySelector("svg");
      expect(svg).not.toBeNull();
    });
  });

  it("applies correct styling to menu item icons (size and layout)", () => {
    const column = createTestColumn();
    render(
      <Column
        column={column}
        onRenameColumn={vi.fn()}
        onDeleteColumn={vi.fn()}
        onToggleColumnComplete={vi.fn()}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    const colEl = document.querySelector(".column") as HTMLElement;
    openColumnMenu(colEl);

    // Verify the Rename menu item has proper structure
    const renameBtn = screen.getByText("Rename");
    expect(renameBtn).toHaveClass("column-menu-item");

    // Check that the item has an SVG icon as a direct child (flexbox layout from CSS)
    const svg = renameBtn.querySelector("svg");
    expect(svg).not.toBeNull();

    // Verify the SVG icon has lucide classes (standard icon library classes)
    // The CSS styling (.column-menu-item svg) applies to any svg inside .column-menu-item
    expect(svg?.classList.contains("lucide")).toBe(true);
  });

  it("renders different icon types for different menu actions", () => {
    const column = createTestColumn();
    render(
      <Column
        column={column}
        onRenameColumn={vi.fn()}
        onDeleteColumn={vi.fn()}
        onToggleColumnComplete={vi.fn()}
        onArchiveColumnCards={vi.fn()}
        onInsertColumn={vi.fn()}
        onArchiveColumn={vi.fn()}
        onSortColumn={vi.fn()}
      />,
    );

    const colEl = document.querySelector(".column") as HTMLElement;
    openColumnMenu(colEl);

    // Check specific icons are present for various actions
    expect(screen.getByText("Rename").querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Archive completed cards").querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Set as Completed Board").querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Delete").querySelector("svg")).toBeInTheDocument();
  });
});
