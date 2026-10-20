# vv — the Valiant Verification reference SDK

The enforcement engine for the open [spec](../spec.md): named gates, mutation-proven guards,
and an incident ledger. **Zero dependencies** — a single file that runs on bare Node (>=18).
See `SPEC.md` for the full contract and file formats.

## Install (one command)

There is nothing to install yet — copy or symlink `vv.mjs` onto your PATH:

```bash
cp vv.mjs ~/.local/bin/vv && chmod +x ~/.local/bin/vv
# or, for now:
alias vv='node /path/to/valiant-verification/sdk/vv.mjs'
```

A real `npm i -g` distribution is Phase 2 of the build plan (still zero runtime dependencies).

## Quickstart

```bash
vv init      # scaffold .vv/ — a gate, a guard, a mutation ledger
vv run       # run every named gate; writes .vv/report.json; exit 0 = green
vv prove     # seed each mutation and require the guard to go red
```

`vv` finds `.vv/` by walking up from the current directory, so it works from anywhere under the
project root.

## What the three commands enforce

- **`vv run`** — a gate is green only if its command **exited 0 and printed evidence**. A gate
  that exits 0 silently is *neutral* (a fail) unless it declares `allowSilentPass`. A required
  gate that is missing from `gates.json` is a fail. "Green" is written to `.vv/report.json`,
  with each gate's producer and falsifier, so it is checkable rather than claimed.
- **`vv prove`** — a guard that has never failed proves nothing. Each mutation seeds a fault
  and the guard must go red; the file is restored afterwards. A guard that stays green is
  reported MISSED and the run exits 1. Zero mutations exits 2 — never a silent pass.

## The full loop, in one directory

`example-project/` shows it end-to-end:

```bash
cd example-project
node ../vv.mjs run      # PASS
node ../vv.mjs prove    # seeds a marker, the guard goes red, then restores
```

## License

Source-available, not open source. See `LICENSE.md` beside this file.
