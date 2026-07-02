# Context For Later Implementation

> Historical note: this plan is complete and kept only as implementation history for follow-up work.

This plan follows the completed ingest vocabulary cleanup. At the time this plan was written:

- Current public commands are `ingest-channel-profile`, `ingest-channel-videos`, and `ingest-transcripts`.
- The ingest module now has direct source/storage/parser orchestration; Phase 7.1 added CLI/report contract coverage before Phase 8 finalizes user-facing behavior.
- Phases 1-9 have been implemented and verified; the real ingest implementation plan is complete.
- The json3 parser is now a pure parser boundary in `src/transcripts/json3Parser.ts`; remaining work should use it rather than treat parser behavior as a TODO.
- The relevant TODO reference docs are:
  - `docs/plans/Ingest Implementation TODO Inventory.md`
  - `docs/plans/Current Transcript Schema And Follow-Up.md`
- The current database schema already includes versioned `transcripts` plus `transcript_segments`, so the remaining work should build on that model and remove legacy plain-text assumptions from storage wiring and tests.
- The current database schema already requires `channels.creator_id`, and creator persistence now lives in `src/repositories/creator.repository.ts`. Production ingest storage uses that boundary for creator-backed channel persistence.
- There are root-level sample/data files that may be useful fixtures or stray artifacts; they should be reviewed before deletion.
- This plan is intentionally written for a human/user-led implementation. The agent should review, explain, and verify only. The agent should not edit runtime code while executing this plan unless explicitly told to abandon that constraint. The agent may always edit plan/status files to keep review gates and plan state current.

# Real Ingest Implementation Guide Plan With Review Gates

## Summary

This plan is for you to implement manually. The agent’s job is not to edit runtime code. The agent’s output after each phase is implementation notes, examples, and verification results that help you make the edits yourself.

Start at Phase 1. Before every phase after Phase 1, the agent must first review the previous phase’s implementation for correctness, scope control, and test status. Only then should it produce the next phase’s implementation notes.

Hard rule for the agent:
- Do not edit runtime code.
- Do not apply patches outside plan/status documentation.
- Do not run formatters or commands that rewrite files outside plan/status documentation.
- Do not delete files.
- Read, analyze, run non-mutating verification, update plan/status documentation, and provide instructions only.

## Review Gate Protocol

At the end of each phase, the agent must provide a gate report with:

- **Phase completed:** phase number and name.
- **Implementation notes produced:** concise list of docs, examples, commands, or design notes provided to the user.
- **Runtime code edited by agent:** must be `No`.
- **Behavior changed by agent:** must be `No runtime behavior change`.
- **Scope check:** confirm no runtime code edits, no production schema change by the agent, no file deletion by the agent, no legacy CLI reintroduction, no cache workflow, and no public `--json`.
- **Verification run:** exact non-mutating commands run and pass/fail status.
- **Known risks:** uncertainty, test gaps, or decisions still requiring user implementation.
- **Next phase preview:** one sentence describing the next phase.
- **Gate rule:** stop and wait for the user to say `continue`.

Before each phase after Phase 1, the agent must review the previous phase’s user-made implementation:
- Inspect relevant diffs/files.
- Run appropriate non-mutating checks.
- List issues or confirm no findings.
- Do not proceed to new implementation notes until that review is complete.

## Phase 1: Repo Cleanup Audit

Agent output:
- A list of root-level stray data/doc files with recommendation: delete, move to fixtures, or keep.
- Start with known candidates: `Jesus Won Without Fighting Back...*.json3`, `Jesus Won Without Fighting Back...*.vtt`, `alisachilders-channel-full.json`, `raw_metadata.json`, `thebeatagp-channel-full.json`, `video.json`, `video1.json`, and `README.starter-template.md`.
- Search for other stray files outside normal source/doc/test/db folders.
- Ask before deleting anything that might be user data or a useful fixture.

