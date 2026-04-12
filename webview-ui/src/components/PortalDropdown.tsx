import { createPortal } from "react-dom";
import type { ReactNode } from "react";

interface PortalDropdownProps {
  isOpen: boolean;
  position: { top: number; right: number };
  onClose: () => void;
  children: ReactNode;
  dropdownClassName?: string;
}

export function PortalDropdown({
  isOpen,
  position,
  onClose,
  children,
  dropdownClassName,
}: PortalDropdownProps) {
  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Click-outside overlay */}
      <div className="portal-dropdown-overlay" onClick={onClose} />
      {/* Dropdown menu */}
      <div
        className={`portal-dropdown ${dropdownClassName ?? ""}`}
        style={{
          top: position.top,
          right: position.right,
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
