import { logger } from '../utils/logger';
import { ValidationPipeline } from '../validation/pipeline';
import { FileDiscovery } from '../utils/file-discovery';

export interface ValidateOptions {
  file?: string;
}

export class ValidateCommand {
  private pipeline: ValidationPipeline;

  constructor() {
    this.pipeline = new ValidationPipeline();
  }

  async execute(options: ValidateOptions): Promise<void> {
    logger.debug('Starting validate command', options);

    // Discover manifest file
    const fileDiscovery = new FileDiscovery();
    const manifestPath = options.file 
      ? options.file 
      : await fileDiscovery.findManifest('.');

    if (!manifestPath) {
      logger.error('Error: No service.yml found in this directory or any parent directories.');
      throw new Error('Manifest not found');
    }

    logger.info(`Validating manifest: ${manifestPath}`);

    try {
      // Run validation pipeline (stages 1-2: parsing and schema validation)
      const result = await this.pipeline.validate(manifestPath);
      
      logger.success('Manifest validation completed successfully');
      
      if (result.warnings && result.warnings.length > 0) {
        logger.warn(`Found ${result.warnings.length} warning(s):`);
        result.warnings.forEach(warning => {
          logger.warn(`  - ${warning}`);
        });
      }

      logger.info('Validation summary:');
      logger.info(`  Service: ${result.manifest.service}`);
      logger.info(`  Owner: ${result.manifest.owner}`);
      logger.info(`  Compliance Framework: ${result.manifest.complianceFramework || 'commercial'}`);
      logger.info(`  Components: ${result.manifest.components?.length || 0}`);

    } catch (error) {
      if (error instanceof Error) {
        logger.error('Validation failed:', error);
      }
      throw error;
    }
  }
}