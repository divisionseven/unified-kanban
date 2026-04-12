import type { BoardState } from "./parser/index.js";

/**
 * Messages sent from the extension host to the webview.
 */
/** Default settings read from VS Code workspace configuration. */
export interface DefaultSettings {
  laneWidth: number;
  dateFormat: string;
  timeFormat: string;
  /** @deprecated Use newCardInsertionMethod instead */
  prependNewCards: boolean;
  showCheckboxes: boolean;
  newCardInsertionMethod: "prepend" | "prepend-compact" | "append";
  hideCardCount: boolean;
  accentColor: string;
  moveTags: boolean;
  tagAction: "kanban" | "obsidian";
  moveDates: boolean;
  dateTrigger: string;
  timeTrigger: string;
  dateDisplayFormat: string;
  showRelativeDate: boolean;
  datePickerWeekStart: number;
  archiveWithDate: boolean;
  appendArchiveDate: boolean;
  archiveDateSeparator: string;
  archiveDateFormat: string;
  maxArchiveSize: number;
  inlineMetadataPosition: "body" | "footer" | "metadata-table";
  moveTaskMetadata: boolean;
  newNoteTemplate: string;
  newNoteFolder: string;
  showAddList: boolean;
  showArchiveAll: boolean;
  showViewAsMarkdown: boolean;
  showBoardSettings: boolean;
  showSearch: boolean;
  showSetView: boolean;
}

export type HostMessage =
  | {
      type: "INIT";
      board: BoardState;
      theme: string;
      defaults?: DefaultSettings;
      fileName?: string;
    }
  | { type: "UPDATE"; board: BoardState }
  | { type: "THEME_CHANGE"; theme: string }
  | { type: "MOVE_CARD_RESULT"; success: boolean; board: BoardState }
  | { type: "MOVE_COLUMN_RESULT"; success: boolean; board: BoardState }
  | { type: "UPDATE_CARD_RESULT"; success: boolean; board: BoardState }
  | { type: "ADD_CARD_RESULT"; success: boolean; board: BoardState }
  | { type: "DELETE_CARD_RESULT"; success: boolean; board: BoardState }
  | { type: "ADD_COLUMN_RESULT"; success: boolean; board: BoardState }
  | { type: "DELETE_COLUMN_RESULT"; success: boolean; board: BoardState }
  | { type: "RENAME_COLUMN_RESULT"; success: boolean; board: BoardState }
  | { type: "TOGGLE_COLUMN_COMPLETE_RESULT"; success: boolean; board: BoardState }
  | { type: "TOGGLE_CARD_RESULT"; success: boolean; board: BoardState }
  | { type: "UPDATE_SETTINGS_RESULT"; success: boolean; board: BoardState }
  | { type: "ADD_BLOCK_ID_RESULT"; success: boolean; board: BoardState }
  | { type: "INSERT_CARD_RESULT"; success: boolean; board: BoardState }
  | { type: "ARCHIVE_COLUMN_CARDS_RESULT"; success: boolean; board: BoardState }
  | { type: "ARCHIVE_CARD_RESULT"; success: boolean; board: BoardState }
  | { type: "ARCHIVE_ALL_CARDS_RESULT"; success: boolean; archivedCount: number }
  | { type: "INSERT_COLUMN_RESULT"; success: boolean; board: BoardState }
  | { type: "ARCHIVE_COLUMN_RESULT"; success: boolean; board: BoardState }
  | { type: "SORT_COLUMN_RESULT"; success: boolean; board: BoardState }
  | { type: "SET_VIEW_RESULT"; success: boolean; board: BoardState }
  | { type: "ADD_DATE_RESULT"; success: boolean; board: BoardState }
  | { type: "REMOVE_DATE_RESULT"; success: boolean; board: BoardState }
  | { type: "ADD_TIME_RESULT"; success: boolean; board: BoardState }
  | { type: "REMOVE_TIME_RESULT"; success: boolean; board: BoardState }
  | { type: "NEW_NOTE_FROM_CARD_RESULT"; success: boolean; board: BoardState; notePath?: string }
  | { type: "SPLIT_CARD_RESULT"; success: boolean; board: BoardState }
  | { type: "DUPLICATE_CARD_RESULT"; success: boolean; board: BoardState }
  | { type: "CYCLE_VIEW" }
  | { type: "SET_VIEW_COMMAND"; view: "board" | "table" | "list" }
  | { type: "OPEN_SETTINGS" }
  | { type: "ADD_LANE_COMMAND"; title: string };

/**
 * Messages sent from the webview to the extension host.
 */
export type WebviewMessage =
  | { type: "READY" }
  | {
      type: "MOVE_CARD";
      cardId: string;
      fromColumnId: string;
      toColumnId: string;
      newIndex: number;
    }
  | {
      type: "MOVE_COLUMN";
      columnId: string;
      newIndex: number;
    }
  | { type: "UPDATE_CARD"; cardId: string; columnId: string; text: string }
  | { type: "ADD_CARD"; columnId: string; text: string }
  | { type: "DELETE_CARD"; cardId: string; columnId: string }
  | { type: "ADD_COLUMN"; title: string }
  | { type: "DELETE_COLUMN"; columnId: string }
  | { type: "RENAME_COLUMN"; columnId: string; title: string }
  | { type: "TOGGLE_COLUMN_COMPLETE"; columnId: string }
  | { type: "TOGGLE_CARD"; cardId: string; columnId: string }
  | { type: "OPEN_FILE"; path: string }
  | { type: "OPEN_BOARD_FILE" }
  | { type: "ARCHIVE_ALL_CARDS" }
  | { type: "REQUEST_INIT" }
  | { type: "UPDATE_SETTINGS"; settings: Record<string, unknown> }
  | { type: "ADD_BLOCK_ID"; cardId: string; columnId: string; blockId: string }
  | {
      type: "INSERT_CARD";
      columnId: string;
      text: string;
      position: "before" | "after";
      referenceCardId: string;
    }
  | { type: "ARCHIVE_COLUMN_CARDS"; columnId: string }
  | { type: "ARCHIVE_CARD"; cardId: string; columnId: string }
  | {
      type: "INSERT_COLUMN";
      title: string;
      position: "before" | "after";
      referenceColumnId: string;
    }
  | { type: "ARCHIVE_COLUMN"; columnId: string }
  | { type: "SORT_COLUMN"; columnId: string; sortKey: string; direction: "asc" | "desc" }
  | { type: "SET_VIEW"; view: "board" | "table" | "list" }
  | { type: "ADD_DATE"; cardId: string; columnId: string; date: string }
  | { type: "REMOVE_DATE"; cardId: string; columnId: string }
  | { type: "ADD_TIME"; cardId: string; columnId: string; time: string }
  | { type: "REMOVE_TIME"; cardId: string; columnId: string }
  | { type: "NEW_NOTE_FROM_CARD"; cardId: string; columnId: string }
  | { type: "SPLIT_CARD"; cardId: string; columnId: string }
  | { type: "DUPLICATE_CARD"; cardId: string; columnId: string }
  | { type: "SEARCH_TAG"; tag: string };
