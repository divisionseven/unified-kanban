// ─── Code Block Rendering Test ───────────────────────────────────────────

import { render } from "@testing-library/react";
import { MarkdownRenderer } from "../components/MarkdownRenderer.js";

// ─── Code Block End-to-End Test ─────────────────────────────────────────
describe("MarkdownRenderer — code blocks", () => {
  it("renders fenced code blocks with proper <pre><code> structure", () => {
    // IMPORTANT: Fenced code blocks require a newline after the opening fence
    // and the content must be on separate lines from the fence markers
    const content = `Card with code block
\`\`\`
function hello() {
  return "world";
}
\`\`\`
more text`;

    const { container } = render(<MarkdownRenderer content={content} />);

    // Check for pre element
    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();

    // Check for code element inside pre
    const code = pre?.querySelector("code");
    expect(code).not.toBeNull();

    // Get the inner text of the code block
    const codeText = code?.textContent ?? "";

    // Verify the code content is preserved
    expect(codeText).toContain("function hello()");
    expect(codeText).toContain('return "world"');
  });

  it("renders properly formatted fenced code block", () => {
    // Proper fenced code block - opening fence on its own line
    const content = `Start
\`\`\`
function hello() {
  return "world";
}
\`\`\`
End`;

    const { container } = render(<MarkdownRenderer content={content} />);

    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
  });

  it("renders inline code correctly", () => {
    const content = "This is `inline code` in text";

    const { container } = render(<MarkdownRenderer content={content} />);

    // Inline code should be rendered as <code> without <pre>
    const codeElements = container.querySelectorAll("code");
    expect(codeElements.length).toBeGreaterThan(0);

    const inlineCode = container.querySelector(".markdown-inline-code");
    expect(inlineCode).not.toBeNull();
    expect(inlineCode?.textContent).toBe("inline code");
  });

  it("preserves backticks in content before markdown processing", () => {
    // Test that the backticks themselves aren't being stripped by any preprocessing
    const content = "Text with \`\`\`three backticks\`\`\`";

    const { container } = render(<MarkdownRenderer content={content} />);

    // The content should contain a code element
    const codeElements = container.querySelectorAll("code");
    expect(codeElements.length).toBeGreaterThan(0);
  });
});
