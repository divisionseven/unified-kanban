import { useState, useCallback, useRef, useEffect } from "react";

/** Props for the SettingsPanel component — current settings and save/cancel callbacks. */
interface SettingsPanelProps {
  settings: Record<string, unknown> | null;
  onSave: (settings: Record<string, unknown>) => void;
  onCancel: () => void;
}

/**
 * Inline settings overlay panel for configuring board settings.
 * Groups settings into Board Format, Tags, Dates, Archive, Metadata,
 * Note Creation, and Header Buttons sections.
 */
export function SettingsPanel({
  settings,
  onSave,
  onCancel,
}: SettingsPanelProps): React.ReactElement {
  const [laneWidth, setLaneWidth] = useState<string>(String(settings?.["lane-width"] ?? 270));
  const [dateFormat, setDateFormat] = useState<string>(
    String(settings?.["date-format"] ?? "YYYY-MM-DD"),
  );
  const [timeFormat, setTimeFormat] = useState<string>(
    String(settings?.["time-format"] ?? "HH:mm"),
  );
  const [showCheckboxes, setShowCheckboxes] = useState<boolean>(
    settings?.["show-checkboxes"] !== false,
  );
  const [newCardInsertion, setNewCardInsertion] = useState<string>(
    String(settings?.["new-card-insertion-method"] ?? "append"),
  );
  const [hideCardCount, setHideCardCount] = useState<boolean>(
    settings?.["hide-card-count"] === true,
  );
  const [moveTags, setMoveTags] = useState<boolean>(settings?.["move-tags"] !== false);
  const [tagAction, setTagAction] = useState<string>(
    String(settings?.["tag-action"] ?? "obsidian"),
  );
  const [tagColors, setTagColors] = useState<
    Array<{ tagKey: string; color: string; backgroundColor: string }>
  >(
    (settings?.["tag-colors"] as Array<{
      tagKey: string;
      color: string;
      backgroundColor: string;
    }>) ?? [],
  );
  const [tagSort, setTagSort] = useState<Array<{ tag: string }>>(
    (settings?.["tag-sort"] as Array<{ tag: string }>) ?? [],
  );
  const [newTagColorKey, setNewTagColorKey] = useState("");
  const [newTagColorValue, setNewTagColorValue] = useState("#e06c75");
  const [newTagSortKey, setNewTagSortKey] = useState("");
  const [moveDates, setMoveDates] = useState<boolean>(settings?.["move-dates"] !== false);
  const [dateTrigger, setDateTrigger] = useState<string>(String(settings?.["date-trigger"] ?? "@"));
  const [timeTrigger, setTimeTrigger] = useState<string>(String(settings?.["time-trigger"] ?? "@"));
  const [dateDisplayFormat, setDateDisplayFormat] = useState<string>(
    String(settings?.["date-display-format"] ?? "YYYY-MM-DD"),
  );
  const [showRelativeDate, setShowRelativeDate] = useState<boolean>(
    settings?.["show-relative-date"] === true,
  );
  const [datePickerWeekStart, setDatePickerWeekStart] = useState<string>(
    String(settings?.["date-picker-week-start"] ?? 1),
  );
  const [archiveWithDate, setArchiveWithDate] = useState<boolean>(
    settings?.["archive-with-date"] === true,
  );
  const [appendArchiveDate, setAppendArchiveDate] = useState<boolean>(
    settings?.["append-archive-date"] === true,
  );
  const [archiveDateSeparator, setArchiveDateSeparator] = useState<string>(
    String(settings?.["archive-date-separator"] ?? " "),
  );
  const [archiveDateFormat, setArchiveDateFormat] = useState<string>(
    String(settings?.["archive-date-format"] ?? "YYYY-MM-DD"),
  );
  const [maxArchiveSize, setMaxArchiveSize] = useState<string>(
    String(settings?.["max-archive-size"] ?? -1),
  );
  const [inlineMetadataPosition, setInlineMetadataPosition] = useState<string>(
    String(settings?.["inline-metadata-position"] ?? "body"),
  );
  const [moveTaskMetadata, setMoveTaskMetadata] = useState<boolean>(
    settings?.["move-task-metadata"] !== false,
  );
  const [newNoteTemplate, setNewNoteTemplate] = useState<string>(
    String(settings?.["new-note-template"] ?? ""),
  );
  const [newNoteFolder, setNewNoteFolder] = useState<string>(
    String(settings?.["new-note-folder"] ?? ""),
  );
  const [showAddList, setShowAddList] = useState<boolean>(settings?.["show-add-list"] !== false);
  const [showArchiveAll, setShowArchiveAll] = useState<boolean>(
    settings?.["show-archive-all"] !== false,
  );
  const [showViewAsMarkdown, setShowViewAsMarkdown] = useState<boolean>(
    settings?.["show-view-as-markdown"] !== false,
  );
  const [showBoardSettings, setShowBoardSettings] = useState<boolean>(
    settings?.["show-board-settings"] !== false,
  );
  const [showSearch, setShowSearch] = useState<boolean>(settings?.["show-search"] !== false);
  const [showSetView, setShowSetView] = useState<boolean>(settings?.["show-set-view"] !== false);
  const [fullListLaneWidth, setFullListLaneWidth] = useState<boolean>(
    settings?.["full-list-lane-width"] === true,
  );
  const [showTitle, setShowTitle] = useState<boolean>(settings?.["show-title"] !== false);
  const [customTitle, setCustomTitle] = useState<string>(String(settings?.["custom-title"] ?? ""));
  const [accentColor, setAccentColor] = useState<string>(String(settings?.["accent-color"] ?? ""));

  // Sync all state from settings prop when it changes (e.g., after save from another session)
  useEffect(() => {
    if (!settings) return;

    setLaneWidth(String(settings["lane-width"] ?? 270));
    setDateFormat(String(settings["date-format"] ?? "YYYY-MM-DD"));
    setTimeFormat(String(settings["time-format"] ?? "HH:mm"));
    setShowCheckboxes(settings["show-checkboxes"] !== false);
    setNewCardInsertion(String(settings["new-card-insertion-method"] ?? "append"));
    setHideCardCount(settings["hide-card-count"] === true);
    setMoveTags(settings["move-tags"] !== false);
    setTagAction(String(settings["tag-action"] ?? "obsidian"));
    setTagColors(
      (settings["tag-colors"] as Array<{
        tagKey: string;
        color: string;
        backgroundColor: string;
      }>) ?? [],
    );
    setTagSort((settings["tag-sort"] as Array<{ tag: string }>) ?? []);
    setMoveDates(settings["move-dates"] !== false);
    setDateTrigger(String(settings["date-trigger"] ?? "@"));
    setTimeTrigger(String(settings["time-trigger"] ?? "@"));
    setDateDisplayFormat(String(settings["date-display-format"] ?? "YYYY-MM-DD"));
    setShowRelativeDate(settings["show-relative-date"] === true);
    setDatePickerWeekStart(String(settings["date-picker-week-start"] ?? "1"));
    setArchiveWithDate(settings["archive-with-date"] === true);
    setAppendArchiveDate(settings["append-archive-date"] === true);
    setArchiveDateSeparator(String(settings["archive-date-separator"] ?? " "));
    setArchiveDateFormat(String(settings["archive-date-format"] ?? "YYYY-MM-DD"));
    setMaxArchiveSize(String(settings["max-archive-size"] ?? -1));
    setInlineMetadataPosition(String(settings["inline-metadata-position"] ?? "body"));
    setMoveTaskMetadata(settings["move-task-metadata"] !== false);
    setNewNoteTemplate(String(settings["new-note-template"] ?? ""));
    setNewNoteFolder(String(settings["new-note-folder"] ?? ""));
    setShowAddList(settings["show-add-list"] !== false);
    setShowArchiveAll(settings["show-archive-all"] !== false);
    setShowViewAsMarkdown(settings["show-view-as-markdown"] !== false);
    setShowBoardSettings(settings["show-board-settings"] !== false);
    setShowSearch(settings["show-search"] !== false);
    setShowSetView(settings["show-set-view"] !== false);
    setFullListLaneWidth(settings["full-list-lane-width"] === true);
    setShowTitle(settings["show-title"] !== false);
    setCustomTitle(String(settings["custom-title"] ?? ""));
    setAccentColor(String(settings["accent-color"] ?? ""));
  }, [settings]);

  const originalSettingsRef = useRef<Record<string, unknown>>(settings ?? {});

  const hasChanges = (() => {
    const original = originalSettingsRef.current ?? {};

    // String fields (compare as strings)
    if (String(original["lane-width"] ?? 270) !== laneWidth) return true;
    if (String(original["date-format"] ?? "YYYY-MM-DD") !== dateFormat) return true;
    if (String(original["time-format"] ?? "HH:mm") !== timeFormat) return true;
    if (String(original["date-trigger"] ?? "@") !== dateTrigger) return true;
    if (String(original["time-trigger"] ?? "@") !== timeTrigger) return true;
    if (String(original["date-display-format"] ?? "YYYY-MM-DD") !== dateDisplayFormat) return true;
    if (String(original["date-picker-week-start"] ?? 1) !== datePickerWeekStart) return true;
    if (String(original["archive-date-separator"] ?? " ") !== archiveDateSeparator) return true;
    if (String(original["archive-date-format"] ?? "YYYY-MM-DD") !== archiveDateFormat) return true;
    if (String(original["max-archive-size"] ?? -1) !== maxArchiveSize) return true;
    if (String(original["inline-metadata-position"] ?? "body") !== inlineMetadataPosition)
      return true;
    if (String(original["new-note-template"] ?? "") !== newNoteTemplate) return true;
    if (String(original["new-note-folder"] ?? "") !== newNoteFolder) return true;
    if (String(original["new-card-insertion-method"] ?? "append") !== newCardInsertion) return true;
    if (String(original["tag-action"] ?? "obsidian") !== tagAction) return true;
    if (String(original["accent-color"] ?? "") !== accentColor) return true;
    if (String(original["custom-title"] ?? "") !== customTitle) return true;

    // Boolean fields (compare as booleans)
    if ((original["show-checkboxes"] ?? false) !== showCheckboxes) return true;
    if ((original["hide-card-count"] ?? false) !== hideCardCount) return true;
    if ((original["move-tags"] ?? false) !== moveTags) return true;
    if ((original["move-dates"] ?? false) !== moveDates) return true;
    if ((original["show-relative-date"] ?? false) !== showRelativeDate) return true;
    if ((original["archive-with-date"] ?? false) !== archiveWithDate) return true;
    if ((original["append-archive-date"] ?? false) !== appendArchiveDate) return true;
    if ((original["move-task-metadata"] ?? false) !== moveTaskMetadata) return true;
    if ((original["show-add-list"] ?? false) !== showAddList) return true;
    if ((original["show-archive-all"] ?? false) !== showArchiveAll) return true;
    if ((original["show-view-as-markdown"] ?? false) !== showViewAsMarkdown) return true;
    if ((original["show-board-settings"] ?? false) !== showBoardSettings) return true;
    if ((original["show-search"] ?? false) !== showSearch) return true;
    if ((original["show-set-view"] ?? false) !== showSetView) return true;
    if ((original["full-list-lane-width"] ?? false) !== fullListLaneWidth) return true;
    if ((original["show-title"] ?? true) !== showTitle) return true;

    // Array fields (element-by-element comparison)
    const origTagColors =
      (original["tag-colors"] as Array<{
        tagKey: string;
        color: string;
        backgroundColor: string;
      }>) ?? [];
    if (tagColors.length !== origTagColors.length) return true;
    if (
      !tagColors.every(
        (tc, i) =>
          tc.tagKey === origTagColors[i]?.tagKey &&
          tc.color === origTagColors[i]?.color &&
          tc.backgroundColor === origTagColors[i]?.backgroundColor,
      )
    )
      return true;

    const origTagSort = (original["tag-sort"] as Array<{ tag: string }>) ?? [];
    if (tagSort.length !== origTagSort.length) return true;
    if (!tagSort.every((ts, i) => ts.tag === origTagSort[i]?.tag)) return true;

    return false;
  })();

  const handleSave = useCallback(() => {
    onSave({
      "lane-width": parseInt(laneWidth, 10) || 270,
      "date-format": dateFormat || "YYYY-MM-DD",
      "time-format": timeFormat || "HH:mm",
      "show-checkboxes": showCheckboxes,
      "new-card-insertion-method": newCardInsertion,
      "hide-card-count": hideCardCount,
      "move-tags": moveTags,
      "tag-action": tagAction,
      "tag-colors": tagColors,
      "tag-sort": tagSort,
      "move-dates": moveDates,
      "date-trigger": dateTrigger,
      "time-trigger": timeTrigger,
      "date-display-format": dateDisplayFormat || "YYYY-MM-DD",
      "show-relative-date": showRelativeDate,
      "date-picker-week-start": parseInt(datePickerWeekStart, 10) || 1,
      "archive-with-date": archiveWithDate,
      "append-archive-date": appendArchiveDate,
      "archive-date-separator": archiveDateSeparator,
      "archive-date-format": archiveDateFormat || "YYYY-MM-DD",
      "max-archive-size": parseInt(maxArchiveSize, 10) || -1,
      "inline-metadata-position": inlineMetadataPosition,
      "move-task-metadata": moveTaskMetadata,
      "new-note-template": newNoteTemplate,
      "new-note-folder": newNoteFolder,
      "show-add-list": showAddList,
      "show-archive-all": showArchiveAll,
      "show-view-as-markdown": showViewAsMarkdown,
      "show-board-settings": true,
      "show-search": showSearch,
      "show-set-view": showSetView,
      "full-list-lane-width": fullListLaneWidth,
      "show-title": showTitle,
      "custom-title": customTitle || undefined,
      "accent-color": accentColor || undefined,
    });
  }, [
    laneWidth,
    dateFormat,
    timeFormat,
    showCheckboxes,
    newCardInsertion,
    hideCardCount,
    moveTags,
    tagAction,
    tagColors,
    tagSort,
    moveDates,
    dateTrigger,
    timeTrigger,
    dateDisplayFormat,
    showRelativeDate,
    datePickerWeekStart,
    archiveWithDate,
    appendArchiveDate,
    archiveDateSeparator,
    archiveDateFormat,
    maxArchiveSize,
    inlineMetadataPosition,
    moveTaskMetadata,
    newNoteTemplate,
    newNoteFolder,
    showAddList,
    showArchiveAll,
    showViewAsMarkdown,
    showSearch,
    showSetView,
    fullListLaneWidth,
    showTitle,
    customTitle,
    accentColor,
    onSave,
  ]);

  return (
    <div className="settings-panel">
      {/* Board Format Section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Board Format</h3>
        <div className="settings-field">
          <label htmlFor="setting-show-checkboxes">
            <input
              id="setting-show-checkboxes"
              type="checkbox"
              checked={showCheckboxes}
              onChange={(e) => setShowCheckboxes(e.target.checked)}
            />
            Show checkboxes
          </label>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-new-card-insertion">Card Insertion</label>
          <select
            id="setting-new-card-insertion"
            value={newCardInsertion}
            onChange={(e) => setNewCardInsertion(e.target.value)}
          >
            <option value="append">Append (bottom)</option>
            <option value="prepend">Prepend (top)</option>
            <option value="prepend-compact">Prepend compact (top)</option>
          </select>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-hide-card-count">
            <input
              id="setting-hide-card-count"
              type="checkbox"
              checked={hideCardCount}
              onChange={(e) => setHideCardCount(e.target.checked)}
            />
            Hide card count
          </label>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-lane-width">Lane Width</label>
          <input
            id="setting-lane-width"
            type="number"
            min={150}
            max={600}
            step={10}
            value={laneWidth}
            onChange={(e) => setLaneWidth(e.target.value)}
          />
        </div>
        <div className="settings-field">
          <label htmlFor="setting-accent-color">
            Accent Color<span className="settings-field-hint">(hex, e.g., #ff6600)</span>
          </label>
          <div className="accent-color-input-row">
            <input
              id="setting-accent-color"
              type="color"
              value={accentColor || "#808080"}
              onChange={(e) => setAccentColor(e.target.value)}
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#ff6600 or empty for native"
              pattern="^#[0-9a-fA-F]{0,6}$"
            />
            {accentColor && (
              <button
                className="accent-color-clear"
                onClick={() => setAccentColor("")}
                title="Use VS Code native colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Tags</h3>
        <div className="settings-field">
          <label htmlFor="setting-move-tags">
            <input
              id="setting-move-tags"
              type="checkbox"
              checked={moveTags}
              onChange={(e) => setMoveTags(e.target.checked)}
            />
            Extract tags
          </label>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-tag-action">Tag Click Action</label>
          <select
            id="setting-tag-action"
            value={tagAction}
            onChange={(e) => setTagAction(e.target.value)}
          >
            <option value="kanban">Filter by tag</option>
            <option value="obsidian">Open search</option>
          </select>
        </div>

        {/* Tag Colors */}
        <div className="settings-field settings-field-full">
          <label>Tag Colors</label>
          {tagColors.map((tc, idx) => (
            <div key={tc.tagKey} className="tag-color-row">
              <span className="tag-color-key">#{tc.tagKey}</span>
              <input
                type="color"
                value={tc.color}
                onChange={(e) => {
                  const updated = [...tagColors];
                  updated[idx] = { ...tc, color: e.target.value };
                  setTagColors(updated);
                }}
              />
              <button
                className="tag-color-remove"
                onClick={() => setTagColors(tagColors.filter((_, i) => i !== idx))}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="tag-color-add">
            <input
              type="text"
              placeholder="tag name"
              value={newTagColorKey}
              onChange={(e) => setNewTagColorKey(e.target.value)}
            />
            <input
              type="color"
              value={newTagColorValue}
              onChange={(e) => setNewTagColorValue(e.target.value)}
            />
            <button
              onClick={() => {
                if (newTagColorKey.trim()) {
                  setTagColors([
                    ...tagColors,
                    {
                      tagKey: newTagColorKey.trim(),
                      color: newTagColorValue,
                      backgroundColor: "#fff",
                    },
                  ]);
                  setNewTagColorKey("");
                }
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Tag Sort Order */}
        <div className="settings-field settings-field-full">
          <label>Tag Sort Order</label>
          {tagSort.map((ts, idx) => (
            <div key={ts.tag} className="tag-sort-row">
              <span className="tag-sort-key">#{ts.tag}</span>
              <div className="tag-sort-buttons">
                <button
                  disabled={idx === 0}
                  onClick={() => {
                    const updated = [...tagSort];
                    [updated[idx - 1]!, updated[idx]!] = [updated[idx]!, updated[idx - 1]!];
                    setTagSort(updated);
                  }}
                >
                  ↑
                </button>
                <button
                  disabled={idx === tagSort.length - 1}
                  onClick={() => {
                    const updated = [...tagSort];
                    [updated[idx]!, updated[idx + 1]!] = [updated[idx + 1]!, updated[idx]!];
                    setTagSort(updated);
                  }}
                >
                  ↓
                </button>
              </div>
              <button
                className="tag-sort-remove"
                onClick={() => setTagSort(tagSort.filter((_, i) => i !== idx))}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="tag-sort-add">
            <input
              type="text"
              placeholder="tag name"
              value={newTagSortKey}
              onChange={(e) => setNewTagSortKey(e.target.value)}
            />
            <button
              onClick={() => {
                if (
                  newTagSortKey.trim() &&
                  !tagSort.some((ts) => ts.tag === newTagSortKey.trim())
                ) {
                  setTagSort([...tagSort, { tag: newTagSortKey.trim() }]);
                  setNewTagSortKey("");
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Dates Section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Dates</h3>
        <div className="settings-field">
          <label htmlFor="setting-move-dates">
            <input
              id="setting-move-dates"
              type="checkbox"
              checked={moveDates}
              onChange={(e) => setMoveDates(e.target.checked)}
            />
            Extract dates
          </label>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-date-trigger">Date Trigger</label>
          <input
            id="setting-date-trigger"
            type="text"
            value={dateTrigger}
            onChange={(e) => setDateTrigger(e.target.value)}
            placeholder="@"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="setting-time-trigger">Time Trigger</label>
          <input
            id="setting-time-trigger"
            type="text"
            value={timeTrigger}
            onChange={(e) => setTimeTrigger(e.target.value)}
            placeholder="@"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="setting-date-display-format">Date Display Format</label>
          <input
            id="setting-date-display-format"
            type="text"
            value={dateDisplayFormat}
            onChange={(e) => setDateDisplayFormat(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="setting-date-format">Date Format</label>
          <input
            id="setting-date-format"
            type="text"
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="setting-time-format">Time Format</label>
          <input
            id="setting-time-format"
            type="text"
            value={timeFormat}
            onChange={(e) => setTimeFormat(e.target.value)}
            placeholder="HH:mm"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="setting-show-relative-date">
            <input
              id="setting-show-relative-date"
              type="checkbox"
              checked={showRelativeDate}
              onChange={(e) => setShowRelativeDate(e.target.checked)}
            />
            Relative dates
          </label>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-date-picker-week-start">Week Start</label>
          <select
            id="setting-date-picker-week-start"
            value={datePickerWeekStart}
            onChange={(e) => setDatePickerWeekStart(e.target.value)}
          >
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </select>
        </div>
      </div>

      {/* Archive Section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Archive</h3>
        <div className="settings-field">
          <label htmlFor="setting-archive-with-date">
            <input
              id="setting-archive-with-date"
              type="checkbox"
              checked={archiveWithDate}
              onChange={(e) => setArchiveWithDate(e.target.checked)}
            />
            Archive with date
          </label>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-append-archive-date">
            <input
              id="setting-append-archive-date"
              type="checkbox"
              checked={appendArchiveDate}
              onChange={(e) => setAppendArchiveDate(e.target.checked)}
            />
            Append archive date
          </label>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-archive-date-sep">Date Separator</label>
          <input
            id="setting-archive-date-sep"
            type="text"
            value={archiveDateSeparator}
            onChange={(e) => setArchiveDateSeparator(e.target.value)}
            placeholder=" "
          />
        </div>
        <div className="settings-field">
          <label htmlFor="setting-archive-date-fmt">Archive Date Format</label>
          <input
            id="setting-archive-date-fmt"
            type="text"
            value={archiveDateFormat}
            onChange={(e) => setArchiveDateFormat(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="setting-max-archive">Max Archive Size</label>
          <input
            id="setting-max-archive"
            type="number"
            value={maxArchiveSize}
            onChange={(e) => setMaxArchiveSize(e.target.value)}
            placeholder="-1"
          />
        </div>
      </div>

      {/* Metadata Section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Metadata</h3>
        <div className="settings-field">
          <label htmlFor="setting-inline-meta-pos">Metadata Position</label>
          <select
            id="setting-inline-meta-pos"
            value={inlineMetadataPosition}
            onChange={(e) => setInlineMetadataPosition(e.target.value)}
          >
            <option value="body">Body</option>
            <option value="footer">Footer</option>
            <option value="metadata-table">Metadata table</option>
          </select>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-move-task-meta">
            <input
              id="setting-move-task-meta"
              type="checkbox"
              checked={moveTaskMetadata}
              onChange={(e) => setMoveTaskMetadata(e.target.checked)}
            />
            Extract task metadata
          </label>
        </div>
      </div>

      {/* Note Creation Section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Note Creation</h3>
        <div className="settings-field">
          <label htmlFor="setting-note-template">Template</label>
          <input
            id="setting-note-template"
            type="text"
            value={newNoteTemplate}
            onChange={(e) => setNewNoteTemplate(e.target.value)}
            placeholder="Template path"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="setting-note-folder">Folder</label>
          <input
            id="setting-note-folder"
            type="text"
            value={newNoteFolder}
            onChange={(e) => setNewNoteFolder(e.target.value)}
            placeholder="Folder path"
          />
        </div>
      </div>

      {/* Header Buttons Section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Header Buttons</h3>
        <div className="settings-field">
          <label htmlFor="setting-show-add-list">
            <input
              id="setting-show-add-list"
              type="checkbox"
              checked={showAddList}
              onChange={(e) => setShowAddList(e.target.checked)}
            />
            Add list
          </label>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-show-archive-all">
            <input
              id="setting-show-archive-all"
              type="checkbox"
              checked={showArchiveAll}
              onChange={(e) => setShowArchiveAll(e.target.checked)}
            />
            Archive all
          </label>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-show-markdown">
            <input
              id="setting-show-markdown"
              type="checkbox"
              checked={showViewAsMarkdown}
              onChange={(e) => setShowViewAsMarkdown(e.target.checked)}
            />
            View as markdown
          </label>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-show-search">
            <input
              id="setting-show-search"
              type="checkbox"
              checked={showSearch}
              onChange={(e) => setShowSearch(e.target.checked)}
            />
            Search
          </label>
        </div>
        <div className="settings-field">
          <label htmlFor="setting-show-set-view">
            <input
              id="setting-show-set-view"
              type="checkbox"
              checked={showSetView}
              onChange={(e) => setShowSetView(e.target.checked)}
            />
            Set view
          </label>
        </div>
      </div>

      {/* List View Section */}
      <div className="settings-section">
        <h3 className="settings-section-title">List View</h3>
        <div className="settings-field">
          <label htmlFor="setting-full-list-lane-width">
            <input
              id="setting-full-list-lane-width"
              type="checkbox"
              checked={fullListLaneWidth}
              onChange={(e) => setFullListLaneWidth(e.target.checked)}
            />
            Full lane width
          </label>
        </div>
      </div>

      {/* Display Section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Display</h3>
        <div className="settings-field">
          <label htmlFor="setting-show-title">
            <input
              id="setting-show-title"
              type="checkbox"
              checked={showTitle}
              onChange={(e) => setShowTitle(e.target.checked)}
            />
            Show title
          </label>
        </div>
        {showTitle && (
          <div className="settings-field">
            <label htmlFor="setting-custom-title">Custom Title</label>
            <input
              id="setting-custom-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Enter custom title..."
            />
          </div>
        )}
      </div>

      <div className="settings-actions">
        <button className="settings-save-button" disabled={!hasChanges} onClick={handleSave}>
          Save
        </button>
        <button className="settings-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
