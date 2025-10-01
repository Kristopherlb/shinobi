import { Logger } from './utils/logger.js';
import { ValidationOrchestrator } from '@shinobi/core';
import { FileDiscovery } from './utils/file-discovery.js';

export interface ValidateOptions {
  file?: string;
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
      // Discover manifest file
      const manifestPath = options.file 
        ? options.file 
        : await this.dependencies.fileDiscovery.findManifest('.');

      if (!manifestPath) {
        return {
          success: false,
          exitCode: 2,
          error: 'No service.yml found in this directory or any parent directories.'
        };
      }

      this.dependencies.logger.info(`Validating manifest: ${manifestPath}`);

      // Run validation pipeline (stages 1-2: parsing and schema validation)
      const result = await this.dependencies.pipeline.validate(manifestPath);
      
      this.dependencies.logger.success('Manifest validation completed successfully');
      
      if (result.warnings && result.warnings.length > 0) {
        this.dependencies.logger.warn(`Found ${result.warnings.length} warning(s):`);
        result.warnings.forEach((warning: string) => {
          this.dependencies.logger.warn(`  - ${warning}`);
        });
      }

      this.dependencies.logger.info('Validation summary:');
      this.dependencies.logger.info(`  Service: ${result.manifest.service}`);
      this.dependencies.logger.info(`  Owner: ${result.manifest.owner}`);
      this.dependencies.logger.info(`  Compliance Framework: ${result.manifest.complianceFramework || 'commercial'}`);
      this.dependencies.logger.info(`  Components: ${result.manifest.components?.length || 0}`);

      return {
        success: true,
        exitCode: 0,
        data: {
          manifest: result.manifest,
          warnings: result.warnings || []
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
