# Add Storyboard Planner Agent

## Background

Priority 5 needs a storyboard-specific agent boundary so shot planning can consume existing production records before any generated images or export assembly work. The first version should use local SQLite data and deterministic provider output.

## Scope

- Add `src/agents/storyboard-planner/`.
- Define provider-agnostic input, context, shot, output, provider, and plan types.
- Add a deterministic fake provider for local tests.
- Build storyboard plans from project scenes, plot beats, dialogue blocks, and timeline clips.
- Validate provider output before returning a plan.

## Verification

- Unit tests cover successful fake-provider output from SQLite production records.
- Unit tests cover invalid provider output.
- Unit tests cover missing parsed scene records.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.

## Next

Continue Priority 5 by tightening shared input/output schema coverage across agents.
