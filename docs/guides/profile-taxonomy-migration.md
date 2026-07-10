# Profile-centric taxonomy migration

This guide is the full implementation plan for shifting the app from a creator-centric YouTube model to a profile-centric taxonomy-first model.

It assumes a single coordinated cut across schema, runtime code, tests, seeds, and docs. It does not stage the migration behind compatibility gates.

## Goals

- Replace `Creator` with `Profile` as the durable cross-source identity term.
- Make taxonomy the primary internal organization model.
- Keep imported metadata tags separate from taxonomy terms.
- Keep the current runtime surfaces explicitly YouTube-specific.
- Retire `channel profile` wording in favor of `channel metadata` or `channel details`.

## Non-goals

- Do not add a generic `platform_surfaces` abstraction in this pass.
- Do not model articles, Wikipedia, socials, or other new source tables yet.
- Do not infer taxonomy automatically from imported metadata tags.
- Do not merge taxonomy terms and source metadata tags into one table.

## Invariants

- A profile is the canonical cross-source identity record.
- A YouTube channel is a source-specific publishing surface owned by one profile.
- Taxonomy terms are curated internal classifications.
- Source metadata tags are imported raw labels from external metadata.
- Ingest writes source metadata tags only.
- Manual taxonomy assignment happens through explicit taxonomy workflows, not ingest.

## Target vocabulary

| Current | Target |
| --- | --- |
| Creator | Profile |
| creator-backed channel | profile-backed channel |
| channel profile | channel metadata |
| tags_internal | taxonomy_terms |
| creator_tags_internal | profile_taxonomy_terms |
| channel_tags_internal | channel_taxonomy_terms |
| source_tags | source_metadata_tags |
| internalTags | taxonomyTerms |

## Target schema

The first-pass schema should be:

- `profiles`: durable identity rows.
- `profile_bios`: extended profile biography fields.
- `channels`: current YouTube channel rows with `profile_id` ownership.
- `videos`: current YouTube video rows.
- `transcripts`: versioned raw transcript rows.
- `transcript_segments`: normalized transcript segment rows.
- `taxonomy_terms`: curated taxonomy vocabulary.
- `profile_taxonomy_terms`: profile-to-taxonomy join table.
- `channel_taxonomy_terms`: optional channel-to-taxonomy join table only if there is a real manual classification need.

The YouTube-specific tables keep imported metadata tags in `source_metadata_tags` JSON arrays. Those values are raw source evidence and are not taxonomy.

## Recommended taxonomy term shape

The first pass should upgrade flat tags into a real taxonomy term model:

- `id`
- `slug`
- `label`
- `description`
- `parent_id` nullable for hierarchy

If hierarchy is not implemented immediately, still reserve `slug` and `label` separately so the taxonomy model is not locked to raw imported strings.

## File-by-file cut

### Schema and seeds

- Rename `creators` to `profiles` in `src/db/schema.sql`.
- Rename `creator_bios` to `profile_bios` in `src/db/schema.sql`.
- Rename `channels.creator_id` to `channels.profile_id` in `src/db/schema.sql`.
- Rename `tags_internal` to `taxonomy_terms` in `src/db/schema.sql`.
- Rename `creator_tags_internal` to `profile_taxonomy_terms` in `src/db/schema.sql`.
- Rename `channel_tags_internal` to `channel_taxonomy_terms` in `src/db/schema.sql` if it remains in use.
- Rename `channels.source_tags` and `videos.source_tags` to `source_metadata_tags` in `src/db/schema.sql`.
- Rename the seed files and their insert targets from `creators` and `creator_bios` to `profiles` and `profile_bios`.
- Update `src/db/seeds/channels.sql` so foreign keys use `profile_id`.
- Preserve imported YouTube labels in the metadata tag columns only.

### Runtime repositories and types

- Rename `src/repositories/creator.repository.ts` to `src/repositories/profile.repository.ts`.
- Rename `findOrCreateCreatorByName` to `findOrCreateProfileByName`.
- Rename `CreatorRecord` to `ProfileRecord`.
- Update `src/repositories/channel.repository.ts` to use `profile_id`, profile-based naming, and `source_metadata_tags`.
- Update `src/repositories/video.repository.ts` to use `source_metadata_tags`.
- Update `src/types/entities.types.ts` from `Creator*` to `Profile*` and from `internalTags` to `taxonomyTerms`.
- Update `src/shared/types.ts` from `CreatorDTO` and related aliases to `ProfileDTO` equivalents.

### Ingest runtime

- Rename `findOrCreateStubCreator` to `findOrCreateStubProfile` in `src/ingest/ingestStorage.ts`.
- Rename `StoredCreator` to `StoredProfile` in `src/ingest/ingestStorage.ts`.
- Rename `creatorId` fields and parameters to `profileId` throughout ingest storage and repository seams.
- Rename `upsertYoutubeChannelForCreator` to `upsertYoutubeChannelForProfile`.
- Keep ingest behavior unchanged except for terminology and column names.
- Ensure ingest still writes only source metadata tags.

### Commands and UI wording

- Keep `ingest-channel-profile` only as a compatibility command name if needed.
- Change the displayed wording in command descriptions, prompts, summaries, and docs from `channel profile` to `channel metadata`.
- Update `src/commands/ingestChannelProfile.ts`, `src/ingest/ingest.module.ts`, `src/ui/reports.ts`, and `src/ui/workflowPrompts.ts` so `Profile` is never used to describe fetched YouTube metadata.
- Change `creator-backed` wording to `profile-backed` in `src/commands/ingestChannelVideos.ts` and related UI copy.

### Taxonomy workflows

Add a manual taxonomy surface that does not depend on ingest:

- `taxonomy create-term`
- `taxonomy list-terms`
- `taxonomy assign-profile-term`
- `taxonomy remove-profile-term`
- `profile show`

`profile show` should return taxonomy terms separately from source metadata tags.

## Data strategy

This migration assumes a destructive local database cut rather than an in-place compatibility layer.

Recommended approach:

1. Update schema.
2. Update seed files.
3. Rebuild `src/db/db.sqlite` from the new schema.
4. Reseed.
5. Run runtime validation and the test suite.

Use a one-time SQL migration only if preserving the existing local database matters more than keeping the cut simple.

## Validation

The implementation is complete when all of the following are true:

- Active runtime code no longer uses `Creator` as the cross-source identity term.
- User-facing text no longer uses `profile` for YouTube metadata.
- Taxonomy terms and imported metadata tags are stored separately.
- Ingest writes only source metadata tags.
- Tests assert the tag split and the renamed ownership model.
- `npm run start -- test-connection` passes.
- `npm test` passes.

## Current-state doc updates after code lands

Once runtime changes are implemented, update the current-state docs so they accurately describe the new model:

- `CONTEXT.md`
- `README.md`
- `docs/app/overview.md`
- `docs/app/cli.md`
- `docs/app/database.md`
- `docs/app/ingest-workflows.md`

Do not update those current-state docs before the code lands, or they will stop describing the app as it actually works.
