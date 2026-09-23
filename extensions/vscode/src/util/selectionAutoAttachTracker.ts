import { createHash } from "node:crypto";
import { Range } from "core";

// Per (session, file) hash of the last selection sent automatically, so
// we don't resend an unchanged selection on every outgoing message
// within the same conversation. Scoped per session so a new chat never
// inherits dedup state from a different conversation. The hash covers
// both the range and the content, so identical text selected at a
// different position in the same file is never mistaken for a repeat.
//
// Nothing ever removes an entry when a session ends, so this is capped
// at MAX_TRACKED_SELECTIONS with oldest-last-sent eviction to keep it
// bounded across a long-running extension host. Eviction only ever
// causes a harmless redundant resend, never an incorrect skip, so an
// approximate "oldest write" policy is fine; it deliberately doesn't
// bump order on reads, since isDuplicateSelection is meant to stay
// side-effect free.
const MAX_TRACKED_SELECTIONS = 200;
const lastSentHashBySessionAndFile = new Map<string, string>();

function hash(range: Range, contents: string): string {
  const rangeKey = `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
  return createHash("sha256").update(`${rangeKey}\n${contents}`).digest("hex");
}

/**
 * Read-only check: is this (range, contents) for `filepath` within
 * `sessionId` an exact repeat of the last selection actually recorded
 * as sent for that (session, file) pair? Does not mutate any state.
 */
export function isDuplicateSelection(
  sessionId: string,
  filepath: string,
  range: Range,
  contents: string,
): boolean {
  const key = `${sessionId}:${filepath}`;
  return lastSentHashBySessionAndFile.get(key) === hash(range, contents);
}

/**
 * Records that this (range, contents) for `filepath` within
 * `sessionId` was actually sent, so a later identical selection is
 * recognized as a duplicate by `isDuplicateSelection`. Call this only
 * once the message is confirmed to actually go out, not merely offered.
 */
export function recordSelectionSent(
  sessionId: string,
  filepath: string,
  range: Range,
  contents: string,
): void {
  const key = `${sessionId}:${filepath}`;
  // Delete before set so an existing key moves to the newest end of
  // the map's insertion order, keeping the oldest-first eviction below
  // accurate.
  lastSentHashBySessionAndFile.delete(key);
  lastSentHashBySessionAndFile.set(key, hash(range, contents));

  if (lastSentHashBySessionAndFile.size > MAX_TRACKED_SELECTIONS) {
    const oldestKey = lastSentHashBySessionAndFile.keys().next().value;
    if (oldestKey !== undefined) {
      lastSentHashBySessionAndFile.delete(oldestKey);
    }
  }
}
