import { Logger } from '../platform/logger/src/index';
import { SchemaManager } from './schema-manager';
import { EnhancedSchemaValidator } from './enhanced-schema-validator';
import { ManifestSchemaComposer } from './manifest-schema-composer';
export interface SchemaValidatorDependencies {
    logger: Logger;
    schemaManager: SchemaManager;
    enhancedValidator?: EnhancedSchemaValidator;
    schemaComposer?: ManifestSchemaComposer;
}
/**
 * Pure service for JSON Schema validation
 * Responsibility: Stage 2 - Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)
 * Enhanced with comprehensive component-specific validation
 */
export declare class SchemaValidator {
    private dependencies;
    private ajv;
    private enhancedValidator;
    constructor(dependencies: SchemaValidatorDependencies);
    validateSchema(manifest: any): Promise<void>;
    /**
     * Fallback basic schema validation using the original approach
     */
    private basicValidateSchema;
    /**
     * Get validation statistics and schema composition info
     */
    getValidationStats(): any;
}
//# sourceMappingURL=schema-validator.d.ts.map