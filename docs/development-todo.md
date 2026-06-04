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
- [ ] Extract plot beats and conflict/reversal points.
- [ ] Extract dialogue blocks per scene.
- [ ] Extract scene mood, location, time of day, and camera hints more reliably.
- [ ] Add parser result review UI before writing final records.
- [ ] Add parser re-run behavior that preserves user edits where possible.
- [ ] Add parser fixtures for Chinese short-drama scripts.
- [ ] Add failure recovery for partial parse results.

## Priority 2: Asset Management

- [ ] Add local file import/upload UI for images, audio, and video.
- [ ] Register imported files in the `assets` table.
- [ ] Link assets to characters, scenes, and timeline clips.
- [ ] Add asset preview pages or drawers.
- [ ] Add asset versioning for regeneration.
- [ ] Add asset deletion rules that prevent breaking existing project references.
- [ ] Add thumbnail generation for large images/videos.
- [ ] Add file type validation and size limits.

## Priority 3: Character And Scene Generation

- [ ] Define provider adapter contracts for image generation.
- [ ] Add prompt templates for character design.
- [ ] Add prompt templates for scene/keyframe generation.
- [ ] Store prompt text, provider, model, parameters, and parent artifact IDs.
- [ ] Add generation job status: queued, running, completed, failed.
- [ ] Add retry and regenerate actions.
- [ ] Add manual asset override for each character and scene.
- [ ] Add visual consistency controls across generated character images.

## Priority 4: Timeline, Preview, And Assembly

- [ ] Replace placeholder clip visuals with asset-backed clip previews.
- [ ] Add timeline editing: trim, reorder, split, delete.
- [ ] Add voice/audio track records.
- [ ] Add subtitle track records.
- [ ] Add transition records.
- [ ] Add a local assembly manifest format.
- [ ] Add preview playback from local assets.
- [ ] Add export using a local video assembly tool.
- [ ] Add smoke tests for manifest creation and output file existence.

## Priority 5: Agent Architecture

- [ ] Create `src/agents/script-parser/`.
- [ ] Create `src/agents/character-designer/`.
- [ ] Create `src/agents/scene-designer/`.
- [ ] Create `src/agents/storyboard-planner/`.
- [ ] Create `src/agents/asset-generator/`.
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

Character relationships are now parsed, persisted, returned, copied, and displayed. Implement plot beats and conflict/reversal point persistence next.

Acceptance criteria:

- Add a SQLite plot beat table or documented storage contract.
- Persist provider-level plot beats during script parsing.
- Return plot beats through `ProjectDetail` without breaking existing UI.
- Surface plot beats in the script/storyboard workflow without redesigning the reference UI.
- Tests cover setup/conflict/reversal/decision beat extraction and persistence.
- `npm run test`, `npm run typecheck`, and `npm run build` pass.
