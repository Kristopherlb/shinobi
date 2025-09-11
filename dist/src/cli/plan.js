"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanCommand = void 0;
class PlanCommand {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async execute(options) {
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
            const { ResolverEngine } = await Promise.resolve().then(() => __importStar(require('../resolver/resolver-engine')));
            const { ResolverBinderRegistry } = await Promise.resolve().then(() => __importStar(require('../resolver/binder-registry')));
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
            const { PlanOutputFormatter } = await Promise.resolve().then(() => __importStar(require('../services/plan-output-formatter')));
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
        }
        catch (error) {
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
exports.PlanCommand = PlanCommand;
