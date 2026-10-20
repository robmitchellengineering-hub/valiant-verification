#!/usr/bin/env node
// vv — the Valiant Verification enforcement engine (reference SDK, v0.1)
//
// Zero-dependency by design: only the Node standard library. See SPEC.md for the contract.
// Three commands:
//   vv init    scaffold a working .vv/ (gate + guard + mutation + ledger)
//   vv run     run every named gate, enforce the contract, write .vv/report.json
//   vv prove   apply each mutation, run its guard, and require it to go RED
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

// Walk up from `start` to the nearest directory containing .vv/.
function findRoot(start) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, '.vv'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const gitCommit = (root) => {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
};

// ── init ────────────────────────────────────────────────────────────────────
const NO_TODO_GUARD = `// Guard: the tree carries no TODO/FIXME markers.
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
    else if (/\\.(js|mjs|cjs|ts|jsx|tsx)$/.test(name)) {
      const text = readFileSync(p, 'utf8');
      if (/TODO|FIXME/.test(text)) hits.push(p);
    }
  }
}
walk('.');
if (hits.length) {
  console.error('TODO/FIXME markers found:\\n  ' + hits.join('\\n  '));
  process.exit(1);
}
console.log('no TODO/FIXME markers');
`;

function init() {
  const root = process.cwd();
  const vv = join(root, '.vv');
  mkdirSync(join(vv, 'guards'), { recursive: true });

  const gates = {
    version: 1,
    required: ['no-todo'],
    gates: [
      {
        name: 'no-todo',
        run: 'node .vv/guards/no-todo.mjs',
        producer: 'vv/no-todo',
        falsifier: 'a TODO or FIXME marker in any tracked source file',
        allowSilentPass: false,
      },
    ],
  };
  const mutations = {
    version: 1,
    mutations: [
      // Add the first mutation by hand: pick a line that occurs EXACTLY ONCE in a
      // guarded file, and make `replace` seed the fault the guard must catch.
      // e.g.  { guard: "no-todo", file: "src/index.js", why: "…", find: "return 42;", replace: "// TODO: explain\\n  return 42;" }
    ],
  };
  const ledger = `# Incident ledger

One section per breakage, each with a detection rule. The rule is what gets fed
back to the reviewer on every turn — a breakage filed without a rule is not memory.

## (no incidents yet)
`;

  writeFileSync(join(vv, 'gates.json'), JSON.stringify(gates, null, 2) + '\n');
  writeFileSync(join(vv, 'mutations.json'), JSON.stringify(mutations, null, 2) + '\n');
  writeFileSync(join(vv, 'ledger.md'), ledger);
  writeFileSync(join(vv, 'guards', 'no-todo.mjs'), NO_TODO_GUARD);

  console.log('scaffolded .vv/  (gates.json · guards/no-todo.mjs · mutations.json · ledger.md)');
  console.log('next:  vv run      # the named gate must pass');
  console.log('       vv prove    # add a mutation first, then prove the guard can fail');
}

