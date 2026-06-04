# 2026-06-04 API And UI Error Handling

## Background

The development TODO lists API error handling and user-visible error states as a Priority 0 foundation item.

## Goal

Use consistent API error responses and show relevant failures in the core project UI.

## Confirmed Details

- API errors should use a consistent response shape.
- UI failures should be visible to users instead of failing silently.
- Completed TODO items must be marked as complete.
- Each completed TODO should be committed separately.

## Open Questions

- Whether future iterations should add toast notifications or a shared error banner component.

## Proposed Scope

- Add shared API error response helpers.
- Update project, script, parse, duplicate, delete, and asset error responses.
- Add client-side API error parsing.
- Display errors in dashboard, project list, workspace header/title editing, and script save/parse flows.
- Add tests for common API failure responses.
- Mark the TODO as complete.

## Out Of Scope

- Global toast system.
- Retry queues.
- Detailed observability/logging.

## Data/API Contracts

API failures now use:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

## Test Plan

- API behavior tests for bad title and missing project errors.
- Existing integration, smoke, typecheck, and build checks.
- Browser verification of at least one visible error state.

## Implementation Notes

- Added `src/lib/api-response.ts`.
- Added `src/lib/next-api-response.ts`.
- Added `src/lib/client-errors.ts`.
- Updated project management API helpers to return structured errors.
- Updated API routes to use structured errors.
- Updated dashboard, project list, workspace title editing, and script editor to show errors.
- Updated `docs/development-todo.md` and `docs/data-model.md`.

## Verification Result

- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verified `/project/project_missing_error_check` renders the user-visible `Project not found` error instead of a server error page.
