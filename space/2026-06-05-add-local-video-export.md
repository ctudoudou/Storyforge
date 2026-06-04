# Add Local Video Export

## Background

Priority 4 needed the workspace export action to leave the mock/static stage and use the same local assembly manifest contract as preview. The current implementation should be local-first and avoid remote placeholders or generated mock data.

## Scope

- Add `video_export_jobs` SQLite records for export lifecycle state.
- Add `src/agents/video-assembler/` with a provider contract and local manifest assembler.
- Write export artifacts under `data/exports/` from the current assembly manifest.
- Add `/api/projects/:projectId/exports` for listing and creating local exports.
- Connect the workspace export button to the local export API.
- Persist missing-asset failures as failed export jobs with explicit errors.

## Verification

- Integration tests cover export creation from real local assets.
- Integration tests assert the local output artifact exists.
- Integration tests cover missing local asset failures and failed job records.
- Smoke route tests cover the workspace export entrypoint and video assembler files.

## Next

Continue Priority 4 with smoke tests for manifest creation and output file existence.
