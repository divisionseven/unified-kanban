import * as vscode from "vscode";
import * as crypto from "crypto";
import * as path from "node:path";
import { parse, serialize } from "./parser/index.js";
import { parseCard, slugify } from "./parser/parse.js";
import type { BoardState, BoardSettings, Card, Column } from "./parser/index.js";
import type { DefaultSettings, HostMessage } from "./messages.js";

/** Module-level guard for archiveDoneCards to prevent re-entrant edit triggers */
let archiveApplyingEdit = false;

/**
 * Format a date string according to board settings for archive timestamping.
 * Returns the formatted date string or empty string if formatting fails.
 */
function formatArchiveDate(settings: BoardSettings | null): string {
  const format = settings?.["archive-date-format"] ?? "YYYY-MM-DD";
  const now = new Date();
  // Simple format replacement for common tokens
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return format
    .replace("YYYY", String(year))
    .replace("YYYY", String(year))
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hour)
    .replace("mm", minute)
    .replace("ss", second);
}

/**
 * Apply archive date stamping to a card's rawText.
 * Modifies card.rawText and card.text in place, re-parses to get new ID.
 */
function stampCardArchiveDate(card: Card, settings: BoardSettings | null): Card {
  const archiveWithDate = settings?.["archive-with-date"] ?? false;
  if (!archiveWithDate) return card;

  const appendDate = settings?.["append-archive-date"] ?? false;
  const separator = settings?.["archive-date-separator"] ?? " ";
  const formattedDate = formatArchiveDate(settings);

  if (!formattedDate) return card;

  // Strip existing archive date if present (simple pattern)
  let text = card.text;
  let rawText = card.rawText;

  if (appendDate) {
    text = `${text}${separator}${formattedDate}`;
    // rawText has checkbox prefix: "- [ ] " or "- [x] "
    const checkboxMatch = rawText.match(/^(- \[[ x]\] )/);
    const prefix = checkboxMatch ? checkboxMatch[1] : "- [ ] ";
    rawText = `${prefix}${text}`;
  } else {
    text = `${formattedDate}${separator}${text}`;
    const checkboxMatch = rawText.match(/^(- \[[ x]\] )/);
    const prefix = checkboxMatch ? checkboxMatch[1] : "- [ ] ";
    rawText = `${prefix}${text}`;
  }

  // Re-parse to get new ID and updated metadata
  const reparsed = parseCard(rawText);
  card.id = reparsed.id;
  card.text = reparsed.text;
  card.rawText = reparsed.rawText;
  card.metadata = reparsed.metadata;

  return card;
}

/**
 * Trim archive column to max-archive-size setting.
 * Removes oldest cards (first in array) when over limit.
 */
function trimArchiveSize(archiveColumn: Column, settings: BoardSettings | null): void {
  const maxSize = settings?.["max-archive-size"] ?? -1;
  if (maxSize < 0) return; // No limit

  while (archiveColumn.cards.length > maxSize) {
    archiveColumn.cards.shift(); // Remove oldest (first)
  }
}

/**
 * Custom text editor provider for kanban board .md files.
 * Renders a React webview with drag-and-drop support.
 */
