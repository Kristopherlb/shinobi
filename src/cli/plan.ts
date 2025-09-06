import { Logger } from '../utils/logger';
import { ValidationOrchestrator } from '../services/validation-orchestrator';
import { FileDiscovery } from '../utils/file-discovery';

export interface PlanOptions {
  file?: string;
  env?: string;
}

export interface PlanResult {
  success: boolean;
  exitCode: number;
  data?: {
    resolvedManifest: any;
    warnings: string[];
  };
  error?: string;
}

interface PlanDependencies {
  pipeline: ValidationOrchestrator;
  fileDiscovery: FileDiscovery;
  logger: Logger;
}

export class PlanCommand {
  constructor(private dependencies: PlanDependencies) {}

  async execute(options: PlanOptions): Promise<PlanResult> {
    this.dependencies.logger.debug('Starting plan command', options);

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

      const env = options.env || 'dev';
      this.dependencies.logger.info(`Planning deployment for environment: ${env}`);
      this.dependencies.logger.info(`Using manifest: ${manifestPath}`);

      // Run full validation pipeline (all 4 stages)
      const result = await this.dependencies.pipeline.plan(manifestPath, env);
      
      this.dependencies.logger.success('Plan generation completed successfully');
      
      // Display active compliance framework (AC-E3)
      this.dependencies.logger.info(`Active Framework: ${result.resolvedManifest.complianceFramework || 'commercial'}`);
      
      if (result.warnings && result.warnings.length > 0) {
        this.dependencies.logger.warn(`Found ${result.warnings.length} warning(s):`);
        result.warnings.forEach(warning => {
          this.dependencies.logger.warn(`  - ${warning}`);
        });
      }

      this.dependencies.logger.info('\nPlan summary:');
      this.dependencies.logger.info(`  Service: ${result.resolvedManifest.service}`);
      this.dependencies.logger.info(`  Environment: ${env}`);
      this.dependencies.logger.info(`  Components: ${result.resolvedManifest.components?.length || 0}`);

      return {
        success: true,
        exitCode: 0,
        data: {
          resolvedManifest: result.resolvedManifest,
          warnings: result.warnings || []
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dependencies.logger.error('Plan failed:', error);
      
      return {
        success: false,
        exitCode: 2,
        error: errorMessage
      };
    }
  }
}