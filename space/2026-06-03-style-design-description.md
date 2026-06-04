# 2026-06-03 Style Design Description

## Background

Storyforge needs an initial Chinese style description to guide future UI and product design. The requested direction is modern, clear, and inspired by Apple-like transparent glass material.

## Goal

Create a reusable Chinese visual style description that can guide future Storyforge UI, interaction, and design documentation.

## Confirmed Details

- The design language should be written in Chinese.
- The desired feel is modern and clear.
- The visual reference is Apple-style transparent glass material.
- Storyforge is an AI short-drama generation platform, so the style should support a professional creative workflow rather than a generic landing page.

## Open Questions

- Should Storyforge default to light mode, dark mode, or support both from the beginning?
- Is there an existing logo, brand color, or typography preference?
- Which screen should be designed first: script input, generation workspace, storyboard, review, or export?

## Proposed Scope

- Add a Chinese style guide under `docs/`.
- Keep this iteration documentation-only.
- Avoid implementing runtime UI until concrete screen requirements are confirmed.

## Out of Scope

- Building product UI.
- Choosing a frontend framework.
- Creating design assets, logo, screenshots, or Figma files.
- Defining final design tokens in code.

## Data/API Contracts

No runtime data or API contract is introduced.

Future UI implementation should translate this style guide into explicit design tokens for color, spacing, radius, blur, shadow, typography, state colors, and motion duration.

## Test Plan

No automated tests are required for this documentation-only iteration.

Future UI work should include component or E2E tests for core flows and visual checks for responsive layout, text readability, and glass-material contrast.

## Implementation Notes

- Added `docs/style-guide.md` with a Chinese style description for Storyforge.
- The guide covers visual positioning, material hierarchy, color, typography, layout, components, motion, media presentation, and prohibited directions.

## Verification Result

- Documentation was added without runtime code changes.
- No automated test command was required because this iteration only adds documentation.
