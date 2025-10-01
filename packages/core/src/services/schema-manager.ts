import { Logger } from '../platform/logger/src/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class SchemaManager {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('SchemaManager');
  }
  /**
   * Get the base schema for manifest validation (AC-P2.2)
   * 
   * This service has a single responsibility: to load and provide the authoritative
   * base schema from the version-controlled JSON file. Dynamic schema composition
   * (merging component-specific schemas) is handled by the SchemaValidator service.
   */
  async getBaseSchema(): Promise<any> {
    this.logger.debug('Loading base service manifest schema');

    // Load the authoritative JSON schema
    const schemaPath = path.resolve(__dirname, 'service-manifest.schema.json');
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    const baseSchema = JSON.parse(schemaContent);

    this.logger.debug('Base schema loaded successfully');
    return baseSchema;
  }

}