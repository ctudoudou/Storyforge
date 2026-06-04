# Add Scene Designer Agent

## Background

Priority 5 needs scene-specific agent contracts so scene and keyframe planning can use existing project records instead of free-form mock inputs. The scene designer should read SQLite scene data, linked scene assets, and project context.

## Scope

- Add `src/agents/scene-designer/`.
- Define provider-agnostic input, context, output, provider, and plan types.
- Add a deterministic fake provider for local tests.
- Build scene/keyframe design plans from project title, script context, scene metadata, scene characters, and linked scene assets.
- Validate provider output before returning a plan.

## Verification

- Unit tests cover successful fake-provider output from SQLite scene records and linked scene assets.
- Unit tests cover invalid provider output.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.

## Next

Continue Priority 5 with `src/agents/storyboard-planner/`.
