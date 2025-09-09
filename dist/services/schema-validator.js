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
/**
 * Pure service for JSON Schema validation
 * Responsibility: Stage 2 - Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)
 */
class SchemaValidator {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this.ajv = new ajv_1.default({ allErrors: true, verbose: true });
        (0, ajv_formats_1.default)(this.ajv);
    }
    async validateSchema(manifest) {
        this.dependencies.logger.debug('Validating manifest schema');
        // Get the master schema (dynamically composed)
        const schema = await this.dependencies.schemaManager.getMasterSchema();
        const validate = this.ajv.compile(schema);
        const valid = validate(manifest);
        if (!valid) {
            const errors = validate.errors || [];
            const errorMessages = errors.map(error => {
                const path = error.instancePath || error.schemaPath || 'root';
                const message = error.message || 'validation failed';
                const data = error.data !== undefined ? ` (found: ${JSON.stringify(error.data)})` : '';
                return `  ${path}: ${message}${data}`;
            });
            const errorMsg = `Schema validation failed:\n${errorMessages.join('\n')}`;
            this.dependencies.logger.debug('Schema validation errors', errors);
            throw new Error(errorMsg);
        }
        // Validate required fields for AC-E1 (missing complianceFramework, etc.)
        const manifestObj = manifest;
        if (!manifestObj.service) {
            throw new Error('Missing required field: service');
        }
        if (!manifestObj.owner) {
            throw new Error('Missing required field: owner');
        }
        this.dependencies.logger.debug('Schema validation completed successfully');
    }
}
exports.SchemaValidator = SchemaValidator;
