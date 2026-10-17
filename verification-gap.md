# The Verification Gap

> "Verification, code review, and security became the bottlenecks once generation was cheap."
> — Anthropic, on running an AI-native engineering organization
> ([claude.com/blog/running-an-ai-native-engineering-org](https://claude.com/blog/running-an-ai-native-engineering-org))

## The problem

Generation is solved. The scarce resource moved downstream — to whether you can trust what was
generated. Every serious tool runs the same loop — **plan → edit → run → verify**. The difference
between them is not the model; it is whether the *verify* step is something the system **enforces**,
or something the model **may skip**.

## The receipts: twelve tools, ten leave verification optional

Compiled from primary vendor docs and engineering posts (2025–2026). "Yes" = a mandatory gate before
"done". "Partial" = a gate exists but is not mandatory or is explicitly not a test replacement.

| Tool | Mandatory verification gate before "done"? |
|---|---|
| **Factory** | **Yes** — Missions end every milestone with a *validation* phase running builds, test suites, lint, typecheck, and browsing the app under test ([factory.com/news/missions](https://factory.com/news/missions)) |
| **Amp** | **Yes** — **Ship** runs the full test suite before push; it ignores a failing test only after confirming it also fails on base ([ampcode.com/docs/orbs/shipping](https://ampcode.com/docs/orbs/shipping)) |
| **Devin** | **Partial** — video QA, self-described as a "sanity check… not a replacement" for tests and CI ([docs.devin.ai/work-with-devin/testing-and-recordings](https://docs.devin.ai/work-with-devin/testing-and-recordings)) |
| **Copilot Coding Agent** | **Partial** — runs the tests/linters the repo's `copilot-setup-steps.yml` workflow specifies; the outer gate is normal PR CI ([github.com/ai-infra-curriculum/ai-agent-guidebook](https://github.com/ai-infra-curriculum/ai-agent-guidebook/blob/main/guides/github-copilot/workspace-guide.md)) |
| **v0** | **Partial** — the build/deploy gate *is* Vercel itself; "Fix Build / Fix CI" actions, but no always-on test gate in the loop ([v0.app/docs/deployments](https://v0.app/docs/deployments)) |
| **Claude Code** | **No** — verification is a loop phase, but enforcement is via **hooks** (shell commands the model may skip); no built-in lint/typecheck gate ([code.claude.com/docs/en/hooks-guide](https://code.claude.com/docs/en/hooks-guide)) |
| **Cursor** | **No** — "the user is still responsible for verifying"; no hard test/lint/typecheck gate before "done" ([cursor.com/learn/agents](https://cursor.com/learn/agents)) |
| **Jules** | **No** — runs whatever the user's **setup script** specifies; no built-in CI or mandatory lint/typecheck gate ([jules.google/docs/environment](https://jules.google/docs/environment/)) |
| **Replit** | **No** — **App Testing** (browser click-through) is on-demand, Power/Max only, and limited to certain stacks ([docs.replit.com/features/agent/app-testing](https://docs.replit.com/features/agent/app-testing)) |
| **Lovable** | **No** — three verification tools, "mostly run only when asked" ([docs.lovable.dev/features/testing.md](https://docs.lovable.dev/features/testing.md)) |
| **Bolt** | **No** — in-browser execution and version-history rollback; no documented always-on lint/typecheck/CI gate ([support.bolt.new/building/chat-tools.md](https://support.bolt.new/building/chat-tools.md)) |
| **Windsurf (Cascade)** | **No** — the only default check is **lint auto-fix**; no default test/typecheck/CI gate ([docs.devin.ai/desktop/cascade/cascade.md](https://docs.devin.ai/desktop/cascade/cascade.md)) |

## The gap

The mechanism the tools share is a **hook** — a shell command at a lifecycle event that a model may
or may not run. That is the entire difference between a check that works and a check that is merely
present:

> **A green check that never ran is not a pass.**

Ten of twelve tools define "done" as "the model stopped." Only Factory and Amp gate verification at
all — and **none of them prove that their checks can fail** (mutation testing). A guard that has
never gone red is indistinguishable from a guard that does nothing.

## The answer — five principles

1. **The gate is structural, not a choice.** Required checks are matched by name; a skipped or
   neutral check is a fail.
2. **Prove the check can fail.** Every guard is mutation-tested: break it, confirm it goes red.
3. **The reviewer must not grade its own work.** Review runs on a different model than the coder.
4. **Failures become memory.** Every breakage is filed with a detection rule and fed back.
5. **Evidence carries provenance.** A result names who produced it, that it ran, and what would
   falsify it.

## Take it

- The specification: [`spec.md`](spec.md)
- A runnable, dependency-free reference: [`example/`](example/)
- The live system it runs in: [morpheus.nz/verification](https://morpheus.nz/verification)

---

*Sources: a 12-tool survey of primary documentation — `research/ai-coding-agents-internals-2025-2026.md`
and `research/AGENT-LANDSCAPE-2025-2026.md`. Financial and headcount figures elsewhere are third-party
and deliberately not used here; this document cites only verification behaviour, from vendor docs.*
