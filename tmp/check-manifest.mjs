import { ManifestSchemaComposer } from '../packages/core/src/services/manifest-schema-composer.ts';
import { Logger } from '../packages/core/src/platform/logger/src/index.ts';

const composer = new ManifestSchemaComposer({ logger: Logger.getLogger('test') });
const master = await composer.composeMasterSchema();
console.log(Object.keys(master.$defs || {}).length);
const def = master.$defs?.['component.lambda-api.config'];
console.log('has def', !!def);
if (def) {
  console.log('definitions keys', Object.keys(def.definitions || {}));
}
