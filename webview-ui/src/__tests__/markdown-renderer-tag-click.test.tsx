// ─── MarkdownRenderer Tag Click Coverage Test ────────────────────────────────

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MarkdownRenderer } from "../components/MarkdownRenderer.js";

describe("MarkdownRenderer — onTagClick callback coverage", () => {
  // Lines 95-120: Tests the branch where onTagClick is provided
  it("calls onTagClick when tag link is clicked", () => {
    const onTagClick = vi.fn();
    render(<MarkdownRenderer content="#mytag" onTagClick={onTagClick} />);

    const tagLink = document.querySelector('a[href="#mytag"]');
    expect(tagLink).toBeInTheDocument();

    fireEvent.click(tagLink!);
    expect(onTagClick).toHaveBeenCalledWith("mytag");
  });

  // Lines 109-114: Tests keyboard handler on tag link
  it("calls onTagClick when tag link is activated via keyboard", () => {
    const onTagClick = vi.fn();
    render(<MarkdownRenderer content="#mytag" onTagClick={onTagClick} />);

    const tagLink = document.querySelector('a[href="#mytag"]') as HTMLElement;

    fireEvent.keyDown(tagLink, { key: "Enter" });
    expect(onTagClick).toHaveBeenCalledWith("mytag");

    fireEvent.keyDown(tagLink, { key: " " });
    expect(onTagClick).toHaveBeenCalledTimes(2);
  });
});
