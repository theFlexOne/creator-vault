# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root
- relevant files under `docs/adr/` when the work touches an architectural decision or could conflict with one

If these files do not exist, proceed silently.

Do not preload the entire `docs/adr/` directory for ordinary code, docs, or plan work. Read ADRs selectively when the task needs architecture context.

## File structure

This repo is a single-context repo:

```
/
|- CONTEXT.md
|- docs/
|  \- adr/
\- src/
```

## Use the glossary's vocabulary

When naming domain concepts in issues, plans, tests, or proposals, use the terms defined in `CONTEXT.md`.

## Flag ADR conflicts

If proposed work contradicts an ADR, surface that conflict explicitly instead of silently overriding it.
