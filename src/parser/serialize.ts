import type { BoardState, BoardSettings, Card, Column } from "./types.js";

/**
 * Serialize a BoardState back to markdown.
 *
 * Round-trip fidelity rules (project-scope.md lines 266–274):
 * - Use rawText for unmodified cards (passthrough)
 * - Use frontmatterRaw for frontmatter (preserves --- delimiters)
 * - Use settingsRaw for settings (preserves %% markers and JSON)
 *
 * For cards that have been modified (no rawText or explicitly flagged),
 * reconstruct from structured fields.
 */
export function serialize(state: BoardState): string {
  const parts: string[] = [];

  // 1. Frontmatter block
  if (state.frontmatterRaw) {
    parts.push(state.frontmatterRaw);
  }

  // 2. rawBody passthrough (pre-heading preamble content)
  if (state.rawBody && state.rawBody.trim() !== "") {
    parts.push(state.rawBody);
  }

  // 3. Columns
  for (const column of state.columns) {
    parts.push(`## ${column.title}`);
    const content = reconstructColumnContent(column);
    if (content) {
      parts.push(content);
    }
  }

  // 4. Archive section
  if (state.archiveCards.length > 0) {
    parts.push("***");
    parts.push("## Archive");
    for (const card of state.archiveCards) {
      parts.push(card.rawText || (card.checked ? `- [x] ${card.text}` : `- [ ] ${card.text}`));
    }
  }

  // 5. Settings block
  if (state.settingsRaw) {
    parts.push(state.settingsRaw);
  } else if (state.settings) {
    parts.push(serializeSettingsBlock(state.settings));
  }

  let result = parts.join("\n");

  // Ensure trailing newline
  if (!result.endsWith("\n")) {
    result += "\n";
  }

  return result;
}

/**
 * Serialize a single card to a markdown list item.
 *
 * If rawText is available, use it for passthrough fidelity.
 * Otherwise, reconstruct from structured fields.
 */
function serializeCard(card: Card): string {
  if (card.rawText) {
    return card.rawText;
  }

  // Reconstruct from structured fields (future mutation path)
  const checkbox = card.checked ? "- [x] " : "- [ ] ";
  const lines = card.text.split("\n");
  const firstLine = lines[0] ?? "";
  const continuationLines = lines.slice(1);

  // First line gets checkbox, continuations get 2-space indent
  let result = checkbox + firstLine;
  for (const contLine of continuationLines) {
    result += "\n  " + contLine;
  }

  // Re-emit metadata markers
  for (const date of card.metadata.dueDates) {
    if (!result.includes(`@{${date}}`)) {
      result += ` @{${date}}`;
    }
  }
  for (const time of card.metadata.times) {
    if (!result.includes(`@{${time}}`)) {
      result += ` @{${time}}`;
    }
  }
  for (const tag of card.metadata.tags) {
    if (!result.includes(`#${tag}`)) {
      result += ` #${tag}`;
    }
  }
  for (const link of card.metadata.wikilinks) {
    if (!result.includes(`[[${link}]]`)) {
      result += ` [[${link}]]`;
    }
  }

  return result;
}

/**
 * Reconstruct column content by merging rawContent with current card data.
 *
 * Uses positional matching via card.lineIndex to replace card lines in
 * rawContent with current card data, preserving all non-card lines
 * (blank lines, comments, custom formatting).
 *
 * Handles:
 * - Modified cards: replaced at their original lineIndex position
 * - New cards (no lineIndex): appended before **Complete** or at end
 * - Deleted cards: orphan card lines skipped (not duplicated); non-card lines preserved
 * - Moved cards: source column orphan card line skipped, target column treated as new
 */
