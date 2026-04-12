// ─── InlineEdit Component Tests ───────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InlineEdit } from "../components/InlineEdit.js";

describe("InlineEdit", () => {
  let onConfirmSpy: ReturnType<typeof vi.fn>;
  let onCancelSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onConfirmSpy = vi.fn();
    onCancelSpy = vi.fn();
  });

  afterEach(() => {
    onConfirmSpy.mockRestore();
    onCancelSpy.mockRestore();
  });

  // ─── Component Rendering ─────────────────────────────────────────────────

  it("renders textarea with defaultValue", () => {
    render(
      <InlineEdit defaultValue="Initial text" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />,
    );
    const textarea = screen.getByDisplayValue("Initial text");
    expect(textarea).toBeInTheDocument();
  });

  it("renders textarea with empty defaultValue", () => {
    render(<InlineEdit defaultValue="" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("");
  });

  it("renders with default className", () => {
    render(<InlineEdit defaultValue="Test" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass("card-edit-textarea");
  });

  it("renders with custom className", () => {
    render(
      <InlineEdit
        defaultValue="Test"
        onConfirm={onConfirmSpy}
        onCancel={onCancelSpy}
        className="custom-class"
      />,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass("custom-class");
  });

  it("renders with placeholder when provided", () => {
    render(
      <InlineEdit
        defaultValue=""
        placeholder="Enter text..."
        onConfirm={onConfirmSpy}
        onCancel={onCancelSpy}
      />,
    );
    const textarea = screen.getByPlaceholderText("Enter text...");
    expect(textarea).toBeInTheDocument();
  });

  // ─── Text Input ──────────────────────────────────────────────────────────

  it("allows text input", () => {
    render(<InlineEdit defaultValue="Initial" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "New value" } });
    expect(textarea).toHaveValue("New value");
  });

  // ─── Save on Enter ────────────────────────────────────────────────────────

  it("calls onConfirm with current value on Enter key", () => {
    render(<InlineEdit defaultValue="Initial" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "New value" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onConfirmSpy).toHaveBeenCalledWith("New value");
  });

  it("does not call onConfirm on Shift+Enter (inserts newline)", () => {
    render(<InlineEdit defaultValue="Line 1" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    // Set cursor position at end
    fireEvent.change(textarea, { target: { value: "Line 1" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    // onConfirm should NOT be called on Shift+Enter
    expect(onConfirmSpy).not.toHaveBeenCalled();
  });

  // ─── Cancel on Escape ────────────────────────────────────────────────────

  it("calls onCancel on Escape key", () => {
    render(<InlineEdit defaultValue="Initial" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(onCancelSpy).toHaveBeenCalled();
  });

  it("does not call onConfirm when Escape is pressed", () => {
    render(<InlineEdit defaultValue="Initial" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(onConfirmSpy).not.toHaveBeenCalled();
  });

  // ─── Save on Blur ────────────────────────────────────────────────────────

  it("calls onConfirm on blur", () => {
    render(<InlineEdit defaultValue="Initial" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "New value" } });
    fireEvent.blur(textarea);
    expect(onConfirmSpy).toHaveBeenCalledWith("New value");
  });

  // ─── Empty Value Handling ───────────────────────────────────────────────

  it("allows saving empty value via Enter", () => {
    render(<InlineEdit defaultValue="Initial" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onConfirmSpy).toHaveBeenCalledWith("");
  });

  it("allows saving empty value via blur", () => {
    render(<InlineEdit defaultValue="Initial" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "" } });
    fireEvent.blur(textarea);
    expect(onConfirmSpy).toHaveBeenCalledWith("");
  });

  // ─── Shift+Enter Newline Insertion ───────────────────────────────────────

  it("inserts newline with 2-space indentation on Shift+Enter", () => {
    render(<InlineEdit defaultValue="Line 1" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    // Need to set selection range for cursor position
    const ta = textarea as HTMLTextAreaElement;
    ta.setSelectionRange(6, 6); // After "Line 1"
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(ta.value).toBe("Line 1\n  ");
  });

  // ─── Auto-resize Behavior ─────────────────────────────────────────────────

  it("renders textarea with rows=1", () => {
    render(<InlineEdit defaultValue="Test" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("rows", "1");
  });

  // ─── Props Passing ───────────────────────────────────────────────────────

  it("passes all props to the textarea element", () => {
    render(
      <InlineEdit
        defaultValue="Test content"
        placeholder="Type here..."
        onConfirm={onConfirmSpy}
        onCancel={onCancelSpy}
        className="my-class another-class"
      />,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("Test content");
    expect(textarea).toHaveAttribute("placeholder", "Type here...");
    expect(textarea).toHaveClass("my-class", "another-class");
  });

  // ─── Multiple Interactions ───────────────────────────────────────────────

  it("accumulates multiple keystrokes before confirming", () => {
    render(<InlineEdit defaultValue="A" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "AB" } });
    fireEvent.change(textarea, { target: { value: "ABC" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onConfirmSpy).toHaveBeenCalledWith("ABC");
  });

  it("cancels after typing and pressing Escape", () => {
    render(<InlineEdit defaultValue="Original" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Modified" } });
    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(onCancelSpy).toHaveBeenCalled();
    expect(onConfirmSpy).not.toHaveBeenCalled();
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────

  it("handles very long text", () => {
    const longText = "A".repeat(1000);
    render(<InlineEdit defaultValue={longText} onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onConfirmSpy).toHaveBeenCalledWith(longText);
  });

  it("handles special characters in value", () => {
    const specialText = "Test <script>alert('xss')</script> & \"quoted\"";
    render(
      <InlineEdit defaultValue={specialText} onConfirm={onConfirmSpy} onCancel={onCancelSpy} />,
    );
    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onConfirmSpy).toHaveBeenCalledWith(specialText);
  });

  it("handles newline characters in default value", () => {
    const multilineText = "Line 1\nLine 2";
    render(
      <InlineEdit defaultValue={multilineText} onConfirm={onConfirmSpy} onCancel={onCancelSpy} />,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue(multilineText);
  });

  // ─── Focus Behavior ───────────────────────────────────────────────────────

  it("textarea is focused on mount", () => {
    render(<InlineEdit defaultValue="Test" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveFocus();
  });

  // ─── Default Props Behavior ───────────────────────────────────────────────

  it("uses default className when not provided", () => {
    render(<InlineEdit defaultValue="Test" onConfirm={onConfirmSpy} onCancel={onCancelSpy} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toBe("card-edit-textarea");
  });
});
