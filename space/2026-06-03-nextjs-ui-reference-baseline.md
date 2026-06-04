# 2026-06-03 Next.js UI Reference Baseline

## Background

The user provided `/Users/potato/Downloads/AI 短剧生成平台.zip` as the code reference for Storyforge's initial UI. The project should be developed with Next.js, while the visual style must fully follow the supplied reference.

The archive was inspected and currently contains a Vite/React implementation, including:

- `src/app/pages/Dashboard.tsx`
- `src/app/pages/ProjectWorkspace.tsx`
- `src/app/components/Layout.tsx`
- workspace components for script editing, character graph, storyboard, and timeline
- shadcn-style UI components
- Tailwind CSS theme/style files
- `src/imports/image.png`

## Goal

Record the UI baseline and framework constraint before implementation.

## Confirmed Details

- Storyforge will use Next.js for development.
- The supplied code bundle is the authoritative initial UI reference.
- UI style must fully follow the supplied reference.
- The agent must not make unauthorized visual changes.
- Future visual changes should happen through separate version iterations.
- The reference bundle is Vite/React, so a Next.js port will be needed.

## Open Questions

- Should the next step import the supplied UI as the first runnable Next.js baseline?
- Should the reference bundle be copied into the repository as a preserved source snapshot?
- Should the initial Next.js app use App Router?
- Which package manager should be used: npm, pnpm, yarn, or bun?
- Should the first baseline include only static mocked UI, or should it start wiring local data models and API routes?

## Proposed Scope

For the next implementation iteration, the safe default is:

- Scaffold or configure a Next.js app.
- Port the supplied Vite/React UI into Next.js.
- Preserve the visual output as closely as possible.
- Replace React Router usage with Next.js routing.
- Keep data mocked unless the user confirms backend scope.
- Add tests or smoke checks appropriate for the baseline.

## Out Of Scope

- Redesigning the interface.
- Changing colors, spacing, typography, copy, or component structure for preference.
- Implementing real AI generation providers.
- Implementing database persistence.
- Building video assembly logic.

## Data/API Contracts

No runtime API is introduced in this documentation iteration.

Future implementation should keep UI mock data separate from domain and provider contracts.

## Test Plan

No automated tests are required for this documentation-only iteration.

The next implementation iteration should include:

- Build verification for the Next.js app.
- At least one smoke test or route render check for the main workspace.
- Browser screenshot review against the supplied reference when practical.

## Implementation Notes

- Inspected the supplied archive and confirmed it is Vite/React rather than Next.js.
- Updated `AGENTS.md` to make Next.js and the supplied UI bundle explicit constraints.
- Updated `docs/style-guide.md` to mark the supplied bundle as the current authoritative UI baseline.
- Ported the supplied Vite/React UI into a Next.js App Router project.
- Preserved the reference component tree under `src/app/components` and `src/app/pages`.
- Replaced React Router usage with Next.js `Link`, `usePathname`, and App Router route files.
- Added package scripts for `dev`, `build`, `start`, `test`, and `typecheck`.
- Added a smoke test to verify that the main routes and core workspace copy remain wired.
- Added `.gitignore` and Next.js project configuration files.

## Verification Result

- Archive contents were listed successfully.
- The reference package manifest was inspected.
- `npm install` completed successfully.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Local browser verification passed for `http://localhost:3000`.
- Local browser verification passed for `http://localhost:3000/project/new`.
- The `解析剧本` interaction was triggered and reached the `解析完成` / `查看人物设定` state.
- Browser screenshot capture was attempted, but the browser screenshot command timed out; DOM and interaction checks passed.
