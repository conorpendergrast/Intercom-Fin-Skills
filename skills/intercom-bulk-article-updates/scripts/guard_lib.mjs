// Shared helpers for guarded Intercom article writes.
// Motivation: a bulk run once PUT an article with its whole body HTML-escaped
// (`<div…>` -> `&lt;div…&gt;`) and never ran a verify step, so it shipped and
// rendered the raw source as text. These helpers make that class of bug both
// un-writable (pre-write guard) and detectable (escape signature).
import { execFileSync } from 'node:child_process';

// Corruption signature: HTML tags appearing ESCAPED as literal text in a body.
// A correctly-authored Intercom body holds real tags (`<div>`), never `&lt;div`.
export const ESCAPE_SIG = /&lt;(div|p[ >]|a |h[1-6]|ul|ol|li|b>|\/)/;

export function isCorrupted(body) {
  return ESCAPE_SIG.test(body || '');
}

// Fetch a live article via the authenticated intercom CLI. Throws on failure.
export function getArticle(id) {
  const out = execFileSync('intercom', ['api', `/articles/${id}`, '--json'], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(out);
}

// PRE-WRITE guard: is this body safe to PUT as raw HTML?
// The single most important gate — it runs BEFORE the write, so a mis-encoded
// body never reaches Intercom in the first place.
//
// TRADE-OFF (tune to your content): how strict to be.
//   - Too strict -> false-rejects a legit article that shows escaped tags in a
//                   code sample (a doc literally teaching `&lt;div&gt;`).
//   - Too loose  -> lets a fully-escaped body through — the incident.
// Default assumes Help Center articles don't contain large runs of escaped
// markup. Raise MAX_ESCAPED_TAGS (or special-case ids) if yours do.
const MAX_ESCAPED_TAGS = 3;
export function bodyLooksSafe(body) {
  const b = body || '';
  if (!b.trim()) return { safe: false, reason: 'empty body' };
  if (!/<[a-z][^>]*>/i.test(b)) return { safe: false, reason: 'no raw HTML tags present' };
  if (/^\s*<[a-z][^>]*>\s*&lt;/i.test(b) || /^\s*&lt;/.test(b))
    return { safe: false, reason: 'body opens with an escaped tag (double-encoded)' };
  const escapedTags = (b.match(/&lt;\/?[a-z]/gi) || []).length;
  if (escapedTags > MAX_ESCAPED_TAGS)
    return { safe: false, reason: `${escapedTags} escaped HTML tags (> ${MAX_ESCAPED_TAGS}); looks double-encoded` };
  return { safe: true };
}
