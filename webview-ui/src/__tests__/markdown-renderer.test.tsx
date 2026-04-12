// ─── MarkdownRenderer Component Tests ───────────────────────────────────────

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { MarkdownRenderer, normalizeFencedCodeIndent } from "../components/MarkdownRenderer.js";

// Helper to wait for async rendering (e.g., Prism syntax highlighting)
async function waitForMarkdownRender(container: HTMLElement): Promise<void> {
  await waitFor(
    () => {
      // Just ensure the container is rendered
      expect(container.querySelector(".markdown-content")).not.toBeNull();
    },
    { timeout: 3000 },
  );
}

// ─── normalizeFencedCodeIndent Tests ─────────────────────────────────────

describe("normalizeFencedCodeIndent", () => {
  it("returns unchanged content with no fenced code blocks", () => {
    const input = "This is regular text\nwith multiple lines";
    expect(normalizeFencedCodeIndent(input)).toBe(input);
  });

  it("does not modify fenced code blocks with no indentation", () => {
    const input = "```javascript\nconst x = 1;\n```";
    const result = normalizeFencedCodeIndent(input);
    expect(result).toBe("```javascript\nconst x = 1;\n```");
  });

  it("removes leading indentation from fenced code blocks (5 spaces)", () => {
    const input = "     ```javascript\n     const x = 1;\n     ```";
    const result = normalizeFencedCodeIndent(input);
    expect(result).toBe("```javascript\nconst x = 1;\n```");
  });

  it("removes leading indentation from fenced code blocks (3 spaces)", () => {
    const input = "   ```python\n   print('hello')\n   ```";
    const result = normalizeFencedCodeIndent(input);
    expect(result).toBe("```python\nprint('hello')\n```");
  });

  it("handles empty content gracefully", () => {
    expect(normalizeFencedCodeIndent("")).toBe("");
  });

  it("handles content with only whitespace", () => {
    const input = "   \n   \n   ";
    expect(normalizeFencedCodeIndent(input)).toBe(input);
  });

  it("handles tilde fence fences", () => {
    const input = "~~~javascript\ncode\n~~~";
    const result = normalizeFencedCodeIndent(input);
    expect(result).toBe(input);
  });
});

// ─── MarkdownRenderer Basic Rendering ───────────────────────────────

describe("MarkdownRenderer — basic rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders in a div with markdown-content class", () => {
    render(<MarkdownRenderer content="Hello world" />);
    const container = document.querySelector(".markdown-content");
    expect(container).not.toBeNull();
  });

  it("accepts and applies className prop", () => {
    render(<MarkdownRenderer content="Test" className="custom-class" />);
    const container = document.querySelector(".markdown-content.custom-class");
    expect(container).not.toBeNull();
  });

  it("handles empty string content", () => {
    render(<MarkdownRenderer content="" />);
    const container = document.querySelector(".markdown-content");
    expect(container).not.toBeNull();
  });

  it("handles whitespace-only content", () => {
    render(<MarkdownRenderer content="   \n\n   " />);
    const container = document.querySelector(".markdown-content");
    expect(container).not.toBeNull();
  });
});

// ─── MarkdownRenderer Headings ─────────────────────────────

