# CLI UI Implementation Plan With Review Gates

## Summary

This plan turns Creator Vault into a guided terminal app by adding `et ui` beside the existing command surface. Version 1 stays in the terminal, uses prompt-driven flows instead of a full pane-based TUI, reuses the existing ingest and diagnostic seams, and pauses at the end of every phase for review before the next phase begins.

Recommended library stack for this plan:

- keep `prompts` as the primary interaction library
- add `log-update` for in-place status and summary rendering
- keep existing `picocolors` and `consola`
- optionally add `ora` for short-lived spinner states
- do not introduce `ink`, `blessed`, or `neo-blessed` in v1

The implementation target is:

- keep existing `ingest-channel-profile`, `ingest-channel-videos`, `ingest-transcripts`, and `test-connection`
- add `et ui` as a new interactive entrypoint
- support guided runs for all current commands plus a chained full ingest pipeline
- stream run output during execution and show a final structured summary
- update current-state docs alongside behavior changes

## Review Gate Protocol

At the end of each phase, the agent should provide a gate report with:

- **Phase completed:** phase number and name
- **Files touched:** concise list of runtime, test, and doc files changed
- **Behavior changed:** short summary of user-visible changes
- **Scope check:** confirm the phase did not spill into later work
- **Verification run:** exact commands run and pass/fail status
- **Known risks:** remaining uncertainty or deliberate deferrals
- **Next phase preview:** one sentence on what comes next
- **Gate rule:** stop and wait for the user to say `continue`

Before every phase after Phase 1, the agent must first review the previous phase's implementation:

- inspect the relevant diff/files
- run the phase's non-mutating verification again if needed
- list findings or confirm no findings
- only then move on to the next phase

## Phase 1: Interactive Shell And Prompt Surface

Agent pre-phase review:
- None. Start here.

Implementation guidance:
- Add a new interactive command module, likely `src/commands/ui.ts`, and register it in `src/commands/index.ts`.
- Create a dedicated interactive layer, preferably under `src/ui/`, instead of embedding prompt logic in command files.
- Keep `prompts` as the primary prompt library and expand `src/services/prompt.service.ts` into a slightly richer prompt adapter that supports:
  - menu select
  - free-text input
  - numeric input with defaults
  - confirm
- Do not swap to `@inquirer/prompts`; the repo already has `prompts`, so changing libraries here would add churn without improving the plan materially.
- Build the top-level menu with these actions:
  - ingest channel profile
  - ingest channel videos
  - ingest transcripts
  - run full ingest pipeline
  - test connection
  - exit
- Keep `bin/run.ts` and the existing non-interactive command behavior unchanged.

Acceptance:
- `et ui` is registered and launches an interactive menu.
- The menu can be entered without changing any existing command invocation.
- Prompt helpers are reusable and live outside the ingest module.

Pause and wait for `continue`.

## Phase 2: Guided Single-Workflow Runs

Agent pre-phase review:
- Review the Phase 1 command registration and prompt-layer boundaries.
- Confirm the interactive code does not leak into the ingest module or direct command implementations.

Implementation guidance:
- Add guided flows for:
  - channel profile ingest
  - channel video ingest
  - transcript ingest
  - test connection
- Each ingest flow should collect the same options the CLI already supports:
  - inputs
  - `save`
  - `limit` where relevant
  - `batch` for video ingest
  - `createChannel` for video ingest
- Reuse existing public seams:
  - `runIngestChannelProfile`
  - `runIngestChannelVideos`
  - `runIngestTranscripts`
  - `runTestConnection`
- Add a mandatory confirmation step before any run with `save=true`.
- Normalize prompt output into the exact argument shapes those public functions already expect.

Acceptance:
- Each current command can be launched from `et ui`.
- Save-enabled runs require confirmation.
- No workflow logic is duplicated in the UI layer.

Pause and wait for `continue`.

## Phase 3: Run Streaming And Summary Rendering

Agent pre-phase review:
- Review the Phase 2 flow wiring and confirm option mapping is correct.
- Confirm the UI layer still depends only on public seams.

