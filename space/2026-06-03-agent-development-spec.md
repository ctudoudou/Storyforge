# 2026-06-03 Agent Development Spec

## Background

Storyforge is planned as an AI short-drama generation platform. The core pipeline starts from text input, parses character and plot relationships, generates character assets, generates scene images, and finally assembles those assets into a short drama.

This iteration establishes the repository working rules for future Codex/Agent development.

## Goal

Create a development specification that defines how agents should communicate, document requirements, structure code, write tests, and verify each implementation.

## Confirmed Details

- The platform should support a text-to-short-drama generation flow.
- The workflow includes story parsing, character relationship extraction, plot relationship extraction, character asset generation, scene image generation, and final short-drama assembly.
- Future development should clarify requirements with the user before implementation.
- Every development/debugging iteration should include tests where relevant.
- Each requirement iteration should have a separate file under `space/`.
- Iteration files should use date and requirement title in the filename.
- Iteration content should be written in Markdown.
- The repository should include project and code-structure conventions suitable for Codex agents.

## Open Questions

- Which application stack will be used first: Next.js, another web framework, a backend-only service, or a monorepo?
- Which AI providers will be used for LLM, image, voice, and video generation?
- Which storage layer will hold generated assets and metadata?
- Should workflow execution be synchronous for the MVP or use background jobs from the start?
- What is the first user-facing MVP flow?

## Proposed Scope

This iteration only defines development rules and repository conventions.

## Out Of Scope

- Implementing the product UI.
- Implementing AI provider calls.
- Designing the database schema.
- Building the short-drama generation pipeline.
- Creating media assets.

## Data/API Contracts

No runtime API is introduced in this iteration.

Future agent contracts should define:

- Input schema.
- Output schema.
- Side effects.
- Required providers.
- Retry behavior.
- Error types.
- Progress events.
- Test fixtures.

## Test Plan

No automated tests are required for this documentation-only iteration.

For future iterations:

- Domain logic must include unit tests.
- Agent orchestration must include integration tests with fake providers.
- Provider adapters must include mocked integration tests.
- API routes must include request/response and error-state tests.
- UI flows must include component or E2E tests.
- Media assembly must include manifest validation and output smoke tests.

## Implementation Notes

- Added root `AGENTS.md` as the repository-level instruction file for future Codex/Agent work.
- Added this iteration file under `space/` to establish the required iteration-record pattern.

## Verification Result

- Repository structure was checked before writing files.
- The repository was empty before this iteration.
- Documentation files were created without introducing runtime code.