describe("MarkdownRenderer — headings", () => {
  it("renders h1 headings", () => {
    render(<MarkdownRenderer content="# Heading 1" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Heading 1")).toBeInTheDocument();
  });

  it("renders h2 headings", () => {
    render(<MarkdownRenderer content="## Heading 2" />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("renders h3 headings", () => {
    render(<MarkdownRenderer content="### Heading 3" />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("renders atx-style h4 headings", () => {
    render(<MarkdownRenderer content="#### H4" />);
    expect(screen.getByText("H4")).toBeInTheDocument();
  });
});

// ─── MarkdownRenderer Text Formatting ─────────────────────────────

describe("MarkdownRenderer — text formatting", () => {
  it("renders bold text with **double asterisks**", () => {
    render(<MarkdownRenderer content="**bold text**" />);
    const bold = document.querySelector("strong");
    expect(bold).not.toBeNull();
    expect(bold?.textContent).toBe("bold text");
  });

  it("renders bold text with __double underscores__", () => {
    render(<MarkdownRenderer content="__bold text__" />);
    const bold = document.querySelector("strong");
    expect(bold).not.toBeNull();
  });

  it("renders italic text with *single asterisks*", () => {
    render(<MarkdownRenderer content="*italic text*" />);
    const italic = document.querySelector("em");
    expect(italic).not.toBeNull();
    expect(italic?.textContent).toBe("italic text");
  });

  it("renders italic text with _single underscores_", () => {
    render(<MarkdownRenderer content="_italic text_" />);
    const italic = document.querySelector("em");
    expect(italic).not.toBeNull();
  });

  it("renders bold and italic combined", () => {
    render(<MarkdownRenderer content="***bold and italic***" />);
    const boldItalic = document.querySelector("strong em") || document.querySelector("em strong");
    expect(boldItalic).not.toBeNull();
  });

  it("renders strikethrough text", () => {
    render(<MarkdownRenderer content="~~strikethrough~~" />);
    const del = document.querySelector("del");
    expect(del).not.toBeNull();
    expect(del?.textContent).toBe("strikethrough");
  });

  it("renders inline code with backticks", () => {
    render(<MarkdownRenderer content="`inline code`" />);
    const code = document.querySelector(".markdown-inline-code");
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe("inline code");
  });

  it("renders multiple inline code blocks", () => {
    render(<MarkdownRenderer content="Use `const x = 1` and `console.log()`" />);
    const codes = document.querySelectorAll(".markdown-inline-code");
    expect(codes).toHaveLength(2);
  });
});

// ─── MarkdownRenderer Lists ─────────────────────────────────

describe("MarkdownRenderer — lists", () => {
  it("renders unordered lists with -", () => {
    render(<MarkdownRenderer content="- Item 1\n- Item 2\n- Item 3" />);
    const ul = document.querySelector("ul");
    expect(ul).not.toBeNull();
  });

  it("renders unordered lists with *", () => {
    render(<MarkdownRenderer content="* Item A\n* Item B" />);
    const ul = document.querySelector("ul");
    expect(ul).not.toBeNull();
  });

  it("renders unordered lists with +", () => {
    render(<MarkdownRenderer content="+ First\n+ Second" />);
    const ul = document.querySelector("ul");
    expect(ul).not.toBeNull();
  });

  it("renders ordered lists", () => {
    render(<MarkdownRenderer content="1. First item\n2. Second item\n3. Third item" />);
    const ol = document.querySelector("ol");
    expect(ol).not.toBeNull();
  });

  it("renders checkbox lists (task lists)", () => {
    render(<MarkdownRenderer content="- [ ] Unchecked" />);
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
  });
});

// ─── MarkdownRenderer Links ───────────────────────────────────────

describe("MarkdownRenderer — links", () => {
  it("renders standard markdown links", () => {
    render(<MarkdownRenderer content="[Link text](https://example.com)" />);
    const link = screen.getByRole("link", { name: /Link text/ });
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("opens external links in new tab with security attributes", () => {
    render(<MarkdownRenderer content="[External](https://example.com)" />);
    const link = screen.getByRole("link", { name: /External/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders link with title attribute", () => {
    render(<MarkdownRenderer content='[Link](https://example.com "Title")' />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("title", "Title");
  });

  it("renders multiple links", () => {
    render(<MarkdownRenderer content="[First](url1) and [Second](url2)" />);
    const links = document.querySelectorAll("a");
    expect(links).toHaveLength(2);
  });
});

// ─── MarkdownRenderer Blockquotes ─────────────────────────────

describe("MarkdownRenderer — blockquotes", () => {
  it("renders blockquotes with >", () => {
    render(<MarkdownRenderer content="> This is a quote" />);
    const blockquote = document.querySelector("blockquote");
    expect(blockquote).not.toBeNull();
    expect(blockquote?.textContent).toContain("This is a quote");
  });

  it("renders nested blockquotes", () => {
    render(<MarkdownRenderer content="> Outer\n> > Inner quote" />);
    const blockquotes = document.querySelectorAll("blockquote");
    expect(blockquotes.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── MarkdownRenderer Tags (#tag) ────────────────────────────

describe("MarkdownRenderer — tags (#tag)", () => {
  it("converts #tag to clickable element when onTagClick provided", () => {
    const onTagClick = vi.fn();
    render(<MarkdownRenderer content="#important" onTagClick={onTagClick} />);
    // Tags render as <a> with role="button"
    const button = screen.getByRole("button", { name: "#important" });
    expect(button).not.toBeNull();
  });

  it("calls onTagClick when tag is clicked", () => {
    const onTagClick = vi.fn();
    render(<MarkdownRenderer content="#mytag" onTagClick={onTagClick} />);
    fireEvent.click(screen.getByRole("button", { name: /#mytag/ }));
    expect(onTagClick).toHaveBeenCalledWith("mytag");
  });

  it("calls onTagClick when tag is activated via keyboard", () => {
    const onTagClick = vi.fn();
    render(<MarkdownRenderer content="#keytag" onTagClick={onTagClick} />);
    const button = screen.getByRole("button", { name: /#keytag/ });
    fireEvent.keyDown(button, { key: "Enter" });
    expect(onTagClick).toHaveBeenCalledWith("keytag");
  });

  it("calls onTagClick on space key", () => {
    const onTagClick = vi.fn();
    render(<MarkdownRenderer content="#spacetag" onTagClick={onTagClick} />);
    const button = screen.getByRole("button", { name: /#spacetag/ });
    fireEvent.keyDown(button, { key: " " });
    expect(onTagClick).toHaveBeenCalledWith("spacetag");
  });

  it("renders #tag as plain text when onTagClick not provided", () => {
    render(<MarkdownRenderer content="#notextag" />);
    const span = document.querySelector(".markdown-tag");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("#notextag");
  });

  it("renders multiple tags in content", () => {
    const onTagClick = vi.fn();
    render(<MarkdownRenderer content="#tag1 and #tag2" onTagClick={onTagClick} />);
    // All tags should be rendered as buttons
    const buttons = document.querySelectorAll('a[href^="#"]');
    expect(buttons).toHaveLength(2);
  });

  it("renders code block content", async () => {
    const { container } = render(
      <MarkdownRenderer content="```javascript\n// comment\nconst x = 1;\n```" />,
    );
    await waitForMarkdownRender(container);
    // Ensure no crash - container should still render
    expect(container.querySelector(".markdown-content")).not.toBeNull();
  });
});

// ─── MarkdownRenderer Complex Content ─────────────────────

describe("MarkdownRenderer — complex content", () => {
  it("renders mixed formatting", () => {
    render(<MarkdownRenderer content="# Title\n\n**Bold** and *italic*" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(document.querySelector("strong")).not.toBeNull();
    expect(document.querySelector("em")).not.toBeNull();
  });

  it("renders heading and list", () => {
    const { container } = render(
      <MarkdownRenderer
        content={`# Main Title

### List

- Item 1
- Item 2`}
      />,
    );
    expect(screen.getAllByRole("heading").length).toBeGreaterThanOrEqual(1);
    expect(document.querySelector("ul")).not.toBeNull();
  });

  it("escapes HTML entities in content", () => {
    render(<MarkdownRenderer content="Use <script>alert('x')</script>" />);
    const div = document.querySelector(".markdown-content");
    // The HTML should be escaped
    expect(div?.innerHTML).toContain("&lt;script&gt;");
  });
});

// ─── MarkdownRenderer Edge Cases ────────────────────────────

describe("MarkdownRenderer — edge cases", () => {
  it("handles deeply nested lists", () => {
    render(
      <MarkdownRenderer
        content={`- Level 1
  - Level 2
    - Level 3
      - Level 4`}
      />,
    );
    const ul = document.querySelector("ul");
    expect(ul).not.toBeNull();
  });

  it("handles very long lines", () => {
    const longLine = "word ".repeat(500);
    render(<MarkdownRenderer content={longLine} />);
    const div = document.querySelector(".markdown-content");
    expect(div?.textContent?.length).toBeGreaterThan(0);
  });

  it("handles special characters in code", async () => {
    const { container } = render(
      <MarkdownRenderer content={'```\nconst obj = { key: "value" };\n```'} />,
    );
    await waitForMarkdownRender(container);
    const pre = document.querySelector("pre");
    expect(pre).not.toBeNull();
  });

  it("handles Unicode content", () => {
    render(<MarkdownRenderer content="# 标题\n内容 with émojis 🎉" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("handles malformed markdown gracefully", () => {
    render(<MarkdownRenderer content="[link with no url]\n**unclosed bold" />);
    const div = document.querySelector(".markdown-content");
    expect(div).not.toBeNull();
  });

  it("handles numbers in tags", () => {
    const onTagClick = vi.fn();
    render(<MarkdownRenderer content="#tag123" onTagClick={onTagClick} />);
    const button = screen.getByRole("button", { name: "#tag123" });
    expect(button).not.toBeNull();
  });

  it("handles tags with underscores", () => {
    const onTagClick = vi.fn();
    render(<MarkdownRenderer content="#tag_with_underscore" onTagClick={onTagClick} />);
    const button = screen.getByRole("button", { name: /#tag_with_underscore/ });
    expect(button).not.toBeNull();
  });

  it("handles tags with hyphens", () => {
    const onTagClick = vi.fn();
    render(<MarkdownRenderer content="#tag-with-hyphen" onTagClick={onTagClick} />);
    const button = screen.getByRole("button", { name: /#tag-with-hyphen/ });
    expect(button).not.toBeNull();
  });
});

// ─── MarkdownRenderer Props ─────────────────────────────────

describe("MarkdownRenderer — props interface", () => {
  it("accepts content prop as required parameter", () => {
    render(<MarkdownRenderer content="Required content" />);
    expect(screen.getByText("Required content")).toBeInTheDocument();
  });

  it("updates output when content prop changes", () => {
    const { rerender } = render(<MarkdownRenderer content="First" />);
    expect(screen.getByText("First")).toBeInTheDocument();

    rerender(<MarkdownRenderer content="Second" />);
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("updates when className prop changes", () => {
    const { rerender, container } = render(
      <MarkdownRenderer content="Test" className="class-one" />,
    );
    expect(container.querySelector(".class-one")).not.toBeNull();

    rerender(<MarkdownRenderer content="Test" className="class-two" />);
    expect(container.querySelector(".class-one")).toBeNull();
    expect(container.querySelector(".class-two")).not.toBeNull();
  });

  it("handles undefined className gracefully", () => {
    render(<MarkdownRenderer content="Test" className={undefined} />);
    const container = document.querySelector(".markdown-content");
    expect(container).toHaveClass("markdown-content");
  });

  it("allows dynamic onTagClick callback updates", () => {
    const onTagClick1 = vi.fn();
    const onTagClick2 = vi.fn();

    const { rerender } = render(<MarkdownRenderer content="#tag" onTagClick={onTagClick1} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onTagClick1).toHaveBeenCalledWith("tag");

    // Update the callback
    rerender(<MarkdownRenderer content="#tag" onTagClick={onTagClick2} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onTagClick2).toHaveBeenCalledWith("tag");
  });
});

// ─── MarkdownRenderer Regression Tests ──────────────────────────

describe("MarkdownRenderer — regression tests", () => {
  it("normalizes indented fenced code blocks before processing", async () => {
    const { container } = render(
      <MarkdownRenderer
        content={`      \`\`\`javascript
      const x = 1;
      \`\`\``}
      />,
    );
    await waitForMarkdownRender(container);
    const pre = document.querySelector("pre");
    expect(pre).not.toBeNull();
  });
});
