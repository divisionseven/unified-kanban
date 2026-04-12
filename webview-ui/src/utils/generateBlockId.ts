const CHARSET = "abcdefghijklmnopqrstuvwxyz0123456789";
const LENGTH = 6;

/**
 * Generate a random 6-character lowercase alphanumeric block ID.
 * Uses crypto.getRandomValues (available in webview Chromium).
 * Returns string like "a1b2c3" — no caret prefix.
 */
export function generateBlockId(): string {
  const array = new Uint8Array(LENGTH);
  crypto.getRandomValues(array);
  let result = "";
  for (let i = 0; i < LENGTH; i++) {
    result += CHARSET[array[i]! % CHARSET.length];
  }
  return result;
}
