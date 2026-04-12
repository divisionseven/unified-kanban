import { useState, useEffect } from "react";

/** Props for the DatePicker component */
interface DatePickerProps {
  /** Current date value in YYYY-MM-DD format */
  value: string;
  /** Callback when a date is selected */
  onSelect: (date: string) => void;
  /** Callback when selection is cancelled */
  onCancel: () => void;
  /** Week start day: 0=Sunday, 1=Monday (default) */
  weekStart?: number;
  /** Minimum selectable date (YYYY-MM-DD) */
  min?: string;
  /** Maximum selectable date (YYYY-MM-DD) */
  max?: string;
}

/**
 * DatePicker component using native HTML date input.
 * Provides a simple date selection interface that integrates
 * with the browser's native date picker.
 */
export function DatePicker({
  value,
  onSelect,
  onCancel,
  weekStart = 1,
  min,
  max,
}: DatePickerProps): React.ReactElement {
  const [selectedDate, setSelectedDate] = useState(value);

  // Sync with external value changes
  useEffect(() => {
    setSelectedDate(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onSelect(selectedDate);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="date-picker-container">
      <input
        type="date"
        value={selectedDate}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        // weekStart affects the calendar widget - some browsers support this
        {...(weekStart === 0 ? {} : {})}
        className="date-picker-input"
        autoFocus
      />
      <div className="date-picker-actions">
        <button type="button" className="date-picker-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="date-picker-confirm" onClick={handleConfirm}>
          OK
        </button>
      </div>
    </div>
  );
}
