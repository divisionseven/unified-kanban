import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { Card } from "../components/Card.js";
import { useBoardState } from "../hooks/useBoardState.js";

// Mock postMessage
vi.mock("../hooks/useVSCodeAPI.js", () => ({
  postMessage: vi.fn(),
}));

describe("Advanced Card Features", () => {
  describe("Card menu items", () => {
    const createTestCard = () => ({
      id: "test-card-1",
      text: "Test card text",
      rawText: "- [ ] Test card text",
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
    });

    const boardColumns = [
      { id: "col-1", title: "Todo", cardCount: 1 },
      { id: "col-2", title: "In Progress", cardCount: 2 },
      { id: "col-3", title: "Done", cardCount: 3 },
    ];

    it("renders 'New note from card' menu item", () => {
      const card = createTestCard();

      render(
        <Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={vi.fn()} />,
      );

      const cardEl = document.querySelector(".card") as HTMLElement;
      const menuButton = cardEl.querySelector(".card-menu-trigger") as HTMLButtonElement;
      fireEvent.click(menuButton);

      expect(screen.getByText("New note from card")).toBeInTheDocument();
    });

    it("renders 'Split card' menu item", () => {
      const card = createTestCard();

      render(
        <Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={vi.fn()} />,
      );

      const cardEl = document.querySelector(".card") as HTMLElement;
      const menuButton = cardEl.querySelector(".card-menu-trigger") as HTMLButtonElement;
      fireEvent.click(menuButton);

      expect(screen.getByText("Split card")).toBeInTheDocument();
    });

    it("renders 'Duplicate card' menu item", () => {
      const card = createTestCard();

      render(
        <Card card={card} columnId="col-1" boardColumns={boardColumns} onMoveCard={vi.fn()} />,
      );

      const cardEl = document.querySelector(".card") as HTMLElement;
      const menuButton = cardEl.querySelector(".card-menu-trigger") as HTMLButtonElement;
      fireEvent.click(menuButton);

      expect(screen.getByText("Duplicate card")).toBeInTheDocument();
    });

    it("calls onNewNoteFromCard when clicking menu item", () => {
      const card = createTestCard();
      const onNewNoteFromCard = vi.fn();

      render(
        <Card
          card={card}
          columnId="col-1"
          boardColumns={boardColumns}
          onMoveCard={vi.fn()}
          onNewNoteFromCard={onNewNoteFromCard}
        />,
      );

      const cardEl = document.querySelector(".card") as HTMLElement;
      const menuButton = cardEl.querySelector(".card-menu-trigger") as HTMLButtonElement;
      fireEvent.click(menuButton);

      fireEvent.click(screen.getByText("New note from card"));

      expect(onNewNoteFromCard).toHaveBeenCalledWith("test-card-1", "col-1");
    });

    it("calls onSplitCard when clicking menu item", () => {
      const card = createTestCard();
      const onSplitCard = vi.fn();

      render(
        <Card
          card={card}
          columnId="col-1"
          boardColumns={boardColumns}
          onMoveCard={vi.fn()}
          onSplitCard={onSplitCard}
        />,
      );

      const cardEl = document.querySelector(".card") as HTMLElement;
      const menuButton = cardEl.querySelector(".card-menu-trigger") as HTMLButtonElement;
      fireEvent.click(menuButton);

      fireEvent.click(screen.getByText("Split card"));

      expect(onSplitCard).toHaveBeenCalledWith("test-card-1", "col-1");
    });

    it("calls onDuplicateCard when clicking menu item", () => {
      const card = createTestCard();
      const onDuplicateCard = vi.fn();

      render(
        <Card
          card={card}
          columnId="col-1"
          boardColumns={boardColumns}
          onMoveCard={vi.fn()}
          onDuplicateCard={onDuplicateCard}
        />,
      );

      const cardEl = document.querySelector(".card") as HTMLElement;
      const menuButton = cardEl.querySelector(".card-menu-trigger") as HTMLButtonElement;
      fireEvent.click(menuButton);

      fireEvent.click(screen.getByText("Duplicate card"));

      expect(onDuplicateCard).toHaveBeenCalledWith("test-card-1", "col-1");
    });
  });

  describe("useBoardState callbacks", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("has applyNewNoteFromCard in return type", () => {
      const { result } = renderHook(() => useBoardState());
      expect(typeof result.current.applyNewNoteFromCard).toBe("function");
    });

    it("has applySplitCard in return type", () => {
      const { result } = renderHook(() => useBoardState());
      expect(typeof result.current.applySplitCard).toBe("function");
    });

    it("has applyDuplicateCard in return type", () => {
      const { result } = renderHook(() => useBoardState());
      expect(typeof result.current.applyDuplicateCard).toBe("function");
    });
  });
});