Example commands:
```bash
find . -maxdepth 2 -type f | sort
rg -n "raw_metadata|thebeatagp|alisachilders|json3|starter-template"
git status --short
```

Acceptance:
- You have a cleanup decision list.
- Obvious throwaway files are deleted only by you after confirmation.
- Useful sample data is moved by you into a deliberate fixture path, such as `test/fixtures/youtube/`.

Pause and wait for `continue`.

## Phase 2: Transcript Repository Alignment

Agent pre-phase review:
- Review Phase 1 cleanup decisions and any user-made file moves/deletions.
- Confirm no useful fixture data was accidentally lost.
- Confirm the repo still compiles/tests if applicable.

Agent output:
- A short alignment note explaining how the current versioned `transcripts` and `transcript_segments` tables are used by ingest storage.
- Example repository calls for transcript version lookup, checksum-based deduplication, next-version insert, and segment persistence.
- A compatibility note listing any remaining plain-text transcript assumptions in tests, docs, or transitional code.

Implementation guidance:
- Treat `src/db/schema.sql` as canonical unless a verified mismatch requires a targeted fix.
- Replace old plain-text transcript assumptions with the existing version-aware repository methods.
- Keep raw json3 in SQLite; temp files are staging only.

Acceptance:
- DB/service tests cover transcript version insert, checksum skip, changed checksum next-version insert, and segment persistence on the existing schema.
- Legacy plain-text transcript assumptions are removed from touched tests/docs.
- `npm run compile` passes after your implementation.

Pause and wait for `continue`.

## Phase 3: YouTube Source Adapter Instructions

Agent pre-phase review:
- Review your Phase 2 schema/repository implementation.
- Check for schema/repository mismatch, broken seeds, or transcript tests that do not prove versioning.
- Run relevant non-mutating verification.

Agent output:
- A source adapter design note showing how `YoutubeSource` hides yt-dlp details from ingest orchestration.
- Example call shapes for:
  - `getChannelProfile(input)`
  - `getChannelVideosPage(input, { playlistStart, playlistEnd })`
  - `downloadJson3Captions(requests, tempDir)`
- Mocked yt-dlp examples proving expected options.

Implementation guidance:
- Use `/videos` with `dumpSingleJson: true`, `skipDownload: true`, `flatPlaylist: false`, `playlistStart`, and `playlistEnd`.
- Keep default chunk/page size at `10` until larger chunks are validated.
- Prefer manual English json3 captions, then automatic English fallback.
- Keep retrieval naming only inside this low-level retrieval adapter.

Acceptance:
- Adapter tests mock external calls.
- No tests hit live YouTube.
- Existing helper behavior is preserved until fully replaced.
- `npm run compile` passes after your implementation.

Pause and wait for `continue`.

## Phase 4: Json3 Parser Instructions

Agent pre-phase review:
- Review your Phase 3 source adapter implementation.
- Confirm tests mock external YouTube/yt-dlp calls.
- Confirm low-level retrieval vocabulary remains source-level only.

Agent output:
- Parser examples using small json3 fixtures.
- Expected normalized segment output for each fixture.
- Diagnostic examples for invalid JSON, empty events, missing timing, and unsupported shapes.

Implementation guidance:
- Keep parser pure: no DB, filesystem, logger, or YouTube imports.
- Collapse text runs into segment text.
- Compute `startMs`, `endMs`, stable `idx`, and SHA-256 checksum.
- Return diagnostics instead of throwing for malformed individual events.
- Return an invalid-json diagnostic for invalid top-level JSON.

Acceptance:
- Parser fixture tests cover normal captions, empty events, multi-run text, timing, invalid JSON, and checksum stability.
- `npm run compile` passes after your implementation.

Pause and wait for `continue`.

## Phase 5: Creator Repository Instructions

