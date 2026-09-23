import { createHash } from "node:crypto";

// Per (session, file) hash of the last selection content sent
// automatically, so we don't resend an unchanged selection on every
// outgoing message within the same conversation. Scoped per session so
// a new chat never inherits dedup state from a different conversation.
const lastSentHashBySessionAndFile = new Map<string, string>();

function hash(contents: string): string {
  return createHash("sha256").update(contents).digest("hex");
}

/**
 * Returns true (and records the hash) if `contents` for `filepath` within
 * `sessionId` has not already been sent, or has changed since the last
 * time it was sent in that same session. Returns false if it's an exact
 * repeat of the last send for that (session, file) pair.
 */
export function shouldSendSelection(
  sessionId: string,
  filepath: string,
  contents: string,
): boolean {
  const key = `${sessionId}:${filepath}`;
  const newHash = hash(contents);
  if (lastSentHashBySessionAndFile.get(key) === newHash) {
    return false;
  }
  lastSentHashBySessionAndFile.set(key, newHash);
  return true;
}
