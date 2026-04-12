// ─── Column Component Tests ─────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Column as ColumnType, Card as CardType } from "../../../src/parser/types.ts";
import { Column } from "../components/Column.js";

// Use vi.hoisted to create mocks that can be referenced in vi.mock
const { mockUseSortable, mockUseDroppable, mockUsePortalDropdown } = vi.hoisted(() => {
  const mockSortable = vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }));

  const mockDroppable = vi.fn(() => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }));

  const mockPortalDropdown = vi.fn(() => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    position: { top: 0, left: 0 },
    triggerRef: { current: null },
  }));

  return {
    mockUseSortable: mockSortable,
    mockUseDroppable: mockDroppable,
    mockUsePortalDropdown: mockPortalDropdown,
  };
});

// Set up mocks
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: mockUseSortable,
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  verticalListSortingStrategy: {},
}));

vi.mock("@dnd-kit/core", () => ({
  useDroppable: mockUseDroppable,
}));

vi.mock("../hooks/usePortalDropdown.ts", () => ({
  usePortalDropdown: mockUsePortalDropdown,
}));

/**
 * Helper to create a minimal CardType for testing.
 */
function createTestCard(overrides: Partial<CardType> = {}): CardType {
  return {
    id: "test-card-" + Math.random().toString(36).substr(2, 9),
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
    id: "test-column",
    title: "Test Column",
    complete: false,
    cards: [],
    rawContent: "",
    ...overrides,
  };
}

// Helper to configure dropdown mock for a test
function setDropdownOpen(isOpen: boolean) {
  mockUsePortalDropdown.mockReturnValue({
    isOpen,
    open: vi.fn(),
    close: vi.fn(),
    position: { top: 100, left: 100 },
    triggerRef: { current: document.createElement("button") },
  });
}

// ─── Component Rendering ───────────────────────────────────────────────────