Agent pre-phase review:
- Review your Phase 4 parser implementation.
- Confirm parser is pure and diagnostics are stable.
- Confirm parser tests use fixtures and do not require YouTube, DB, or filesystem writes beyond test fixtures.
- Inspect `src/repositories/channel.repository.ts` and confirm creator persistence is still inline before extracting it.

Agent output:
- A repository boundary note showing which creator operations belong in `src/repositories/creator.repository.ts`.
- Example repository calls for create/reuse by creator name.
- A channel repository adjustment note showing how channel saves use the creator boundary without owning creator persistence.
- A docs update checklist note for any changed repository responsibilities.

Implementation guidance:
- Add `src/repositories/creator.repository.ts` for creator persistence.
- Move create/reuse-by-name behavior out of `src/repositories/channel.repository.ts`.
- Keep `src/repositories/channel.repository.ts` responsible for YouTube channel rows and channel lookup only.
- Preserve current behavior where channel profile saves create or reuse a stub Creator named from the YouTube channel name.
- Do not change `CONTEXT.md` terminology unless the domain language changes.
- Follow `docs/agents/docs-update-checklist.md`; update `docs/app/database.md` if repository responsibilities or creator/channel persistence docs change.

Acceptance:
- Creator repository tests cover create, reuse, and required-name behavior.
- Channel repository tests prove channel saves still populate `channels.creator_id`.
- Existing channel profile save behavior is preserved.
- `npm run compile` passes after your implementation.

Pause and wait for `continue`.

## Phase 6: Storage Adapter Instructions

Agent pre-phase review:
- Review your Phase 5 creator repository implementation.
- Confirm creator persistence is no longer hidden inside channel repository internals.
- Confirm channel saves still populate required `channels.creator_id`.
- Confirm repository docs were updated where repository responsibilities changed.

Agent output:
- A storage adapter method map from `IngestStorage` to repository functions.
- Examples for missing-channel behavior:
  - `createChannel: false` skips safely.
  - `createChannel: true` uses the creator repository to create/reuse a stub Creator named from the YouTube channel name, then saves/reuses the YouTube channel.
- Examples for transcript versioning:
  - unchanged checksum skips insert.
  - changed checksum inserts next version and segments.

Implementation guidance:
- Keep DB access inside repositories/storage adapter, not core ingest orchestration.
- Map `findOrCreateStubCreator` to the creator repository.
- Map `findOrCreateYoutubeChannel` to the channel repository.
- Map video persistence to the video repository.
- Map transcript version and segment persistence to the transcript repository.
- Add a storage method for finding videos needing transcript backfill, since `ingest-transcripts` must remain independent.
- Follow `docs/agents/docs-update-checklist.md`; keep storage docs aligned with the creator/channel repository boundary.

Acceptance:
- Storage tests cover channel create/update, missing-channel skip, creator-repository-backed stub creator creation, video saves, transcript version skip/insert, and segment saves.
- `npm run compile` passes after your implementation.

Pause and wait for `continue`.

## Phase 6.1: Storage Contract Tightening

Agent pre-phase review:
- Review your Phase 6 storage adapter implementation.
- Confirm `IngestStorage` is the only DB-facing interface planned for Phase 7 orchestration.
- Inspect transcript-backfill data flow and confirm orchestration has enough data to download captions without DB imports.
- Inspect legacy channel profile save wiring and decide whether it remains transitional compatibility or must be removed before Phase 7.

Agent output:
- A storage contract note for transcript backfill.
- A compatibility note for legacy `upsertChannelInfo`.
- Fake-driven test examples showing Phase 7 orchestration can use storage without reaching into repositories.

Implementation guidance:
- Change `VideoNeedingTranscript` so it includes both the internal video ID and the external YouTube video ID.
- Update `getVideosMissingTranscripts` and `IngestStorage.findVideosMissingTranscripts` to return both IDs.
- Keep orchestration responsible for workflow order only; it should not query repositories directly.
- Ensure Phase 7 ingest orchestration uses `storage.findOrCreateYoutubeChannel(..., { createChannel: true })` instead of legacy `upsertChannelInfo`.
- Either remove `upsertChannelInfo` when no callers remain, or clearly treat it as legacy compatibility until Phase 9 cleanup.
- Follow `docs/agents/docs-update-checklist.md`; keep current-state docs aligned with the transcript-backfill storage contract.

