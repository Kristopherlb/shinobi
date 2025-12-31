/**
 * Validate Command
 *
 * Implements the `shinobi validate` command, which parses and validates service
 * manifests without connecting to AWS. This command performs:
 *
 * - Manifest file discovery (searches current and parent directories)
 * - YAML parsing and syntax validation
 * - JSON Schema validation against platform schemas
 * - Component reference validation
 * - Context hydration and environment resolution
 *
 * This command is safe to run in CI/CD pipelines as it performs no AWS API calls
 * and has no side effects. It returns a standardized result object that can be
 * consumed programmatically.
 *
 * Exit codes:
 * - 0: Validation successful
 * - 2: Validation failed (syntax errors, schema violations, missing files)
 */

import * as path from 'path';
import { Logger } from './console-logger.js';
import { ValidationOrchestrator } from '@shinobi/core';
import { FileDiscovery } from './utils/file-discovery.js';

export interface ValidateOptions {
  file?: string;
  json?: boolean;
}

export interface ValidateResult {
  success: boolean;
  exitCode: number;
  data?: {
    manifest: any;
    warnings: string[];
  };
  error?: string;
}

interface ValidateDependencies {
  pipeline: ValidationOrchestrator;
  fileDiscovery: FileDiscovery;
  logger: Logger;
}

export class ValidateCommand {
  constructor(private dependencies: ValidateDependencies) {}

  async execute(options: ValidateOptions): Promise<ValidateResult> {
    this.dependencies.logger.debug('Starting validate command', { data: options });

    try {
      // Discover manifest file - resolve to absolute path if provided
      const manifestPath = options.file 
        ? path.resolve(options.file)
        : await this.dependencies.fileDiscovery.findManifest('.');

      if (!manifestPath) {
        return {
          success: false,
          exitCode: 2,
          error: 'No service.yml found in this directory or any parent directories.'
        };
      }

      // Ensure we log the absolute path (fileDiscovery may return absolute, but resolve to be safe)
      const resolvedPath = path.isAbsolute(manifestPath) 
        ? manifestPath 
        : path.resolve(manifestPath);
      
      if (!options.json) {
        this.dependencies.logger.info(`Validating manifest: ${resolvedPath}`);
      }

      // Run validation pipeline (stages 1-2: parsing and schema validation)
      const result = await this.dependencies.pipeline.validate(manifestPath);
      
      // Prepare result data (consistent for both JSON and human-readable output)
      const manifest = result.manifest || {};
      const warnings = result.warnings || [];
      
      // Human-readable output (skip if JSON mode)
      if (!options.json) {
        this.dependencies.logger.success('Manifest validation completed successfully');
        
        if (warnings.length > 0) {
          this.dependencies.logger.warn(`Found ${warnings.length} warning(s):`);
          warnings.forEach((warning: string) => {
            this.dependencies.logger.warn(`  - ${warning}`);
          });
        }

        this.dependencies.logger.info('Validation summary:');
        this.dependencies.logger.info(`  Service: ${manifest.service ?? 'unknown'}`);
        this.dependencies.logger.info(`  Owner: ${manifest.owner ?? 'unknown'}`);
        this.dependencies.logger.info(`  Compliance Framework: ${manifest.complianceFramework ?? 'commercial'}`);
        this.dependencies.logger.info(`  Components: ${manifest.components?.length ?? 0}`);
      }

      return {
        success: true,
        exitCode: 0,
        data: {
          manifest,
          warnings
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dependencies.logger.error('Validation failed', error);
      
      return {
        success: false,
        exitCode: 2,
        error: errorMessage
      };
    }
  }
}
