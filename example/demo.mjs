#!/usr/bin/env node
// Valiant Verification — reference example (dependency-free).
//
// Demonstrates the two contracts that make a check trustworthy:
//   1. The named-gate contract: a required check is matched by NAME; a skipped or
//      neutral result is a FAIL, never a silent pass.
//   2. The mutation-test contract: prove a guard can fail by seeding a fault and
//      asserting the guard goes red.
//
// Run:  node example/demo.mjs
// Exit: 0 when the discipline holds.

// ── The thing under test: files whose imports must all resolve ──────────────────────
const cleanFiles = [
  { path: 'src/a.js', imports: ['helper'], exports: ['helper'] },
];

// ── A guard: no file may import a symbol that nothing exports ───────────────────────
function guardNoMissingExports(files) {
  const exported = new Set(files.flatMap((f) => f.exports));
  const bad = files.filter((f) => f.imports.some((sym) => !exported.has(sym)));
  return bad.length === 0; // true = pass, false = fail
}

// ── Contract 1: named gates; only `true` is a pass ──────────────────────────────────
const gates = [
  { name: 'no-missing-exports', run: () => guardNoMissingExports(cleanFiles) }, // true
  // A gate that returns nothing (skipped / not implemented) is a FAIL, not a pass:
  { name: 'lint-clean', run: () => undefined },
];

console.log('─ named gates (neutral = fail) ─');
for (const g of gates) {
  const result = g.run();
  const ok = result === true;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${g.name}  (result: ${String(result)})`);
}

// ── Contract 2: prove the guard can fail (mutation test) ────────────────────────────
// Seed a fault — a file that imports a symbol nothing exports — the guard MUST go red.
const fault = [{ path: 'src/b.js', imports: ['ghost'], exports: [] }];
const wentRed = guardNoMissingExports([...cleanFiles, ...fault]) === false;

console.log('─ mutation test (prove it can fail) ─');
console.log(`  ${wentRed ? 'PASS' : 'FAIL'}  guard went red on a seeded fault`);
if (!wentRed) {
  console.error('\nThe guard did not catch the seeded fault — it is not proven.');
  process.exit(1);
}

console.log('\nBoth contracts hold: the gate is structural, and the guard is proven to fail.');
