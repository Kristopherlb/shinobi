"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidator = void 0;
/**
 * Schema Validator Service - Single responsibility for JSON Schema validation
 * Implements Principle 4: Single Responsibility Principle
 */
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const schema_error_formatter_1 = require("./schema-error-formatter");
/**
 * Pure service for JSON Schema validation
 * Responsibility: Stage 2 - Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)
 */
class SchemaValidator {
    dependencies;
    ajv;
    constructor(dependencies) {
        this.dependencies = dependencies;
        this.ajv = new ajv_1.default({ allErrors: true, verbose: true });
        (0, ajv_formats_1.default)(this.ajv);
    }
    async validateSchema(manifest) {
        this.dependencies.logger.debug('Validating manifest schema');
        // Get the base schema (dynamically composed)
        const schema = await this.dependencies.schemaManager.getBaseSchema();
        const validate = this.ajv.compile(schema);
        const valid = validate(manifest);
        if (!valid) {
            const errors = validate.errors || [];
            // Use the enhanced error formatter for better developer experience
            const errorReport = schema_error_formatter_1.SchemaErrorFormatter.generateErrorReport(errors);
            this.dependencies.logger.error('Schema validation failed', {
                errors: errors,
                formattedReport: errorReport
            });
            throw new Error(errorReport);
        }
        // Schema validation handles all required field checks
        // Manual field validation removed - JSON Schema is the single source of truth
        this.dependencies.logger.debug('Schema validation completed successfully');
    }
}
exports.SchemaValidator = SchemaValidator;
