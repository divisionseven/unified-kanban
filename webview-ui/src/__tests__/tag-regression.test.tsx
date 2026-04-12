// ─── Tag Behavior Regression Tests ─────────────────────────────────────────

import { render, fireEvent } from "@testing-library/react";
import type { Card as CardType } from "../../../src/parser/types.ts";
import { Card } from "../components/Card.js";

/**
 * Helper to create a minimal CardType for testing tags.
 * After the parser-layer stripping fix, card.text is stripped of @{} markers,
 * #tags, [[wikilinks]], and inline metadata. Use rawText for the full original.
 */
function createTagTestCard(overrides: Partial<CardType> = {}): CardType {
  return {
    id: "tag-test-card",
    text: "Test card with", // tags stripped from text
    rawText: "- [ ] Test card with #mytag", // full original
    checked: false,
    metadata: {
      dueDates: [],
      times: [],
      tags: ["mytag"],
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
 * Get the tag badge element (the span in card-metadata, not the link in card-text).
 * This is needed because when moveTags is false, tags appear in both places.
 */
function getTagBadge(): HTMLElement | null {
  return document.querySelector(".tag-badge");
}

/**
 * ─── moveTags: false (default) — Tags shown in footer only ─────────────────────
 *
 * After parser-layer stripping fix, card.text is stripped of #tags.
 * Tags appear ONLY as badges in the footer (from metadata.tags).
 * The body text no longer contains tags - they're in metadata.
 */

describe("moveTags: false — Bug regression", () => {
  /**
   * Regression test for tag display behavior.
   *
   * After the parser-layer stripping fix:
   * - card.text is stripped of #tags (they're in metadata.tags)
   * - Tags appear ONLY as badges in the footer (not in body text)
   * - This prevents duplication when tags are moved to footer
   */

  it("displays tags as badges in footer (not in body text) when moveTags is false (default)", () => {
    const card = createTagTestCard();
    // Default: moveTags is false
    render(<Card card={card} columnId="col" />);

    // Tag should NOT appear in body text (stripped from card.text)
    const cardText = document.querySelector(".card-text");
    expect(cardText).toBeInTheDocument();
    expect(cardText?.textContent).not.toContain("mytag");

    // Tag SHOULD appear as badge in footer
    const tagBadge = getTagBadge();
    expect(tagBadge).toBeInTheDocument();
    expect(tagBadge?.textContent).toContain("mytag");
  });

  it("displays tags as badges when moveTags is false (default)", () => {
    const card = createTagTestCard();
    render(<Card card={card} columnId="col" moveTags={false} />);

    // Tag badge should be visible (using class selector to avoid duplicate)
    const tagBadge = getTagBadge();
    expect(tagBadge).toBeInTheDocument();
    expect(tagBadge?.textContent).toContain("mytag");
  });

  it("shows tag as badge (not in body text) when moveTags is false", () => {
    const card = createTagTestCard({
      text: "Task with and more text", // tag stripped from text
      rawText: "- [ ] Task with #feature and more text",
      metadata: {
        ...createTagTestCard().metadata,
        tags: ["feature"],
      },
    });
    render(<Card card={card} columnId="col" moveTags={false} />);

    // Tag should NOT appear in body text (stripped from card.text)
    const cardText = document.querySelector(".card-text");
    expect(cardText?.textContent).not.toContain("feature");

    // Tag badge should be visible in footer
    const tagBadge = getTagBadge();
    expect(tagBadge).toBeInTheDocument();
  });
});

// ─── moveTags: true — Tags ARE stripped from body ────────────────────────────

describe("moveTags: true — Bug regression", () => {
  /**
   * Regression test for tag stripping behavior.
   *
   * When moveTags is true, tags should be STRIPPED from the card body text
   * (to prevent duplication since they appear in footer) but displayed as
   * tag badges in the footer.
   */

  it("strips tags from card body text when moveTags is true", () => {
    const card = createTagTestCard();
    render(<Card card={card} columnId="col" moveTags={true} />);

    // Tag should NOT appear in body text (stripped)
    const cardText = document.querySelector(".card-text");
    expect(cardText).toBeInTheDocument();
    // When moveTags is true, the tag should be stripped from display text
    // The body text should NOT contain "mytag" as it's stripped
    expect(cardText?.textContent?.includes("mytag")).toBe(false);
  });

  it("displays tags in footer when moveTags is true", () => {
    const card = createTagTestCard();
    render(<Card card={card} columnId="col" moveTags={true} />);

    // Tag badge should be visible in footer
    const tagBadge = getTagBadge();
    expect(tagBadge).toBeInTheDocument();
  });

  it("shows tag only in footer, not in body text, when moveTags is true", () => {
    const card = createTagTestCard({
      text: "Task with #important text",
      rawText: "- [ ] Task with #important text",
      metadata: {
        ...createTagTestCard().metadata,
        tags: ["important"],
      },
    });
    render(<Card card={card} columnId="col" moveTags={true} />);

    // Body text should NOT contain the tag
    const cardText = document.querySelector(".card-text");
    expect(cardText?.textContent?.includes("important")).toBe(false);

    // But footer tag badge should be visible
    const tagBadge = getTagBadge();
    expect(tagBadge).toBeInTheDocument();
  });
});

// ─── Tag Click Handlers — kanban and obsidian modes ─────────────────────────

describe("tag click handlers — Bug regression", () => {
  /**
   * Regression test for tag click handler functionality.
   *
   * Tags should be clickable in both kanban mode (calls onTagFilter callback)
   * and obsidian mode (posts SEARCH_TAG message to VS Code).
   */

  it("calls onTagFilter when tagAction is 'kanban'", () => {
    const mockOnTagFilter = vi.fn();
    const card = createTagTestCard();
    render(<Card card={card} columnId="col" tagAction="kanban" onTagFilter={mockOnTagFilter} />);

    // Click the tag badge (use class selector to target badge specifically)
    const tagBadge = getTagBadge();
    expect(tagBadge).toBeInTheDocument();
    fireEvent.click(tagBadge!);

    // onTagFilter should be called with the tag name
    expect(mockOnTagFilter).toHaveBeenCalledWith("mytag");
  });

  it("does not call onTagFilter when tagAction is 'obsidian'", () => {
    const mockOnTagFilter = vi.fn();
    const card = createTagTestCard();
    render(<Card card={card} columnId="col" tagAction="obsidian" onTagFilter={mockOnTagFilter} />);

    // Click the tag badge (use class selector to target badge specifically)
    const tagBadge = getTagBadge();
    expect(tagBadge).toBeInTheDocument();
    fireEvent.click(tagBadge!);

    // onTagFilter should NOT be called (obsidian mode uses postMessage)
    expect(mockOnTagFilter).not.toHaveBeenCalled();
  });

  it("tag badges have correct role and tabIndex for accessibility", () => {
    const card = createTagTestCard();
    render(<Card card={card} columnId="col" tagAction="kanban" onTagFilter={() => {}} />);

    const tagBadge = getTagBadge();
    expect(tagBadge).toBeInTheDocument();
    expect(tagBadge).toHaveAttribute("role", "button");
    expect(tagBadge).toHaveAttribute("tabIndex", "0");
  });

  it("footer tags are clickable when moveTags is true", () => {
    const mockOnTagFilter = vi.fn();
    const card = createTagTestCard();
    render(
      <Card
        card={card}
        columnId="col"
        moveTags={true}
        tagAction="kanban"
        onTagFilter={mockOnTagFilter}
      />,
    );

    // Click the footer tag badge
    const tagBadge = getTagBadge();
    expect(tagBadge).toBeInTheDocument();
    fireEvent.click(tagBadge!);

    // onTagFilter should be called with the tag name
    expect(mockOnTagFilter).toHaveBeenCalledWith("mytag");
  });

  it("multiple tags each trigger correct filter callback", () => {
    const mockOnTagFilter = vi.fn();
    const card = createTagTestCard({
      metadata: {
        ...createTagTestCard().metadata,
        tags: ["tag1", "tag2", "tag3"],
      },
    });
    render(<Card card={card} columnId="col" tagAction="kanban" onTagFilter={mockOnTagFilter} />);

    // Get all tag badges and click each one
    const tagBadges = document.querySelectorAll(".tag-badge");
    expect(tagBadges.length).toBe(3);

    // Click each tag and verify the correct tag is passed
    // Note: The tag badges contain "#tag" text, we need to click them
    fireEvent.click(tagBadges[0]);
    expect(mockOnTagFilter).toHaveBeenCalledWith("tag1");

    fireEvent.click(tagBadges[1]);
    expect(mockOnTagFilter).toHaveBeenCalledWith("tag2");

    fireEvent.click(tagBadges[2]);
    expect(mockOnTagFilter).toHaveBeenCalledWith("tag3");
  });
});
