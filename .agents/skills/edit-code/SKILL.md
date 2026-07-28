---
name: edit-code
description: Make scoped production changes only when the user explicitly authorizes this skill.
---

# Edit Code

Use this skill only when the user explicitly invokes `$edit-code` or otherwise clearly authorizes this skill for production-code work. Ordinary diagnosis, review, planning, test, and documentation requests remain read-only.

## Preflight

1. Restate the authorized outcome and the files or behavior in scope.
2. Read `AGENTS.md`, `CONTEXT.md`, and the smallest relevant implementation, test, and documentation files before editing.
3. Inspect `git status --short` and preserve unrelated working-tree changes. Do not overwrite, discard, or fold them into the task.
4. Confirm the request is sufficiently concrete. If a material product or architecture decision is unresolved, stop and ask for direction.

## Implementation

- Change only what is necessary for the authorized outcome. Do not broaden a plan, refactor unrelated code, or alter schema or seed data without explicit scope.
- Use **Profile** as the cross-platform domain identity. Use platform-specific terms, such as **YouTube Channel**, **Video**, and **Transcript**, where applicable.
- Keep tests and operator-facing documentation aligned when the authorized change affects behavior, commands, or workflows.
- Work in small coherent slices. After each slice, inspect the diff and repair local failures before expanding scope.

## Validation

- Run the narrowest command or test that can disprove the change, then widen validation only when risk or the request justifies it.
- Use existing package scripts only. Do not claim lint or formatting ran unless the repository adds and runs those commands.
- Run `git diff --check` before completion. Report any validation that was skipped and the remaining risk.

## Completion Report

State:

- the production, test, and documentation changes made;
- validation run and its result;
- unrelated working-tree changes preserved; and
- remaining blockers, follow-up work, or known risk.
