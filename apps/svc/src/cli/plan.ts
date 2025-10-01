import { Logger } from './utils/logger.js';
import { PlanOutputFormatter } from '@shinobi/core';
import { ExecutionContextManager } from './execution-context-manager.js';

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
    formattedSummary: string;
    structuredData: any;
  };
  error?: string;
}

interface PlanDependencies {
  logger: Logger;
  formatter?: PlanOutputFormatter;
  executionContext: ExecutionContextManager;
}

export class PlanCommand {
  private readonly formatter: PlanOutputFormatter;

  constructor(private readonly dependencies: PlanDependencies) {
    this.formatter =
      dependencies.formatter ??
      new PlanOutputFormatter({ logger: dependencies.logger.platformLogger });
  }

  async execute(options: PlanOptions): Promise<PlanResult> {
    this.dependencies.logger.debug('Starting plan command', { data: options });

    try {
      const environment = options.env || 'dev';
      const executionContext = await this.dependencies.executionContext.resolve({
        manifestPath: options.file,
        environment
      });

      this.dependencies.logger.info(`Planning deployment for environment: ${executionContext.environment}`);
      this.dependencies.logger.info(`Using manifest: ${executionContext.manifestPath}`);

      const planResult = executionContext.planResult;

      const synthesisResult = {
        resolvedManifest: planResult.resolvedManifest,
        synthesisTime: 0,
        components: [],
        bindings: planResult.resolvedManifest.binds || [],
        patchesApplied: false
      };

      const formatted = this.formatter.formatPlanOutput({
        synthesisResult,
        environment: executionContext.environment,
        complianceFramework: planResult.resolvedManifest.complianceFramework || 'commercial'
      });

      this.dependencies.logger.success('Plan generation completed successfully');
      formatted.userFriendlySummary
        .split('\n')
        .filter(Boolean)
        .forEach((line) => this.dependencies.logger.info(line));

      if (planResult.warnings.length > 0) {
        planResult.warnings.forEach((warning: string) => this.dependencies.logger.warn(warning));
      }

      if (formatted.warnings.length > 0) {
        formatted.warnings.forEach((warning: string) => this.dependencies.logger.warn(warning));
      }

      if (formatted.recommendations.length > 0) {
        formatted.recommendations.forEach((recommendation: string) => this.dependencies.logger.info(recommendation));
      }

      return {
        success: true,
        exitCode: 0,
        data: {
          resolvedManifest: planResult.resolvedManifest,
          warnings: [...planResult.warnings, ...formatted.warnings],
          formattedSummary: formatted.userFriendlySummary,
          structuredData: formatted.structuredData
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dependencies.logger.error('Plan failed', error);

      return {
        success: false,
        exitCode: 2,
        error: errorMessage
      };
    }
  }
}
