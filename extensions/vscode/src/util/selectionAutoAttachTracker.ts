import { createHash } from "node:crypto";
import { Range } from "core";

// Per (session, file) hash of the last selection sent automatically, so
// we don't resend an unchanged selection on every outgoing message
// within the same conversation. Scoped per session so a new chat never
// inherits dedup state from a different conversation. The hash covers
// both the range and the content, so identical text selected at a
// different position in the same file is never mistaken for a repeat.
const lastSentHashBySessionAndFile = new Map<string, string>();

function hash(range: Range, contents: string): string {
  const rangeKey = `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
  return createHash("sha256").update(`${rangeKey}\n${contents}`).digest("hex");
}

/**
 * Returns true (and records the hash) if this (range, contents) for
 * `filepath` within `sessionId` has not already been sent, or has
 * changed since the last time it was sent in that same session. Returns
 * false if it's an exact repeat of the last send for that (session,
 * file) pair.
 */
export function shouldSendSelection(
  sessionId: string,
  filepath: string,
  range: Range,
  contents: string,
): boolean {
  const key = `${sessionId}:${filepath}`;
  const newHash = hash(range, contents);
  if (lastSentHashBySessionAndFile.get(key) === newHash) {
    return false;
  }
  lastSentHashBySessionAndFile.set(key, newHash);
  return true;
}
