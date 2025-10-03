import { ManifestSchemaComposer } from '../packages/core/src/services/manifest-schema-composer.ts';
import { Logger } from '../packages/core/src/platform/logger/src/index.ts';

const composer = new ManifestSchemaComposer({ logger: Logger.getLogger('schema-inspector') });
const masterSchema = await composer.composeMasterSchema();
const keys = Object.keys(masterSchema.$defs || {});
console.log('defs count', keys.length);
const lambdaDef = masterSchema.$defs?.['component.lambda-api.config'];
if (lambdaDef) {
  console.log('lambda keys', Object.keys(lambdaDef));
  console.log('lambda definitions keys', Object.keys(lambdaDef.definitions || {}));
  console.log('example AlarmConfig', JSON.stringify(lambdaDef.definitions?.AlarmConfig, null, 2));
}
