# Ingest orchestration lives in `src/ingest`

Public ingest orchestration lives in `src/ingest/`. CLI commands are entrypoints, repositories remain persistence boundaries, and `src/services/` is reserved for non-ingest support services rather than workflow orchestration.

This keeps the workflow boundary explicit: `src/ingest` coordinates input loading, source retrieval, parsing, storage, temp-directory access, and reporting without owning raw database queries. The decision makes the ingest pipeline easier to test as an orchestration layer while keeping persistence and low-level adapters behind narrower seams.
