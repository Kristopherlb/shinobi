/**
 * Manifest Parser Service - Single responsibility for YAML parsing
 * Implements Principle 4: Single Responsibility Principle
 */
import * as fs from 'fs/promises';
import * as YAML from 'yaml';
import { Logger } from '../platform/logger/src';

export interface ManifestParserDependencies {
  logger: Logger;
}

/**
 * Pure service for parsing YAML manifests
 * Responsibility: Stage 1 - Parsing (AC-P1.1, AC-P1.2)
 */
export class ManifestParser {
  constructor(private dependencies: ManifestParserDependencies) { }

  async parseManifest(manifestPath: string): Promise<any> {
    this.dependencies.logger.debug(`Parsing manifest: ${manifestPath}`);

    try {
      const fileContent = await fs.readFile(manifestPath, 'utf8');
      const manifest = YAML.parse(fileContent);

      if (!manifest || typeof manifest !== 'object') {
        throw new Error('Invalid YAML: manifest must be an object');
      }

      this.dependencies.logger.debug('Manifest parsed successfully');
      return manifest;

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('YAML')) {
          throw new Error(`Invalid YAML syntax: ${error.message}`);
        }
        throw new Error(`Failed to read manifest: ${error.message}`);
      }
      throw error;
    }
  }
}