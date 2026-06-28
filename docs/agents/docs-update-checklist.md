# Docs Update Checklist

Agents should use this checklist whenever code, terminology, schema, commands, or user-facing behavior changes.

## Before Editing

- Identify the affected surface: `README.md`, `CONTEXT.md`, `docs/app/`, `docs/guides/`, `docs/plans/`, `docs/plans/plan-status.md`, `docs/postman/`, `docs/agents/`, and relevant source comments or tests.
- Determine the current canonical name for the thing that changed.
- Identify any old names, stale paths, or transitional wording that must be removed or rewritten.

## Required Updates

- Update current-state docs first so they describe the new behavior, names, and boundaries.
- Keep planning docs aligned with current terminology even when they still describe future work.
- Keep historical or migration notes clearly labeled as such; do not let them read like current guidance.
- Update examples, commands, links, and file references that point at renamed files or renamed concepts.
- If a plan's status, current phase, next phase, or immediate next step changes, update `docs/plans/plan-status.md` in the same change.

## Verification

- Run a repo search for the old terms and confirm only justified historical references remain.
- Spot-check the updated docs for link correctness and vocabulary consistency.
- If the change affects user-facing behavior, confirm the docs explain the new behavior without mentioning retired names unless needed for migration.

## Plan Requirement

- Any future plan that changes behavior, terminology, schema, or command surface must include a docs update step that references this checklist.
