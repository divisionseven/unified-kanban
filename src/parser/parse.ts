import { fromMarkdown } from "mdast-util-from-markdown";
import type { Root, Heading, Nodes } from "mdast";
import { visit } from "unist-util-visit";
import type { BoardState, BoardSettings, Card, CardMetadata, Column } from "./types.js";

/**
 * Simple deterministic string hash (djb2 algorithm).
 * Used for card IDs — same input always produces same output.
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Slugify a string: lowercase, replace non-alphanumeric with hyphens.
 * Used for column IDs.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extract YAML frontmatter from the beginning of a markdown string.
 * Returns the content between --- delimiters and the remaining body.
 */
export function extractFrontmatter(input: string): {
  frontmatter: string;
  frontmatterRaw: string;
  body: string;
} {
  const match = input.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return { frontmatter: "", frontmatterRaw: "", body: input };
  }
  const fullMatch = match[0];
  const frontmatter = match[1] ?? "";
  const body = input.slice(fullMatch.length);
  // Reconstruct frontmatterRaw with the --- delimiters
  const frontmatterRaw = fullMatch;
  return { frontmatter, frontmatterRaw, body };
}

/**
 * Set of all known setting keys from the Obsidian Kanban format.
 * Used by extractFrontmatterSettings to identify which YAML keys
 * are board settings vs. unrelated frontmatter metadata.
 */
const settingKeyLookup: Set<string> = new Set([
  "kanban-plugin",
  "append-archive-date",
  "archive-date-format",
  "archive-date-separator",
  "archive-with-date",
  "date-display-format",
  "date-format",
  "date-picker-week-start",
  "date-time-display-format",
  "date-trigger",
  "full-list-lane-width",
  "hide-card-count",
  "inline-metadata-position",
  "lane-width",
  "max-archive-size",
  "move-dates",
  "move-tags",
  "move-task-metadata",
  "new-card-insertion-method",
  "new-line-trigger",
  "new-note-folder",
  "new-note-template",
  "show-add-list",
  "show-archive-all",
  "show-board-settings",
  "show-checkboxes",
  "show-relative-date",
  "show-search",
  "show-set-view",
  "show-view-as-markdown",
  "tag-action",
  "tag-sort",
  "time-format",
  "time-trigger",
  "cssclasses",
  "cssclass",
]);

/**
 * Extract kanban settings from YAML frontmatter content.
 */
export function extractFrontmatterSettings(frontmatter: string): Partial<BoardSettings> {
  const settings: Record<string, unknown> = {};
  if (!frontmatter.trim()) return settings;

  const lines = frontmatter.split("\n");
  for (const line of lines) {
    const match = line.match(/^([a-z-]+):\s*(.+)$/);
    if (!match) continue;

    const key = match[1];
    const rawValue = match[2];

    if (!key || !rawValue || !settingKeyLookup.has(key)) continue;

    if (rawValue === "true") {
      settings[key] = true;
    } else if (rawValue === "false") {
      settings[key] = false;
    } else if (/^\d+$/.test(rawValue)) {
      settings[key] = parseInt(rawValue, 10);
    } else {
      settings[key] = rawValue;
    }
  }

  return settings as Partial<BoardSettings>;
}

/**
 * Extract cssclasses/cssclass from YAML frontmatter.
 */