describe("Column", () => {
  let onAddCardSpy: ReturnType<typeof vi.fn>;
  let onRenameColumnSpy: ReturnType<typeof vi.fn>;
  let onDeleteColumnSpy: ReturnType<typeof vi.fn>;
  let onToggleColumnCompleteSpy: ReturnType<typeof vi.fn>;
  let onArchiveColumnCardsSpy: ReturnType<typeof vi.fn>;
  let onInsertColumnSpy: ReturnType<typeof vi.fn>;
  let onArchiveColumnSpy: ReturnType<typeof vi.fn>;
  let onSortColumnSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onAddCardSpy = vi.fn();
    onRenameColumnSpy = vi.fn();
    onDeleteColumnSpy = vi.fn();
    onToggleColumnCompleteSpy = vi.fn();
    onArchiveColumnCardsSpy = vi.fn();
    onInsertColumnSpy = vi.fn();
    onArchiveColumnSpy = vi.fn();
    onSortColumnSpy = vi.fn();

    // Reset mock configurations
    mockUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    });

    mockUseDroppable.mockReturnValue({
      setNodeRef: vi.fn(),
      isOver: false,
    });

    mockUsePortalDropdown.mockReturnValue({
      isOpen: false,
      open: vi.fn(),
      close: vi.fn(),
      position: { top: 0, left: 0 },
      triggerRef: { current: null },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Basic Rendering ─────────────────────────────────────────────────────

  it("renders column with title", () => {
    const column = createTestColumn({ title: "My Column" });
    render(
      <Column
        column={column}
        onAddCard={onAddCardSpy}
        onRenameColumn={onRenameColumnSpy}
        onDeleteColumn={onDeleteColumnSpy}
      />,
    );
    expect(screen.getByText("My Column")).toBeInTheDocument();
  });

  it("renders with default laneWidth", () => {
    const column = createTestColumn();
    render(<Column column={column} onAddCard={onAddCardSpy} />);
    const columnEl = document.querySelector(".column");
    expect(columnEl).toHaveStyle({ minWidth: "270px", maxWidth: "270px" });
  });

  it("renders with custom laneWidth", () => {
    const column = createTestColumn();
    render(<Column column={column} laneWidth={300} onAddCard={onAddCardSpy} />);
    const columnEl = document.querySelector(".column");
    expect(columnEl).toHaveStyle({ minWidth: "300px", maxWidth: "300px" });
  });

  // ─── Card Count Display ──────────────────────────────────────────────────

  it("displays card count when hideCardCount is false (default)", () => {
    const column = createTestColumn({ cards: [createTestCard(), createTestCard()] });
    render(<Column column={column} onAddCard={onAddCardSpy} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("hides card count when hideCardCount is true", () => {
    const column = createTestColumn({ cards: [createTestCard()] });
    render(<Column column={column} hideCardCount onAddCard={onAddCardSpy} />);
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  // ─── Complete Column State ───────────────────────────────────────────────

  it("renders complete badge when column.complete is true", () => {
    const column = createTestColumn({ complete: true });
    render(<Column column={column} />);
    const badge = screen.getByText("✓");
    expect(badge).toHaveClass("column-complete-badge");
  });

  it("does not render complete badge when column.complete is false", () => {
    const column = createTestColumn({ complete: false });
    render(<Column column={column} />);
    expect(screen.queryByText("✓")).not.toBeInTheDocument();
  });

  // ─── Card List Display ───────────────────────────────────────────────────

  it("renders cards in the column", () => {
    const card1 = createTestCard({ id: "card-1", text: "Card 1" });
    const card2 = createTestCard({ id: "card-2", text: "Card 2" });
    const column = createTestColumn({ cards: [card1, card2] });
    render(<Column column={column} />);
    expect(screen.getByText("Card 1")).toBeInTheDocument();
    expect(screen.getByText("Card 2")).toBeInTheDocument();
  });

  // ─── Empty Column State ──────────────────────────────────────────────────

  it("shows 'No cards' message when column is empty and not adding", () => {
    const column = createTestColumn({ cards: [] });
    render(<Column column={column} onAddCard={onAddCardSpy} />);
    expect(screen.getByText("No cards")).toBeInTheDocument();
  });

  it("does not show 'No cards' when isAdding is true", () => {
    const column = createTestColumn({ cards: [] });
    const { rerender } = render(<Column column={column} onAddCard={onAddCardSpy} />);
    // Trigger add card mode
    const addButton = screen.getByText("+ Add card");
    fireEvent.click(addButton);
    rerender(<Column column={column} onAddCard={onAddCardSpy} />);
    expect(screen.queryByText("No cards")).not.toBeInTheDocument();
  });

  // ─── Add Card Functionality ───────────────────────────────────────────────

  it("renders 'Add card' button", () => {
    const column = createTestColumn();
    render(<Column column={column} onAddCard={onAddCardSpy} />);
    expect(screen.getByText("+ Add card")).toBeInTheDocument();
  });

  it("shows InlineEdit when add card button is clicked", () => {
    const column = createTestColumn();
    render(<Column column={column} onAddCard={onAddCardSpy} />);
    const addButton = screen.getByText("+ Add card");
    fireEvent.click(addButton);
    expect(screen.getByPlaceholderText("New card text...")).toBeInTheDocument();
  });

  it("calls onAddCard when new card is confirmed", async () => {
    const column = createTestColumn();
    render(<Column column={column} onAddCard={onAddCardSpy} />);
    // Click add button to enter adding mode
    const addButton = screen.getByText("+ Add card");
    fireEvent.click(addButton);
    // Type in the textarea
    const textarea = screen.getByPlaceholderText("New card text...");
    fireEvent.change(textarea, { target: { value: "New card text" } });
    // Press Enter to confirm
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onAddCardSpy).toHaveBeenCalledWith("test-column", "New card text");
  });

  it("does not call onAddCard when empty text is submitted", () => {
    const column = createTestColumn();
    render(<Column column={column} onAddCard={onAddCardSpy} />);
    const addButton = screen.getByText("+ Add card");
    fireEvent.click(addButton);
    const textarea = screen.getByPlaceholderText("New card text...");
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onAddCardSpy).not.toHaveBeenCalled();
  });

  it("closes add mode when cancel is triggered", () => {
    const column = createTestColumn();
    render(<Column column={column} onAddCard={onAddCardSpy} />);
    const addButton = screen.getByText("+ Add card");
    fireEvent.click(addButton);
    const textarea = screen.getByPlaceholderText("New card text...");
    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(screen.queryByPlaceholderText("New card text...")).not.toBeInTheDocument();
  });

  // ─── Column Header and Menu ───────────────────────────────────────────────

  it("renders column menu trigger button", () => {
    const column = createTestColumn();
    render(<Column column={column} />);
    expect(screen.getByLabelText("Column actions")).toBeInTheDocument();
  });

  it("renders h2 with column-title class", () => {
    const column = createTestColumn({ title: "Menu Test" });
    render(<Column column={column} />);
    const title = screen.getByText("Menu Test");
    expect(title.tagName).toBe("H2");
    expect(title).toHaveClass("column-title");
  });

  // ─── Drag Over State ──────────────────────────────────────────────────────

  it("applies drag-over class when dragOverColumnId matches", () => {
    const column = createTestColumn({ id: "col-1" });
    render(<Column column={column} dragOverColumnId="col-1" />);
    const cardsContainer = document.querySelector(".column-cards");
    expect(cardsContainer).toHaveClass("drag-over");
  });

  it("does not apply drag-over class when dragOverColumnId does not match", () => {
    const column = createTestColumn({ id: "col-1" });
    render(<Column column={column} dragOverColumnId="col-2" />);
    const cardsContainer = document.querySelector(".column-cards");
    expect(cardsContainer).not.toHaveClass("drag-over");
  });

  // ─── Dragging State ───────────────────────────────────────────────────────

  it("applies dragging class when isDragging is true", () => {
    // Reconfigure mock to return isDragging: true
    mockUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: true,
    });

    const column = createTestColumn();
    render(<Column column={column} onAddCard={onAddCardSpy} />);
    const columnEl = document.querySelector(".column");
    expect(columnEl).toHaveClass("dragging");
  });

  // ─── Double-click to Rename ───────────────────────────────────────────────

  it("enters rename mode on double-click of column title", () => {
    const column = createTestColumn({ title: "Double Click" });
    render(<Column column={column} onRenameColumn={onRenameColumnSpy} />);
    const title = screen.getByText("Double Click");
    fireEvent.doubleClick(title);
    expect(screen.getByPlaceholderText("Column title...")).toBeInTheDocument();
  });

  // ─── Rename via Menu ───────────────────────────────────────────────────────

  it("opens menu on click of column menu trigger", async () => {
    setDropdownOpen(true);

    const column = createTestColumn();
    render(<Column column={column} onRenameColumn={onRenameColumnSpy} />);
    const menuTrigger = screen.getByLabelText("Column actions");
    fireEvent.click(menuTrigger);

    // Menu should be open now with rename option
    await waitFor(() => {
      expect(screen.getByText("Rename")).toBeInTheDocument();
    });
  });

  // ─── Sorting Menu ─────────────────────────────────────────────────────────

  it("toggles sort menu on click", async () => {
    setDropdownOpen(true);

    const column = createTestColumn();
    render(<Column column={column} onSortColumn={onSortColumnSpy} />);

    // Menu is open, find and click Sort by button
    const sortButton = screen.getByText(/Sort by/);
    fireEvent.click(sortButton);

    // Sort submenu should be visible
    expect(screen.getByText("Card text A→Z")).toBeInTheDocument();
  });

  it("calls onSortColumn when sort option is selected", async () => {
    setDropdownOpen(true);

    const column = createTestColumn();
    render(<Column column={column} onSortColumn={onSortColumnSpy} />);

    // Open sort menu
    const sortButton = screen.getByText(/Sort by/);
    fireEvent.click(sortButton);

    // Click on sort option
    const textAscButton = screen.getByText("Card text A→Z");
    fireEvent.click(textAscButton);

    expect(onSortColumnSpy).toHaveBeenCalledWith("test-column", "text", "asc");
  });

  // ─── Delete Column ─────────────────────────────────────────────────────────

  it("calls onDeleteColumn without confirmation when column is empty", async () => {
    setDropdownOpen(true);

    // Mock window.confirm for empty column (no confirmation needed)
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);

    const column = createTestColumn({ cards: [] });
    render(<Column column={column} onDeleteColumn={onDeleteColumnSpy} />);

    // Click delete button in menu
    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onDeleteColumnSpy).toHaveBeenCalledWith("test-column");
    });

    vi.unstubAllGlobals();
  });

  it("shows confirmation when deleting column with cards", async () => {
    setDropdownOpen(true);

    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);

    const column = createTestColumn({ cards: [createTestCard()] });
    render(<Column column={column} onDeleteColumn={onDeleteColumnSpy} />);

    // Click delete button - use selector to target column menu specifically
    const deleteButton = document.querySelector(".column-menu-dropdown .column-menu-item-danger");
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton!);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith("This column has 1 card. Delete anyway?");
    });

    vi.unstubAllGlobals();
  });

  // ─── Toggle Complete ─────────────────────────────────────────────────────

  it("calls onToggleColumnComplete when menu option is clicked", async () => {
    setDropdownOpen(true);

    const column = createTestColumn({ complete: false });
    render(<Column column={column} onToggleColumnComplete={onToggleColumnCompleteSpy} />);

    // Click "Set as Completed Board"
    const completeButton = screen.getByText("Set as Completed Board");
    fireEvent.click(completeButton);

    expect(onToggleColumnCompleteSpy).toHaveBeenCalledWith("test-column");
  });

  it("shows 'Remove Completed Status' when column is complete", async () => {
    setDropdownOpen(true);

    const column = createTestColumn({ complete: true });
    render(<Column column={column} onToggleColumnComplete={onToggleColumnCompleteSpy} />);

    expect(screen.getByText("Remove Completed Status")).toBeInTheDocument();
  });

  // ─── Archive Column Cards ─────────────────────────────────────────────────

  it("calls onArchiveColumnCards when menu option is clicked", async () => {
    setDropdownOpen(true);

    const column = createTestColumn();
    render(<Column column={column} onArchiveColumnCards={onArchiveColumnCardsSpy} />);

    const archiveButton = screen.getByText("Archive completed cards");
    fireEvent.click(archiveButton);

    expect(onArchiveColumnCardsSpy).toHaveBeenCalledWith("test-column");
  });

  // ─── Insert Column (Before/After) ────────────────────────────────────────

  it("shows inline edit for insert before", async () => {
    setDropdownOpen(true);

    const column = createTestColumn();
    render(<Column column={column} onInsertColumn={onInsertColumnSpy} />);

    // Click "Insert list before"
    const insertBeforeButton = screen.getByText("Insert list before");
    fireEvent.click(insertBeforeButton);

    expect(screen.getByPlaceholderText("New list title (before)...")).toBeInTheDocument();
  });

  it("shows inline edit for insert after", async () => {
    setDropdownOpen(true);

    const column = createTestColumn();
    render(<Column column={column} onInsertColumn={onInsertColumnSpy} />);

    // Click "Insert list after"
    const insertAfterButton = screen.getByText("Insert list after");
    fireEvent.click(insertAfterButton);

    expect(screen.getByPlaceholderText("New list title (after)...")).toBeInTheDocument();
  });

  it("calls onInsertColumn when insert is confirmed", async () => {
    setDropdownOpen(true);

    const column = createTestColumn();
    render(<Column column={column} onInsertColumn={onInsertColumnSpy} />);

    // Click insert before
    const insertBeforeButton = screen.getByText("Insert list before");
    fireEvent.click(insertBeforeButton);

    // Enter new column title
    const input = screen.getByPlaceholderText("New list title (before)...");
    fireEvent.change(input, { target: { value: "New Column" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onInsertColumnSpy).toHaveBeenCalledWith("New Column", "before", "test-column");
  });

  // ─── Archive Column ───────────────────────────────────────────────────────

  it("calls onArchiveColumn when menu option is clicked", async () => {
    setDropdownOpen(true);

    const column = createTestColumn();
    render(<Column column={column} onArchiveColumn={onArchiveColumnSpy} />);

    const archiveButton = screen.getByText("Archive list");
    fireEvent.click(archiveButton);

    expect(onArchiveColumnSpy).toHaveBeenCalledWith("test-column");
  });

  // ─── Sort by Metadata Keys ───────────────────────────────────────────────

  it("shows sort options for inline metadata keys", async () => {
    setDropdownOpen(true);

    // Create card with inline metadata
    const card = createTestCard({
      metadata: {
        ...createTestCard().metadata,
        inlineMetadata: [{ key: "priority", value: "high", raw: "[priority:: high]" }],
      },
    });
    const column = createTestColumn({ cards: [card] });

    render(<Column column={column} onSortColumn={onSortColumnSpy} />);

    // Open sort menu
    const sortButton = screen.getByText(/Sort by/);
    fireEvent.click(sortButton);

    // Should show metadata sort options
    expect(screen.getByText("priority ↑")).toBeInTheDocument();
    expect(screen.getByText("priority ↓")).toBeInTheDocument();
  });

  // ─── Search Dimmed Cards ──────────────────────────────────────────────────

  it("passes searchDimmed to Card components", () => {
    const card = createTestCard({ id: "card-1" });
    const column = createTestColumn({ cards: [card] });
    const dimmedSet = new Set<string>(["card-1"]);

    render(<Column column={column} searchDimmedCardIds={dimmedSet} />);
    // Card should be rendered (we're testing it receives the prop)
    expect(screen.getByText("Test card")).toBeInTheDocument();
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────────

  it("renders without any optional callbacks", () => {
    const column = createTestColumn({ cards: [createTestCard()] });
    // Should not throw
    render(<Column column={column} />);
    expect(screen.getByText("Test Column")).toBeInTheDocument();
  });

  it("handles column with many cards", () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      createTestCard({ id: `card-${i}`, text: `Card ${i}` }),
    );
    const column = createTestColumn({ cards });
    render(<Column column={column} />);
    expect(screen.getByText("Card 0")).toBeInTheDocument();
    expect(screen.getByText("Card 9")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("does not rename when new title is same as old", () => {
    const column = createTestColumn({ title: "Same Title" });
    render(<Column column={column} onRenameColumn={onRenameColumnSpy} />);

    // Double-click to enter rename mode
    const title = screen.getByText("Same Title");
    fireEvent.doubleClick(title);

    const input = screen.getByDisplayValue("Same Title");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRenameColumnSpy).not.toHaveBeenCalled();
  });

  it("renders menu with all options when dropdown is open", async () => {
    setDropdownOpen(true);

    const column = createTestColumn({ complete: false, cards: [] });
    render(
      <Column
        column={column}
        onRenameColumn={onRenameColumnSpy}
        onDeleteColumn={onDeleteColumnSpy}
        onToggleColumnComplete={onToggleColumnCompleteSpy}
        onArchiveColumnCards={onArchiveColumnCardsSpy}
        onInsertColumn={onInsertColumnSpy}
        onSortColumn={onSortColumnSpy}
        onArchiveColumn={onArchiveColumnSpy}
      />,
    );

    // All menu items should be visible
    await waitFor(() => {
      expect(screen.getByText("Rename")).toBeInTheDocument();
      expect(screen.getByText("Archive completed cards")).toBeInTheDocument();
      expect(screen.getByText("Insert list before")).toBeInTheDocument();
      expect(screen.getByText("Insert list after")).toBeInTheDocument();
      expect(screen.getByText(/Sort by/)).toBeInTheDocument();
      expect(screen.getByText("Set as Completed Board")).toBeInTheDocument();
      expect(screen.getByText("Archive list")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });

  // ─── Rename Confirmation ─────────────────────────────────────────────────

  it("calls onRenameColumn with new title when confirmed", () => {
    const column = createTestColumn({ title: "Old Title" });
    render(<Column column={column} onRenameColumn={onRenameColumnSpy} />);

    // Double-click to enter rename mode
    const title = screen.getByText("Old Title");
    fireEvent.doubleClick(title);

    // Change value
    const input = screen.getByDisplayValue("Old Title");
    fireEvent.change(input, { target: { value: "New Title" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRenameColumnSpy).toHaveBeenCalledWith("test-column", "New Title");
  });

  it("cancels rename on Escape key", () => {
    const column = createTestColumn({ title: "Cancel Test" });
    render(<Column column={column} onRenameColumn={onRenameColumnSpy} />);

    // Double-click to enter rename mode
    const title = screen.getByText("Cancel Test");
    fireEvent.doubleClick(title);

    // Press Escape
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Escape" });

    // Should be back to regular display
    expect(screen.getByText("Cancel Test")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  // ─── Multiple Sort Options ───────────────────────────────────────────────

  it("shows all sort options when menu is expanded", async () => {
    setDropdownOpen(true);

    const column = createTestColumn();
    render(<Column column={column} onSortColumn={onSortColumnSpy} />);

    // Open sort menu
    const sortButton = screen.getByText(/Sort by/);
    fireEvent.click(sortButton);

    // Check all sort options are present
    expect(screen.getByText("Card text A→Z")).toBeInTheDocument();
    expect(screen.getByText("Card text Z→A")).toBeInTheDocument();
    expect(screen.getByText("Date ↑")).toBeInTheDocument();
    expect(screen.getByText("Date ↓")).toBeInTheDocument();
    expect(screen.getByText("Tags A→Z")).toBeInTheDocument();
    expect(screen.getByText("Priority ↑")).toBeInTheDocument();
  });

  // ─── Card Props Pass-through ─────────────────────────────────────────────

  it("passes all card-related props to Card component", () => {
    const card = createTestCard({ text: "Props Test Card" });
    const column = createTestColumn({ cards: [card] });

    render(
      <Column
        column={column}
        dateFormat="DD/MM/YYYY"
        timeFormat="HH:mm"
        dateDisplayFormat="DD/MM/YYYY"
        showCheckboxes={false}
        moveDates
        moveTags
        tagColors={[{ tagKey: "test", color: "#fff", backgroundColor: "#000" }]}
        tagSort={[{ tag: "test" }]}
        tagAction="kanban"
        showRelativeDate
        dateColors={[{ isToday: true, color: "red" }]}
        inlineMetadataPosition="footer"
        moveTaskMetadata
        configuredMetadataKeys={[
          { metadataKey: "key", label: "Key", shouldHideLabel: false, containsMarkdown: false },
        ]}
      />,
    );

    expect(screen.getByText("Props Test Card")).toBeInTheDocument();
  });
});
