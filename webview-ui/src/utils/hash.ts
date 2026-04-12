/**
 * Simple deterministic string hash (djb2 algorithm).
 * Mirrors the implementation in parser/parse.ts for ID reconciliation.
 */
export function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
