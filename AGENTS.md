# Profile Vault Agent Guide

This file is the shared source of truth for AI assistants working in this repository. Keep tool-specific wrappers thin or omit them entirely when this file already covers the needed behavior.

## Operating Mode

- All agents in this repository operate in read-only mode for application source code.
- AI in this project is a complex assistant for analysis, review, debugging, planning, tests, docs, and narrow non-behavioral guidance.
- Do not modify application source, schemas, seeds, or other files that change production behavior unless the user explicitly invokes or authorizes `$edit-code`.
- Without that authorization, permitted work includes analysis, review, debugging, planning, tests, docs, agent-context files, and helpful inline comments when explicitly useful.
- If a request needs a production change but `$edit-code` has not been explicitly authorized, provide precise handoff guidance instead of making the edit.
- `$edit-code` is the sole exception to this default; follow `.agents/skills/edit-code/SKILL.md` whenever it is authorized.

## Repo Priorities

- Optimize first for code review, debugging, refactor planning, test writing, and docs or architecture lookup.
- Translate implementation findings into precise handoff guidance for the lead developer rather than editing application source.
- Prefer existing repo docs over re-explaining the system from scratch.

## Project Map

- Start with `README.md` for setup, commands, and current workflows.
- Use `CONTEXT.md` as the canonical domain glossary. **Profile** is the cross-platform identity; use concrete platform terms such as **YouTube Channel**, **Video**, and **Transcript** for source-specific concepts.
- Use `docs/app/overview.md` for runtime shape and layer boundaries.
- Use `docs/app/database.md` before reasoning about persistence behavior.

## Workflow

- Stay repo-relative in all references and examples.
- Do not invent missing commands, policies, or architecture details.
- When details are unclear, point to the gap and leave a clear placeholder.
- For review, focus on concrete bugs, regressions, missing validation, and risky assumptions.
- For debugging, start with the smallest relevant command or test. Use `npm run start -- test-connection` as a quick environment check when SQLite or YouTube access may be involved.
- For refactor planning, make CLI, ingest, repository, service, and UI boundaries explicit. Separate safe docs or test work from production changes that require `$edit-code`.
- For tests, follow existing test layout and add the narrowest coverage that supports the claimed behavior.
- Prefer existing documentation over duplicate explanations; add concise clarification only when there is a real entry-point gap.

## Commands

- Run the CLI from source: `npm run start -- <command>`.
- Compile: `npm run compile`; build: `npm run build`; full tests: `npm test`; coverage: `npm run test:coverage`.
- Focused test suites: `npm run test:commands`, `npm run test:services`, and `npm run test:lib`.
- Database utilities: `npm run db:seed`, `npm run db:dump:schema`, `npm run db:dump:table -- <table-name>`, and `npm run db:dump:data`.
- Do not invent lint or format commands: neither is configured as an npm script.

## Validation Default

- Prefer the narrowest relevant tests for the touched area.
- Update docs when behavior, commands, or operator guidance changes.
- If validation cannot run, say what was skipped and what risk remains.
- Do not claim lint or formatting ran unless the repository adds and runs those commands.
- Do not require full-suite tests, compilation, or builds unless the task warrants the broader check.
