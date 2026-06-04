# Add Project Review States

## Goal

Persist and edit project review states separately from production processing status.

## Scope

- Add `review_state` to projects with the states `draft`, `reviewed`, `needs_changes`, and `approved`.
- Return `reviewState` in project list and project detail responses.
- Support updating review state through the existing project PATCH route.
- Add a compact workspace control for review state changes.
- Reset duplicated projects to review draft.

## Verification

- Migration tests cover the new column and index.
- Local DB tests cover persistence, invalid state rejection, and duplicate reset behavior.
- API tests cover valid and invalid review state updates.
- UI smoke tests protect the workspace review state control.
