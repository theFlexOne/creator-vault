## Plan: Add High-Priority Test Coverage (Expanded Sub-Phases)

**TL;DR**: Add ~30 tests covering `normalizeYoutubeUrl` (pure function), the three fetch command handlers, and trackChannel edge cases. Each phase is broken into granular sub-phases for incremental validation.

---

**Execution Workflow**
- **Incremental Verification**: Run `npm test` after each phase completion (steps 1.5, 2.6, 3.6, 4.6, 5.5)
- **Check-in Cadence**: Stop and request user approval after completing Phase 2 before proceeding to Phase 3
- **State Management**: Commit or save changes after each phase to preserve progress
- **Error Handling**: If any phase fails, stop execution and report the issue before proceeding

---

**Steps**

### Phase 1 — normalizeYoutubeUrl tests (pure function, all branches)
**1.1** Add `describe('normalizeYoutubeUrl')` block to command.service.test.ts after existing `resolveIdentifiers` tests

**1.2** Write channel ID format tests (2 tests):
   - `'UCxxx'` channel ID → `https://www.youtube.com/channel/UCxxx/videos`
   - Existing channel URL `'https://youtube.com/channel/UCxxx'` → adds `/videos` suffix

**1.3** Write handle format tests (2 tests):
   - `'@handle'` → `https://www.youtube.com/@handle/videos`
   - `'barehandle'` (no @ prefix) → `https://www.youtube.com/@barehandle/videos`

**1.4** Write URL edge case tests (2 tests):
   - `'https://youtube.com/watch?v=xyz'` → no `/videos` added (watch URL exception)
   - `'https://youtube.com/@handle/'` → strips trailing slash, adds `/videos`

**1.5** Run `npm test` — verify 6 new tests pass *(depends on 1.1-1.4)*

---

### Phase 2 — fetchChannel handler tests *(can parallelize with Phase 1)*
**2.1** Create src/commands/__tests__/fetchChannel.test.ts with:
   - **First**: Read `src/commands/__tests__/trackChannel.test.ts` to copy the exact mocking pattern for `logger` and `resolveIdentifiers`
   - Imports for `fetchChannel`, mocked helpers, types
   - `jest.mock()` declarations for `getChannelMetadata`, `upsertChannelData`, `resolveIdentifiers`, `logger`
   - `describe('fetchChannel command')` block
   - Mock metadata fixture
   - `beforeEach` to clear mocks and setup default `resolveIdentifiers` passthrough

**2.2** Write happy path tests (2 tests):
   - Basic execution: metadata fetched, `--save` calls `upsertChannelData` with correct args, logs success
   - Handle without `@` prefix: `metadata.handle = 'test'` → log shows `@test`

**2.3** Write --json flag test (1 test):
   - `--json` flag: results array populated, `console.log` called with JSON, resolution message to stderr (not logger.info)

**2.4** Write error/edge case tests (2 tests):
   - Metadata fetch returns `null` → `logger.error` called, `upsertChannelData` not called, continues to next
   - Unhandled error in loop (throw from `getChannelMetadata`) → catches, logs error, continues

**2.5** Write multiple channels test (1 test):
   - Two channels → both processed, results array has 2 items, both metadata objects verified

**2.6** Run `npm test` — verify 6 new fetchChannel tests pass *(depends on 2.1-2.5)*

---

### Phase 3 — fetchVideos handler tests
**3.1** Create src/commands/__tests__/fetchVideos.test.ts with:
   - Imports, mocks for `getChannelMetadata`, `getChannelInternalId`, `getChannelUrl`, `upsertVideoData`, `resolveIdentifiers`, `logger`
   - Mock metadata fixture with `videos` array (at least 3 videos for slicing tests)
   - `beforeEach` setup

**3.2** Write happy path tests (2 tests):
   - Basic with `--save`: fetches metadata, calls `upsertVideoData` with correct channelInternalId and videos, logs count
   - Without `--save`: metadata fetched, `upsertVideoData` not called, logs "not saved"

**3.3** Write --json flag test (1 test):
   - `--json`: results array, `console.log` JSON output, stderr for resolution message

**3.4** Write DB lookup failure tests (2 tests):
   - `getChannelInternalId` returns `undefined` → logs error mentioning "not found in database", continues
   - `getChannelUrl` returns `undefined` → logs error, continues

