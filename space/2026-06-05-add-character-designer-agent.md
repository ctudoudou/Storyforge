# Add Character Designer Agent

## Background

Priority 5 needs agent-specific directories and contracts so later live providers can be swapped in without changing product code. The character designer should use existing SQLite character records and visual consistency settings instead of accepting free-form mock input.

## Scope

- Add `src/agents/character-designer/`.
- Define provider-agnostic input, context, output, provider, and plan types.
- Add a deterministic fake provider for local tests.
- Build character design plans from project title, script context, character records, and visual consistency settings.
- Validate provider output before returning a plan.

## Verification

- Unit tests cover successful fake-provider output from SQLite character records.
- Unit tests cover invalid provider output.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.

## Next

Continue Priority 5 with `src/agents/scene-designer/`.
