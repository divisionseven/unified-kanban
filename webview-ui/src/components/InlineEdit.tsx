import { useState, useRef, useEffect, useCallback } from "react";

interface InlineEditProps {
  /** Initial text value for the textarea */
  defaultValue: string;
  /** Placeholder text shown when empty */
  placeholder?: string;
  /** Called when user confirms with Enter (or blur) */
  onConfirm: (value: string) => void;
  /** Called when user cancels with Escape */
  onCancel: () => void;
  /** CSS class for the textarea element */
  className?: string;
}

/**
 * Shared inline editing component with controlled textarea.
 *
 * Keyboard behavior:
 * - Enter → confirm (calls onConfirm)
 * - Escape → cancel (calls onCancel)
 * - Shift+Enter → insert newline (default behavior)
 * - Blur → confirm
 */
export function InlineEdit({
  defaultValue,
  placeholder,
  onConfirm,
  onCancel,
  className = "card-edit-textarea",
}: InlineEditProps): React.ReactElement {
  const [value, setValue] = useState(defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback((ta: HTMLTextAreaElement) => {
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

  // Auto-focus and auto-resize on mount
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
      autoResize(ta);
    }
  }, [autoResize]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      autoResize(e.target);
    },
    [autoResize],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onConfirm(value);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter" && e.shiftKey) {
        // Shift+Enter: insert newline with 2-space indentation for soft-wrapped continuation
        e.preventDefault();
        const ta = textareaRef.current;
        if (ta) {
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          const newValue = value.slice(0, start) + "\n  " + value.slice(end);
          setValue(newValue);
          // Move cursor after the inserted newline + indentation
          const newPos = start + 3; // "\n  " = 3 chars
          requestAnimationFrame(() => {
            ta.setSelectionRange(newPos, newPos);
          });
          // Trigger auto-resize after state update
          setTimeout(() => autoResize(ta), 0);
        }
      }
    },
    [value, onConfirm, onCancel, autoResize],
  );

  const handleBlur = useCallback(() => {
    onConfirm(value);
  }, [value, onConfirm]);

  return (
    <textarea
      ref={textareaRef}
      className={className}
      value={value}
      placeholder={placeholder}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      rows={1}
    />
  );
}
