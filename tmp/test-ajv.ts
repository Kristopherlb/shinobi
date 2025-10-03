import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Logger } from '../packages/core/src/platform/logger/src/index.ts';
import { ManifestSchemaComposer } from '../packages/core/src/services/manifest-schema-composer.ts';

const logger = Logger.getLogger('test-ajv');
const composer = new ManifestSchemaComposer({ logger });
const masterSchema = await composer.composeMasterSchema();

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

const validate = ajv.compile(masterSchema);
console.log('compiled', typeof validate === 'function');
