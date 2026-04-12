## 2026-04-11 - Fix: Accent Color Not Resetting to Default

### Overview

Fixed an issue where custom accent colors were not being cleared when the user removed the color value, causing the board to retain the old custom color instead of reverting to the VS Code theme default.

### Root Cause

**Location:** `webview-ui/src/App.tsx:67-68` **Mechanism:** The useEffect that sets the CSS variable `--board-accent-color` only executed `setProperty` when there was a color value present. It never removed or cleared the CSS variable when the accentColor was emptied, so the stale custom color persisted on the page.

### Fix Applied

**Change:** Added an else branch to the useEffect that calls `document.documentElement.style.removeProperty("--board-accent-color")` when accentColor is empty or undefined. **Why it prevents recurrence:** Now when the user clears the accent color field, the CSS variable is explicitly removed, allowing the CSS fallback chain to provide the VS Code theme default.

### Changes Made

- **File**: `webview-ui/src/App.tsx`
  - Added else branch in useEffect to remove the `--board-accent-color` CSS variable when accentColor is falsy
  - Impact: Users can now properly reset the accent color to the default by clearing the field

### Files Modified

| File                     | Change Type | Description                             |
| ------------------------ | ----------- | --------------------------------------- |
| `webview-ui/src/App.tsx` | Modified    | Added CSS variable cleanup in useEffect |

### Testing

- Regression test: Not required (simple CSS manipulation fix; CSS fallback chain handles default behavior)

### Impact

- Performance: No impact
- Functionality: Users can now clear the accent color and see the VS Code theme default
- Breaking: None
