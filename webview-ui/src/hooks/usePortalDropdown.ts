import { useState, useCallback, useEffect, useRef } from "react";

interface DropdownPosition {
  top: number;
  right: number;
}

interface UsePortalDropdownReturn {
  isOpen: boolean;
  position: DropdownPosition;
  triggerRef: React.RefObject<HTMLButtonElement>;
  open: (e: React.MouseEvent) => void;
  close: () => void;
}

export function usePortalDropdown(): UsePortalDropdownReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  return { isOpen, position, triggerRef, open, close };
}
