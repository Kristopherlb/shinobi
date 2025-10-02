/**
 * Schema Validator Service - Single responsibility for JSON Schema validation
 * Implements Principle 4: Single Responsibility Principle
 * Enhanced with component-specific schema validation
 */
import AjvImport from 'ajv';
import addFormatsImport from 'ajv-formats';
import { SchemaErrorFormatter } from './schema-error-formatter.js';
import { EnhancedSchemaValidator } from './enhanced-schema-validator.js';
import { ManifestSchemaComposer } from './manifest-schema-composer.js';
/**
 * Pure service for JSON Schema validation
 * Responsibility: Stage 2 - Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)
 * Enhanced with comprehensive component-specific validation
 */
export class SchemaValidator {
    dependencies;
    ajv;
    enhancedValidator;
    constructor(dependencies) {
        this.dependencies = dependencies;
        const AjvConstructor = AjvImport;
        const addFormats = addFormatsImport;
        this.ajv = new AjvConstructor({ allErrors: true, verbose: true });
        addFormats(this.ajv);
        // Initialize enhanced validator if not provided
        if (!this.dependencies.enhancedValidator) {
            if (!this.dependencies.schemaComposer) {
                this.dependencies.schemaComposer = new ManifestSchemaComposer({
                    logger: this.dependencies.logger
                });
            }
            this.enhancedValidator = new EnhancedSchemaValidator({
                logger: this.dependencies.logger,
                schemaComposer: this.dependencies.schemaComposer
            });
        }
        else {
            this.enhancedValidator = this.dependencies.enhancedValidator;
        }
    }
    async validateSchema(manifest) {
        this.dependencies.logger.debug('Validating manifest schema with enhanced validation');
        let result;
        try {
            // Use enhanced validator for comprehensive validation
            result = await this.enhancedValidator.validateManifest(manifest);
        }
        catch (err) {
            // Crash during composition/compile — safe to fall back
            this.dependencies.logger.warn(`Enhanced validation crashed; falling back to basic validation: ${err.message}`);
            await this.basicValidateSchema(manifest);
            return;
        }
        if (!result.valid) {
            // Generate detailed error report
            const errorReport = this.enhancedValidator.generateValidationReport(result);
            this.dependencies.logger.error('Enhanced schema validation failed', {
                errorCount: result.errors.length,
                warningCount: result.warnings.length,
                componentResults: result.componentValidationResults.length,
                detailedReport: errorReport
            });
            // DO NOT fall back here — surface the failure
            throw new Error(errorReport);
        }
        // Log warnings if any
        if (result.warnings.length > 0) {
            this.dependencies.logger.warn(`Schema validation completed with ${result.warnings.length} warnings`);
            for (const warning of result.warnings) {
                this.dependencies.logger.warn(`  - ${warning.path}: ${warning.message}`);
            }
        }
        // Log component validation summary
        const componentStats = result.componentValidationResults.reduce((stats, component) => {
            stats.total++;
            if (component.valid)
                stats.valid++;
            else
                stats.invalid++;
            return stats;
        }, { total: 0, valid: 0, invalid: 0 });
        this.dependencies.logger.debug('Enhanced schema validation completed successfully');
    }
    /**
     * Fallback basic schema validation using the original approach
     */
    async basicValidateSchema(manifest) {
        this.dependencies.logger.debug('Performing basic schema validation');
        // Get the base schema (dynamically composed)
        const schema = await this.dependencies.schemaManager.getBaseSchema();
        const validate = this.ajv.compile(schema);
        const valid = validate(manifest);
        if (!valid) {
            const errors = (validate.errors ?? []);
            // Use the enhanced error formatter for better developer experience
            const errorReport = SchemaErrorFormatter.generateErrorReport(errors);
            this.dependencies.logger.error('Basic schema validation failed', {
                errors: errors,
                formattedReport: errorReport
            });
            throw new Error(errorReport);
        }
        this.dependencies.logger.debug('Basic schema validation completed successfully');
    }
    /**
     * Get validation statistics and schema composition info
     */
    getValidationStats() {
        return {
            schemaStats: this.enhancedValidator.getSchemaStats(),
            validatorType: 'enhanced'
        };
    }
}
//# sourceMappingURL=schema-validator.js.map