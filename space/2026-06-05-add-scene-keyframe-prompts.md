# Add Scene And Keyframe Prompts

## Background

Character prompt templates are in place. Scene and keyframe generation need the same provider-agnostic prompt layer so future providers can receive consistent context before durable generation jobs are added.

## Scope

- Add `buildSceneKeyframePrompt` under `src/agents/asset-generator/`.
- Define scene/keyframe prompt input and output types.
- Include location, time of day, mood, camera hints, project title, story summary, beat summary, characters, style, aspect ratio, consistency notes, anchor assets, and reference assets.
- Return a positive prompt, negative prompt, normalized references, and structured parameters.
- Validate that `scene.location` is present.
- Distinguish scene design output from keyframe output through `target` and `promptType`.

## Provider-Agnostic Rule

The scene/keyframe prompt builder only creates reusable prompt text and parameters. It does not call a provider, write files, or mutate SQLite.

## Verification

- `node --experimental-strip-types --test tests/unit/scene-keyframe-prompt.test.ts`
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Next

Store prompt text, provider, model, parameters, and parent artifact IDs.
