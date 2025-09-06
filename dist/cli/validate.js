"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateCommand = void 0;
const logger_1 = require("../utils/logger");
const pipeline_1 = require("../validation/pipeline");
const file_discovery_1 = require("../utils/file-discovery");
class ValidateCommand {
    constructor() {
        this.pipeline = new pipeline_1.ValidationPipeline();
    }
    async execute(options) {
        logger_1.logger.debug('Starting validate command', options);
        // Discover manifest file
        const fileDiscovery = new file_discovery_1.FileDiscovery();
        const manifestPath = options.file
            ? options.file
            : await fileDiscovery.findManifest('.');
        if (!manifestPath) {
            logger_1.logger.error('Error: No service.yml found in this directory or any parent directories.');
            throw new Error('Manifest not found');
        }
        logger_1.logger.info(`Validating manifest: ${manifestPath}`);
        try {
            // Run validation pipeline (stages 1-2: parsing and schema validation)
            const result = await this.pipeline.validate(manifestPath);
            logger_1.logger.success('Manifest validation completed successfully');
            if (result.warnings && result.warnings.length > 0) {
                logger_1.logger.warn(`Found ${result.warnings.length} warning(s):`);
                result.warnings.forEach(warning => {
                    logger_1.logger.warn(`  - ${warning}`);
                });
            }
            logger_1.logger.info('Validation summary:');
            logger_1.logger.info(`  Service: ${result.manifest.service}`);
            logger_1.logger.info(`  Owner: ${result.manifest.owner}`);
            logger_1.logger.info(`  Compliance Framework: ${result.manifest.complianceFramework || 'commercial'}`);
            logger_1.logger.info(`  Components: ${result.manifest.components?.length || 0}`);
        }
        catch (error) {
            if (error instanceof Error) {
                logger_1.logger.error('Validation failed:', error);
            }
            throw error;
        }
    }
}
exports.ValidateCommand = ValidateCommand;
