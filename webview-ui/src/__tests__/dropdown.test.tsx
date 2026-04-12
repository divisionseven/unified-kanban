// ─── PortalDropdown Component Tests ──────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { PortalDropdown } from "../components/PortalDropdown.js";

/**
 * Test wrapper that manages open/close state for PortalDropdown.
 * Mimics real usage: a trigger button opens the dropdown.
 */
function TestWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Menu</button>
      <PortalDropdown
        isOpen={isOpen}
        position={{ top: 100, right: 100 }}
        onClose={() => setIsOpen(false)}
        dropdownClassName="test-dropdown"
      >
        <div>Menu Item 1</div>
        <div>Menu Item 2</div>
      </PortalDropdown>
    </>
  );
}

describe("PortalDropdown", () => {
  it("renders nothing when closed", () => {
    render(<TestWrapper />);
    expect(screen.queryByText("Menu Item 1")).not.toBeInTheDocument();
  });

  it("renders menu items to document.body when open", () => {
    render(<TestWrapper />);
    fireEvent.click(screen.getByText("Open Menu"));
    expect(screen.getByText("Menu Item 1")).toBeInTheDocument();
    expect(screen.getByText("Menu Item 2")).toBeInTheDocument();
  });

  it("applies dropdownClassName to the dropdown container", () => {
    render(<TestWrapper />);
    fireEvent.click(screen.getByText("Open Menu"));
    const dropdown = document.querySelector(".test-dropdown");
    expect(dropdown).toBeInTheDocument();
  });

  it("positions dropdown using the provided position", () => {
    render(<TestWrapper />);
    fireEvent.click(screen.getByText("Open Menu"));
    const dropdown = document.querySelector(".test-dropdown");
    expect(dropdown).toBeDefined();
    if (dropdown) {
      const style = dropdown as HTMLElement;
      expect(style.style.top).toBe("100px");
      expect(style.style.right).toBe("100px");
    }
  });

  it("closes when clicking outside (overlay)", () => {
    render(<TestWrapper />);
    fireEvent.click(screen.getByText("Open Menu"));
    expect(screen.getByText("Menu Item 1")).toBeInTheDocument();
    // Click the overlay (the portal-dropdown-overlay div)
    const overlay = document.querySelector(".portal-dropdown-overlay");
    if (overlay) fireEvent.click(overlay);
    expect(screen.queryByText("Menu Item 1")).not.toBeInTheDocument();
  });
});
