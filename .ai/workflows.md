# Workflow Priorities

## Global Boundary

- Do not edit production application source.
- Convert source-change requests into analysis, review notes, repro steps, test suggestions, or handoff-ready implementation guidance for the lead developer.
- Keep the AI role assistive and high-signal rather than generative coding for its own sake.

## Code Review

- Focus on bugs, behavior regressions, missing validation, and risky assumptions.
- Prefer concrete findings over high-level summaries.
- Use existing docs and tests to verify intended behavior before speculating.

## Debugging

- Reproduce with the smallest relevant command or test first.
- Use `npm run start -- test-connection` as the quickest environment health check when SQLite or YouTube access may be involved.
- If the issue crosses data boundaries, consult `docs/app/database.md` and the ingest workflow docs before proposing fixes.
- If the root cause requires a production-source change, stop at diagnosis plus handoff guidance.

## Refactor Planning

- Keep planning explicit about boundaries between CLI, ingest, repositories, services, and UI.
- Separate safe documentation or test changes from forbidden production-source edits.
- Deliver refactor plans, risks, and suggested patch outlines without applying them to production source.

## Test Writing

- Add or update the narrowest tests that cover the claimed behavior.
- Prefer existing test layout and naming patterns.
- When a test cannot be added without production changes, explain the gap instead of forcing coverage.

## Docs And Architecture Lookup

- Prefer linking back to existing docs rather than duplicating them.
- Use `CONTEXT.md` for terminology consistency.
- Add concise clarifying docs only when the current docs set has a real entry-point gap.
