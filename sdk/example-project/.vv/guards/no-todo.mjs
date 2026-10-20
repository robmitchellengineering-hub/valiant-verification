// Guard: the tree carries no TODO/FIXME markers.
// Exits 0 (pass) when clean, non-zero (fail) when a marker is present.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['node_modules', '.git', '.vv', 'dist', 'build']);
const hits = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(js|mjs|cjs|ts|jsx|tsx)$/.test(name)) {
      const text = readFileSync(p, 'utf8');
      if (/TODO|FIXME/.test(text)) hits.push(p);
    }
  }
}
walk('.');
if (hits.length) {
  console.error('TODO/FIXME markers found:\n  ' + hits.join('\n  '));
  process.exit(1);
}
console.log('no TODO/FIXME markers');
