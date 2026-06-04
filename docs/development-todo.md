# Storyforge Development Goals And TODO

## Product Goal

Build a local-first AI short-drama generation platform. Users should be able to create a project from text, parse the story into structured production data, generate or manage local character and scene assets, assemble shots into a timeline, preview the result, and eventually export a short drama video.

The current implementation should stay local-first:

- SQLite stores project metadata, scripts, parsed characters, scenes, timeline clips, and asset records.
- `data/assets/` stores image, audio, video, and other generated/imported files.
- The UI must keep following the supplied reference design unless a later iteration explicitly changes it.

## Current Baseline

- Next.js App Router project is running.
- UI baseline has been migrated from the supplied reference bundle.
- Local SQLite data layer exists.
- Local asset directory contract exists.
- Project creation, script saving, deterministic script parsing, character extraction, scene extraction, and timeline clip creation exist.
- Project title editing exists from the workspace header and project list.
- Project deletion exists from the dashboard and project list.
- Project duplication exists from the dashboard and project list.
- Database schema migrations are versioned in SQLite.
- API errors use a consistent response shape and core UI surfaces show user-visible failures.
- Core workspace, project list, and assets views have explicit loading and empty states.
- Project API route handlers have integration tests against temporary local SQLite data.
- Development fixtures can be seeded explicitly with `npm run seed:dev`.
- The test runner decision is documented in `docs/testing.md`; Node type stripping stays for now.
- Script parsing now goes through `src/agents/script-parser/` with a deterministic fake provider while keeping the existing UI/database contract.
- Parsed character relationships are persisted in SQLite and shown in the characters workspace.
- Parsed plot beats are persisted in SQLite and shown in the storyboard workspace.
- Parsed dialogue blocks are persisted in SQLite and shown in the storyboard workspace.
- Parsed scene mood, location, time of day, and camera hints are persisted in SQLite and shown in the storyboard workspace.
- Parser results can be previewed and canceled before final SQLite persistence.
- Parser re-runs preserve user-edited and asset-linked parsed records where natural keys still match.
- Chinese short-drama parser fixtures cover multiple deterministic script shapes.
- Parser partial failures preserve usable sections and return warnings for skipped sections.
- Asset imports can be registered in SQLite with file type and size validation.
- Local asset files can be selected from the assets page and imported into the local asset library.
- Imported assets can be linked and unlinked from characters, scenes, and timeline clips.
- The asset library can preview local image, video, and audio files and show project references in a detail drawer.
- Assets keep version history for regeneration metadata, active-version switching, and old local file preservation.
- Asset deletion is blocked while project records reference the asset; unreferenced deletes clean up owned local files and versions.
- Image and video assets get local thumbnail metadata and fallback SVG thumbnail files without replacing originals.
- Image generation provider contracts exist under `src/agents/asset-generator/`, with a fake local SVG provider that registers generated outputs as local assets.
- Character design prompt templates exist for provider-agnostic Chinese short-drama image generation.
- Scene and keyframe prompt templates exist for provider-agnostic Chinese short-drama image generation.
- Generated image metadata is persisted in SQLite with prompt text, provider, model, parameters, source assets, and parent artifact references.
- Image generation jobs persist queued, running, completed, and failed status transitions.
- Failed generation jobs can be retried and completed image generations can seed regeneration jobs while preserving source context.
- Character and scene asset links track manual override source separately from generated assignments.
- Character visual consistency settings persist notes and anchor asset IDs for generated image prompts.
- Timeline video clips render linked local image/video asset thumbnails and show explicit unbound states.
- Timeline clips can be trimmed, reordered, split, and deleted through persisted SQLite-backed APIs.
- Voice/audio track records are stored in SQLite, can bind local audio assets, and render on the timeline audio track.
- Subtitle track records are stored in SQLite, can be generated from parsed dialogue blocks, and render on a dedicated timeline subtitle track.
- Transition records are stored in SQLite, connect adjacent video clips, and render as markers on the timeline video track.
- Local assembly manifests can be generated from SQLite project data and verified local asset files.
- Runtime mock project data and remote placeholder images have been removed.

## MVP Target

The first usable MVP should support this complete loop:

1. Create a local project.
2. Enter or paste a script.
3. Save the script to SQLite.
4. Parse the script into characters, scenes, relationships, and timeline-ready records.
5. Review and edit parsed records.
6. Import or generate local character images.
7. Import or generate local scene images.
8. Build a timeline from real local clips/assets.
9. Preview the project.
10. Export a local video file or export manifest.

