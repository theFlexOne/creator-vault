## Plan: Add High-Priority Test Coverage for Current CLI Surfaces

**TL;DR**: Add focused coverage for the current shipped CLI: `normalizeYoutubeUrl`, `resolveCliInputIdentifiers`, and the `ingest-*` command modules. Keep the plan limited to current behavior, not the future ingest architecture described elsewhere.

---

**Execution Workflow**
- **Incremental Verification**: Run targeted tests after each phase, then `npm test` and `npm run compile` at the end.
- **Current-State Only**: Cover shipped behavior and compatibility seams that still exist in production code.
- **Out of Scope**: Do not add tests for future ingest orchestration, transcript versioning, source adapters, or storage adapters beyond current stubs.

---

**Steps**

### Phase 1 — `normalizeYoutubeUrl` branch coverage
**1.1** Add a dedicated `describe('normalizeYoutubeUrl')` block near existing YouTube utility tests.

**1.2** Cover channel ID and channel URL inputs:
   - `'UCxxx'` becomes `https://www.youtube.com/channel/UCxxx/videos`
   - `'https://youtube.com/channel/UCxxx'` gains `/videos`

**1.3** Cover handle inputs:
   - `'@handle'` becomes `https://www.youtube.com/@handle/videos`
   - `'barehandle'` becomes `https://www.youtube.com/@barehandle/videos`

**1.4** Cover URL edge cases:
   - watch URLs do not gain `/videos`
   - trailing slashes are normalized before adding `/videos`

**1.5** Run the relevant Jest target and confirm full branch coverage for the helper.

---

### Phase 2 — CLI input resolution edge cases
**2.1** Extend `src/cli/__tests__/input.test.ts` instead of adding a new compatibility-wrapper-focused test plan.

**2.2** Keep the existing direct-input and file-input assertions, then add edge cases for:
   - empty file contents
   - malformed JSON input returning `[]`
   - unsupported JSON object shapes falling back to line splitting

**2.3** Treat `src/services/command.service.ts` as a thin compatibility seam only.
   - Add tests only if the wrapper remains in production code and is used by a current entrypoint.
   - Otherwise prefer covering `resolveCliInputIdentifiers` directly.

**2.4** Run the CLI input test target and confirm current supported file-input behavior is documented by tests.

---

### Phase 3 — Current ingest command modules
**3.1** Keep command-module tests centered on current surfaces:
   - `ingest-channel-profile`
   - `ingest-channel-videos`
   - `ingest-transcripts`

**3.2** For `ingest-channel-profile`, verify:
   - handler delegates to `runIngestChannelProfile`
   - `--save` defaults to `false`

**3.3** For `ingest-channel-videos`, verify:
   - handler delegates to `runIngestChannelVideos`
   - `--limit` default is `100`
   - `--batch` default is `20`
   - validation rejects `limit < 1` and `batch < 1`

**3.4** For `ingest-transcripts`, verify:
   - handler delegates to `runIngestTranscripts`
   - `--limit` default is `10`
   - `--save` defaults to `false`

**3.5** Add `test-connection` command coverage only if it follows the same lightweight wiring pattern and can be tested without inventing new fixtures.

**3.6** Run command tests after each command file is updated.

---

### Phase 4 — Final verification
**4.1** Run `npm test`.

**4.2** Run `npm run compile`.

**4.3** Run a final repo search to confirm the plan and tests reference only the current command surface and currently supported CLI behavior.

---

**Relevant files**
- `src/lib/youtube/normalizeYoutubeUrl.ts`
- `src/cli/__tests__/input.test.ts`
- `src/commands/__tests__/ingestChannelProfile.test.ts`
- `src/commands/__tests__/ingestChannelVideos.test.ts`
- `src/commands/__tests__/ingestTranscripts.test.ts`

---

**Decisions**
- Prefer updating existing test files over creating legacy-named replacements.
- Keep the plan aligned with the current command surface and defaults.
- Exclude future ingest-module behavior that is already tracked in the ingest implementation guide.
