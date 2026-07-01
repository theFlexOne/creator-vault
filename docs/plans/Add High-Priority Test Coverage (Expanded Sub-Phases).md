## Plan: Raise Test Coverage and CI Confidence

**TL;DR**: Replace the narrow CLI-only coverage plan with an audit-driven plan that first makes coverage trustworthy, then closes the highest-risk gaps in CLI parsing, diagnostics, SQLite persistence, ingest orchestration, YouTube source behavior, and CI.

---

**Execution Workflow**
- **Coverage first**: Add coverage configuration and CI alignment before chasing individual percentages.
- **Behavior-preserving tests**: Keep production behavior unchanged unless a new test exposes a real bug.
- **Canonical schema**: Treat `src/db/schema.sql` as the test schema source of truth for persistence coverage.
- **Docs sync**: Follow `docs/agents/docs-update-checklist.md` whenever commands, CI, coverage scripts, or plan status change.

---

**Steps**

### Phase 1 - Coverage Infrastructure And CI
**Status:** Completed 2026-07-01. Added the coverage script, source-wide Jest coverage collection, npm-based release workflow verification, and README coverage command. Threshold enforcement remains deferred until the planned test phases land.

**1.1** Add a first-class `npm run test:coverage` script.

**1.2** Update Jest coverage configuration so coverage runs count untouched source files.

**1.3** Use global coverage thresholds after the planned tests land:
- branches: `80%`
- statements: `85%`
- functions: `85%`
- lines: `85%`

**1.4** Exclude only low-value files from coverage:
- test files and test helpers
- build output
- trivial barrels
- type-only files when they do not emit behavior
- DB utility scripts without command coverage

**1.5** Update `.github/workflows/release.yml` to use this repo's npm setup:
- `npm ci`
- `npm run compile`
- `npm test`
- `npm run test:coverage`
- `npm run build`

**1.6** Remove the stale `pnpm lint` workflow step unless a lint script is reintroduced.

**1.7** Update `docs/plans/plan-status.md` so the active next step points to this Phase 1 coverage infrastructure work.

**1.8** Verify:
```bash
npm run test:coverage
npm run compile
```

---

### Phase 2 - CLI Input And URL Helper Branch Coverage
**Status:** Completed 2026-07-01. Added direct `normalizeYoutubeUrl` branch coverage and CLI input edge-case coverage for empty inputs, empty files, malformed JSON, unsupported JSON fallback behavior, and file read failures.

**2.1** Add direct tests for `normalizeYoutubeUrl`.

**2.2** Cover:
- channel ID input becomes a channel `/videos` URL
- channel URL input gains `/videos`
- handle input becomes a handle `/videos` URL
- bare handle input becomes a handle `/videos` URL
- watch URLs do not gain `/videos`
- trailing slashes are normalized before adding `/videos`

**2.3** Extend `src/cli/__tests__/input.test.ts` for:
- empty args
- empty file contents
- malformed JSON returning `[]`
- unsupported JSON object shapes falling back to line splitting
- read errors returning `[]` and logging the failure

**2.4** Verify:
```bash
npm test -- src/lib/youtube src/cli
npm run test:coverage
```

---

### Phase 3 - Command And Diagnostic Coverage
**Status:** Completed 2026-07-01. Added `test-connection` command delegation coverage and mocked diagnostic service tests for database success/failure, downloader success/failure, YouTube network success/warning, and final completion logging. Existing ingest command tests preserve the current defaults and validation behavior.

**3.1** Preserve current ingest command defaults in command tests:
- `ingest-channel-profile --save=false`
- `ingest-channel-videos --limit=100`
- `ingest-channel-videos --batch=10`
- `ingest-channel-videos --save=false`
- `ingest-transcripts --limit=10`
- `ingest-transcripts --save=false`

**3.2** Keep validation coverage for non-positive `limit` and `batch` values.

**3.3** Add command coverage for `test-connection` delegating to `runTestConnection`.

**3.4** Add service tests for `runTestConnection` with mocked DB, mocked `youtube-dl-exec`, and mocked logger.

**3.5** Cover diagnostic paths:
- DB success
- DB failure
- downloader version success
- downloader version failure
- YouTube network success
- YouTube network warning
- final completion log

**3.6** Verify:
```bash
npm test -- src/commands src/services
```

---

### Phase 4 - Schema-Faithful Persistence Tests
**4.1** Create a shared test DB helper that loads `src/db/schema.sql` into an in-memory SQLite database.

**4.2** Enable `PRAGMA foreign_keys = ON` in the shared test DB helper.

**4.3** Replace duplicated hand-written schemas in repository/storage tests with the shared helper.

**4.4** Preserve existing assertions for:
- creator creation and reuse
- channel insert/update
- video upsert and missing-transcript selection
- transcript versioning
- transcript segment persistence
- ingest storage adapter behavior

**4.5** Add at least one assertion proving the real schema is active, such as:
- invalid JSON in source tag/category columns is rejected
- foreign-key enforcement rejects orphan rows
- `videos.url` uniqueness behaves like `src/db/schema.sql`

**4.6** Verify:
```bash
npm test -- src/services src/ingest/__tests__/ingestStorage.test.ts
```

---

### Phase 5 - Ingest, Source, And Exported Helper Gaps
**5.1** Extend ingest orchestration tests for:
- missing channel profile
- empty video page
- unmatched caption result
- caption file read failure
- storage failure
- transcript backfill missing channel
- transcript backfill with no videos needing transcripts

**5.2** Extend YouTube source tests for:
- entries without IDs are skipped
- `preferManual=false` selects automatic captions before manual captions
- no matching caption language returns no download
- failed caption fetch throws the expected error
- multiple caption requests return only successfully downloaded captions

**5.3** Add mock-based tests for exported legacy YouTube helpers:
- `getChannelVideoUrls`
- `getVideoInfo`
- `getChannelTranscripts`
- `getVideoTranscript`

**5.4** Do not remove legacy exported helpers in this plan. Cover their current compatibility behavior.

**5.5** Verify:
```bash
npm test -- src/ingest src/lib/youtube
```

---

### Phase 6 - Final Coverage Gate And Docs Sync
**6.1** Run the full verification sequence:
```bash
npm run compile
npm test
npm run test:coverage
git diff --check
```

**6.2** If coverage fails, add or improve tests. Do not lower thresholds to pass.

**6.3** Update docs only where behavior or commands changed:
- coverage script
- CI expectations
- active plan status

**6.4** Run a stale-term search to confirm the old incorrect batch-default plan wording is gone.

---

**Acceptance Criteria**
- `npm run test:coverage` exists and counts unimported source files.
- CI uses npm commands that exist in this repo.
- Coverage thresholds are enforced after the planned tests are added.
- SQLite tests use the canonical schema and foreign-key behavior.
- CLI command tests document the current defaults, including `ingest-channel-videos --batch=10`.
- `test-connection` is covered without touching real YouTube or the real DB.
- Ingest orchestration tests cover happy paths, dry runs, missing data, parser diagnostics, and dependency failures.
- Exported YouTube helper tests document current compatibility behavior.

---

**Decisions**
- Prefer behavioral tests through public module boundaries over implementation-detail assertions.
- Use npm as the canonical CI package manager because `package-lock.json` is present and no `pnpm-lock.yaml` is present.
- Keep legacy exported YouTube helpers in place for this plan.
- Do not change production CLI behavior as part of coverage work unless a new test exposes a real bug.
