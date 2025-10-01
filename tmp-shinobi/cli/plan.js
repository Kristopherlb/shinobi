import { PlanOutputFormatter } from '@shinobi/core';
export class PlanCommand {
    dependencies;
    formatter;
    constructor(dependencies) {
        this.dependencies = dependencies;
        this.formatter = dependencies.formatter ?? new PlanOutputFormatter({ logger: dependencies.logger });
    }
    async execute(options) {
        this.dependencies.logger.debug('Starting plan command', { data: options });
        try {
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
            const environment = options.env || 'dev';
            this.dependencies.logger.info(`Planning deployment for environment: ${environment}`);
            this.dependencies.logger.info(`Using manifest: ${manifestPath}`);
            const validationResult = await this.dependencies.pipeline.plan(manifestPath, environment);
            const synthesisResult = {
                resolvedManifest: validationResult.resolvedManifest,
                synthesisTime: 0,
                components: [],
                bindings: validationResult.resolvedManifest.binds || [],
                patchesApplied: false
            };
            const formatted = this.formatter.formatPlanOutput({
                synthesisResult,
                environment,
                complianceFramework: validationResult.resolvedManifest.complianceFramework || 'commercial'
            });
            this.dependencies.logger.success('Plan generation completed successfully');
            formatted.userFriendlySummary
                .split('\n')
                .filter(Boolean)
                .forEach((line) => this.dependencies.logger.info(line));
            if (validationResult.warnings.length > 0) {
                validationResult.warnings.forEach((warning) => this.dependencies.logger.warn(warning));
            }
            if (formatted.warnings.length > 0) {
                formatted.warnings.forEach((warning) => this.dependencies.logger.warn(warning));
            }
            if (formatted.recommendations.length > 0) {
                formatted.recommendations.forEach((recommendation) => this.dependencies.logger.info(recommendation));
            }
            return {
                success: true,
                exitCode: 0,
                data: {
                    resolvedManifest: validationResult.resolvedManifest,
                    warnings: [...validationResult.warnings, ...formatted.warnings],
                    formattedSummary: formatted.userFriendlySummary,
                    structuredData: formatted.structuredData
                }
            };
        }
        catch (error) {
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