**3.5** Write metadata and limit tests (2 tests):
   - `getChannelMetadata` returns `null` → logs error, `upsertVideoData` not called
   - `--limit 2` with metadata having 5 videos → only first 2 passed to `upsertVideoData` (verify via `toHaveBeenCalledWith` checking videos.length === 2)

**3.6** Run `npm test` — verify 7 new fetchVideos tests pass *(depends on 3.1-3.5)*

---

### Phase 4 — fetchTranscripts handler tests
**4.1** Create src/commands/__tests__/fetchTranscripts.test.ts with:
   - Imports, mocks for `getChannelInternalId`, `getVideosMissingTranscripts`, `getChannelTranscripts`, `upsertTranscriptData`, `resolveIdentifiers`, `logger`
   - Mock fixtures for video IDs and transcripts
   - `beforeEach` setup

**4.2** Write happy path tests (2 tests):
   - With `--save`: gets missing videos, fetches transcripts, calls `upsertTranscriptData`, logs stored count
   - Without `--save`: transcripts fetched, `upsertTranscriptData` not called, logs "not saved"

**4.3** Write --json flag test (1 test):
   - `--json`: results array with channel and transcripts, JSON to stdout

**4.4** Write DB and edge case tests (3 tests):
   - Channel not in DB (`getChannelInternalId` → `undefined`) → logs error, continues
   - No videos missing transcripts (`getVideosMissingTranscripts` → `[]`) → logs info message, doesn't call `getChannelTranscripts`
   - Error thrown in loop → catches, logs, continues

**4.5** Write multiple channels test (1 test):
   - Two channels → both processed, results array has 2 items

**4.6** Run `npm test` — verify 7 new fetchTranscripts tests pass *(depends on 4.1-4.5)*

---

### Phase 5 — trackChannel edge case tests
**5.1** Add test: all transcripts already exist
   - `getVideosMissingTranscripts` returns `[]` → `getChannelTranscripts` not called, logs "All processed videos already have transcripts"

**5.2** Add test: limit application
   - Metadata has 20 videos, `limit: 5` → only 5 passed to `upsertVideoData` (check `videos` arg length)

**5.3** Add test: multiple channels
   - Two channels → both processed sequentially, verify both get metadata fetched and upserted

**5.4** Add test: error during transcript fetch
   - `getChannelTranscripts` throws → catches error, logs, `upsertTranscriptData` not called for that channel

**5.5** Run `npm test` — verify 4 new trackChannel tests pass (total 6 in file) *(depends on 5.1-5.4)*

---

### Phase 6 — Final verification
**6.1** Run `npm test` across entire suite — all 41 tests pass (11 original + 30 new)

**6.2** Run `npm test -- --coverage` — verify:
   - fetchChannel.ts handler: >80% coverage
   - fetchVideos.ts handler: >80% coverage
   - fetchTranscripts.ts handler: >80% coverage
   - trackChannel.ts handler: >80% coverage
   - `normalizeYoutubeUrl` function: 100% coverage

**6.3** Manual review: confirm all critical branches covered (channel not found, --save, --json, error handling, multiple inputs)

---

**Relevant files**
- src/services/__tests__/command.service.test.ts — add `normalizeYoutubeUrl` tests (Phase 1)
- src/commands/__tests__/fetchChannel.test.ts — **new file** (Phase 2)
- src/commands/__tests__/fetchVideos.test.ts — **new file** (Phase 3)
- src/commands/__tests__/fetchTranscripts.test.ts — **new file** (Phase 4)
- src/commands/__tests__/trackChannel.test.ts — extend (Phase 5)

---

**Verification after each sub-phase**
- 1.5, 2.6, 3.6, 4.6, 5.5 — incremental `npm test` runs
- 6.1-6.3 — final suite-wide validation

---

**Decisions**
- Each phase broken into sub-phases: setup → test groups → validation
- Phases 1-2 can parallelize (independent files)
- Template pattern: Explicitly read `src/commands/__tests__/trackChannel.test.ts` before creating new test files to ensure consistent mocking syntax
- Total: ~30 new tests (11 existing → 41 total)
- Excluded: `getChannelTranscripts`, `getVideoTranscript` integration, `db.service` (medium/low priority)