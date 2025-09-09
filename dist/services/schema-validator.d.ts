import { Logger } from '../utils/logger';
import { SchemaManager } from '../schemas/schema-manager';
export interface SchemaValidatorDependencies {
    logger: Logger;
    schemaManager: SchemaManager;
}
/**
 * Pure service for JSON Schema validation
 * Responsibility: Stage 2 - Schema Validation (AC-P2.1, AC-P2.2, AC-P2.3)
 */
export declare class SchemaValidator {
    private dependencies;
    private ajv;
    constructor(dependencies: SchemaValidatorDependencies);
    validateSchema(manifest: any): Promise<void>;
}
