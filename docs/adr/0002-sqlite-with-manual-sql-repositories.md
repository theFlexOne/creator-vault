# SQLite with manual SQL repositories

Creator Vault uses local SQLite through `better-sqlite3`, with repository-owned manual SQL instead of an ORM. The schema in `src/db/schema.sql` is treated as the canonical persistence model, and repository modules own the SQL needed to read and write that model.

This keeps persistence explicit and close to the current CLI-oriented workflow: local data, direct schema control, and narrow repository boundaries instead of a broader ORM abstraction. That tradeoff favors predictable storage behavior and easy inspection of SQL over higher-level persistence tooling.
