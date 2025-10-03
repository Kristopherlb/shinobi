import { ManifestSchemaComposer } from '../packages/core/src/services/manifest-schema-composer.ts';
import { Logger } from '../packages/core/src/platform/logger/src/index.ts';

const composer = new ManifestSchemaComposer({ logger: Logger.getLogger('schema-inspector') });
const master = await composer.composeMasterSchema();
const keys = Object.keys(master.$defs || {});
console.log('defs sample', keys.filter(key => key.startsWith('component.lambda-api')).slice(0,10));
console.log('has Alarm', 'component.lambda-api.definition.AlarmConfig' in (master.$defs || {}));
