# Storyforge Agent Development Guide

This repository is for an AI short-drama generation platform. The product flow is:

1. Accept user text or story input.
2. Parse characters, relationships, plot structure, scenes, and production constraints.
3. Generate character assets.
4. Generate scene images.
5. Assemble shots, voice, subtitles, music, and transitions into a short drama video.

All agents working in this repository must follow the rules below.

## Working Principles

- Clarify requirements before implementation. For each new feature or iteration, confirm goal, inputs, outputs, user flow, data model impact, acceptance criteria, and test scope before writing production code.
- Prefer incremental implementation. Keep each change focused on one iteration point and avoid broad unrelated refactors.
- Keep architecture explicit. If a feature introduces a new agent, workflow stage, model provider, storage type, or queue, document the contract before implementation.
- Verify behavior with tests. Every feature, bug fix, workflow change, parser, generator adapter, or API endpoint must include relevant tests.
- Keep generated assets traceable. Generated characters, scenes, prompts, model parameters, source text spans, and final media artifacts must be linked through stable IDs.
- Make provider integration replaceable. Do not hard-code one AI vendor into domain logic; isolate provider SDKs behind adapters.

## Frontend Stack And UI Baseline

- Use Next.js for product development unless the user explicitly changes the stack.
- The initial UI must faithfully follow the supplied `AI 短剧生成平台.zip` reference. Treat that bundle as the visual baseline for layout, color, spacing, typography, copy, component density, interaction states, and asset usage.
- The supplied bundle is a Vite/React implementation. When porting it to Next.js, only make framework-required changes such as routing, app entrypoints, static asset paths, and client/server component boundaries.
- Do not redesign, restyle, simplify, embellish, or reinterpret the UI without an explicit requirement iteration from the user.
- Any future UI change must be recorded in a separate `space/` iteration file with the intended visual difference and verification method.
- UI implementation must be checked against the reference with screenshots or a local browser review when practical.

## Requirement Intake

Before non-trivial implementation, create or update one iteration document under `space/`. Small maintenance actions, obvious command execution, or low-impact edits do not need a new `space/` record.

The agent must clarify these points when they are not obvious:

- Product goal: what user problem this iteration solves.
- User input: accepted format, examples, limits, required fields, optional fields.
- Output: API response, UI state, generated asset, video artifact, or background job result.
- Workflow stage: script parsing, character design, scene design, storyboard, asset generation, video assembly, review, export, or publishing.
- Persistence: what must be stored, for how long, and how it is versioned.
- Failure behavior: retries, partial results, user-visible errors, and manual recovery.
- Acceptance criteria: concrete conditions that prove the feature is done.
- Test plan: unit, integration, fixture, snapshot, E2E, visual, or media-output validation.

If requirement details are missing and reasonable assumptions would be risky, ask the user before implementation.

## Iteration Space

Each requirement iteration must have its own Markdown file in `space/`.

Naming format:

```text
space/YYYY-MM-DD-short-requirement-title.md
```

Each iteration document must contain:

- `# Date + Requirement Title`
- Background
- Goal
- Confirmed Details
- Open Questions
- Proposed Scope
- Out of Scope
- Data/API Contracts
- Test Plan
- Implementation Notes
- Verification Result

Keep iteration files focused on the current iteration. Do not overwrite previous iteration records.

## Recommended Project Structure

Use this structure unless the repository later adopts a framework that requires a different layout:

```text
.
├── AGENTS.md
├── README.md
├── space/
│   └── YYYY-MM-DD-requirement-title.md
├── docs/
│   ├── architecture.md
│   ├── data-model.md
│   └── workflows.md
├── src/
│   ├── app/
│   ├── api/
│   ├── agents/
│   │   ├── script-parser/
│   │   ├── character-designer/
│   │   ├── scene-designer/
│   │   ├── storyboard-planner/
│   │   ├── asset-generator/
│   │   └── video-assembler/
│   ├── domain/
│   │   ├── script/
│   │   ├── character/
│   │   ├── scene/
│   │   ├── storyboard/
│   │   └── media/
│   ├── providers/
│   │   ├── llm/
│   │   ├── image/
│   │   ├── voice/
│   │   └── video/
│   ├── jobs/
│   ├── storage/
│   ├── config/
│   └── shared/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── e2e/
└── scripts/
```

## Code Organization

- `src/agents/`: orchestration logic for each AI workflow stage. Agents coordinate domain services and provider adapters, but should not own persistence details directly.
- `src/domain/`: pure business types, validation, transformations, and deterministic logic.
- `src/providers/`: external model and media provider adapters. Provider-specific request/response formats stay here.
- `src/jobs/`: async job definitions, queues, retries, progress reporting, and cancellation.
- `src/storage/`: database, object storage, asset metadata, and repository implementations.
- `src/api/`: HTTP/RPC route handlers. Keep handlers thin; delegate to services or agents.
- `src/shared/`: cross-cutting utilities that are truly shared. Avoid dumping unrelated helpers here.
- `tests/fixtures/`: reusable story inputs, parsed script outputs, provider mocks, image metadata, and assembly manifests.

## Agent Contract Rules

Each agent module must expose a clear contract:

- Input schema.
- Output schema.
- Side effects.
- Required providers.
- Retry behavior.
- Error types.
- Progress events.
- Test fixtures.

Agent outputs must be structured and machine-readable. Avoid returning free-form text when downstream stages need reliable fields.

For example, the script parser should produce stable entities such as:

- Characters.
- Character relationships.
- Plot events.
- Scenes.
- Locations.
- Time of day.
- Emotional beats.
- Visual style hints.
- Dialogue blocks.

## Testing Rules

Every implementation must include tests that match risk level:

- Domain parsing and transformations: unit tests with fixtures.
- Provider adapters: mocked integration tests with recorded request/response shapes.
- Agent orchestration: integration tests using fake providers.
- API routes: request/response tests, auth tests where applicable, and error-state tests.
- Background jobs: retry, cancellation, idempotency, and progress tests.
- Generated media assembly: manifest validation tests and smoke tests for output file creation.
- UI changes: component tests or E2E tests for core flows.

Do not call paid or nondeterministic model APIs in normal automated tests. Use fake providers or fixtures by default. Live provider tests must be opt-in and clearly documented.

## Quality Gates

Before an iteration is considered complete:

1. Requirements are recorded under `space/`.
2. Code is implemented in the agreed scope.
3. Tests are added or updated.
4. Relevant test commands pass.
5. Lint/typecheck/build pass when available.
6. The iteration document has a verification result.
7. Any known limitations are documented.

## Data And Asset Traceability

Generated artifacts must retain:

- Source input ID.
- Iteration/job ID.
- Agent stage.
- Prompt text or prompt template version.
- Provider name and model.
- Generation parameters.
- Parent artifact IDs.
- Review status.
- Storage location.

Use immutable artifact IDs for generated outputs. If a user regenerates an asset, create a new artifact version instead of overwriting history.

## Security And Privacy

- Never commit real provider API keys, tokens, private prompts, or user source material that is not intended as a fixture.
- Store secrets in environment variables or secret managers.
- Keep user-submitted scripts and generated assets private by default.
- Redact sensitive text from logs unless explicitly needed for local debugging.
- Validate uploaded files and generated media manifests before processing.

## Documentation Expectations

Update docs when behavior changes:

- Architecture changes go in `docs/architecture.md`.
- Data model changes go in `docs/data-model.md`.
- Workflow changes go in `docs/workflows.md`.
- Iteration-specific decisions go in the matching `space/` file.

Documentation should describe actual behavior, not aspirational design.