export function extractCssClasses(frontmatter: string): string[] {
  const classes: string[] = [];
  if (!frontmatter.trim()) return classes;

  const lines = frontmatter.split("\n");
  let inCssClassesList = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === "cssclasses:") {
      inCssClassesList = true;
      continue;
    }

    if (inCssClassesList) {
      const listItemMatch = trimmedLine.match(/^-\s*(.+)$/);
      if (listItemMatch?.[1]) {
        const className = listItemMatch[1].trim().replace(/^["']|["']$/g, "");
        if (className) {
          classes.push(className);
        }
        continue;
      }
      if (trimmedLine && !trimmedLine.startsWith("-") && !trimmedLine.startsWith("  ")) {
        inCssClassesList = false;
      }
    }

    const arrayMatch = trimmedLine.match(/^cssclasses:\s*\[(.*)\]$/);
    if (arrayMatch?.[1]) {
      const arrayContent = arrayMatch[1];
      if (arrayContent.trim()) {
        const items = arrayContent.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
        classes.push(...items.filter(Boolean));
      }
      continue;
    }

    const singleMatch = trimmedLine.match(/^cssclass:\s*(.+)$/);
    if (singleMatch?.[1]) {
      const className = singleMatch[1].trim().replace(/^["']|["']$/g, "");
      if (className) {
        classes.push(className);
      }
    }
  }

  return classes;
}

/**
 * Extract the `%% kanban:settings ... %%` block from the end of a document.
 */
export function extractSettings(body: string): {
  settings: BoardSettings | null;
  settingsRaw: string | null;
  bodyWithoutSettings: string;
} {
  const settingsRegex = /\n%% kanban:settings\n([\s\S]*?)\n%%\s*$/;
  const match = body.match(settingsRegex);

  if (!match) {
    return { settings: null, settingsRaw: null, bodyWithoutSettings: body };
  }

  const fullBlock = match[0].trimStart();
  const innerContent = match[1] ?? "";

  let jsonStr = innerContent.trim();
  if (jsonStr.startsWith("```") && jsonStr.endsWith("```")) {
    jsonStr = jsonStr
      .replace(/^```\w*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
  }

  let settings: BoardSettings | null = null;
  try {
    settings = JSON.parse(jsonStr) as BoardSettings;
  } catch {
    settings = null;
  }

  const bodyWithoutSettings = body.slice(0, body.length - fullBlock.length);

  return {
    settings,
    settingsRaw: `%% kanban:settings\n${innerContent}\n%%`,
    bodyWithoutSettings,
  };
}

/**
 * Extract the archive section from the body content.
 */
export function extractArchive(body: string): {
  archiveCards: Card[];
  archiveRawContent: string;
  bodyWithoutArchive: string;
} {
  const archiveRegex = /\n\*\*\*\n+## Archive\n([\s\S]*)$/;
  const match = body.match(archiveRegex);

  if (!match) {
    return {
      archiveCards: [],
      archiveRawContent: "",
      bodyWithoutArchive: body,
    };
  }

  const archiveContent = match[1] ?? "";
  const fullMatch = match[0];

  const archiveCards: Card[] = [];
  const archiveLines = archiveContent.split("\n");
  for (const line of archiveLines) {
    const cardMatch = line.match(/^- \[([ x])\] (.*)$/);
    if (cardMatch) {
      archiveCards.push(parseCard(line));
    }
  }

  const archiveRawContent = `***\n## Archive\n${archiveContent}`;
  const bodyWithoutArchive = body.slice(0, body.length - fullMatch.length);

  return {
    archiveCards,
    archiveRawContent,
    bodyWithoutArchive,
  };
}

/**
 * Extract metadata from card text.
 */
export function extractMetadata(text: string): CardMetadata {
  const metadata: CardMetadata = {
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
  };

  let match: RegExpExecArray | null;

  // Block IDs
  const blockIdEmojiRegex = /🆔 *([a-zA-Z0-9_-]+)/u;
  match = blockIdEmojiRegex.exec(text);
  if (match?.[1]) {
    metadata.blockId = match[1];
  }
  if (!metadata.blockId) {
    const blockIdCaretRegex = /\^([a-zA-Z0-9-]+)$/;
    match = blockIdCaretRegex.exec(text);
    if (match?.[1]) {
      metadata.blockId = match[1];
    }
  }

  // Priority emojis
  const priorityRegex = /([🔺⏫🔼🔽⏬])\uFE0F?/u;
  match = priorityRegex.exec(text);
  if (match?.[1]) {
    const priorityMap: Record<string, number> = {
      "\u{1F53A}": 0,
      "\u{23EB}": 1,
      "\u{1F53C}": 2,
      "\u{1F53D}": 4,
      "\u{23EC}": 5,
    };
    metadata.priority = priorityMap[match[1]] ?? null;
  }

  // Task date emojis
  const startDateRegex = /🛫 *(\d{4}-\d{2}-\d{2})/u;
  match = startDateRegex.exec(text);
  if (match?.[1]) metadata.startDate = match[1];

  const createdDateRegex = /➕ *(\d{4}-\d{2}-\d{2})/u;
  match = createdDateRegex.exec(text);
  if (match?.[1]) metadata.createdDate = match[1];

  const scheduledDateRegex = /[⏳⌛] *(\d{4}-\d{2}-\d{2})/u;
  match = scheduledDateRegex.exec(text);
  if (match?.[1]) metadata.scheduledDate = match[1];

  const dueDateEmojiRegex = /[📅📆🗓] *(\d{4}-\d{2}-\d{2})/u;
  match = dueDateEmojiRegex.exec(text);
  if (match?.[1]) metadata.dueDate = match[1];

  const doneDateRegex = /✅ *(\d{4}-\d{2}-\d{2})/u;
  match = doneDateRegex.exec(text);
  if (match?.[1]) metadata.doneDate = match[1];

  const cancelledDateRegex = /❌ *(\d{4}-\d{2}-\d{2})/u;
  match = cancelledDateRegex.exec(text);
  if (match?.[1]) metadata.cancelledDate = match[1];

  // Recurrence and dependsOn
  const recurrenceRegex = /🔁 *(.+?)$/u;
  match = recurrenceRegex.exec(text);
  if (match?.[1]) metadata.recurrence = match[1].trim();

  const dependsOnRegex = /⛔\uFE0F? *([a-zA-Z0-9_-]+)/u;
  match = dependsOnRegex.exec(text);
  if (match?.[1]) metadata.dependsOn = match[1];

  // Dataview inline metadata
  const dvSquareRegex = /\[([^:]+?):: ([^\]]+)\]/g;
  while ((match = dvSquareRegex.exec(text)) !== null) {
    if (match[1] && match[2]) {
      metadata.inlineMetadata.push({
        key: match[1].trim(),
        value: match[2].trim(),
        raw: match[0],
      });
    }
  }
  const dvParenRegex = /\(([^:]+?):: ([^)]+)\)/g;
  while ((match = dvParenRegex.exec(text)) !== null) {
    if (match[1] && match[2]) {
      metadata.inlineMetadata.push({
        key: match[1].trim(),
        value: match[2].trim(),
        raw: match[0],
      });
    }
  }

  // Wikilink dates
  const wikilinkDateRegex = /@\[\[(\d{4}-\d{2}-\d{2})\]\]/g;
  while ((match = wikilinkDateRegex.exec(text)) !== null) {
    if (match[1]) metadata.wikilinkDates.push(match[1]);
  }

  // Markdown note dates
  const mdNoteDateRegex = /@\[(\d{4}-\d{2}-\d{2})\]\(([^)]+)\)/g;
  while ((match = mdNoteDateRegex.exec(text)) !== null) {
    if (match[1] && match[2]) {
      metadata.mdNoteDates.push({ date: match[1], path: match[2] });
    }
  }

  // Standard extractions
  const dateRegex = /@\{(\d{4}-\d{2}-\d{2})\}/g;
  while ((match = dateRegex.exec(text)) !== null) {
    if (match[1]) metadata.dueDates.push(match[1]);
  }

  const timeRegex = /@\{(\d{2}:\d{2})\}/g;
  while ((match = timeRegex.exec(text)) !== null) {
    if (match[1]) metadata.times.push(match[1]);
  }

  const textWithoutCode = text.replace(/`[^`]*`/g, (m) => " ".repeat(m.length));
  const tagRegex = /#(\w[\w-]*)/g;
  while ((match = tagRegex.exec(textWithoutCode)) !== null) {
    if (match[1]) metadata.tags.push(match[1]);
  }

  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  while ((match = wikilinkRegex.exec(text)) !== null) {
    if (match[1]) metadata.wikilinks.push(match[1]);
  }

  return metadata;
}

/**
 * Extract metadata with custom date/time triggers.
 */
export function extractMetadataWithTriggers(
  text: string,
  dateTrigger: string,
  timeTrigger: string,
): CardMetadata {
  const metadata = extractMetadata(text);

  if (dateTrigger === "@" && timeTrigger === "@") {
    return metadata;
  }

  const escapedDateTrigger = dateTrigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedTimeTrigger = timeTrigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const customDateRegex = new RegExp(`${escapedDateTrigger}\\{(\\d{4}-\\d{2}-\\d{2})\\}`, "g");
  let match: RegExpExecArray | null;
  const customDates: string[] = [];
  while ((match = customDateRegex.exec(text)) !== null) {
    if (match[1]) customDates.push(match[1]);
  }

  const existingDates = new Set(metadata.dueDates);
  for (const d of customDates) {
    if (!existingDates.has(d)) {
      metadata.dueDates.push(d);
    }
  }

  const customTimeRegex = new RegExp(`${escapedTimeTrigger}\\{(\\d{2}:\\d{2})\\}`, "g");
  const customTimes: string[] = [];
  while ((match = customTimeRegex.exec(text)) !== null) {
    if (match[1]) customTimes.push(match[1]);
  }

  const existingTimes = new Set(metadata.times);
  for (const t of customTimes) {
    if (!existingTimes.has(t)) {
      metadata.times.push(t);
    }
  }

  return metadata;
}

/**
 * Strips metadata markers from card text while preserving content inside code blocks.
 * Handles both standard and indented fenced code blocks (e.g., inside list items).
 */
function stripCardText(text: string): string {
  let inFencedCode = false;
  let inIndentedCode = false;
  let result = "";
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const remaining = text.slice(i);

    const fenceMatch = remaining.match(/^[ \t]*[`~]{3,}/);
    if (fenceMatch) {
      // Toggle state AFTER processing the fence line (same as stripMetadataMarkers)
      result += fenceMatch[0];
      i += fenceMatch[0].length;
      inFencedCode = !inFencedCode;
      continue;
    }

    if (inFencedCode) {
      result += char;
      i++;
      continue;
    }

    const lineStartMatch = remaining.match(/^([ \t]{4,})/);
    if (lineStartMatch?.[1]) {
      inIndentedCode = true;
      result += lineStartMatch[1];
      i += lineStartMatch[1].length;
      continue;
    }

    if (inIndentedCode && char === "\n") {
      inIndentedCode = false;
      result += char;
      i++;
      continue;
    }

    if (inIndentedCode) {
      result += char;
      i++;
      continue;
    }

    if (char === "`") {
      const isDoubleBacktick = remaining.startsWith("``");
      const closingIndex = isDoubleBacktick
        ? remaining.indexOf("``", 2)
        : remaining.indexOf("`", 1);

      if (closingIndex === -1) {
        result += char;
        i++;
      } else {
        const codeBlock = isDoubleBacktick
          ? remaining.slice(0, closingIndex + 2)
          : remaining.slice(0, closingIndex + 1);
        result += codeBlock;
        i += codeBlock.length;
      }
      continue;
    }

    const dateMatch = remaining.match(/^@\{[^}]*\}/);
    if (dateMatch) {
      i += dateMatch[0].length;
      continue;
    }

    const tagMatch = remaining.match(/^#(\w[\w-]*)/);
    if (tagMatch) {
      i += tagMatch[0].length;
      continue;
    }

    const wikilinkMatch = remaining.match(/^\[\[[^\]]*\]\]/);
    if (wikilinkMatch) {
      i += wikilinkMatch[0].length;
      continue;
    }

    const dvSquareMatch = remaining.match(/^\[([^:]+?):: ([^\]]+)\]/);
    if (dvSquareMatch) {
      i += dvSquareMatch[0].length;
      continue;
    }

    const dvParenMatch = remaining.match(/^\(([^:]+?):: ([^)]+)\)/);
    if (dvParenMatch) {
      i += dvParenMatch[0].length;
      continue;
    }

    const dateEmojiMatch = remaining.match(/^[🛫➕⏳📅📆🗓✅❌]\uFE0F?\s*\d{4}-\d{2}-\d{2}/);
    if (dateEmojiMatch) {
      i += dateEmojiMatch[0].length;
      continue;
    }

    result += char;
    i++;
  }

  return result.trim();
}

