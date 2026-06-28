## Agent skills

### Issue tracker

Issues for this repo are tracked in GitHub Issues. External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

This repo uses the default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain-doc layout with one root `CONTEXT.md` and root `docs/adr/`. See `docs/agents/domain.md`.

### Documentation updates

Agents should follow `docs/agents/docs-update-checklist.md` whenever code, terminology, schema, commands, or user-facing behavior changes.

- Update current-state docs before or alongside the code change.
- Keep planning docs aligned with current terminology.
- Treat future plans as incomplete unless they include a documentation update step.

### Commit messages

Agents should use this commit message template:

```gitcommit
<type>(<scope>): <short imperative summary>

<1-2 sentences explaining what changed and why. Wrap at ~72 chars.>

Plan: <path/to/plan.md>
Phase: <n>
# Or:
# Phases: <n>, <n>

Includes:
- <key change>
- <key change>
- <key change>

# For phase-based commits, prefer phase sections instead:
# Phase <n>:
# - <key change>
# - <key change>

Verification:
- <command>
- <command>
- <command>

Refs #<issue>
# Optional additional refs:
# Refs #<issue>
```

- Use a conventional subject line: `type(scope): imperative summary`.
- Add a short explanatory paragraph after the subject.
- Include either an `Includes:` section or `Phase <n>:` sections.
- Include a `Verification:` section with the commands that were run.
- End with issue references such as `Refs #2` or `Closes #2`.
- When a commit implements a tracked plan, include both `Plan:` and `Phase:` or `Phases:` lines.
