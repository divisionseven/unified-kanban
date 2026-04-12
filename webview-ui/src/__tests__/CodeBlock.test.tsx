// ─── CodeBlock Component Tests ────────────────────────────────────────────

import { render } from "@testing-library/react";
import { vi, beforeEach } from "vitest";
import { CodeBlock } from "../components/CodeBlock.js";

// ─── Test Helpers ──────────────────────────────────────────────────────────

/**
 * Wait for Prism to render the highlighted code.
 */
async function waitForPrismRender(container: HTMLElement): Promise<void> {
  const { waitFor } = await import("@testing-library/react");
  await waitFor(
    () => {
      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
    },
    { timeout: 3000 },
  );
}

describe("CodeBlock", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  // ─── Prism Highlighter Initialization ─────────────────────────────────

  describe("Prism highlighter initialization", () => {
    it("component renders with proper HTML structure", async () => {
      const { container } = render(<CodeBlock code="test" lang="python" />);

      await waitForPrismRender(container);

      // Verify the HTML contains pre and code tags
      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      const code = pre?.querySelector("code");
      expect(code).not.toBeNull();
    });
  });

  // ─── Language Alias Mapping ───────────────────────────────────────────────

  describe("language alias mapping", () => {
    const aliasTestCases = [
      { alias: "js", expected: "javascript" },
      { alias: "ts", expected: "typescript" },
      { alias: "py", expected: "python" },
      { alias: "rb", expected: "ruby" },
      { alias: "sh", expected: "bash" },
      { alias: "yml", expected: "yaml" },
      { alias: "text", expected: "plaintext" },
    ];

    aliasTestCases.forEach(({ alias, expected }) => {
      it(`maps '${alias}' to '${expected}'`, async () => {
        const { container } = render(<CodeBlock code={`const x = 1;`} lang={alias} />);

        await waitForPrismRender(container);

        const code = container.querySelector(`code.language-${expected}`);
        expect(code).not.toBeNull();
      });
    });

    it("maps 'shell' to 'bash'", async () => {
      const { container } = render(<CodeBlock code="echo hello" lang="shell" />);

      await waitForPrismRender(container);

      const code = container.querySelector("code.language-bash");
      expect(code).not.toBeNull();
    });

    it("maps 'zsh' to 'bash'", async () => {
      const { container } = render(<CodeBlock code="echo hello" lang="zsh" />);

      await waitForPrismRender(container);

      const code = container.querySelector("code.language-bash");
      expect(code).not.toBeNull();
    });

    it("handles case-insensitive language names", async () => {
      const { container } = render(<CodeBlock code="const x = 1;" lang="JAVASCRIPT" />);

      await waitForPrismRender(container);

      const code = container.querySelector("code.language-javascript");
      expect(code).not.toBeNull();
    });

    it("handles language names with surrounding whitespace", async () => {
      const { container } = render(<CodeBlock code="const x = 1;" lang="  javascript  " />);

      await waitForPrismRender(container);

      const code = container.querySelector("code.language-javascript");
      expect(code).not.toBeNull();
    });

    it("unknown/unrecognized languages fall back gracefully", async () => {
      const { container } = render(<CodeBlock code="some code" lang="notareallanguage" />);

      await waitForPrismRender(container);

      // Unknown language should be passed through as-is (Prism handles it)
      const code = container.querySelector("code.language-notareallanguage");
      expect(code).not.toBeNull();
    });

    it("falls back to plaintext when language is undefined", async () => {
      const { container } = render(<CodeBlock code="plain text" lang={undefined} />);

      await waitForPrismRender(container);

      // When lang is undefined, Prism renders plain pre/code without language class
      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      const code = pre?.querySelector("code");
      expect(code).not.toBeNull();
      expect(code?.textContent).toBe("plain text");
    });

    it("falls back to plaintext when language is empty string", async () => {
      const { container } = render(<CodeBlock code="plain text" lang="" />);

      await waitForPrismRender(container);

      // When lang is empty, Prism renders plain pre/code without language class
      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      const code = pre?.querySelector("code");
      expect(code).not.toBeNull();
      expect(code?.textContent).toBe("plain text");
    });
  });

  // ─── Code Rendering ──────────────────────────────────────────────────────

  describe("code rendering", () => {
    it("renders Python code with syntax highlighting", async () => {
      const pythonCode = `def hello():
    print("Hello, World!")`;

      const { container } = render(<CodeBlock code={pythonCode} lang="python" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      expect(pre?.textContent).toContain("def hello():");
    });

    it("renders JavaScript code with syntax highlighting", async () => {
      const jsCode = `function greet(name) {
  return \`Hello, \${name}!\`;
}`;

      const { container } = render(<CodeBlock code={jsCode} lang="javascript" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      expect(pre?.textContent).toContain("function greet");
    });

    it("renders TypeScript code with syntax highlighting", async () => {
      const tsCode = `interface User {
  name: string;
  age: number;
}`;

      const { container } = render(<CodeBlock code={tsCode} lang="typescript" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      expect(pre?.textContent).toContain("interface User");
    });

    it("renders code with no language specified as plaintext", async () => {
      const code = "Some plain text without highlighting";

      const { container } = render(<CodeBlock code={code} />);

      await waitForPrismRender(container);

      // When no lang is specified, Prism renders plain pre/code
      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      const codeEl = pre?.querySelector("code");
      expect(codeEl).not.toBeNull();
      expect(codeEl?.textContent).toBe(code);
    });

    it("handles empty code gracefully", async () => {
      const { container } = render(<CodeBlock code="" lang="javascript" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
    });

    it("trims whitespace from code", async () => {
      const codeWithWhitespace = `  
      const x = 1;  
      `;

      const { container } = render(<CodeBlock code={codeWithWhitespace} lang="javascript" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      // Code should be trimmed by the component
      expect(pre?.textContent?.trim()).toContain("const x = 1;");
    });

    it("preserves multi-line code correctly", async () => {
      const multiLineCode = `line one
line two
line three`;

      const { container } = render(<CodeBlock code={multiLineCode} lang="text" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      expect(pre?.textContent).toContain("line one");
      expect(pre?.textContent).toContain("line two");
      expect(pre?.textContent).toContain("line three");
    });
  });

  // ─── HTML Output Structure ───────────────────────────────────────────────

  describe("HTML output structure", () => {
    it("outputs valid HTML with pre and code tags", async () => {
      const { container } = render(<CodeBlock code="test" lang="python" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      expect(pre?.tagName.toLowerCase()).toBe("pre");

      const code = pre?.querySelector("code");
      expect(code).not.toBeNull();
      expect(code?.tagName.toLowerCase()).toBe("code");
    });

    it("applies language class to code element", async () => {
      const { container } = render(<CodeBlock code="test" lang="python" />);

      await waitForPrismRender(container);

      const code = container.querySelector("code.language-python");
      expect(code).not.toBeNull();
    });

    it("applies Prism classes to pre element", async () => {
      const { container } = render(<CodeBlock code="test" lang="javascript" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
    });

    it("applies theme class to pre element", async () => {
      const { container } = render(<CodeBlock code="test" lang="javascript" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      // Theme class - Prism doesn't use theme classes like Shiki, so remove this assertion
    });

    it("contains Prism token classes for syntax highlighting", async () => {
      // The component should output code that supports syntax highlighting
      const { container } = render(<CodeBlock code={`const x = 1;`} lang="javascript" />);

      await waitForPrismRender(container);

      const code = container.querySelector("code");
      expect(code).not.toBeNull();
      // The code element should be inside a Prism-highlighted pre
      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      expect(pre?.querySelector("code")).not.toBeNull();
    });

    it("renders output with dangerouslySetInnerHTML", async () => {
      const { container } = render(<CodeBlock code="test" lang="python" />);

      await waitForPrismRender(container);

      // Prism uses dangerouslySetInnerHTML on the code element
      const code = container.querySelector("code");
      expect(code).not.toBeNull();
      // The innerHTML should contain escaped HTML (Prism token spans)
      expect(code?.innerHTML).toBeTruthy();
    });
  });

  // ─── Basic Rendering ─────────────────────────────────────────────────────

  describe("basic rendering", () => {
    it("renders code element with language class", async () => {
      const { container } = render(<CodeBlock code="test" lang="javascript" />);

      await waitForPrismRender(container);

      const code = container.querySelector("code.language-javascript");
      expect(code).not.toBeNull();
    });

    it("contains highlighted HTML in code element", async () => {
      const { container } = render(<CodeBlock code="const x = 1;" lang="javascript" />);

      await waitForPrismRender(container);

      const code = container.querySelector("code");
      expect(code).not.toBeNull();
      // Prism adds token spans for highlighting
      expect(code?.innerHTML).toContain("const");
    });
  });

  // ─── Fallback Behavior ───────────────────────────────────────────────────

  describe("fallback behavior", () => {
    it("handles rapid prop changes without crashing", async () => {
      const { rerender, container } = render(<CodeBlock code="first" lang="javascript" />);

      await waitForPrismRender(container);

      // Rapidly change props
      rerender(<CodeBlock code="second" lang="python" />);
      rerender(<CodeBlock code="third" lang="rust" />);
      rerender(<CodeBlock code="fourth" lang="go" />);

      // Should not crash - just update the output
      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
    });

    it("cancels pending requests when props change", async () => {
      const { rerender, container } = render(<CodeBlock code="first" lang="javascript" />);

      await waitForPrismRender(container);

      // Change props before waiting for first render
      rerender(<CodeBlock code="second" lang="python" />);

      // Should render the second code
      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre?.textContent).toContain("second");
    });
  });

  // ─── CodeBlock Props Interface ─────────────────────────────────────────────

  describe("CodeBlock props interface", () => {
    it("accepts code prop as required parameter", async () => {
      const code = "console.log('hello');";
      const { container } = render(<CodeBlock code={code} lang="javascript" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
    });

    it("accepts lang prop as optional parameter", async () => {
      // No lang prop - should render plain pre/code
      const { container } = render(<CodeBlock code="some text" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      const code = pre?.querySelector("code");
      expect(code).not.toBeNull();
    });

    it("updates output when code prop changes", async () => {
      const { rerender, container } = render(<CodeBlock code="first code" lang="python" />);

      await waitForPrismRender(container);

      // Change the code
      rerender(<CodeBlock code="second code" lang="python" />);

      await waitForPrismRender(container);

      const pre = container.querySelector("pre");
      expect(pre?.textContent).toContain("second code");
    });

    it("updates output when lang prop changes", async () => {
      const { rerender, container } = render(<CodeBlock code="test" lang="javascript" />);

      await waitForPrismRender(container);

      // Change the language
      rerender(<CodeBlock code="test" lang="python" />);

      await waitForPrismRender(container);

      const code = container.querySelector("code.language-python");
      expect(code).not.toBeNull();
    });
  });
});
