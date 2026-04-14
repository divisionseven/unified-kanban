import * as vscode from "vscode";
import { KanbanEditorProvider, createNewBoard, archiveDoneCards } from "./KanbanEditorProvider.js";

/**
 * Called by VS Code when the extension is activated.
 */
export function activate(context: vscode.ExtensionContext): void {
  // Register the custom editor provider
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      KanbanEditorProvider.viewType,
      new KanbanEditorProvider(context),
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      },
    ),
  );

  // Register the "Open as Text" command
  context.subscriptions.push(
    vscode.commands.registerCommand("kanban.openAsText", () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        vscode.commands.executeCommand(
          "workbench.action.reopenTextEditor",
          activeEditor.document.uri,
        );
      }
    }),
  );

  // Register the "New Board" command
  context.subscriptions.push(
    vscode.commands.registerCommand("kanban.newBoard", () => {
      void createNewBoard();
    }),
  );

  // Register the "Archive Done Cards" command
  context.subscriptions.push(
    vscode.commands.registerCommand("kanban.archiveDoneCards", () => {
      void archiveDoneCards();
    }),
  );

  // Register "Toggle Kanban View" — cycles Board→Table→List→Board
  context.subscriptions.push(
    vscode.commands.registerCommand("kanban.toggleKanbanView", () => {
      const panel = KanbanEditorProvider.activePanel;
      if (!panel) return;
      panel.webview.postMessage({ type: "CYCLE_VIEW" });
    }),
  );

  // Register "View as Board"
  context.subscriptions.push(
    vscode.commands.registerCommand("kanban.viewBoard", () => {
      const panel = KanbanEditorProvider.activePanel;
      if (!panel) return;
      panel.webview.postMessage({ type: "SET_VIEW_COMMAND", view: "board" });
    }),
  );

  // Register "View as Table"
  context.subscriptions.push(
    vscode.commands.registerCommand("kanban.viewTable", () => {
      const panel = KanbanEditorProvider.activePanel;
      if (!panel) return;
      panel.webview.postMessage({ type: "SET_VIEW_COMMAND", view: "table" });
    }),
  );

  // Register "View as List"
  context.subscriptions.push(
    vscode.commands.registerCommand("kanban.viewList", () => {
      const panel = KanbanEditorProvider.activePanel;
      if (!panel) return;
      panel.webview.postMessage({ type: "SET_VIEW_COMMAND", view: "list" });
    }),
  );

  // Register "Open Board Settings"
  context.subscriptions.push(
    vscode.commands.registerCommand("kanban.openBoardSettings", () => {
      const panel = KanbanEditorProvider.activePanel;
      if (!panel) return;
      panel.webview.postMessage({ type: "OPEN_SETTINGS" });
    }),
  );

  // Register "Convert to Kanban" — adds frontmatter to a plain .md file
  context.subscriptions.push(
    vscode.commands.registerCommand("kanban.convertToKanban", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a markdown file first.");
        return;
      }
      const text = editor.document.getText();
      if (text.includes("kanban-plugin:")) {
        vscode.window.showInformationMessage("This file is already a kanban board.");
        return;
      }
      const newText = `---\nkanban-plugin: basic\n---\n\n${text}\n\n%% kanban:settings\n{"kanban-plugin":"basic"}\n%%`;
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        editor.document.uri,
        new vscode.Range(0, 0, editor.document.lineCount, 0),
        newText,
      );
      await vscode.workspace.applyEdit(edit);
      await editor.document.save();
    }),
  );

  // Register "Add Kanban Lane" — prompts for title, sends ADD_COLUMN to active webview
  context.subscriptions.push(
    vscode.commands.registerCommand("kanban.addKanbanLane", async () => {
      const title = await vscode.window.showInputBox({ prompt: "Lane title" });
      if (!title) return;
      const panel = KanbanEditorProvider.activePanel;
      if (!panel) {
        vscode.window.showWarningMessage("No active kanban board.");
        return;
      }
      panel.webview.postMessage({ type: "ADD_LANE_COMMAND", title });
    }),
  );
}

/**
 * Called by VS Code when the extension is deactivated.
 */
export function deactivate(): void {
  // Nothing to clean up
}
