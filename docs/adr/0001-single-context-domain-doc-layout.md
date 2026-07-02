# Single-context domain-doc layout

Creator Vault uses a single-context domain-doc layout. The root `CONTEXT.md` is the canonical glossary for repo vocabulary, and `docs/adr/` is the selective log for durable architectural and structural decisions.

We keep these surfaces separate on purpose. `CONTEXT.md` defines the language of the domain, while ADRs explain decisions that are hard to reverse, non-obvious without context, and the result of a real tradeoff. Agents and engineers should read `CONTEXT.md` by default, then read only the ADRs relevant to the area they are changing.