export class KanbanEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "vscode-kanban.kanbanEditor";

  /** Most recently resolved webview panel — used for command dispatch. */
  public static activePanel: vscode.WebviewPanel | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Reads VS Code workspace configuration for default kanban settings.
   * These serve as fallbacks when a board has no `%% kanban:settings %%` block.
   */
  private getDefaultSettings(): DefaultSettings {
    const config = vscode.workspace.getConfiguration("kanban");
    return {
      laneWidth: config.get<number>("defaultLaneWidth", 270),
      dateFormat: config.get<string>("defaultDateFormat", "YYYY-MM-DD"),
      timeFormat: config.get<string>("defaultTimeFormat", "HH:mm"),
      prependNewCards: config.get<boolean>("prependNewCards", false),
      showCheckboxes: config.get<boolean>("showCheckboxes", true),
      newCardInsertionMethod: config.get<"prepend" | "prepend-compact" | "append">(
        "newCardInsertionMethod",
        "append",
      ),
      hideCardCount: config.get<boolean>("hideCardCount", false),
      accentColor: config.get<string>("accentColor", ""),
      moveTags: config.get<boolean>("moveTags", true),
      tagAction: config.get<"kanban" | "obsidian">("tagAction", "obsidian"),
      moveDates: config.get<boolean>("moveDates", true),
      dateTrigger: config.get<string>("dateTrigger", "@"),
      timeTrigger: config.get<string>("timeTrigger", "@"),
      dateDisplayFormat: config.get<string>("dateDisplayFormat", "YYYY-MM-DD"),
      showRelativeDate: config.get<boolean>("showRelativeDate", false),
      datePickerWeekStart: config.get<number>("datePickerWeekStart", 1),
      archiveWithDate: config.get<boolean>("archiveWithDate", false),
      appendArchiveDate: config.get<boolean>("appendArchiveDate", false),
      archiveDateSeparator: config.get<string>("archiveDateSeparator", " "),
      archiveDateFormat: config.get<string>("archiveDateFormat", "YYYY-MM-DD"),
      maxArchiveSize: config.get<number>("maxArchiveSize", -1),
      inlineMetadataPosition: config.get<"body" | "footer" | "metadata-table">(
        "inlineMetadataPosition",
        "body",
      ),
      moveTaskMetadata: config.get<boolean>("moveTaskMetadata", true),
      newNoteTemplate: config.get<string>("newNoteTemplate", ""),
      newNoteFolder: config.get<string>("newNoteFolder", ""),
      showAddList: config.get<boolean>("showAddList", true),
      showArchiveAll: config.get<boolean>("showArchiveAll", true),
      showViewAsMarkdown: config.get<boolean>("showViewAsMarkdown", true),
      showBoardSettings: config.get<boolean>("showBoardSettings", true),
      showSearch: config.get<boolean>("showSearch", true),
      showSetView: config.get<boolean>("showSetView", true),
    };
  }

  /**
   * Called by VS Code when the custom editor is opened.
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    // sandbox is supported in VS Code 1.86+ but types may not be updated yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview")],
      sandbox: {
        "allow-modals": true,
      },
    } as unknown as vscode.WebviewOptions;

    webviewPanel.webview.html = getWebviewContent(webviewPanel.webview, this.context.extensionUri);

    // Track as active panel for command dispatch
    KanbanEditorProvider.activePanel = webviewPanel;
    webviewPanel.onDidDispose(() => {
      if (KanbanEditorProvider.activePanel === webviewPanel) {
        KanbanEditorProvider.activePanel = undefined;
      }
    });

    // Track whether we're applying our own edit (to suppress self-triggered updates)
    let applyingEdit = false;

    // Status bar item showing card counts
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

    function updateStatusBar(board: BoardState): void {
      const parts = board.columns.map((col) => `${col.title}: ${col.cards.length}`);
      statusBar.text = `$(project) ${parts.join(" | ")}`;
      statusBar.tooltip = "Kanban Board Card Counts";
      statusBar.show();
    }

    // Send initial board state
    const board = parseDocument(document);
    const theme =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? "dark" : "light";
    const defaults = this.getDefaultSettings();
    const fileName = path.parse(document.uri.fsPath).name;
    applyDefaultSettings(board, defaults);
    sendHostMessage(webviewPanel, { type: "INIT", board, theme, defaults, fileName });
    updateStatusBar(board);

    // Watch for document changes (external edits)
    const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        // Skip self-triggered updates from our own WorkspaceEdit
        if (applyingEdit || archiveApplyingEdit) return;

        const updatedBoard = parseDocument(document);
        sendHostMessage(webviewPanel, { type: "UPDATE", board: updatedBoard });
        updateStatusBar(updatedBoard);
      }
    });

    // Watch for theme changes
    const themeSubscription = vscode.window.onDidChangeActiveColorTheme((e) => {
      const newTheme = e.kind === vscode.ColorThemeKind.Dark ? "dark" : "light";
      sendHostMessage(webviewPanel, { type: "THEME_CHANGE", theme: newTheme });
    });

    webviewPanel.onDidDispose(() => {
      changeSubscription.dispose();
      themeSubscription.dispose();
      statusBar.dispose();
    });

    // Handle messages from webview
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "READY": {
          // Re-send INIT in case webview loaded after our first send
          const currentBoard = parseDocument(document);
          const currentTheme =
            vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? "dark" : "light";
          const currentDefaults = this.getDefaultSettings();
          const fileName = path.parse(document.uri.fsPath).name;
          applyDefaultSettings(currentBoard, currentDefaults);
          sendHostMessage(webviewPanel, {
            type: "INIT",
            board: currentBoard,
            theme: currentTheme,
            defaults: currentDefaults,
            fileName,
          });
          break;
        }

        case "MOVE_CARD": {
          try {
            const { cardId, fromColumnId, toColumnId, newIndex } = message;
            const board = parseDocument(document);

            // Find source and destination columns
            const fromColumn = board.columns.find((c) => c.id === fromColumnId);
            const toColumn = board.columns.find((c) => c.id === toColumnId);
            if (!fromColumn || !toColumn) {
              sendHostMessage(webviewPanel, {
                type: "MOVE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Find and remove the card from the source column
            const cardIndex = fromColumn.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "MOVE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }
            const removed = fromColumn.cards.splice(cardIndex, 1);
            const card = removed[0];
            if (!card) {
              sendHostMessage(webviewPanel, {
                type: "MOVE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            // If dropping into a Complete column, auto-check the card
            if (toColumn.complete && !card.checked) {
              card.checked = true;
              card.rawText = card.rawText.replace(/^- \[ \]/, "- [x]");
            }

            // Insert at target position
            if (fromColumnId === toColumnId && newIndex > cardIndex) {
              toColumn.cards.splice(newIndex - 1, 0, card);
            } else {
              toColumn.cards.splice(newIndex, 0, card);
            }

            // Clear lineIndex so the serializer treats this as a new card
            // in the target column (its old lineIndex is from the source column)
            card.lineIndex = undefined;

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            // Re-parse and send result
            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "MOVE_CARD_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "MOVE_CARD_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "MOVE_COLUMN": {
          try {
            const { columnId, newIndex } = message;
            const board = parseDocument(document);

            // Find the column
            const columnIndex = board.columns.findIndex((c) => c.id === columnId);
            if (columnIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "MOVE_COLUMN_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Remove and re-insert at new position
            const removedCols = board.columns.splice(columnIndex, 1);
            const column = removedCols[0];
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "MOVE_COLUMN_RESULT",
                success: false,
                board,
              });
              break;
            }
            board.columns.splice(newIndex, 0, column);

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            // Re-parse and send result
            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "MOVE_COLUMN_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "MOVE_COLUMN_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "UPDATE_CARD": {
          try {
            const { cardId, columnId, text } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "UPDATE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const cardIndex = column.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "UPDATE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const oldCard = column.cards[cardIndex];
            if (!oldCard) {
              sendHostMessage(webviewPanel, {
                type: "UPDATE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Reconstruct rawText with checkbox prefix
            const textLines = text.split("\n");
            const firstLine = textLines[0] ?? "";
            const continuationLines = textLines.slice(1);

            let rawText: string;
            if (continuationLines.length > 0) {
              // Multi-line: indent continuation lines
              rawText = (oldCard.checked ? "- [x] " : "- [ ] ") + firstLine;
              for (const line of continuationLines) {
                rawText += "\n  " + line;
              }
            } else {
              // Single-line: simple case
              rawText = oldCard.checked ? `- [x] ${text}` : `- [ ] ${text}`;
            }

            // DEBUG: Log card reconstruction details

            const newCard = parseCard(rawText);

            // Replace old card at same index
            column.cards[cardIndex] = newCard;

            // Serialize and apply
            const newText = serialize(board);

            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);

            sendHostMessage(webviewPanel, {
              type: "UPDATE_CARD_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "UPDATE_CARD_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "ADD_CARD": {
          try {
            const { columnId, text } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "ADD_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Create rawText and parse to get proper Card
            const rawText = `- [ ] ${text}`;
            const newCard = parseCard(rawText);

            const insertMethod = board.settings?.["new-card-insertion-method"];
            if (insertMethod === "prepend" || insertMethod === "prepend-compact") {
              column.cards.unshift(newCard);
            } else {
              column.cards.push(newCard);
            }

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ADD_CARD_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ADD_CARD_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "DELETE_CARD": {
          try {
            const { cardId, columnId } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "DELETE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const cardIndex = column.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "DELETE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            column.cards.splice(cardIndex, 1);

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "DELETE_CARD_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "DELETE_CARD_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "ADD_COLUMN": {
          try {
            const { title } = message;
            const board = parseDocument(document);

            // Create new column with slugified title
            const newColumn: Column = {
              id: slugify(title),
              title,
              complete: false,
              cards: [],
              rawContent: "",
            };
            board.columns.push(newColumn);

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ADD_COLUMN_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ADD_COLUMN_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "DELETE_COLUMN": {
          try {
            const { columnId } = message;
            const board = parseDocument(document);

            const columnIndex = board.columns.findIndex((c) => c.id === columnId);
            if (columnIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "DELETE_COLUMN_RESULT",
                success: false,
                board,
              });
              break;
            }

            board.columns.splice(columnIndex, 1);

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "DELETE_COLUMN_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "DELETE_COLUMN_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "RENAME_COLUMN": {
          try {
            const { columnId, title } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "RENAME_COLUMN_RESULT",
                success: false,
                board,
              });
              break;
            }

            column.title = title;
            column.id = slugify(title);

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "RENAME_COLUMN_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "RENAME_COLUMN_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "TOGGLE_COLUMN_COMPLETE": {
          try {
            const { columnId } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "TOGGLE_COLUMN_COMPLETE_RESULT",
                success: false,
                board,
              });
              break;
            }

            column.complete = !column.complete;

            // When marking column complete, auto-check all unchecked cards
            if (column.complete) {
              column.cards.forEach((card) => {
                if (!card.checked) {
                  card.checked = true;
                  card.rawText = card.rawText.replace(/^- \[ \]/, "- [x]");
                }
              });
            }

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "TOGGLE_COLUMN_COMPLETE_RESULT",
              success: true,
              board: updatedBoard,
            });
            updateStatusBar(updatedBoard);
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "TOGGLE_COLUMN_COMPLETE_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "UPDATE_SETTINGS": {
          try {
            const board = parseDocument(document);
            const incoming = message.settings as Partial<BoardSettings>;

            // Merge incoming settings into existing
            if (board.settings) {
              Object.assign(board.settings, incoming);

              // Delete keys with undefined to allow removal
              for (const key of Object.keys(incoming)) {
                if (incoming[key] === undefined) {
                  delete (board.settings as Record<string, unknown>)[key];
                }
              }

              // Delete keys that exist in board.settings but are NOT in incoming (settings removed in UI)
              for (const key of Object.keys(board.settings)) {
                if (!(key in incoming)) {
                  delete (board.settings as Record<string, unknown>)[key];
                }
              }
            } else {
              const merged: BoardSettings = {
                "kanban-plugin": "basic",
                ...incoming,
              };
              board.settings = merged;
            }

            // Clear settingsRaw to force regeneration from the settings object
            board.settingsRaw = null;
            board.frontmatterRaw = "";

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "UPDATE_SETTINGS_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "UPDATE_SETTINGS_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "TOGGLE_CARD": {
          try {
            const { cardId } = message;
            const board = parseDocument(document);

            // Find the card by ID across all columns
            let targetCard: Card | undefined;
            for (const col of board.columns) {
              targetCard = col.cards.find((c) => c.id === cardId);
              if (targetCard) break;
            }

            if (!targetCard) {
              sendHostMessage(webviewPanel, {
                type: "TOGGLE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Toggle checked state and rewrite rawText
            const isNowChecked = !targetCard.checked;
            targetCard.checked = isNowChecked;

            // Toggle checkbox prefix only — preserve all continuation lines as-is
            targetCard.rawText = targetCard.rawText.replace(
              /^- \[[ x]\]/,
              isNowChecked ? "- [x]" : "- [ ]",
            );

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "TOGGLE_CARD_RESULT",
              success: true,
              board: updatedBoard,
            });
            updateStatusBar(updatedBoard);
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "TOGGLE_CARD_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "ADD_DATE": {
          try {
            const { cardId, columnId, date } = message;

            // Validate required fields
            if (!cardId || !columnId || !date) {
              const board = parseDocument(document);
              sendHostMessage(webviewPanel, {
                type: "ADD_DATE_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Validate date format (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
              const board = parseDocument(document);
              sendHostMessage(webviewPanel, {
                type: "ADD_DATE_RESULT",
                success: false,
                board,
              });
              break;
            }

            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "ADD_DATE_RESULT",
                success: false,
                board,
              });
              break;
            }

            const cardIndex = column.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "ADD_DATE_RESULT",
                success: false,
                board,
              });
              break;
            }

            const card = column.cards[cardIndex]!;
            // Add date marker to rawText directly to preserve existing metadata
            const dateMarker = `@{${date}}`;
            if (!card.text.includes(dateMarker)) {
              const oldRawText = card.rawText;
              // Check if this is a multi-line card (has indented continuation lines)
              if (oldRawText.includes("\n  ")) {
                // Multi-line: append date marker on a new continuation line with 2-space indent
                card.rawText = `${oldRawText}\n  ${dateMarker}`;
              } else {
                // Single-line: append date marker inline
                card.rawText = `${oldRawText} ${dateMarker}`;
              }
              // Re-parse to update id and extract any new metadata
              const reparsed = parseCard(card.rawText);
              card.id = reparsed.id;
              card.metadata = reparsed.metadata;
            }

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ADD_DATE_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ADD_DATE_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "REMOVE_DATE": {
          try {
            const { cardId, columnId } = message;

            // Validate required fields
            if (!cardId || !columnId) {
              const board = parseDocument(document);
              sendHostMessage(webviewPanel, {
                type: "REMOVE_DATE_RESULT",
                success: false,
                board,
              });
              break;
            }

            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "REMOVE_DATE_RESULT",
                success: false,
                board,
              });
              break;
            }

            const cardIndex = column.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "REMOVE_DATE_RESULT",
                success: false,
                board,
              });
              break;
            }

            const card = column.cards[cardIndex]!;
            // Remove date markers directly from rawText to preserve other metadata
            card.rawText = card.rawText.replace(/\s*@\{\d{4}-\d{2}-\d{2}\}/g, "");
            // Re-parse to update metadata and ID
            const reparsed = parseCard(card.rawText);
            card.id = reparsed.id;
            card.metadata = reparsed.metadata;

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "REMOVE_DATE_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "REMOVE_DATE_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "ADD_TIME": {
          try {
            const { cardId, columnId, time } = message;

            // Validate required fields
            if (!cardId || !columnId || !time) {
              const board = parseDocument(document);
              sendHostMessage(webviewPanel, {
                type: "ADD_TIME_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Validate time format (HH:mm)
            if (!/^\d{2}:\d{2}$/.test(time)) {
              const board = parseDocument(document);
              sendHostMessage(webviewPanel, {
                type: "ADD_TIME_RESULT",
                success: false,
                board,
              });
              break;
            }

            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "ADD_TIME_RESULT",
                success: false,
                board,
              });
              break;
            }

            const cardIndex = column.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "ADD_TIME_RESULT",
                success: false,
                board,
              });
              break;
            }

            const card = column.cards[cardIndex]!;
            // Add time marker to rawText directly to preserve existing metadata
            const timeMarker = `@{${time}}`;
            if (!card.text.includes(timeMarker)) {
              const oldRawText = card.rawText;
              // Check if this is a multi-line card (has indented continuation lines)
              if (oldRawText.includes("\n  ")) {
                // Multi-line: append time marker on a new continuation line with 2-space indent
                card.rawText = `${oldRawText}\n  ${timeMarker}`;
              } else {
                // Single-line: append time marker inline
                card.rawText = `${oldRawText} ${timeMarker}`;
              }
              // Re-parse to update id and extract any new metadata
              const reparsed = parseCard(card.rawText);
              card.id = reparsed.id;
              card.metadata = reparsed.metadata;
            }

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ADD_TIME_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ADD_TIME_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "REMOVE_TIME": {
          try {
            const { cardId, columnId } = message;

            // Validate required fields
            if (!cardId || !columnId) {
              const board = parseDocument(document);
              sendHostMessage(webviewPanel, {
                type: "REMOVE_TIME_RESULT",
                success: false,
                board,
              });
              break;
            }

            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "REMOVE_TIME_RESULT",
                success: false,
                board,
              });
              break;
            }

            const cardIndex = column.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "REMOVE_TIME_RESULT",
                success: false,
                board,
              });
              break;
            }

            const card = column.cards[cardIndex]!;
            // Remove time markers directly from rawText to preserve other metadata
            card.rawText = card.rawText.replace(/\s*@\{\d{2}:\d{2}\}/g, "");
            // Re-parse to update metadata and ID
            const reparsed = parseCard(card.rawText);
            card.id = reparsed.id;
            card.metadata = reparsed.metadata;

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "REMOVE_TIME_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "REMOVE_TIME_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "NEW_NOTE_FROM_CARD": {
          try {
            const { cardId, columnId } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "NEW_NOTE_FROM_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const card = column.cards.find((c) => c.id === cardId);
            if (!card) {
              sendHostMessage(webviewPanel, {
                type: "NEW_NOTE_FROM_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Get settings for template and folder
            const newNoteTemplate = board.settings?.["new-note-template"] ?? "";
            const newNoteFolder = board.settings?.["new-note-folder"] ?? "";

            // Determine note filename from card text
            const noteTitle = card.text.replace(/^-\s*\[[ x]\]\s*/, "").trim();
            // Create slugified filename
            const noteFilename = noteTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");

            if (!noteFilename) {
              sendHostMessage(webviewPanel, {
                type: "NEW_NOTE_FROM_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Determine content: use template if set, otherwise use card text
            let noteContent = newNoteTemplate || noteTitle;

            // Build the full path for the new note
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
              sendHostMessage(webviewPanel, {
                type: "NEW_NOTE_FROM_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const basePath = workspaceFolder.uri.fsPath;
            const folderPath = newNoteFolder
              ? vscode.Uri.joinPath(vscode.Uri.file(basePath), newNoteFolder).fsPath
              : basePath;

            // Create the note file
            const notePath = vscode.Uri.joinPath(vscode.Uri.file(folderPath), `${noteFilename}.md`);

            // Write the note file
            const writeEdit = new vscode.WorkspaceEdit();
            writeEdit.createFile(notePath, { ignoreIfExists: false });
            writeEdit.insert(notePath, new vscode.Position(0, 0), `${noteContent}\n`);
            applyingEdit = true;
            await vscode.workspace.applyEdit(writeEdit);

            // Add wikilink to the card's metadata
            card.metadata.wikilinks.push(noteFilename);
            // Append wikilink directly to rawText to preserve metadata (dates, tags, etc.)
            if (!card.text.includes(`[[${noteFilename}]]`)) {
              const wikilink = ` [[${noteFilename}]]`;
              const oldRawText = card.rawText;

              // Check if this is a multi-line card (has indented continuation lines)
              if (oldRawText.includes("\n  ")) {
                // Multi-line: append wikilink on a new continuation line with 2-space indent
                card.rawText = `${oldRawText}\n  ${wikilink}`;
              } else {
                // Single-line: append wikilink inline
                card.rawText = `${oldRawText}${wikilink}`;
              }

              // Re-parse to update id and extract any new metadata
              const reparsed = parseCard(card.rawText);
              card.id = reparsed.id;
              card.metadata = reparsed.metadata;
            }

            // Serialize and apply the board edit
            const newText = serialize(board);
            const boardEdit = new vscode.WorkspaceEdit();
            boardEdit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const boardSuccess = await vscode.workspace.applyEdit(boardEdit);
            if (boardSuccess) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "NEW_NOTE_FROM_CARD_RESULT",
              success: true,
              board: updatedBoard,
              notePath: noteFilename,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "NEW_NOTE_FROM_CARD_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "SPLIT_CARD": {
          try {
            const { cardId, columnId } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "SPLIT_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const cardIndex = column.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "SPLIT_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const originalCard = column.cards[cardIndex]!;
            // Split on newlines, filter empty lines
            const lines = originalCard.text.split("\n").filter((line) => line.trim().length > 0);

            if (lines.length <= 1) {
              // Nothing to split
              sendHostMessage(webviewPanel, {
                type: "SPLIT_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Create new cards for each line, preserving checked state
            const newCards = lines.map((line) => {
              const rawText = originalCard.checked ? `- [x] ${line}` : `- [ ] ${line}`;
              return parseCard(rawText);
            });

            // Replace original card with new cards at the same position
            column.cards.splice(cardIndex, 1, ...newCards);

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "SPLIT_CARD_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "SPLIT_CARD_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "DUPLICATE_CARD": {
          try {
            const { cardId, columnId } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "DUPLICATE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const cardIndex = column.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "DUPLICATE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const originalCard = column.cards[cardIndex]!;
            // Create copy with modified text
            const copyText = `${originalCard.text} (copy)`;
            const rawText = originalCard.checked ? `- [x] ${copyText}` : `- [ ] ${copyText}`;
            const newCard = parseCard(rawText);

            // Insert copy immediately after original
            column.cards.splice(cardIndex + 1, 0, newCard);

            // Serialize and apply
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "DUPLICATE_CARD_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "DUPLICATE_CARD_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "OPEN_FILE": {
          try {
            const { path: notePath } = message;
            const pattern = `**/${notePath}.md`;
            const files = await vscode.workspace.findFiles(pattern, null, 1);
            if (files.length > 0 && files[0]) {
              const doc = await vscode.workspace.openTextDocument(files[0]);
              await vscode.window.showTextDocument(doc);
            }
          } catch {
            // Best-effort — silently ignore if file not found
          }
          break;
        }

        case "SEARCH_TAG": {
          try {
            const { tag } = message;
            await vscode.commands.executeCommand("workbench.action.findInFiles", {
              query: `#${tag}`,
            });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Failed to open search:", err);
          }
          break;
        }

        case "OPEN_BOARD_FILE": {
          try {
            await vscode.commands.executeCommand("vscode.open", document.uri);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Failed to open file:", err);
          }
          break;
        }

        case "ADD_BLOCK_ID": {
          try {
            const { cardId, columnId: _columnId, blockId } = message;
            const board = parseDocument(document);

            // Find the card by ID across all columns (same strategy as TOGGLE_CARD)
            let targetCard: Card | undefined;
            let targetColumn: Column | undefined;
            for (const col of board.columns) {
              targetCard = col.cards.find((c) => c.id === cardId);
              if (targetCard) {
                targetColumn = col;
                break;
              }
            }

            if (!targetCard || !targetColumn) {
              sendHostMessage(webviewPanel, {
                type: "ADD_BLOCK_ID_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Remove existing block ID if present, then append new one
            targetCard.rawText =
              targetCard.rawText.replace(/\s*\^[a-zA-Z0-9-]+$/, "") + ` ^${blockId}`;
            // Re-parse to update metadata.blockId and id
            const reparsed = parseCard(targetCard.rawText);
            targetCard.id = reparsed.id;
            targetCard.text = reparsed.text;
            targetCard.metadata = reparsed.metadata;

            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ADD_BLOCK_ID_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (_err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ADD_BLOCK_ID_RESULT",
              success: false,
              board,
            });
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "INSERT_CARD": {
          try {
            const { columnId, text, position, referenceCardId } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "INSERT_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const refIndex = column.cards.findIndex((c) => c.id === referenceCardId);
            if (refIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "INSERT_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const rawText = `- [ ] ${text}`;
            const newCard = parseCard(rawText);

            const insertAt = position === "before" ? refIndex : refIndex + 1;
            column.cards.splice(insertAt, 0, newCard);

            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "INSERT_CARD_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (_err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "INSERT_CARD_RESULT",
              success: false,
              board,
            });
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "ARCHIVE_COLUMN_CARDS": {
          try {
            const { columnId } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "ARCHIVE_COLUMN_CARDS_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Find or create Archive column
            let archiveColumn = board.columns.find((c) => c.title === "Archive");
            if (!archiveColumn) {
              archiveColumn = {
                id: "archive",
                title: "Archive",
                complete: false,
                cards: [],
                rawContent: "",
              };
              board.columns.push(archiveColumn);
            }

            // Partition: checked → archive, unchecked → stay
            const checkedCards: Card[] = [];
            const remainingCards: Card[] = [];
            for (const card of column.cards) {
              if (card.checked) {
                checkedCards.push(card);
              } else {
                remainingCards.push(card);
              }
            }

            if (checkedCards.length === 0) {
              sendHostMessage(webviewPanel, {
                type: "ARCHIVE_COLUMN_CARDS_RESULT",
                success: false,
                board,
              });
              break;
            }

            column.cards = remainingCards;
            archiveColumn.cards.push(...checkedCards);

            // Apply date stamping to each archived card
            for (const card of checkedCards) {
              stampCardArchiveDate(card, board.settings);
            }

            // Apply max-archive-size trimming
            trimArchiveSize(archiveColumn, board.settings);

            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ARCHIVE_COLUMN_CARDS_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ARCHIVE_COLUMN_CARDS_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "ARCHIVE_ALL_CARDS": {
          try {
            const board = parseDocument(document);
            let archivedCount = 0;

            // Find or create Archive column
            let archiveColumn = board.columns.find((c) => c.title === "Archive");
            if (!archiveColumn) {
              archiveColumn = {
                id: "archive",
                title: "Archive",
                complete: false,
                cards: [],
                rawContent: "",
              };
              board.columns.push(archiveColumn);
            }

            // Process each column - archive completed cards
            for (const column of board.columns) {
              const completedCards = column.cards.filter((card) => card.checked);
              archivedCount += completedCards.length;

              if (completedCards.length === 0) continue;

              // Apply date stamping to each card before moving
              for (const card of completedCards) {
                stampCardArchiveDate(card, board.settings);
              }

              // Move completed cards to archive column
              const remainingCards = column.cards.filter((card) => !card.checked);
              column.cards = remainingCards;
              archiveColumn.cards.push(...completedCards);
            }

            // Apply max-archive-size trimming
            trimArchiveSize(archiveColumn, board.settings);

            if (archivedCount > 0) {
              const newText = serialize(board);
              const edit = new vscode.WorkspaceEdit();
              edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
              applyingEdit = true;
              const success = await vscode.workspace.applyEdit(edit);
              if (success) {
                await document.save();
              }
            }

            sendHostMessage(webviewPanel, {
              type: "ARCHIVE_ALL_CARDS_RESULT",
              success: true,
              archivedCount,
            });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Archive all failed:", err);
            sendHostMessage(webviewPanel, {
              type: "ARCHIVE_ALL_CARDS_RESULT",
              success: false,
              archivedCount: 0,
            });
          }
          break;
        }

        case "INSERT_COLUMN": {
          try {
            const { title, position, referenceColumnId } = message;
            const board = parseDocument(document);

            const refIndex = board.columns.findIndex((c) => c.id === referenceColumnId);
            if (refIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "INSERT_COLUMN_RESULT",
                success: false,
                board,
              });
              break;
            }

            const newColumn: Column = {
              id: slugify(title),
              title,
              complete: false,
              cards: [],
              rawContent: "",
            };

            const insertAt = position === "before" ? refIndex : refIndex + 1;
            board.columns.splice(insertAt, 0, newColumn);

            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "INSERT_COLUMN_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "INSERT_COLUMN_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "ARCHIVE_COLUMN": {
          try {
            const { columnId } = message;
            const board = parseDocument(document);

            const columnIndex = board.columns.findIndex((c) => c.id === columnId);
            if (columnIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "ARCHIVE_COLUMN_RESULT",
                success: false,
                board,
              });
              break;
            }

            const column = board.columns[columnIndex];
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "ARCHIVE_COLUMN_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Find or create Archive column
            let archiveColumn = board.columns.find((c) => c.title === "Archive");
            if (!archiveColumn) {
              archiveColumn = {
                id: "archive",
                title: "Archive",
                complete: false,
                cards: [],
                rawContent: "",
              };
              board.columns.push(archiveColumn);
            }

            // Move ALL cards to archive
            archiveColumn.cards.push(...column.cards);

            // Apply date stamping to each archived card
            for (const card of column.cards) {
              stampCardArchiveDate(card, board.settings);
            }

            // Apply max-archive-size trimming
            trimArchiveSize(archiveColumn, board.settings);

            // Remove the column
            board.columns.splice(columnIndex, 1);

            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ARCHIVE_COLUMN_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ARCHIVE_COLUMN_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "SORT_COLUMN": {
          try {
            const { columnId, sortKey, direction } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "SORT_COLUMN_RESULT",
                success: false,
                board,
              });
              break;
            }

            const dir = direction === "asc" ? 1 : -1;

            column.cards.sort((a, b) => {
              let cmp = 0;
              switch (sortKey) {
                case "text":
                  cmp = a.text.localeCompare(b.text);
                  break;
                case "date": {
                  const getDate = (card: Card): string | null =>
                    card.metadata.dueDate ??
                    card.metadata.scheduledDate ??
                    card.metadata.createdDate ??
                    card.metadata.startDate ??
                    (card.metadata.dueDates.length > 0
                      ? (card.metadata.dueDates[0] ?? null)
                      : null);
                  const dateA = getDate(a);
                  const dateB = getDate(b);
                  if (dateA && dateB) cmp = dateA.localeCompare(dateB);
                  else if (dateA) cmp = -1;
                  else if (dateB) cmp = 1;
                  break;
                }
                case "tags": {
                  const tagA = a.metadata.tags.length > 0 ? (a.metadata.tags[0] ?? "") : "";
                  const tagB = b.metadata.tags.length > 0 ? (b.metadata.tags[0] ?? "") : "";
                  cmp = tagA.localeCompare(tagB);
                  break;
                }
                case "priority": {
                  const priA = a.metadata.priority;
                  const priB = b.metadata.priority;
                  if (priA !== null && priB !== null) cmp = priA - priB;
                  else if (priA !== null) cmp = -1;
                  else if (priB !== null) cmp = 1;
                  break;
                }
                default: {
                  // metadata:{key} — dynamic metadata key sort
                  if (sortKey.startsWith("metadata:")) {
                    const key = sortKey.slice("metadata:".length);
                    const metaA = a.metadata.inlineMetadata.find((m) => m.key === key);
                    const metaB = b.metadata.inlineMetadata.find((m) => m.key === key);
                    if (metaA && metaB) cmp = metaA.value.localeCompare(metaB.value);
                    else if (metaA) cmp = -1;
                    else if (metaB) cmp = 1;
                  }
                  break;
                }
              }
              return cmp * dir;
            });

            // Sort persists card order in the markdown file
            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "SORT_COLUMN_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "SORT_COLUMN_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "ARCHIVE_CARD": {
          try {
            const { cardId, columnId } = message;
            const board = parseDocument(document);

            const column = board.columns.find((c) => c.id === columnId);
            if (!column) {
              sendHostMessage(webviewPanel, {
                type: "ARCHIVE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const cardIndex = column.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) {
              sendHostMessage(webviewPanel, {
                type: "ARCHIVE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            const card = column.cards[cardIndex];
            if (!card) {
              sendHostMessage(webviewPanel, {
                type: "ARCHIVE_CARD_RESULT",
                success: false,
                board,
              });
              break;
            }

            // Find or create Archive column
            let archiveColumn = board.columns.find((c) => c.title === "Archive");
            if (!archiveColumn) {
              archiveColumn = {
                id: "archive",
                title: "Archive",
                complete: false,
                cards: [],
                rawContent: "",
              };
              board.columns.push(archiveColumn);
            }

            // Remove card from source column
            column.cards.splice(cardIndex, 1);

            // Apply date stamping
            stampCardArchiveDate(card, board.settings);

            // Add to archive column
            archiveColumn.cards.push(card);

            // Apply max-archive-size trimming
            trimArchiveSize(archiveColumn, board.settings);

            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ARCHIVE_CARD_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "ARCHIVE_CARD_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }

        case "SET_VIEW": {
          try {
            const { view } = message;
            const board = parseDocument(document);

            // Store view mode as a board setting
            if (board.settings) {
              board.settings["set-view"] = view;
            } else {
              board.settings = { "kanban-plugin": "basic", "set-view": view };
            }
            board.settingsRaw = null;

            const newText = serialize(board);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            applyingEdit = true;
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
              await document.save();
            }

            const updatedBoard = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "SET_VIEW_RESULT",
              success: true,
              board: updatedBoard,
            });
          } catch (err) {
            const board = parseDocument(document);
            sendHostMessage(webviewPanel, {
              type: "SET_VIEW_RESULT",
              success: false,
              board,
            });
            vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
          } finally {
            applyingEdit = false;
          }
          break;
        }
      }
    });
  }
}

/**
 * Parse a VS Code text document into BoardState.
 */
function parseDocument(document: vscode.TextDocument): BoardState {
  const text = document.getText();
  return parse(text);
}

/**
 * Apply VS Code workspace defaults to a board that has no settings block.
 * Per-board `%% kanban:settings %%` always takes priority — this only fills gaps.
 */
function applyDefaultSettings(board: BoardState, defaults: DefaultSettings): void {
  if (board.settings) return;
  board.settings = {
    "kanban-plugin": "basic",
    "lane-width": defaults.laneWidth,
    "date-format": defaults.dateFormat,
    "time-format": defaults.timeFormat,
    "new-card-insertion-method": defaults.newCardInsertionMethod,
    "show-checkboxes": defaults.showCheckboxes,
    "hide-card-count": defaults.hideCardCount,
    "move-tags": defaults.moveTags,
    "tag-action": defaults.tagAction,
    "move-dates": defaults.moveDates,
    "date-trigger": defaults.dateTrigger,
    "time-trigger": defaults.timeTrigger,
    "date-display-format": defaults.dateDisplayFormat,
    "show-relative-date": defaults.showRelativeDate,
    "date-picker-week-start": defaults.datePickerWeekStart,
    "archive-with-date": defaults.archiveWithDate,
    "append-archive-date": defaults.appendArchiveDate,
    "archive-date-separator": defaults.archiveDateSeparator,
    "archive-date-format": defaults.archiveDateFormat,
    "max-archive-size": defaults.maxArchiveSize,
    "inline-metadata-position": defaults.inlineMetadataPosition,
    "move-task-metadata": defaults.moveTaskMetadata,
    "new-note-template": defaults.newNoteTemplate,
    "new-note-folder": defaults.newNoteFolder,
    "show-add-list": defaults.showAddList,
    "show-archive-all": defaults.showArchiveAll,
    "show-view-as-markdown": defaults.showViewAsMarkdown,
    "show-board-settings": defaults.showBoardSettings,
    "show-search": defaults.showSearch,
    "show-set-view": defaults.showSetView,
    "accent-color": defaults.accentColor,
  };
}

/**
 * Send a typed message to the webview panel.
 */
function sendHostMessage(panel: vscode.WebviewPanel, message: HostMessage): void {
  panel.webview.postMessage(message);
}

/**
 * Generate the HTML content for the webview.
 * Reads dist/webview/index.html, rewrites asset paths, and injects CSP nonce.
 */
export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = generateNonce();

  // The Vite build outputs to dist/webview/
  const webviewDistUri = vscode.Uri.joinPath(extensionUri, "dist", "webview");
  const indexHtmlUri = vscode.Uri.joinPath(webviewDistUri, "index.html");

  // Read the built index.html
  let indexHtml: string;
  try {
    indexHtml = require("fs").readFileSync(indexHtmlUri.fsPath, "utf8");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`Failed to load webview: ${errorMessage}`);
    return "";
  }

  // Build CSP
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} https:`,
    `script-src 'nonce-${nonce}' ${webview.cspSource}`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
  ].join("; ");

  // Rewrite asset paths to use asWebviewUri
  const rewritten = indexHtml
    // Rewrite src="..." attributes for scripts
    .replace(/src="\.\/([^"]+)"/g, (_match: string, assetPath: string) => {
      const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDistUri, assetPath));
      return `src="${assetUri}"`;
    })
    // Rewrite href="..." attributes for stylesheets
    .replace(/href="\.\/([^"]+)"/g, (_match: string, assetPath: string) => {
      const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDistUri, assetPath));
      return `href="${assetUri}"`;
    })
    // Inject nonce into script tags
    .replace(/<script/g, `<script nonce="${nonce}"`)
    // Inject CSP meta tag into <head>
    .replace(/<head>/, `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`);

  return rewritten;
}

/**
 * Generate a random nonce string for CSP enforcement.
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString("base64");
}

/**
 * Create a new kanban board file with starter content.
 * Prompts the user for a filename, creates an untitled document,
 * and opens it in the editor.
 */
export async function createNewBoard(): Promise<void> {
  const name = await vscode.window.showInputBox({
    prompt: "Board name",
    value: "kanban",
  });
  if (!name) return;

  const content = `---
kanban-plugin: basic
---

## Backlog

- [ ] New task

## In Progress

## Done

%% kanban:settings
{"kanban-plugin":"basic"}
%%
`;

  const doc = await vscode.workspace.openTextDocument({
    language: "markdown",
    content,
  });
  await vscode.window.showTextDocument(doc);
}

/**
 * Archive all checked (done) cards from the active kanban editor.
 * Moves checked cards to an ## Archive column, creating it if needed.
 */
export async function archiveDoneCards(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "markdown") {
    vscode.window.showWarningMessage("No active markdown editor. Open a kanban board first.");
    return;
  }

  const document = editor.document;
  const text = document.getText();
  if (!text.includes("kanban-plugin:")) {
    vscode.window.showWarningMessage(
      "This file is not a kanban board (missing kanban-plugin frontmatter).",
    );
    return;
  }

  const board = parse(text);

  // Find or create Archive column
  let archiveColumn = board.columns.find((c) => c.title === "Archive");
  if (!archiveColumn) {
    archiveColumn = {
      id: "archive",
      title: "Archive",
      complete: false,
      cards: [],
      rawContent: "",
    };
    board.columns.push(archiveColumn);
  }

  let archivedCount = 0;

  // Move checked cards from all columns except Archive
  for (const column of board.columns) {
    if (column.title === "Archive") continue;

    const checkedCards: Card[] = [];
    const remainingCards: Card[] = [];

    for (const card of column.cards) {
      if (card.checked) {
        checkedCards.push(card);
      } else {
        remainingCards.push(card);
      }
    }

    if (checkedCards.length > 0) {
      column.cards = remainingCards;
      archiveColumn.cards.push(...checkedCards);

      // Apply date stamping to each archived card
      for (const card of checkedCards) {
        stampCardArchiveDate(card, board.settings);
      }

      // Apply max-archive-size trimming
      trimArchiveSize(archiveColumn, board.settings);

      archivedCount += checkedCards.length;
    }
  }

  if (archivedCount === 0) {
    vscode.window.showInformationMessage("No checked cards to archive.");
    return;
  }

  // Serialize and apply
  const newText = serialize(board);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
  archiveApplyingEdit = true;
  try {
    const success = await vscode.workspace.applyEdit(edit);
    if (success) {
      await document.save();
    }
  } finally {
    archiveApplyingEdit = false;
  }

  vscode.window.showInformationMessage(
    `Archived ${archivedCount} card${archivedCount === 1 ? "" : "s"}.`,
  );
}
