// GUARD — deterministic guarded write path.
// Replaces ad-hoc writes with one code path that CANNOT ship the escaped-body
// bug: back up -> apply the edit in code -> pre-PUT encode guard -> PUT via JSON
// (correct string encoding, never HTML-escaping) -> re-fetch and verify. Every
// article writes its own mandatory log line.
//
// Expects a ./change_plan.json of shape:
//   { "edits_by_source": { "<id>": [ { "op": "repoint", "href": "OLD", "new_url": "NEW" } ] } }
// Adapt the op handling to your job (text substitution, unlink, etc.); keep the guards.
//
// Usage (run from your project dir):
//   node apply_edit.mjs <run>                 # apply every source in change_plan.json
//   node apply_edit.mjs <run> --dry-run       # guard + diff, no PUT
//   node apply_edit.mjs <run> <id> [<id>...]  # only these sources
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getArticle, isCorrupted, bodyLooksSafe } from './guard_lib.mjs';

const CWD = process.cwd();
const args = process.argv.slice(2);
const run = args[0];
if (!run) { console.error('Usage: node apply_edit.mjs <run> [--dry-run] [ids...]'); process.exit(2); }
const dryRun = args.includes('--dry-run');
const onlyIds = args.slice(1).filter(a => /^\d+$/.test(a));

const plan = JSON.parse(fs.readFileSync(path.join(CWD, 'change_plan.json'), 'utf8'));
const runDir = path.join(CWD, 'backups', run);
fs.mkdirSync(runDir, { recursive: true });
// Dry-run logs to a name that does NOT match verify_run's `apply_log*.jsonl`
// glob, so a dry run can never pollute a real run's reconciliation.
const logPath = path.join(runDir, dryRun ? 'dryrun_log.jsonl' : 'apply_log_guarded.jsonl');

function putBody(id, body) {
  const payloadFile = path.join(runDir, `.${id}.payload.json`);
  fs.writeFileSync(payloadFile, JSON.stringify({ body }));           // JSON encoding, NOT html-escaping
  const out = execFileSync('intercom', ['api', `/articles/${id}`, '-X', 'PUT', '--input', payloadFile, '--json'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  fs.unlinkSync(payloadFile);
  return JSON.parse(out);
}
const log = (entry) => fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');

let sources = Object.keys(plan.edits_by_source || {});
if (onlyIds.length) sources = sources.filter(id => onlyIds.includes(id));

for (const id of sources) {
  const edits = plan.edits_by_source[id];
  try {
    // 0. Back up fresh (mandatory) — reused for the edit.
    const before = getArticle(id);
    fs.writeFileSync(path.join(runDir, `${id}.before.json`), JSON.stringify(before, null, 2));
    let body = before.body || '';

    // 1. Apply each op only if its target is still present (per-op independence).
    let applied = 0, skipped = 0;
    for (const e of edits) {
      if (e.op === 'repoint') {
        const needle = `href="${e.href}"`;
        if (body.includes(needle)) { body = body.split(needle).join(`href="${e.new_url}"`); applied++; }
        else skipped++;
      }
      // Extend here for other ops (unlink / text-substitute). For text ops, ensure
      // the match cannot fire inside a tag/attribute/href — see write-safety.md.
    }
    if (applied === 0) { log({ id, ops_applied: 0, ops_skipped: skipped, verified: true, note: 'all ops already gone; no write' }); console.log(`  SKIP  ${id}  (nothing to apply)`); continue; }

    // 2. PRE-PUT ENCODE GUARD — refuse to ship a mis-encoded body.
    const guard = bodyLooksSafe(body);
    if (!guard.safe) { log({ id, ops_applied: applied, ops_skipped: skipped, verified: false, error: `pre-put guard: ${guard.reason}` }); console.log(`  BLOCK ${id}  guard rejected: ${guard.reason}`); continue; }

    fs.writeFileSync(path.join(runDir, `${id}.after.html`), body);
    if (dryRun) { log({ id, ops_applied: applied, ops_skipped: skipped, dryRun: true, note: 'guard passed; not written' }); console.log(`  DRY   ${id}  applied=${applied} skipped=${skipped} guard=ok`); continue; }

    // 3. Write via JSON.
    putBody(id, body);

    // 4. POST-PUT VERIFY — re-fetch; assert not-escaped + expected change + state unchanged.
    const after = getArticle(id);
    const ab = after.body || '';
    const escaped = isCorrupted(ab);
    const newPresent = edits.every(e => e.op !== 'repoint' || ab.includes(e.new_url.split('#')[0]));
    const verified = !escaped && newPresent && (after.state === before.state);
    fs.writeFileSync(path.join(runDir, `${id}.verified.json`), JSON.stringify(after, null, 2));
    log({ id, ops_applied: applied, ops_skipped: skipped, verified, escaped, newPresent, state: after.state });
    console.log(`  ${verified ? 'OK   ' : 'FAIL '} ${id}  applied=${applied} skipped=${skipped} escaped=${escaped} newPresent=${newPresent}`);
  } catch (e) {
    log({ id, error: String(e).slice(0, 200) });
    console.log(`  ERROR ${id}  ${String(e).slice(0, 120)}`);
  }
}
console.log(`\nLog: ${logPath}`);
