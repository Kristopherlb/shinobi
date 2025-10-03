# Bug Report: Jest Cannot Execute Component Test Suites Due to ESM Module Parsing

## Summary
Jest is currently unable to execute any of the component test suites that import shared platform code. The test run fails immediately with `SyntaxError: Cannot use 'import.meta' outside a module`. This blocks validation for packages like `@platform/dynamodb-table` and will progressively impact every component that relies on the core services.

## Reproduction Steps
1. From the repository root run:
   ```bash
   pnpm exec jest --runTestsByPath packages/components/dynamodb-table/tests/dynamodb-table.builder.test.ts
   ```
2. Jest resolves platform helpers (e.g. `packages/core/src/index.ts`).
3. The runtime attempts to load `packages/core/src/services/manifest-schema-composer.js`, which uses native ESM constructs (`import.meta`).
4. Jest aborts with the following error:
   ```
   SyntaxError: Cannot use 'import.meta' outside a module
     at Runtime.createScriptFromCode (.../jest-runtime/build/index.js:1318)
     at Object.<anonymous> (packages/core/src/services/schema-validator.js:10:1)
   ```

## Root Cause
- Our shared core packages are compiled to native ESM and rely on `import.meta`, but Jest is still configured with its default CommonJS pipeline.
- The haste map also sees duplicate package manifests (`packages/components/*/package.json` and `dist/...`) causing naming collisions before transforms run.
- Because Jest never handles the ESM transforms, any test touching the shared platform services fails immediately.

## Impact
- All component-level Jest suites are blocked (DynamoDB table, S3 bucket, Cognito, etc.).
- CI cannot provide regression feedback for component changes.
- Developers lack a local validation loop for L3 components that depend on shared services.

## Requirements / Acceptance Criteria
1. `pnpm exec jest --runTestsByPath packages/components/dynamodb-table/tests/dynamodb-table.builder.test.ts` executes without syntax errors.
2. Jest honours native ESM modules (`import.meta`, `export` syntax) from `packages/core` and other shared packages.
3. Haste-map package collisions are eliminated (address duplicate `package.json` paths or reconfigure module name mapping).
4. Documentation: update the testing guide to describe the new Jest configuration and any required scripts.
5. Optional but recommended: add a smoke test to CI that runs a representative component test suite to prevent regression.

## Suggested Implementation Options for Follow-up
- Adopt Jest’s native ESM support (`"type": "module"`, `extensionsToTreatAsEsm`, `moduleNameMapper` adjustments).
- Convert the build output consumed by Jest to CJS via Babel/ts-jest transforms.
- Alternatively, isolate ESM sources behind mocks/stubs when running Jest (least preferred; best suited only as a stopgap).

## Ownership / Next Steps
- Assign to the Platform Tooling team (or whoever maintains the shared Jest configuration).
- Once a decision is made on the preferred approach, update the Jest configuration in `jest.config.mjs` and any package-level configs, then verify with affected component suites.
