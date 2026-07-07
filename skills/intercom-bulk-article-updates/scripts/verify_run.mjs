// GUARD — run reconciler.
// Corruption slips through when a writer produces NO log line, so nobody notices
// it was never verified. This reconciles a run: every source article in
// change_plan.json must (a) appear in an apply log AND (b) pass the live
// escape-check. A source with no log entry is a hard failure — exactly the hole
// that ships corruption.
//
// Usage (run from your project dir):
//   node verify_run.mjs <run>                     # reads ./backups/<run>/apply_log*.jsonl
//   node verify_run.mjs <run> <change_plan.json>  # explicit plan path
import fs from 'node:fs';
import path from 'node:path';
import { getArticle, isCorrupted } from './guard_lib.mjs';

const CWD = process.cwd();
const [run, planArg] = process.argv.slice(2);
if (!run) { console.error('Usage: node verify_run.mjs <run> [change_plan.json]'); process.exit(2); }

const planPath = planArg || path.join(CWD, 'change_plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const sources = Object.keys(plan.edits_by_source || {});

const runDir = path.join(CWD, 'backups', run);
const logged = new Set();
if (fs.existsSync(runDir)) {
  for (const f of fs.readdirSync(runDir)) {
    if (!/apply_log.*\.jsonl$/.test(f)) continue;   // dry-run logs use a non-matching name
    for (const line of fs.readFileSync(path.join(runDir, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { logged.add(String(JSON.parse(line).id)); } catch {}
    }
  }
}

let failures = 0;
console.log(`Reconciling run ${run}: ${sources.length} planned sources vs logged writers.\n`);
for (const id of sources) {
  const hasLog = logged.has(String(id));
  let live = '?';
  try { live = isCorrupted(getArticle(id).body) ? 'CORRUPTED' : 'clean'; }
  catch { live = 'FETCHFAIL'; }
  const ok = hasLog && live === 'clean';
  if (!ok) failures++;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${id}  log=${hasLog ? 'yes' : 'MISSING'}  live=${live}`);
}
// Flag any logged article that isn't in the plan (rogue write).
for (const id of logged) {
  if (!sources.includes(id)) { failures++; console.log(`  FAIL  ${id}  logged but NOT in change_plan (rogue write)`); }
}

console.log(`\n${failures ? `${failures} FAILURE(S)` : 'All sources reconciled: logged + clean.'}`);
process.exit(failures ? 1 : 0);
