import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "./CodeBlock.js";

/**
 * Normalizes fenced code block indentation by removing extra leading whitespace
 * from both the fence line and all content lines within the block.
 *
 * Handles cases where code blocks are indented with 5+ spaces - reduces both
 * the fence and content by the same amount to produce valid markdown.
 *
 * Example:
 *   Input:  "      ```\n      code\n      ```"
 *   Output: "```\ncode\n```"
 */
export function normalizeFencedCodeIndent(content: string): string {
  return content.replace(/^(\s*)(```[\s\S]*?```)/gm, (_match, leadingWs, block) => {
    // Combine leading whitespace + block to get the full block content
    const fullBlock = leadingWs + block;
    const fullBlockLines = fullBlock.split("\n");

    // Calculate minIndent from ALL lines including fence lines
    const minIndent = Math.min(
      ...fullBlockLines.map((line: string) => line.match(/^(\s*)/)?.[1]?.length ?? 0),
    );

    if (minIndent === 0 || minIndent === Infinity) return fullBlock;

    // Strip minIndent from all lines in the full block
    const normalizedLines = fullBlockLines.map((line: string) => {
      if (line.length >= minIndent) {
        return line.slice(minIndent);
      }
      return line;
    });

    return normalizedLines.join("\n");
  });
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onTagClick?: (tag: string) => void;
}

/**
 * Renders markdown content with GitHub Flavored Markdown support,
 * syntax highlighting for code blocks, and clickable #tags.
 */
export function MarkdownRenderer({
  content,
  className,
  onTagClick,
}: MarkdownRendererProps): React.ReactElement {
  // Normalize fenced code block indentation BEFORE any other processing
  const normalizedContent = normalizeFencedCodeIndent(content);
  // Convert #tags to markdown links, but SKIP inside fenced code blocks
  let inFencedCode = false;
  const processedContent = normalizedContent
    .split("\n")
    .map((line) => {
      // Toggle fence state when encountering fence lines
      if (line.trim().match(/^[`~]{3,}/)) {
        inFencedCode = !inFencedCode;
      }
      // Inside fenced code block: preserve #tags as-is
      if (inFencedCode) {
        return line;
      }
      // Outside: convert #tags to links
      return line.replace(/#([a-zA-Z0-9_-]+)/g, "[#$1](#$1)");
    })
    .join("\n");

  return (
    <div className={`markdown-content ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Handle wikilinks [[...]] - they come through as links with href [[...]]
          a: ({ node: _node, ...props }) => {
            const href = props.href ?? "";
            if (href.startsWith("[[") && href.endsWith("]]")) {
              const linkText = href.slice(2, -2);
              return (
                <span className="markdown-wikilink" role="button" tabIndex={0}>
                  {linkText}
                </span>
              );
            }
            // Handle tag links (#tag) - make them clickable if onTagClick provided
            if (href.startsWith("#")) {
              const tag = href.slice(1); // Remove the # prefix
              if (onTagClick) {
                return (
                  <a
                    {...props}
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTagClick(tag);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onTagClick(tag);
                      }
                    }}
                  />
                );
              }
              // No onTagClick provided - render as plain text (not a link)
              return <span className="markdown-tag">#{tag}</span>;
            }
            // Regular markdown links
            return <a {...props} target="_blank" rel="noopener noreferrer" />;
          },
          // Override pre to intercept fenced code blocks and route to CodeBlock
          pre: ({ children, ...props }) => {
            // Extract the code element from children
            const child = children as React.ReactElement<{
              className?: string;
              children?: React.ReactNode;
            }>;
            if (!child) {
              return (
                <pre {...props}>
                  <code>{children}</code>
                </pre>
              );
            }

            const codeClass = child.props.className ?? "";
            const langMatch = codeClass.match(/language-(\w*)/);
            const lang = langMatch ? langMatch[1] : undefined;

            // Get the code content as string
            const getCodeContent = (node: React.ReactNode): string => {
              if (typeof node === "string") return node;
              if (typeof node === "number") return String(node);
              if (Array.isArray(node)) return node.map(getCodeContent).join("");
              if (child.props.children) {
                if (typeof child.props.children === "string") return child.props.children;
                if (typeof child.props.children === "number") return String(child.props.children);
                return getCodeContent(child.props.children);
              }
              return "";
            };

            const code = getCodeContent(child.props.children);

            return <CodeBlock code={code} lang={lang} />;
          },
          // Style inline code (fenced code blocks are handled by the `pre` override)
          code: ({ className: codeClass, children, ...props }) => {
            const isInline = !codeClass;
            if (isInline) {
              return (
                <code className="markdown-inline-code" {...props}>
                  {children}
                </code>
              );
            }
            // This handles inline code within the pre override
            return (
              <code className={codeClass} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