Implementation guidance:
- Add `log-update` as the primary rendering helper for in-place status lines, step transitions, and final summary presentation.
- Keep existing `consola`/reporter output available; the UI layer should wrap or adapt it rather than rewrite ingest reporting.
- Use `ora` only if needed for brief "starting" or "waiting" states. Do not make the design depend on spinner-only output.
- Add a UI-oriented run wrapper that:
  - shows a "starting" state
  - streams runtime output while the workflow runs
  - renders a final summary screen on success or failure
- Reuse the structured ingest report types already returned from `src/ingest`:
  - `ChannelIngestReport`
  - `VideoIngestReport`
  - `TranscriptIngestReport`
- Add summary renderers for each report type instead of dumping raw JSON.
- Keep v1 log-oriented: do not introduce `ink` or `blessed`, and do not build a pane-based dashboard or widget tree yet.
- Diagnostics can keep simpler output, but should still end in a clear success/failure summary.

Acceptance:
- Interactive runs show live output during execution.
- Each ingest workflow ends with a readable summary built from report data.
- Failures are surfaced clearly without crashing the UI shell.

Pause and wait for `continue`.

## Phase 4: Full Ingest Pipeline Flow

Agent pre-phase review:
- Review the Phase 3 streaming and summary behavior.
- Confirm single-workflow runs are stable before chaining them.

Implementation guidance:
- Add a guided `run full ingest pipeline` action that performs, in order:
  1. channel profile ingest
  2. channel video ingest
  3. transcript ingest
- Collect the shared input set once, then collect step-specific options as needed.
- Preserve current workflow semantics:
  - profile step can run dry-run or save
  - video step respects `limit`, `batch`, `save`, and `createChannel`
  - transcript step respects `limit` and `save`
- If an earlier step fails materially, stop the chain and show a combined summary explaining where it stopped.
- If the user chooses dry-run behavior, carry that choice consistently unless the flow explicitly asks to override it per step.

Acceptance:
- The pipeline flow can launch the current three-step ingest path from one guided entrypoint.
- Step ordering is fixed and matches current app workflow docs.
- Early-stop behavior is explicit and summarized clearly.

Pause and wait for `continue`.

## Phase 5: Tests, Docs, And Final Verification

Agent pre-phase review:
- Review the Phase 4 chained workflow behavior.
- Confirm the UI did not change existing non-interactive command contracts.

Implementation guidance:
- Add tests for:
  - `ui` command registration
  - menu routing
  - prompt-to-argument mapping
  - save confirmation cancel paths
  - per-workflow runner dispatch
  - summary rendering by report type
  - full pipeline ordered execution and early-stop behavior
- Update current-state docs following `docs/agents/docs-update-checklist.md`.
- At minimum, update:
  - `README.md`
  - `docs/app/cli.md`
  - `docs/app/overview.md`
- Document:
  - what `et ui` does
  - that existing direct commands remain supported
  - that v1 is a guided terminal flow, not a full dashboard
  - the chosen UI stack: `prompts` plus `log-update`, with `ora` optional
- If this work becomes active tracked work, update `docs/plans/plan-status.md` in the same change.

Acceptance:
- Targeted tests pass for the new UI surface.
- `npm run compile` passes.
- `npm test` passes.
- `git diff --check` passes.
- Docs describe the shipped command surface accurately.

Pause and wait for `continue`.

## Public Interfaces / Behavioral Changes

- New CLI command: `et ui`
- Existing CLI commands remain unchanged and supported
- New interactive behaviors:
  - guided menu selection
  - prompt-driven option entry
  - save confirmation gate
  - streamed run output
  - final summary rendering
  - chained full ingest pipeline action

## Assumptions And Defaults

- "CLI GUI" means a guided terminal experience, not Electron/Tauri and not a full `ink`-style dashboard for v1.
- `prompts` remains the interaction library for v1 because it is already installed and already wrapped in the repo.
- `log-update` is the preferred rendering addition for v1 because it gives in-place terminal updates without forcing a full component framework.
- `ora` is optional, not foundational.
- The UI layer is a presentation shell over existing public seams, not a rewrite of ingest orchestration.
- Database browsing and record editing are out of scope for this plan.
- Rich progress panels, tables, and live dashboards are deferred until a later phase or follow-up plan.