function reconstructColumnContent(column: Column): string {
  const rawContent = column.rawContent;

  // If rawContent is present and non-empty, do positional reconstruction
  if (rawContent && rawContent.trim() !== "") {
    const rawLines = rawContent.split("\n");

    // Build a map from lineIndex to Card for cards that have a lineIndex
    const cardByLineIndex = new Map<number, Card>();
    const newCards: Card[] = [];

    for (const card of column.cards) {
      if (card.lineIndex !== undefined) {
        cardByLineIndex.set(card.lineIndex, card);
      } else {
        newCards.push(card);
      }
    }

    // Iterate through rawContent lines, replacing card lines with current data
    const outputLines: string[] = [];
    for (let i = 0; i < rawLines.length; i++) {
      const rawLine = rawLines[i];
      const mappedCard = cardByLineIndex.get(i);

      if (mappedCard !== undefined) {
        // Card found - serialize it
        outputLines.push(serializeCard(mappedCard));

        // Skip continuation lines that are part of this card's rawText
        // A continuation line is any line that follows a card-start but is NOT:
        // - Another card-start
        // - A section header (e.g., ##, ###)
        // - A **Complete** marker
        // - An HTML comment
        // - Blank lines (they should be preserved, not skipped)
        let lookAhead = i + 1;
        let inFencedCode = false;
        while (lookAhead < rawLines.length) {
          const nextLine = rawLines[lookAhead];
          // Track fenced code blocks (both ``` and ~~~)
          if (nextLine?.trim().match(/^[`~]{3,}/)) {
            inFencedCode = !inFencedCode;
          }
          // Only break for non-card content if NOT inside a fenced code block
          if (!inFencedCode) {
            // Preserve blank lines - they're part of rawContent formatting
            if (!nextLine || nextLine.trim() === "") {
              outputLines.push(nextLine || "");
              lookAhead++;
              continue;
            }
            if (/^- \[[ x]\] /.test(nextLine)) break; // New card
            // Check for actual section headers: ##, ###, not indented tags
            if (nextLine.trim().match(/^#{1,6}\s/)) break; // ##, ###, ####, etc.
            if (nextLine.trim() === "**Complete**") break;
            if (nextLine.trim().startsWith("<!--")) break; // HTML comment
          }
          // If we're in a fenced code block, always skip (don't break)
          lookAhead++;
        }
        i = lookAhead - 1; // Adjust index (loop will increment)
      } else {
        if (rawLine === undefined) continue;
        // Skip orphan card lines (removed by move/delete operations).
        // These are lines matching the card pattern that no longer have a
        // corresponding card in column.cards. Non-card lines (blank lines,
        // comments, HTML) are preserved verbatim.
        const isOrphanCard = /^- \[[ x]\] /.test(rawLine);
        // Skip **Complete** marker when column is no longer marked complete
        const isStaleCompleteMarker = rawLine.trim() === "**Complete**" && !column.complete;
        if (!isOrphanCard && !isStaleCompleteMarker) {
          outputLines.push(rawLine);
        }
        // If it's an orphan card, we need to skip its continuation lines too
        if (isOrphanCard) {
          let lookAhead = i + 1;
          let inFencedCode = false;
          while (lookAhead < rawLines.length) {
            const nextLine = rawLines[lookAhead];
            // Track fenced code blocks (both ``` and ~~~)
            if (nextLine?.trim().match(/^[`~]{3,}/)) {
              inFencedCode = !inFencedCode;
            }
            // Only break for section headers (##, ###), not for indented tags (#tag)
            // Section headers start with # after trim AND have ## or ### prefix
            if (!inFencedCode) {
              // Blank line - skip but continue looking
              if (!nextLine || nextLine.trim() === "") {
                lookAhead++;
                continue;
              }
              if (/^- \[[ x]\] /.test(nextLine)) break;
              // Check for actual section headers: ##, ###, not indented tags
              if (nextLine.trim().match(/^#{1,6}\s/)) break; // ##, ###, ####, etc.
              if (nextLine.trim() === "**Complete**") break;
              if (nextLine.trim().startsWith("<!--")) break;
            }
            // If we're in a fenced code block, always skip (don't break)
            lookAhead++;
          }
          i = lookAhead - 1;
        }
      }
    }

    // Handle new cards (those without a lineIndex)
    if (newCards.length > 0) {
      const newCardLines = newCards.map((c) => serializeCard(c));

      // Find the **Complete** marker position if present
      const completeIdx = outputLines.findIndex((l) => l.trim() === "**Complete**");

      if (completeIdx !== -1) {
        // Insert new cards before the **Complete** marker
        outputLines.splice(completeIdx, 0, ...newCardLines);
      } else if (column.complete) {
        // **Complete** should be present but isn't — append it after new cards
        outputLines.push(...newCardLines);
        outputLines.push("**Complete**");
      } else {
        // Not complete — just append new cards at the end
        outputLines.push(...newCardLines);
      }
    } else if (column.complete) {
      // No new cards, but check if **Complete** marker is already in output
      const hasComplete = outputLines.some((l) => l.trim() === "**Complete**");
      if (!hasComplete) {
        outputLines.push("**Complete**");
      }
    }

    return outputLines.join("\n");
  }

  // If rawContent is empty, fall back to structured-only serialization
  const parts: string[] = [];

  if (column.complete) {
    parts.push("**Complete**");
  }

  for (const card of column.cards) {
    parts.push(serializeCard(card));
  }

  return parts.join("\n");
}

/**
 * Serialize a BoardSettings object into a `%% kanban:settings ... %%` block.
 *
 * Used when no settings block existed before (settingsRaw is null)
 * but one needs to be created from a settings object.
 */
export function serializeSettingsBlock(settings: BoardSettings): string {
  const json = JSON.stringify(settings);
  return `%% kanban:settings\n${json}\n%%`;
}
