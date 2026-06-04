# Add Script File Import

## Goal

Allow the script workspace to import local `.txt` and `.md` files and save the content through the existing local script API.

## Scope

- Add script import file-name validation for `.txt` and `.md`.
- Add a hidden file input and import button in the script editor.
- Read selected file content in the browser and persist it through `PUT /api/projects/:projectId/script`.
- Show explicit unsupported-file and save-failure errors without mock fallback data.

## Verification

- Unit tests cover accepted and rejected import file names.
- API tests cover imported script content saved through the script route.
- Smoke tests protect the script import button and accepted file types in the workspace UI.
