import { logger } from '../utils/logger';
import { ValidationPipeline } from '../validation/pipeline';
import { FileDiscovery } from '../utils/file-discovery';

export interface PlanOptions {
  file?: string;
  env?: string;
}

export class PlanCommand {
  private pipeline: ValidationPipeline;

  constructor() {
    this.pipeline = new ValidationPipeline();
  }

  async execute(options: PlanOptions): Promise<void> {
    logger.debug('Starting plan command', options);

    // Discover manifest file
    const fileDiscovery = new FileDiscovery();
    const manifestPath = options.file 
      ? options.file 
      : await fileDiscovery.findManifest('.');

    if (!manifestPath) {
      logger.error('Error: No service.yml found in this directory or any parent directories.');
      throw new Error('Manifest not found');
    }

    const env = options.env || 'dev';
    logger.info(`Planning deployment for environment: ${env}`);
    logger.info(`Using manifest: ${manifestPath}`);

    try {
      // Run full validation pipeline (all 4 stages)
      const result = await this.pipeline.plan(manifestPath, env);
      
      logger.success('Plan generation completed successfully');
      
      // Display active compliance framework (AC-E3)
      logger.info(`Active Framework: ${result.resolvedManifest.complianceFramework || 'commercial'}`);
      
      if (result.warnings && result.warnings.length > 0) {
        logger.warn(`Found ${result.warnings.length} warning(s):`);
        result.warnings.forEach(warning => {
          logger.warn(`  - ${warning}`);
        });
      }

      // Output the fully resolved configuration JSON
      logger.info('\nResolved Configuration:');
      console.log(JSON.stringify(result.resolvedManifest, null, 2));

      logger.info('\nPlan summary:');
      logger.info(`  Service: ${result.resolvedManifest.service}`);
      logger.info(`  Environment: ${env}`);
      logger.info(`  Components: ${result.resolvedManifest.components?.length || 0}`);

    } catch (error) {
      if (error instanceof Error) {
        logger.error('Plan failed:', error);
      }
      throw error;
    }
  }
}