/**
 * Parse a single card line.
 */
export function parseCard(rawText: string, _displayText?: string): Card {
  const cardMatch = rawText.match(/^- \[([ x])\] (.*)$/s);
  if (!cardMatch) {
    return {
      id: djb2Hash(rawText),
      text: rawText,
      rawText: rawText,
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
    };
  }

  const checked = cardMatch[1] === "x";
  const rawTextContent = cardMatch[2] ?? "";
  const text = stripCardText(rawTextContent);
  const metadata = extractMetadata(rawTextContent);

  return {
    id: djb2Hash(rawText),
    text,
    rawText: rawText,
    checked,
    metadata,
  };
}

/**
 * Split the body into sections based on headings.
 * Uses line-based approach for accurate line index tracking.
 */
export function splitSections(
  body: string,
): Array<{ title: string; content: string; startLine: number }> {
  const lines = body.split("\n");
  const sections: Array<{ title: string; content: string; startLine: number }> = [];
  let currentTitle = "";
  let currentLines: string[] = [];
  let currentStartLine = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (line === undefined) continue;
    const headingMatch = line.match(/^## (.+)$/);
    if (headingMatch) {
      if (currentTitle || currentLines.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentLines.join("\n"),
          startLine: currentStartLine,
        });
      }
      currentTitle = headingMatch[1] ?? "";
      currentLines = [];
      currentStartLine = lineIdx; // Zero-based: heading line index
    } else {
      currentLines.push(line);
    }
  }

  if (currentTitle || currentLines.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentLines.join("\n"),
      startLine: currentStartLine,
    });
  }

  return sections;
}

