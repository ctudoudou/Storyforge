# 2026-07-01 Add Provider Connection Tests

## Background

Runtime provider configuration now supports script parsing, character design, scene design, storyboard planning, image generation, and video assembly. Users can enter local HTTP, Volcengine gateway, or Kling gateway endpoints in Settings, but they previously had to run a real generation flow to know whether an endpoint was reachable and contract-compatible.

## Goal

Add a Settings action that validates each configured provider endpoint with a minimal safe request before users run project generation.

## Confirmed Details

- The test action should be available from the frontend Settings page.
- It should use the current draft form values, so users can test before saving.
- It should support all six configured runtime endpoints.
- It should validate response shape, not only HTTP reachability.
- It should not write project records or generated assets.
- Real secrets must still stay outside the repo through environment variable references.

## Open Questions

- Vendor-specific polling, upload sessions, and signing remain gateway responsibilities.
- A future iteration can add saved health history or automatic periodic checks.

## Proposed Scope

- Add `POST /api/provider-config/test`.
- Add per-endpoint `测试连接` action and inline result state in Settings.
- Classify provider test failures as reachable, auth failure, HTTP failure, network failure, invalid response, or unknown failure.
- Add integration tests for success and invalid response shape.

## Out of Scope

- No provider SDK integration.
- No live paid API calls in automated tests.
- No saved connection history.
- No project generation workflow changes.

## Data/API Contracts

Request:

```json
{
  "endpoint": "scriptParsing",
  "config": {
    "version": 1,
    "active": {},
    "providers": {}
  }
}
```

Success response:

```json
{
  "ok": true,
  "endpoint": "scriptParsing",
  "providerId": "local-script",
  "providerName": "local-http:local-script",
  "category": "ok",
  "message": "Provider contract check passed."
}
```

Provider failure response keeps HTTP 200 and reports `ok: false` with a category, so the UI can display the provider result without treating the Settings API itself as broken.

## Test Plan

- Integration test for a successful script parsing provider connection check with mocked fetch.
- Integration test for invalid provider response shape.
- Smoke test that Settings exposes `/api/provider-config/test` and `测试连接`.
- Full `npm run test`, `npm run typecheck`, and `npm run build`.
- Browser verification on `/settings`.

## Implementation Notes

- The test API reuses the same HTTP provider adapters as runtime generation.
- The API selects active or fallback provider profiles with the same helper used by runtime provider resolution.
- Video assembly test uses a temporary output directory under the OS temp folder.
- Image generation test validates normalized image bytes and supported MIME/extension values.

## Verification Result

- `npm run typecheck` passed.
- `npm run test` passed with 135 tests.
- `npm run build` passed.
- Browser verification passed at `http://127.0.0.1:3002/settings`; six provider sections and six `测试连接` buttons are visible.
