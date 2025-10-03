require('ts-node/register/transpile-only');
require('tsconfig-paths/register');
const { ManifestSchemaComposer } = require('../packages/core/src/services/manifest-schema-composer.ts');
const { Logger } = require('../packages/core/src/platform/logger/src/index.ts');
(async () => {
  const composer = new ManifestSchemaComposer({ logger: Logger.getLogger('schema-inspector') });
  const masterSchema = await composer.composeMasterSchema();
  const lambdaDef = masterSchema.$defs?.['component.lambda-api.config'];
  console.log('lambda keys', lambdaDef ? Object.keys(lambdaDef) : []);
  console.log('lambda definitions keys', lambdaDef?.definitions ? Object.keys(lambdaDef.definitions) : []);
})();
