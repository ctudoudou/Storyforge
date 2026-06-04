# Document Generated Artifact History

## Goal

Close the undo/regenerate history TODO by documenting the existing local implementation and marking the completed workflow.

## Evidence

- `asset_versions` stores import, regeneration, and manual version records.
- Asset version routes create regeneration history and switch active files.
- The asset detail drawer shows version history and active-version controls from real SQLite data.
- Existing tests cover version creation, active switching, path validation, and missing local file reporting.

## Scope

- Document generated artifact history in the data model notes.
- Update the development TODO and next iteration target.
