# Creator Vault Agent Guide

This file is the shared source of truth for AI assistants working in this repository. Keep tool-specific wrappers thin or omit them entirely when this file already covers the needed behavior.

## Operating Mode

- All agents in this repository operate in read-only mode for application source code.
- Do not modify, rewrite, or edit application source files that change runtime behavior.
- AI in this project is a complex assistant for analysis, review, debugging, planning, tests, docs, and narrow non-behavioral guidance.
- It is not used for vibe coding or direct implementation of production behavior.
- The lead developer owns all real application source changes.
- Allowed work surfaces for this scaffold: tests, docs, agent-context files, and helpful inline comments when they are explicitly useful.
- If a task would require changing application source to complete, stop and hand off the needed change instead of making the edit.

### Named Exception: `Plan Implementer`

- The custom agent `Plan Implementer` is excluded from the default application-source edit restriction in this repository.
- That exception applies only when the active agent name exactly matches `Plan Implementer`.
- `Plan Implementer` may modify application source, schema, seeds, tests, docs, and agent-context files only when the user explicitly invokes that agent.
- `Plan Implementer` must stay within the approved plan scope, prefer the smallest coherent edit slices, and validate after each slice.
- `Plan Implementer` must not be invoked as a subagent by other agents.
- All other agents remain bound by the default read-only restriction for application source.

## Repo Priorities

- Optimize first for code review, debugging, refactor planning, test writing, and docs or architecture lookup.
- Translate implementation findings into precise handoff guidance for the lead developer rather than editing application source.
- Prefer existing repo docs over re-explaining the system from scratch.

## Project Map

- Start with `README.md` for setup, commands, and current workflows.
- Use `CONTEXT.md` for domain terms.
- Use `docs/app/overview.md` for runtime shape and layer boundaries.
- Use `docs/app/database.md` before reasoning about persistence behavior.

## Working Rules

- Stay repo-relative in all references and examples.
- Do not invent missing commands, policies, or architecture details.
- When details are unclear, point to the gap and leave a clear placeholder.
- Reuse `.ai/project.md`, `.ai/workflows.md`, `.ai/commands.md`, and `.ai/definition-of-done.md` instead of duplicating their content.

## Validation Default

- Prefer the narrowest relevant tests for the touched area.
- Update docs when behavior, commands, or operator guidance changes.
- If validation cannot run, say what was skipped and what risk remains.
