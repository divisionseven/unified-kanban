import React, { useEffect, useState } from "react";
import Prism from "prismjs";

// Import common languages
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup"; // html
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";

// ─── Language Alias Map ──────────────────────────────────────────────────────

/** Maps common language aliases to their canonical Prism language names. */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  html: "markup",
  text: "plaintext",
};

// ─── CodeBlock Component ─────────────────────────────────────────────────────

export interface CodeBlockProps {
  /** The code content to highlight. */
  code: string;
  /** The programming language (e.g., 'javascript', 'py', 'ts'). */
  lang?: string;
}

/**
 * Renders a code block with Prism.js syntax highlighting.
 *
 * Uses Prism.js with the Tomorrow Night theme (loaded via CDN in index.html).
 * Falls back to plain text rendering if language is not supported.
 */
export function CodeBlock({ code, lang }: CodeBlockProps): React.ReactElement {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    if (!lang) {
      // No language specified, render as plain text
      setHtml("");
      return;
    }

    const normalizedLang = lang.trim().toLowerCase();
    const prismLang = LANGUAGE_ALIASES[normalizedLang] || normalizedLang;
    const grammar = Prism.languages[prismLang];

    let highlightedHtml: string;

    if (grammar) {
      highlightedHtml = Prism.highlight(code.trim(), grammar, prismLang);
    } else {
      // Fallback: escape HTML and wrap in <code>
      highlightedHtml = code
        .trim()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    setHtml(highlightedHtml);
  }, [code, lang]);

  if (!html) {
    // Fallback: render as plain pre/code block
    return (
      <pre>
        <code>{code}</code>
      </pre>
    );
  }

  // Render Prism-highlighted code
  // Use normalized language for the class to match Prism's language handling
  const normalizedLang = lang?.trim().toLowerCase() || "";
  const prismLang = LANGUAGE_ALIASES[normalizedLang] || normalizedLang;

  return (
    <pre>
      <code className={`language-${prismLang}`} dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