/**
 * Check if a line starts a new card (checkbox item).
 */
function isCardStart(line: string | undefined): boolean {
  return !!line?.match(/^- \[([ x])\]/);
}

/**
 * Check if a line is a section header.
 */
function isSectionHeader(line: string | undefined): boolean {
  return !!line?.trim().startsWith("#");
}

/**
 * Check if a line is the **Complete** marker.
 */
function isCompleteMarker(line: string | undefined): boolean {
  return line?.trim() === "**Complete**";
}

/**
 * Check if a line is an HTML comment.
 */
function isHtmlComment(line: string | undefined): boolean {
  return !!line?.trim().match(/^<!--.*-->$/);
}

/**
 * Check if a line is blank.
 */
function isBlankLine(line: string | undefined): boolean {
  return !line || line.trim() === "";
}

/**
 * Parse a kanban markdown string into a BoardState object.
 *
 * Hybrid approach: Uses mdast to identify structural positions (headings, list items),
 * then uses line-based parsing for accurate content extraction and line index tracking.
 */
export function parse(markdown: string): BoardState {
  // Normalize line endings
  const normalized = markdown.replace(/\r\n/g, "\n");

  // Handle empty input
  if (normalized.trim() === "") {
    return {
      frontmatter: "",
      frontmatterRaw: "",
      columns: [],
      settings: null,
      settingsRaw: null,
      rawBody: "",
      archiveCards: [],
      archiveRawContent: "",
      cssClasses: [],
    };
  }

  // Extract frontmatter
  const { frontmatter, frontmatterRaw, body: afterFrontmatter } = extractFrontmatter(normalized);

  // Extract cssClasses from frontmatter
  const cssClasses = extractCssClasses(frontmatter);

  // Extract settings from frontmatter
  const frontmatterSettings = extractFrontmatterSettings(frontmatter);

  // Extract settings from end (footer)
  const {
    settings: footerSettings,
    settingsRaw,
    bodyWithoutSettings,
  } = extractSettings(afterFrontmatter);

  // Settings precedence: footer > frontmatter > null
  let settings: BoardSettings | null = null;
  if (footerSettings) {
    settings = footerSettings;
  } else if (Object.keys(frontmatterSettings).length > 0) {
    settings = { "kanban-plugin": "basic", ...frontmatterSettings } as BoardSettings;
  }

  // Backward compat: migrate prepend-new-cards
  if (settings && settings["prepend-new-cards"] !== undefined) {
    if (settings["prepend-new-cards"] === true) {
      settings["new-card-insertion-method"] = "prepend";
    } else {
      settings["new-card-insertion-method"] = "append";
    }
    delete settings["prepend-new-cards"];
  }

  // Extract archive section
  const { archiveCards, archiveRawContent, bodyWithoutArchive } =
    extractArchive(bodyWithoutSettings);

  // Parse body with mdast for structural analysis
  const root = fromMarkdown(bodyWithoutArchive) as Root;

  // Use mdast to find column boundaries (headings at depth 2)
  const columnBoundaries: Array<{ title: string; startOffset: number; endOffset: number }> = [];

  visit(root, "heading", (node) => {
    const heading = node as Heading;
    const pos = heading.position;
    if (heading.depth === 2 && pos) {
      const startOffset = pos.start?.offset;
      const endOffset = pos.end?.offset;
      if (startOffset !== undefined && endOffset !== undefined) {
        columnBoundaries.push({
          title: heading.children.map((c: Nodes) => ("value" in c ? c.value : "")).join(""),
          startOffset,
          endOffset,
        });
      }
    }
  });

  // Sort by start offset
  columnBoundaries.sort((a, b) => a.startOffset - b.startOffset);

  // Extract sections using line-based parsing for accurate line index tracking
  const sections = splitSections(bodyWithoutArchive);

  // Track rawBody: content before first heading
  let rawBody = "";

  // Parse columns and cards using line-based approach
  const columns: Column[] = [];

  for (const section of sections) {
    // Content before any heading goes to rawBody
    if (!section.title) {
      const trimmed = section.content.trim();
      if (trimmed) {
        rawBody += (rawBody ? "\n" : "") + trimmed;
      }
      continue;
    }

    const lines = section.content.split("\n");
    const cards: Card[] = [];
    let complete = false;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      if (line === undefined) continue;

      // Check for **Complete** marker
      if (line.trim() === "**Complete**") {
        complete = true;
        continue;
      }

      // Check for card line
      const cardMatch = line.match(/^- \[([ x])\] (.*)$/);
      if (cardMatch) {
        const rawLines: string[] = [line];

        // Track fenced code and indented code state for multi-line code blocks.
        // Handles standard and indented fenced code blocks (e.g., inside list items).
        let inFencedCode = false;
        let inIndentedCode = false;

        // Look ahead for continuation lines
        let lookAheadIdx = lineIdx + 1;
        while (lookAheadIdx < lines.length) {
          const nextLine = lines[lookAheadIdx];

          // Toggle fenced code state
          if (nextLine?.match(/^[ \t]*```/)) {
            inFencedCode = !inFencedCode;
          }

          // Check for indented code start (4+ leading spaces)
          const indentedMatch = nextLine?.match(/^([ \t]{4,})/);
          if (indentedMatch?.[1]) {
            inIndentedCode = true;
          }

          // Check for indented code end (line with < 4 spaces, not blank)
          if (inIndentedCode && nextLine && nextLine.trim() && !nextLine.match(/^[ \t]{4,}/)) {
            inIndentedCode = false;
          }

          if (!inFencedCode && !inIndentedCode) {
            if (isCardStart(nextLine)) break;
            if (isSectionHeader(nextLine)) break;
            if (isCompleteMarker(nextLine)) break;
            if (isHtmlComment(nextLine)) break;
            if (isBlankLine(nextLine)) {
              lookAheadIdx++;
              continue;
            }
          }

          if (nextLine) {
            rawLines.push(nextLine);
          }
          lookAheadIdx++;
        }

        const rawText = rawLines.join("\n");
        const checkboxPrefix = line.match(/^- \[([ x])\] /)?.[0] ?? "";
        const displayText = rawText.substring(checkboxPrefix.length);

        const card = parseCard(rawText, displayText);
        // lineIndex is relative to column content (starting after heading)
        // lineIdx is already 0-based within the section content
        card.lineIndex = lineIdx;

        cards.push(card);

        lineIdx = lookAheadIdx - 1;
        continue;
      }
    }

    const rawContent = section.content.replace(/\n+$/, "");

    columns.push({
      id: slugify(section.title),
      title: section.title,
      complete,
      cards,
      rawContent,
    });
  }

  // Handle custom triggers
  if (settings) {
    const dateTrigger = (settings["date-trigger"] as string) ?? "@";
    const timeTrigger = (settings["time-trigger"] as string) ?? "@";
    if (dateTrigger !== "@" || timeTrigger !== "@") {
      for (const column of columns) {
        for (const card of column.cards) {
          const customMetadata = extractMetadataWithTriggers(card.text, dateTrigger, timeTrigger);
          if (customMetadata.dueDates.length > 0) {
            card.metadata.dueDates = customMetadata.dueDates;
          }
          if (customMetadata.times.length > 0) {
            card.metadata.times = customMetadata.times;
          }
        }
      }
    }
  }

  return {
    frontmatter,
    frontmatterRaw,
    columns,
    settings,
    settingsRaw,
    rawBody,
    archiveCards,
    archiveRawContent,
    cssClasses,
  };
}
