"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanCommand = void 0;
const logger_1 = require("../utils/logger");
const pipeline_1 = require("../validation/pipeline");
const file_discovery_1 = require("../utils/file-discovery");
class PlanCommand {
    constructor() {
        this.pipeline = new pipeline_1.ValidationPipeline();
    }
    async execute(options) {
        logger_1.logger.debug('Starting plan command', options);
        // Discover manifest file
        const fileDiscovery = new file_discovery_1.FileDiscovery();
        const manifestPath = options.file
            ? options.file
            : await fileDiscovery.findManifest('.');
        if (!manifestPath) {
            logger_1.logger.error('Error: No service.yml found in this directory or any parent directories.');
            throw new Error('Manifest not found');
        }
        const env = options.env || 'dev';
        logger_1.logger.info(`Planning deployment for environment: ${env}`);
        logger_1.logger.info(`Using manifest: ${manifestPath}`);
        try {
            // Run full validation pipeline (all 4 stages)
            const result = await this.pipeline.plan(manifestPath, env);
            logger_1.logger.success('Plan generation completed successfully');
            // Display active compliance framework (AC-E3)
            logger_1.logger.info(`Active Framework: ${result.resolvedManifest.complianceFramework || 'commercial'}`);
            if (result.warnings && result.warnings.length > 0) {
                logger_1.logger.warn(`Found ${result.warnings.length} warning(s):`);
                result.warnings.forEach(warning => {
                    logger_1.logger.warn(`  - ${warning}`);
                });
            }
            // Output the fully resolved configuration JSON
            logger_1.logger.info('\nResolved Configuration:');
            console.log(JSON.stringify(result.resolvedManifest, null, 2));
            logger_1.logger.info('\nPlan summary:');
            logger_1.logger.info(`  Service: ${result.resolvedManifest.service}`);
            logger_1.logger.info(`  Environment: ${env}`);
            logger_1.logger.info(`  Components: ${result.resolvedManifest.components?.length || 0}`);
        }
        catch (error) {
            if (error instanceof Error) {
                logger_1.logger.error('Plan failed:', error);
            }
            throw error;
        }
    }
}
exports.PlanCommand = PlanCommand;
