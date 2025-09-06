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
    synthesisResult?: any;
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
      const validationResult = await this.dependencies.pipeline.plan(manifestPath, env);
      
      // Initialize ResolverEngine for synthesis
      const { ResolverEngine } = await import('../resolver/resolver-engine');
      const { ResolverBinderRegistry } = await import('../resolver/binder-registry');
      
      const binderRegistry = new ResolverBinderRegistry();
      const resolverEngine = new ResolverEngine({
        logger: this.dependencies.logger,
        binderRegistry
      });
      
      // Synthesize infrastructure using ResolverEngine  
      this.dependencies.logger.info('Synthesizing infrastructure components...');
      const synthesisResult = await resolverEngine.synthesize(validationResult.resolvedManifest);
      
      // Perform CDK diff analysis
      this.dependencies.logger.info('Analyzing infrastructure changes...');
      const cdkDiff = await this.performCdkDiff(synthesisResult);
      
      // Format and display comprehensive plan output
      const { PlanOutputFormatter } = await import('../services/plan-output-formatter');
      const outputFormatter = new PlanOutputFormatter({
        logger: this.dependencies.logger
      });
      
      const formattedOutput = outputFormatter.formatPlanOutput({
        synthesisResult,
        cdkDiff,
        environment: env,
        complianceFramework: validationResult.resolvedManifest.complianceFramework || 'commercial'
      });
      
      this.dependencies.logger.success('Plan generation completed successfully');
      
      // Display formatted output
      this.dependencies.logger.info('\n' + formattedOutput.userFriendlySummary);
      
      // Display recommendations
      if (formattedOutput.recommendations.length > 0) {
        this.dependencies.logger.info('\n--- Recommendations ---');
        formattedOutput.recommendations.forEach(rec => {
          this.dependencies.logger.info(`  ${rec}`);
        });
      }
      
      // Display warnings
      if (formattedOutput.warnings.length > 0) {
        this.dependencies.logger.warn('\n--- Warnings ---');
        formattedOutput.warnings.forEach(warning => {
          this.dependencies.logger.warn(`  ${warning}`);
        });
      }
      
      // Display active compliance framework (AC-E3)
      this.dependencies.logger.info(`Active Framework: ${validationResult.resolvedManifest.complianceFramework || 'commercial'}`);
      
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        this.dependencies.logger.warn(`Found ${validationResult.warnings.length} warning(s):`);
        validationResult.warnings.forEach(warning => {
          this.dependencies.logger.warn(`  - ${warning}`);
        });
      }

      this.dependencies.logger.info('\nResolved Configuration:');
      this.dependencies.logger.info(JSON.stringify(validationResult.resolvedManifest, null, 2));

      return {
        success: true,
        exitCode: 0,
        data: {
          resolvedManifest: validationResult.resolvedManifest,
          warnings: validationResult.warnings || [],
          synthesisResult: synthesisResult,
          formattedOutput: formattedOutput
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