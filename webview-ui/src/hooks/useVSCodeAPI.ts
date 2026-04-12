import type { WebviewMessage } from "../../../src/messages.ts";

/**
 * Typed wrapper around the VS Code API object available in webviews.
 * Uses acquireVsCodeApi() which is injected by the VS Code webview host.
 */
interface VSCodeApi {
  postMessage(message: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

// acquireVsCodeApi is injected by VS Code into the webview context
declare function acquireVsCodeApi(): VSCodeApi;

const vscodeApi: VSCodeApi = acquireVsCodeApi();

export function postMessage(message: WebviewMessage): void {
  vscodeApi.postMessage(message);
}

export function getState<T>(): T | undefined {
  return vscodeApi.getState() as T | undefined;
}

export function setState<T>(state: T): void {
  vscodeApi.setState(state);
}
