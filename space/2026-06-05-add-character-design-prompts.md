# Add Character Design Prompts

## Background

Image provider contracts are now in place, but callers still need reusable prompt text before they can ask any provider to generate a useful character image. Character prompt generation should stay provider-agnostic so fake providers and future live providers can share the same inputs.

## Scope

- Add `buildCharacterDesignPrompt` under `src/agents/asset-generator/`.
- Define character prompt input and output types.
- Include character name, role, traits, project title, story summary, style, aspect ratio, consistency notes, anchor assets, and reference assets.
- Return a positive prompt, negative prompt, normalized references, and structured parameters.
- Validate that `character.name` is present.

## Provider-Agnostic Rule

The prompt builder only creates text and structured parameters. It does not call a provider, write files, or mutate SQLite.

## Verification

- `node --experimental-strip-types --test tests/unit/character-design-prompt.test.ts`
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Next

Add prompt templates for scene/keyframe generation.
