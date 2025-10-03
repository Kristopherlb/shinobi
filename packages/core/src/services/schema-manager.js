import { Logger } from '../platform/logger/src/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

const moduleDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

const candidateSchemaPaths = async () => {
  const packageRoot = path.resolve(moduleDir, '..', '..');
  return [
    path.resolve(moduleDir, 'service-manifest.schema.json'),
    path.resolve(packageRoot, 'src/services/service-manifest.schema.json'),
    path.resolve(packageRoot, 'dist/services/service-manifest.schema.json')
  ];
};

const findExistingFile = async (paths) => {
  for (const candidate of paths) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return undefined;
};

export class SchemaManager {
  logger;

  constructor() {
    this.logger = new Logger('SchemaManager');
  }

  async getBaseSchema() {
    this.logger.debug('Loading base service manifest schema');

    const schemaPath = await findExistingFile(await candidateSchemaPaths());

    if (!schemaPath) {
      throw new Error('Service manifest schema file could not be located.');
    }

    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    const baseSchema = JSON.parse(schemaContent);

    this.logger.debug('Base schema loaded successfully');
    return baseSchema;
  }
}
