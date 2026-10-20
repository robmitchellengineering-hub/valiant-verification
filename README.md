# Valiant Verification

**Make "done" mean "verified."**

Generation is solved. Verification is not — it is the exact bottleneck the leading AI coding
tools leave open. Valiant Verification is the open specification for **structural code
verification**: named gates, mutation-tested guards, and a reviewer that never grades its own work.

This repository is the **open layer**. The specification and the reference example are free
(Apache-2.0) so the standard spreads. The reference SDK and the guard/hazard corpus are licensed
separately.

## The problem

In 10 of 12 leading AI coding tools, "done" does not mean "verified" — verification is a hook the
model can skip. **A green check that never ran is not a pass.** Full receipts, tool by tool:
[`verification-gap.md`](verification-gap.md).

## The five principles

1. **The gate is structural, not a choice.** Required checks are matched by name; a skipped or
   neutral check is a fail — never a silent pass.
2. **Prove the check can fail.** Every guard is mutation-tested: break it, confirm it goes red. A
   check that has never failed proves nothing.
3. **The reviewer must not grade its own work.** Review runs on a different model than the coder,
   against its own evidence.
4. **Failures become memory.** Every breakage is filed with a detection rule and fed back to the
   reviewer on every turn.
5. **Evidence carries provenance.** A result names who produced it, that it ran, and what would
   falsify it.

## Get started

The specification is the contract: [`spec.md`](spec.md).

A runnable, framework-agnostic illustration of the named-gate and mutation-test contracts lives in
[`example/`](example/):

```bash
node example/demo.mjs
```

It shows a named gate passing on clean input, a neutral gate failing, and a mutation test proving
the guard goes red on a seeded fault — the two properties that separate a check that works from a
check that is merely present.

## Layout

- `spec.md` — the specification.
- `example/` — a minimal, dependency-free reference implementation of the contracts.
- `sdk/` — the reference SDK (`vv`), source-available under commercial terms.
- `LICENSE` — Apache-2.0 (covers the spec, the example and the survey only).

## License

The specification, reference example and survey are Apache-2.0 — free to read, fork, and implement.
The reference SDK (`sdk/`) and the guard/hazard corpus are source-available under commercial terms;
see `sdk/LICENSE.md`.

## Where it runs in production

This is the methodology behind the verification layer at
[morpheus.nz/verification](https://morpheus.nz/verification) — 130+ automated guards, each required
to be proven to fail on a seeded fault, and a 26-entry breakage ledger, measured against the live
codebase.
