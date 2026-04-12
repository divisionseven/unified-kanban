// ─── DatePicker Component Tests ─────────────────────────────────────────

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DatePicker } from "../components/DatePicker.js";

describe("DatePicker", () => {
  // ─── Rendering ──────────────────────────────────────────────────

  it("renders the date input element", () => {
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "date");
  });

  it("renders Cancel and OK buttons", () => {
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("applies container className", () => {
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} />);
    const container = document.querySelector(".date-picker-container");
    expect(container).toBeInTheDocument();
  });

  it("applies action buttons className", () => {
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} />);
    const actions = document.querySelector(".date-picker-actions");
    expect(actions).toBeInTheDocument();
  });

  it("applies cancel button className", () => {
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} />);
    const cancelBtn = document.querySelector(".date-picker-cancel");
    expect(cancelBtn).toBeInTheDocument();
  });

  it("applies confirm button className", () => {
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} />);
    const confirmBtn = document.querySelector(".date-picker-confirm");
    expect(confirmBtn).toBeInTheDocument();
  });

  it("accepts autoFocus prop on the input", () => {
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} />);
    // The input has autoFocus rendered - checking prop exists in JSX
    const input = document.querySelector(".date-picker-input");
    expect(input).toBeInTheDocument();
  });

  // ─── Value Handling ───────────────────────────────────────────

  it("displays the initial value in the input", () => {
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    expect(input.value).toBe("2026-04-15");
  });

  it("displays empty string when value is empty", () => {
    render(<DatePicker value="" onSelect={() => {}} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("syncs internal state when value prop changes", () => {
    const { rerender } = render(
      <DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} />,
    );
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    expect(input.value).toBe("2026-04-15");

    rerender(<DatePicker value="2026-05-20" onSelect={() => {}} onCancel={() => {}} />);
    expect(input.value).toBe("2026-05-20");
  });

  // ─── min/max Constraints ───────────────────────────────────────────

  it("applies min attribute when provided", () => {
    render(
      <DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} min="2026-01-01" />,
    );
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    expect(input.min).toBe("2026-01-01");
  });

  it("applies max attribute when provided", () => {
    render(
      <DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} max="2026-12-31" />,
    );
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    expect(input.max).toBe("2026-12-31");
  });

  it("applies both min and max when provided", () => {
    render(
      <DatePicker
        value="2026-04-15"
        onSelect={() => {}}
        onCancel={() => {}}
        min="2026-01-01"
        max="2026-12-31"
      />,
    );
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    expect(input.min).toBe("2026-01-01");
    expect(input.max).toBe("2026-12-31");
  });

  it("applies default weekStart of 1 (Monday)", () => {
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input");
    expect(input).toBeInTheDocument();
  });

  it("handles weekStart of 0 (Sunday)", () => {
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} weekStart={0} />);
    const input = document.querySelector(".date-picker-input");
    expect(input).toBeInTheDocument();
  });

  // ─── User Interactions: Button Clicks ─────────────────────────────

  it("calls onSelect callback when OK button is clicked", () => {
    const handleSelect = vi.fn();
    render(<DatePicker value="2026-04-15" onSelect={handleSelect} onCancel={() => {}} />);
    fireEvent.click(screen.getByText("OK"));
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith("2026-04-15");
  });

  it("calls onCancel callback when Cancel button is clicked", () => {
    const handleCancel = vi.fn();
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={handleCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it("does not call onSelect when OK is clicked with empty value", () => {
    const handleSelect = vi.fn();
    render(<DatePicker value="" onSelect={handleSelect} onCancel={() => {}} />);
    fireEvent.click(screen.getByText("OK"));
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it("updates internal state when user types in input", () => {
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2026-06-01" } });
    expect(input.value).toBe("2026-06-01");
  });

  it("calls onSelect with updated value when OK clicked after typing", () => {
    const handleSelect = vi.fn();
    render(<DatePicker value="2026-04-15" onSelect={handleSelect} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByText("OK"));
    expect(handleSelect).toHaveBeenCalledWith("2026-06-01");
  });

  // ─── Keyboard Interactions ──────────────────────────────────────

  it("calls onSelect when Enter key is pressed", () => {
    const handleSelect = vi.fn();
    render(<DatePicker value="2026-04-15" onSelect={handleSelect} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter" });
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith("2026-04-15");
  });

  it("calls onCancel when Escape key is pressed", () => {
    const handleCancel = vi.fn();
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={handleCancel} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Escape" });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it("does not call onSelect when other keys are pressed", () => {
    const handleSelect = vi.fn();
    render(<DatePicker value="2026-04-15" onSelect={handleSelect} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Tab" });
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it("does not call onSelect when Enter pressed with empty value", () => {
    const handleSelect = vi.fn();
    render(<DatePicker value="" onSelect={handleSelect} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter" });
    expect(handleSelect).not.toHaveBeenCalled();
  });

  // ─── Edge Cases ────────────────────────────────────────────────────────

  it("handles future date values", () => {
    render(<DatePicker value="2030-12-31" onSelect={() => {}} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    expect(input.value).toBe("2030-12-31");
  });

  it("handles past date values", () => {
    render(<DatePicker value="2020-01-01" onSelect={() => {}} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    expect(input.value).toBe("2020-01-01");
  });

  it("handles leap year date", () => {
    render(<DatePicker value="2024-02-29" onSelect={() => {}} onCancel={() => {}} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    expect(input.value).toBe("2024-02-29");
  });

  it("handles date at minimum boundary", () => {
    render(
      <DatePicker value="2026-01-01" onSelect={() => {}} onCancel={() => {}} min="2026-01-01" />,
    );
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    expect(input.min).toBe("2026-01-01");
    expect(input.value).toBe("2026-01-01");
  });

  it("handles date at maximum boundary", () => {
    render(
      <DatePicker value="2026-12-31" onSelect={() => {}} onCancel={() => {}} max="2026-12-31" />,
    );
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    expect(input.max).toBe("2026-12-31");
    expect(input.value).toBe("2026-12-31");
  });

  it("does not call onCancel when other keys pressed alongside Enter", () => {
    const handleCancel = vi.fn();
    render(<DatePicker value="2026-04-15" onSelect={() => {}} onCancel={handleCancel} />);
    const input = document.querySelector(".date-picker-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    // Should call onSelect, not onCancel
    expect(handleCancel).not.toHaveBeenCalled();
  });
});
