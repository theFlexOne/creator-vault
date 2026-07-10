---
name: "Agent Context Setup"
description: "Scaffold lightweight AGENTS.md and .ai context files for a project without editing application source code"
argument-hint: "Optional constraints, known tools, or project details"
agent: "agent"
---

Set up lightweight agent-context files for this project so AI tools behave consistently across clones and environments.

Use any extra details supplied with this prompt invocation as higher-priority constraints.

Hard constraints:
- You may write test code and add helpful, guiding inline comments to existing files.
- You must never modify, rewrite, or edit the application source code itself.
- Do not assume which AI tools are in use.
- Only add tool-specific files for the tools the user explicitly names.
- Do not ask about custom skills, custom agents, or custom prompt libraries.

This may be either:
- A brand new project with little or no code.
- An existing app that needs agent context added.

Start by reviewing the current chat and briefly inspecting the repository. Use [README.md](../../README.md), [CONTEXT.md](../../CONTEXT.md), [package.json](../../package.json), [docs](../../docs/), and existing [.github](../) contents when relevant.

Before drafting or creating any files:
1. Confirm which setup questions have already been answered, either explicitly or implicitly.
2. Provide a short list of answers you believe are already known.
3. Provide a short list of anything still missing.
4. Ask one focused batch of practical setup questions.

Question rules:
- Every setup question must be multiple choice.
- Each question must include a small set of likely options.
- Each question must include an `Other / write-in` option.
- Allow the user to add extra detail after choosing an option.
- Do not ask open-ended questions unless they are part of an `Other / write-in` choice.
- Keep the batch limited to what is needed for a practical first version.

The setup questions should cover only the still-missing items among:
- Project type, maturity, and purpose.
- Supported AI tools.
- Main app layers and architecture.
- Key workflows such as implement, review, debug, and refactor.
- Commands for dev, test, lint, build, and format.
- Glossary or domain terms.
- Definition of done.
- Any minimal docs worth adding.

Do not draft or create scaffold files until the needed answers are covered.

After the needed answers are covered, propose and draft a tight scaffold similar to this, adapted only as needed:

```text
your-project/
├─ AGENTS.md
├─ .ai/
│  ├─ project.md
│  ├─ workflows.md
│  ├─ commands.md
│  └─ definition-of-done.md
├─ <tool-specific instruction files only if needed>
└─ docs/
   ├─ architecture.md
   └─ glossary.md
```

Scaffold rules:
- Explicitly state the restriction against editing application code within the context files.
- Use `AGENTS.md` as the shared source of truth for agent behavior.
- Use `.ai/` for reusable project context, workflows, commands, and completion criteria.
- Use thin tool-specific wrappers only when a selected AI tool needs one.
- Use repo-relative paths only, never machine-specific paths.
- Keep each file concise, maintainable, and useful.
- Avoid duplicating the same guidance across multiple files.
- If details are unknown, use clear placeholders instead of inventing specifics.
- If this is an existing project, infer what you can from the repo and ask only for missing context.

Final output:
1. The recommended scaffold tree.
2. The drafted contents of each file.
3. A one-sentence purpose for each file.
4. A short list of anything the team should fill in later.

Optimize for a practical first version, not a comprehensive framework.