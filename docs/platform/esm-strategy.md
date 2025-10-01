# ESM Module Strategy

All TypeScript packages in the Shinobi workspace now emit native ECMAScript modules. The shared `tsconfig.base.json` compiles with `"module": "NodeNext"` and every publishable package declares `"type": "module"` so Node.js treats compiled `.js` files as ESM. Legacy helper binaries (`bootstrap-component.js`, `demo-synth.js`, `demo-schema-validation.js`, `deploy-standalone.js`, `test-contracts.js`, `tools/scripts/generate-component-catalogs.js`) were removed rather than ported—no active consumers remained, and keeping them would pull CJS tooling back into the repo.

## Build & project configuration

- `tsconfig.base.json` sets `module`/`moduleResolution` to `NodeNext`. Package-level configs inherit these defaults and only customise `rootDir`/`outDir`.
- Type declarations (`*.d.ts`) continue to be written to each project's `dist` directory; Nx caching remains unchanged.
- Runtime entry points (CLI, MCP server, standards libraries, component packages, etc.) now ship as pure ESM bundles.
- Jest is configured via `jest.preset.mjs`, which wraps Nx’s preset and standardises on `@swc/jest`. Package-level `jest.config.mjs` files extend the preset and re-map workspace aliases.
- `isolatedModules` is enabled globally; when re-exporting types use `export type { ... }` to satisfy TypeScript’s NodeNext semantics.

## Consuming Shinobi packages

### ESM consumers

No changes are required. Import packages normally:

```ts
import { ComponentContext } from '@shinobi/core';
```

### CommonJS consumers

CJS callers must load Shinobi packages via dynamic `import()` or `createRequire`.

```js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { defaultLoggingService } = require('@shinobi/core/platform/services/logging');
```

For asynchronous entry points you can also use:

```js
const core = await import('@shinobi/core');
```

This pattern is used wherever legacy services still run in CommonJS mode.

## CLI & scripting changes

- `apps/svc` (the `@shinobi/cli` package) is now an ESM bundle. The development entrypoint uses `ts-node`'s ESM loader, and the published bin loads the compiled module through `import()`.
- Bootstrap scripts such as `bin/shinobi` dynamically import the compiled CLI to avoid `exports` globals.

## Migration guidance for downstream teams

1. Ensure Node.js 20+ is available wherever Shinobi packages are executed.
2. Replace `require('@shinobi/...')` calls with either `await import()` or a `createRequire` shim.
3. Remove assumptions about `module.exports` or `exports` objects—packages now use `export`/`export default` semantics exclusively.
4. Update build tooling (ts-node, Jest, webpack, etc.) to operate in ESM mode or use compatibility loaders.
5. Rebuild downstream bundles to verify there are no `ReferenceError: exports is not defined` failures.

Following these guidelines keeps both modern (ESM) and legacy (CJS via shims) consumers aligned with the new module strategy.