## Priority 0: Foundation Hardening

- [x] Add explicit project title editing.
- [x] Add project deletion with confirmation.
- [x] Add project duplicate/copy behavior.
- [x] Add database migration versioning instead of only `CREATE TABLE IF NOT EXISTS`.
- [x] Add API error handling and user-visible error states across all data reads/writes.
- [x] Add loading and empty states for every workspace tab.
- [x] Add tests for API routes, not only data-layer functions.
- [x] Add a simple seed/import script for local development fixtures without shipping mock data in runtime UI.
- [x] Decide whether test execution should continue using Node type stripping or switch to a dedicated test runner.

## Priority 1: Script And Story Parsing

- [x] Replace the deterministic parser with an agent-backed parser behind the same data contract.
- [x] Extract character relationships, not only character mentions.
- [x] Extract plot beats and conflict/reversal points.
- [x] Extract dialogue blocks per scene.
- [x] Extract scene mood, location, time of day, and camera hints more reliably.
- [x] Add parser result review UI before writing final records.
- [x] Add parser re-run behavior that preserves user edits where possible.
- [x] Add parser fixtures for Chinese short-drama scripts.
- [x] Add failure recovery for partial parse results.

## Priority 2: Asset Management

- [x] Add local file import/upload UI for images, audio, and video.
- [x] Register imported files in the `assets` table.
- [x] Link assets to characters, scenes, and timeline clips.
- [x] Add asset preview pages or drawers.
- [x] Add asset versioning for regeneration.
- [x] Add asset deletion rules that prevent breaking existing project references.
- [x] Add thumbnail generation for large images/videos.
- [x] Add file type validation and size limits.

## Priority 3: Character And Scene Generation

- [x] Define provider adapter contracts for image generation.
- [x] Add prompt templates for character design.
- [x] Add prompt templates for scene/keyframe generation.
- [x] Store prompt text, provider, model, parameters, and parent artifact IDs.
- [x] Add generation job status: queued, running, completed, failed.
- [x] Add retry and regenerate actions.
- [x] Add manual asset override for each character and scene.
- [x] Add visual consistency controls across generated character images.

## Priority 4: Timeline, Preview, And Assembly

- [x] Replace placeholder clip visuals with asset-backed clip previews.
- [x] Add timeline editing: trim, reorder, split, delete.
- [x] Add voice/audio track records.
- [x] Add subtitle track records.
- [x] Add transition records.
- [x] Add a local assembly manifest format.
- [ ] Add preview playback from local assets.
- [ ] Add export using a local video assembly tool.
- [ ] Add smoke tests for manifest creation and output file existence.

## Priority 5: Agent Architecture

- [ ] Create `src/agents/script-parser/`.
- [ ] Create `src/agents/character-designer/`.
- [ ] Create `src/agents/scene-designer/`.
- [ ] Create `src/agents/storyboard-planner/`.
- [x] Create `src/agents/asset-generator/`.
- [ ] Create `src/agents/video-assembler/`.
- [ ] Define input/output schemas for each agent.
- [ ] Add fake providers for automated tests.
- [ ] Add opt-in live provider tests.
- [ ] Add progress events and cancellation for long-running jobs.

## Priority 6: Product Workflow

- [ ] Add a clear project creation flow from the dashboard.
- [ ] Add script import from `.txt` or `.md`.
- [ ] Add step-by-step workflow status across script, characters, storyboard, timeline, and export.
- [ ] Add review states: draft, reviewed, needs changes, approved.
- [ ] Add undo/regenerate history for generated artifacts.
- [ ] Add project-level settings for style, aspect ratio, language, voice, and duration.
- [ ] Add final export settings.

## Engineering Rules For Each TODO

Every implementation item should include:

- Requirement clarification when behavior is ambiguous.
- A focused `space/` iteration file when the change is non-trivial.
- SQLite/data model update when needed.
- Tests matching the risk level.
- `npm run test`.
- `npm run typecheck`.
- `npm run build`.
- Browser verification for UI changes.

## Suggested Next Iteration

Priority 4 local assembly manifests now describe the timeline from SQLite records and local assets. Continue Priority 4 by adding preview playback from local assets.

Acceptance criteria:

- Preview playback reads the local assembly manifest instead of mock data.
- The preview surface uses linked local image/video/audio assets and existing subtitle/transition timing.
- Missing asset states remain explicit and do not silently fall back to remote placeholders.
- Tests cover manifest-backed preview state, missing asset handling, and route smoke coverage.
- `npm run test`, `npm run typecheck`, and `npm run build` pass.