Acceptance:
- Storage tests prove transcript backfill returns internal video ID plus YouTube video ID.
- No direct DB/repository imports are needed in `src/ingest/ingest.module.ts`.
- Legacy profile-save compatibility is either removed or explicitly isolated from new orchestration.
- `npm test -- src/ingest` passes after your implementation.
- `npm run compile` passes after your implementation.

Pause and wait for `continue`.

## Phase 7: Ingest Orchestration Instructions

Agent pre-phase review:
- Review your Phase 6.1 storage contract implementation.
- Confirm core ingest logic still has no direct DB imports.
- Confirm storage tests prove missing-channel, transcript-version, and transcript-backfill identity behavior.

Agent output:
- Numbered flow examples for each command.
- Fake dependency examples showing how tests drive orchestration without YouTube or SQLite.
- Report-shape examples for success, partial failure, and dry-run behavior.

Implementation guidance:
- Remove transitional workflow delegation only after fake-driven tests cover new orchestration.
- `ingest-channel-profile`: resolve inputs, retrieve profiles, save only with `--save`.
- `ingest-channel-videos`: resolve inputs, retrieve profile, retrieve chunked video metadata, save videos, download captions, parse, save transcript versions/segments with `--save`.
- `ingest-transcripts`: process existing DB videos missing transcript versions; do not retrieve video metadata again.
- `--save=false` must not write to SQLite.

Acceptance:
- Ingest module tests verify orchestration order with fakes.
- Compatibility adapter can be deleted safely by you.
- `npm run compile` passes after your implementation.

Pause and wait for `continue`.

## Phase 7.1: CLI and Report Contract Tightening

Agent pre-phase review:
- Review your Phase 7 orchestration implementation.
- Confirm public commands route through `src/ingest/index.ts` and no longer delegate to legacy service workflows.
- Confirm `--save=false` does not write and `ingest-transcripts` does not retrieve channel profile or video metadata.
- Inspect command tests and identify whether they cover only handler delegation or full yargs option parsing.
- Inspect report types and identify missing fields before Phase 8 finalizes user-facing output.

Agent output:
- A CLI contract note showing current options, intended Phase 8 options, defaults, validation, and where `--create-channel` should apply.
- A report contract note listing the final report fields needed for channels, videos, captions, transcript versions, skipped records, parser diagnostics, and failures.
- Test examples for yargs option parsing, `--save=false` no-write behavior, transcript backfill identity, parser diagnostics in reports, and report counters.

Implementation guidance:
- Keep existing command names: `ingest-channel-profile`, `ingest-channel-videos`, and `ingest-transcripts`.
- Add command parser tests before changing command defaults or adding new options.
- Treat `--batch` as metadata page size and prepare to move the default to `10` in Phase 8.
- Scope `--create-channel` to `ingest-channel-videos` unless review finds another command has real missing-channel creation behavior; default it to `false`.
- Do not make transcript backfill create channels; `ingest-transcripts` must remain a repair/backfill workflow for existing stored channels and videos.
- Add or tighten report types before formatting user-facing output so Phase 8 can document stable fields.
- Include parser diagnostics in reports without throwing away partial successes.
- Keep raw json3 blobs out of final user-facing reports; report counts, IDs, diagnostics, and failures instead.
- Follow `docs/agents/docs-update-checklist.md`; update current-state docs if command contracts or report fields change.