// ── run ─────────────────────────────────────────────────────────────────────
function run() {
  const root = findRoot(process.cwd());
  if (!root) return fail('no .vv/ directory found from here — run `vv init` first');
  const gatesPath = join(root, '.vv', 'gates.json');
  if (!existsSync(gatesPath)) return fail('no .vv/gates.json — run `vv init` first');

  const cfg = readJson(gatesPath);
  const gates = cfg.gates || [];
  const required = cfg.required ?? gates.map((g) => g.name);
  const byName = new Map(gates.map((g) => [g.name, g]));
  const missingRequired = required.filter((n) => !byName.has(n));

  const report = { generatedAt: new Date().toISOString(), commit: gitCommit(root), gates: [] };

  for (const g of gates) {
    const t0 = Date.now();
    let result, evidence;
    if (!g.run) {
      result = 'fail';
      evidence = '(no run command declared)';
    } else {
      const r = spawnSync(g.run, { cwd: root, shell: true, encoding: 'utf8', timeout: 120000 });
      evidence = `${r.stdout ?? ''}${r.stderr ?? ''}`;
      if (r.status !== 0) result = 'fail';
      else if (!evidence.trim() && !g.allowSilentPass) result = 'neutral'; // "reports nothing" = fail
      else result = 'pass';
    }
    const rec = {
      name: g.name,
      result,
      producer: g.producer ?? null,
      falsifier: g.falsifier ?? null,
      evidence,
      durationMs: Date.now() - t0,
    };
    report.gates.push(rec);

    const mark = rec.result === 'pass' ? c.green('PASS') : rec.result === 'fail' ? c.red('FAIL') : c.yellow('NEUTRAL');
    console.log(`  ${mark.padEnd(24)} ${rec.name}`);
    if (rec.result !== 'pass') console.log(`          ${(rec.evidence || '(no output)').split('\n')[0]}`);
  }

  const failed = [
    ...missingRequired.map((name) => ({ name, result: 'missing' })),
    ...report.gates.filter((rec) => required.includes(rec.name) && rec.result !== 'pass'),
  ];

  const verdict = failed.length === 0 ? 'pass' : 'fail';
  report.verdict = verdict;
  writeFileSync(join(root, '.vv', 'report.json'), JSON.stringify(report, null, 2) + '\n');

  if (verdict === 'fail') {
    const missing = failed.filter((f) => f.result === 'missing').map((f) => f.name);
    console.error(`\n  ${c.red('✗')} ${failed.length} required gate(s) not green — a merge must not ship.`);
    if (missing.length) console.error(`    required but not declared: ${missing.join(', ')}`);
    return 1;
  }
  console.log(`\n  ${c.green('✓')} ${required.length} required gate(s) green.  report -> .vv/report.json`);
  return 0;
}

// ── prove ───────────────────────────────────────────────────────────────────
function prove() {
  const root = findRoot(process.cwd());
  if (!root) return fail('no .vv/ directory found from here — run `vv init` first');
  const mp = join(root, '.vv', 'mutations.json');
  if (!existsSync(mp)) return fail('no .vv/mutations.json — run `vv init` first');
  const cfg = readJson(mp);
  const mutations = cfg.mutations || [];
  if (mutations.length === 0) {
    console.error('no mutations registered — nothing was proven (a green run that proves nothing must not report success).');
    return 2;
  }

  let proven = 0;
  let unproven = 0;
  for (const m of mutations) {
    const guardFile = join(root, '.vv', 'guards', `${m.guard}.mjs`);
    if (!existsSync(guardFile)) {
      console.error(`  ${c.red('FAIL')}  ${m.guard}: guard .vv/guards/${m.guard}.mjs not found`);
      unproven++;
      continue;
    }
    const target = join(root, m.file);
    if (!existsSync(target)) {
      console.error(`  ${c.red('FAIL')}  ${m.guard}: subject ${m.file} not found`);
      unproven++;
      continue;
    }
    const original = readFileSync(target, 'utf8');
    const count = original.split(m.find).length - 1;
    if (count !== 1) {
      console.error(`  ${c.red('FAIL')}  ${m.guard}: find matches ${count}× in ${m.file} (must be exactly 1)`);
      unproven++;
      continue;
    }

    writeFileSync(target, original.replace(m.find, m.replace));
    try {
      const r = spawnSync(process.execPath, [guardFile], { cwd: root, encoding: 'utf8', timeout: 60000 });
      if (r.status !== 0) {
        console.log(`  ${c.green('caught')}  ${m.guard}  exit ${r.status}`);
        proven++;
      } else {
        console.error(`  ${c.red('MISSED')}  ${m.guard} — stayed green while ${m.file} was broken`);
        unproven++;
      }
    } finally {
      writeFileSync(target, original);
    }
  }

  const total = proven + unproven;
  console.log(`\n${proven}/${total} guard(s) went red when their subject was broken.`);
  if (unproven > 0) {
    console.error('a guard that has never failed proves nothing — fix the mutation or the guard.');
    return 1;
  }
  return 0;
}

function fail(msg) {
  console.error(msg);
  return 2;
}

function help() {
  console.log(`vv — Valiant Verification (reference SDK, v0.1)

Usage:
  vv init     scaffold .vv/ (gates.json · guards/ · mutations.json · ledger.md)
  vv run      run every named gate by name, enforce the contract, write .vv/report.json
  vv prove    apply each mutation and require its guard to go red

Run from anywhere under the project root (the directory that holds .vv/).`);
}

const cmd = process.argv[2] || 'help';
const exitCode = { init, run, prove, help }[cmd] ? { init, run, prove, help }[cmd]() : (console.error(`unknown command: ${cmd}\n`), help(), 2);
process.exit(exitCode);
