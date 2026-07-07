// GUARD — escape-check gate.
// Fetches the LIVE body of each article and flags the escaped-HTML corruption
// signature. Exits NON-ZERO if any article is corrupted (so it fails loudly in
// an apply run or CI), 0 if all clean. Read-only.
//
// Usage (run from your project dir, which holds ./backups):
//   node detect_corruption.mjs <id> [<id> ...]     # explicit ids
//   node detect_corruption.mjs --from-backups      # every id under ./backups/*
// Writes a JSON report to ./sweep_report.<stamp>.json
import fs from 'node:fs';
import path from 'node:path';
import { getArticle, isCorrupted } from './guard_lib.mjs';

const CWD = process.cwd();

function idsFromBackups() {
  const root = path.join(CWD, 'backups');
  const ids = new Set();
  for (const dir of fs.existsSync(root) ? fs.readdirSync(root) : []) {
    const p = path.join(root, dir);
    if (!fs.statSync(p).isDirectory()) continue;
    for (const f of fs.readdirSync(p)) {
      const m = f.match(/^(\d+)\./);
      if (m) ids.add(m[1]);
    }
  }
  return [...ids].sort();
}

const args = process.argv.slice(2);
const ids = args.includes('--from-backups')
  ? idsFromBackups()
  : args.filter(a => /^\d+$/.test(a));

if (!ids.length) { console.error('No ids. Pass ids or --from-backups.'); process.exit(2); }

const results = [];
for (const id of ids) {
  try {
    const d = getArticle(id);
    const b = d.body || '';
    results.push({
      id, corrupted: isCorrupted(b), len: b.length, state: d.state,
      updated: d.updated_at ? new Date(d.updated_at * 1000).toISOString().slice(0, 10) : '?',
      title: (d.title || '').slice(0, 55),
    });
  } catch (e) {
    results.push({ id, error: String(e).slice(0, 100) });
  }
}

const bad = results.filter(r => r.corrupted);
const errs = results.filter(r => r.error);
console.log(`Checked ${results.length} articles. Corrupted: ${bad.length}. Fetch errors: ${errs.length}.\n`);
for (const r of bad)  console.log(`  CORRUPTED  ${r.id}  ${r.state}  len=${r.len}  updated=${r.updated}  ${r.title}`);
for (const r of errs) console.log(`  FETCHERROR ${r.id}  ${r.error}`);
if (!bad.length && !errs.length) console.log('  All clean.');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = path.join(CWD, `sweep_report.${stamp}.json`);
fs.writeFileSync(out, JSON.stringify(results, null, 2));
console.log(`\nReport: ${out}`);

// Fail loudly: corruption is a hard failure; fetch errors are a soft failure (exit 3).
if (bad.length) process.exit(1);
if (errs.length) process.exit(3);
