# Valiant Verification SDK — Reference implementation spec

**Version 0.1 (draft).** This is the *enforcement engine* described in the root `spec.md`
(the open contract). The open spec says *what* "verified" means; this document pins *how* the
reference SDK does it, so two implementers would build the same CLI.

Licensing note: the open spec, the example, and the survey at the repo root are Apache-2.0.
This `sdk/` directory is the **source-available reference SDK** and is licensed separately —
see `LICENSE.md` beside this file.

---

## 1. The product in one sentence

`vv` is a zero-dependency CLI that a team drops into any repo and, with one command to scaffold,
enforces the three contracts: **named gates**, **mutation-proven guards**, and an **incident
ledger**.

## 2. The dependency rule (non-negotiable)

The CLI and every shipped guard use **only the Node.js standard library**
(`node:fs`, `node:path`, `node:child_process`, `node:url`, `node:crypto`). No `package.json`
dependencies. A guard or the CLI itself that reaches a package import is a build failure — the
same rule Morpheus enforces for its own guards (`verify-guards-no-install.mjs`).

Why this matters: a dependency-free SDK has **no update treadmill**. "Dependencies that change
over time" is the one problem the SDK is designed not to have.

## 3. The `.vv/` layout

```
.vv/
  gates.json          # the named gates a merge must pass (required, by name)
  guards/             # one .mjs file per guard; exits 0 = pass, non-zero = fail
  mutations.json      # one seeded-fault per claim, proving each guard can fail
  ledger.md           # the incident ledger: breakage -> detection rule
  report.json         # written by `vv run`; the machine-readable gate report
```

## 4. Command surface

| command | what it does | exit |
|---|---|---|
| `vv init` | scaffold a working `.vv/` (one example gate, guard, mutation, ledger) | 0 |
| `vv run` | run every gate by name, enforce the contract, write `report.json` | 0 all gates pass with evidence · 1 any required gate fails, is neutral, or is missing |
| `vv prove` | apply each mutation, run its guard, assert it goes **red**, then restore | 0 all guards proven · 1 a guard did not go red · 2 nothing to prove (never a silent pass) |

`vv` is run from the project root; it finds `.vv/` by walking up from the working directory.

## 5. File formats

### 5.1 `gates.json`

```json
{
  "version": 1,
  "required": ["no-todo"],
  "gates": [
    {
      "name": "no-todo",
      "run": "node .vv/guards/no-todo.mjs",
      "producer": "vv/no-todo",
      "falsifier": "a TODO or FIXME marker in any tracked source file",
      "allowSilentPass": false
    }
  ]
}
```

- `required` — the gate names that must be present and successful for a merge.
- `run` — the command executed; its stdout+stderr is the gate's **evidence**.
- `producer` — who ran it (provenance, spec §2.5).
- `falsifier` — what a failure would have looked like (provenance, spec §2.5).
- `allowSilentPass` — `false` (default) means a gate that exits 0 with **no output** is *neutral*,
  which is a **fail** (spec §3: "a gate that reports nothing is a fail"). Set `true` only for a
  command whose success is genuinely silent.

### 5.2 `guards/*.mjs`

A guard is a standalone script: it reads what it protects, prints its evidence, and exits
`0` (pass) or non-zero (fail). It may be both a gate in `gates.json` and a mutation-tested guard
in `mutations.json` — that is the normal case, and it is how Morpheus's own guards work.

### 5.3 `mutations.json`

```json
{
  "version": 1,
  "mutations": [
    {
      "guard": "no-todo",
      "file": "src/index.js",
      "why": "a seeded TODO must turn the no-todo guard red, or the guard proves nothing",
      "find": "return 42;",
      "replace": "// TODO: explain this magic number\n  return 42;"
    }
  ]
}
```

`guard` names the guard (matched against `guards/<name>.mjs`). `find` must occur **exactly once**
in `file`; `vv prove` applies `find -> replace`, runs the guard, and requires a non-zero exit.
A guard with no recorded red run is **unproven** and does not count (spec §4).

## 6. The report (`report.json`)

`vv run` writes one record per gate, so "green" is checkable, not claimed:

```json
{
  "generatedAt": "2026-10-20T00:00:00.000Z",
  "commit": "abc1234",
  "gates": [
    {
      "name": "no-todo",
      "result": "pass",
      "producer": "vv/no-todo",
      "falsifier": "a TODO or FIXME marker in any tracked source file",
      "evidence": "no TODO/FIXME markers\n",
      "durationMs": 41
    }
  ],
  "verdict": "pass"
}
```

`result` is one of `pass` | `fail` | `neutral`. A required gate whose result is anything other
than `pass` fails the run. `commit` is filled from `git rev-parse HEAD` when available.

## 7. Versioning and delivery (the update process — Phase 5 detail)

The corpus is a **versioned feed**, not a "latest" pointer:

- **Version** — semver for the CLI, dated (`YYYY-MM-DD`) for the corpus. A customer pins
  `corpus@2026-10-20` and upgrades deliberately.
- **Delivery** — a git tag per release first; a signed feed later. No silent auto-update.
- **Changelog** — the ledger is the changelog; each entry is `breakage -> detection rule`, kept
  machine-readable (one markdown section per incident).
- **Compatibility contract** — a **new** guard is additive and must not red a customer's CI; a
  **changed** detection rule is a breaking change and bumps the major version.

## 8. Out of scope for v0.1

The telemetry reporter (the 4-field anonymized hazard report), cross-language reference guards
(Java/C#/Python), and the conformance-audit CLI (`vv audit`) are later phases. This v0.1 is the
**core loop**: named gates + mutation proof + ledger, installable and zero-dependency.
