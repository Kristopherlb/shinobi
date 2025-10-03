import { ManifestSchemaComposer } from '../packages/core/src/services/manifest-schema-composer.ts';
import { Logger } from '../packages/core/src/platform/logger/src/index.ts';

try {
  const composer = new ManifestSchemaComposer({ logger: Logger.getLogger('schema-inspector') });
  const master = await composer.composeMasterSchema();
  const lambda = master.$defs?.['component.lambda-api.config'];
  console.log('has lambda', !!lambda);
  if (lambda) {
    console.log('keys', Object.keys(lambda));
    console.log('has definitions', !!lambda.definitions, lambda.definitions ? Object.keys(lambda.definitions) : []);
  }
} catch (err) {
  console.error('error', err);
}