Acceptance:
- Command tests cover yargs option parsing and validation for each ingest command.
- Report tests cover success, dry-run, skipped records, parser diagnostics, partial caption failure, and transcript-version unchanged cases.
- `ingest-channel-videos` has a clear internal option path for `createChannel`, even if the public CLI flag is finalized in Phase 8.
- `ingest-transcripts` still does not retrieve channel profile or video metadata and does not create channels.
- `npm test -- src/commands` passes after your implementation.
- `npm test -- src/ingest` passes after your implementation.
- `npm run compile` passes after your implementation.

Pause and wait for `continue`.

## Phase 8: CLI and Report Finalization

Agent pre-phase review:
- Review your Phase 7.1 CLI/report contract implementation.
- Confirm command parser tests cover defaults, aliases, validation, and the final `--create-channel` scope.
- Confirm report types include stable fields for docs, logs, tests, and partial-failure behavior.
- Confirm `--save=false` does not write and `ingest-transcripts` does not retrieve metadata again.

Agent output:
- Final CLI option table for all ingest commands.
- Final report examples for user-facing logs and tests.
- README draft for completed ingest behavior.

Implementation guidance:
- Keep existing command names.
- Add `--create-channel` only where missing-channel creation is relevant; default `false`.
- Keep `--limit`.
- Treat `--batch` as metadata page size; default `10`.
- Include report fields for channels, videos, captions, transcript versions, skipped records, parser diagnostics, and failures.
- Follow `docs/agents/docs-update-checklist.md`; update README/app docs for final ingest behavior and options.

Acceptance:
- Command tests verify option parsing.
- README documents final ingest behavior.
- `npm run compile` passes after your implementation.

Pause and wait for `continue`.

## Phase 9: Final Legacy and Stray Code Cleanup

Completion note:
- Legacy ingest workflow services, their compatibility input wrapper, and their focused tests were removed after the public commands moved to `src/ingest`.
- Current-state docs now describe `src/ingest` as the ingest orchestration layer and `src/services` as non-ingest support services.
- Ambiguous non-ingest artifacts remain as follow-up decisions instead of being deleted as part of the real ingest plan.

Agent pre-phase review:
- Review your Phase 8 CLI/report implementation.
- Confirm README, command behavior, and report types match.
- Confirm no legacy CLI commands were reintroduced.
- Include report/service vocabulary from earlier phases in the final audit and decide whether any remaining names should be changed or explicitly left as low-level retrieval/reporting language.

Agent output:
- A deletion list for old workflow services, unused helpers, stale TODOs, and stray files.
- A separate “ask user” list for anything ambiguous.
- A final vocabulary audit showing retrieval vocabulary remains only for low-level external access.

Implementation guidance:
- Delete old workflow-level services only after equivalent ingest module coverage exists.
- Remove temporary TODOs that referenced transitional delegation.
- Keep TODOs only for deferred product work.
- Re-run the stray-file audit from Phase 1 and resolve anything left yourself.
- Follow `docs/agents/docs-update-checklist.md`; confirm current-state docs match final storage, orchestration, and CLI behavior.

Acceptance:
- No workflow-level legacy vocabulary remains.
- No transitional ingest delegation remains.
- No unexplained root-level sample/data files remain.
- Full `npm test` passes after your implementation.
- `npm run compile` passes after your implementation.

Pause and wait for `continue`.

## Verification Defaults

Agent may run only non-mutating verification commands, such as:
```bash
npm run compile
npm test -- src/ingest
npm test -- src/transcripts
npm test -- src/services
npm test -- src/commands
npm test
git status --short
git diff --stat
```

The agent must not run commands that rewrite tracked files.

## Assumptions

- You want implementation guidance, examples, and review gates, not agent-made code edits.
- You will make the actual code edits and file deletions.
- Stray files should not be deleted until classified and confirmed.
- `ingest-channel-videos` becomes the main end-to-end workflow.
- `ingest-transcripts` remains a DB-backed repair/backfill workflow.
- `--save=false` never writes to SQLite.
- No cache workflow, public `--json`, or legacy CLI commands are added back.
