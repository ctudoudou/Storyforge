# Testing Strategy

## Decision

Storyforge will keep using Node's built-in test runner with `node --experimental-strip-types --test` for the current local-first MVP foundation.

This keeps the test stack small while the codebase mostly covers deterministic parsing, SQLite persistence, API route handlers, smoke checks, and local scripts.

## Current Commands

```bash
npm run test
npm run typecheck
npm run build
```

## Import Constraints

Node ESM tests do not apply the Next.js bundler resolver. Test-importable TypeScript modules should follow these constraints:

- Use explicit `.ts` extensions for relative imports that are imported by tests.
- Use `next/server.js` instead of `next/server` when a route handler must be imported by Node tests.
- Avoid `@/` aliases inside route modules that are directly imported by Node tests.

These constraints are intentionally scoped to test-imported modules. UI components can continue using the existing project alias where the Next.js bundler handles it.

## Revisit Criteria

Switch to a dedicated runner such as Vitest or Playwright test when one of these becomes true:

- Component tests need a DOM environment.
- Browser flow tests become part of normal CI.
- Mocking module boundaries becomes difficult with Node's built-in runner.
- Snapshot, coverage, or watch-mode ergonomics become a blocker.
- The `--experimental-strip-types` warning becomes unacceptable for the project.
