import "@testing-library/jest-dom/vitest";

// Mock the VS Code API that is only available inside a webview
const g = globalThis as any;
g.acquireVsCodeApi = () => ({
  postMessage: () => {},
  getState: () => undefined,
  setState: () => {},
});

// Mock navigator.clipboard for jsdom
Object.defineProperty(globalThis.navigator, "clipboard", {
  value: {
    writeText: () => Promise.resolve(),
    readText: () => Promise.resolve(""),
  },
  writable: true,
  configurable: true,
});
