/**
 * Enhanced Schema Validator - Uses composed master schema for comprehensive validation
 * Provides detailed error reporting with JSON paths and component-specific validation
 */
import { Logger } from '../platform/logger/src/index.ts';
import { ManifestSchemaComposer } from './manifest-schema-composer.ts';
export interface EnhancedSchemaValidatorDependencies {
    logger: Logger;
    schemaComposer: ManifestSchemaComposer;
}
export interface ValidationError {
    path: string;
    message: string;
    rule: string;
    value?: any;
    allowedValues?: any[];
    componentType?: string;
    componentName?: string;
    severity: 'error' | 'warning';
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    componentValidationResults: ComponentValidationResult[];
}
export interface ComponentValidationResult {
    componentName: string;
    componentType: string;
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}
/**
 * Enhanced schema validator that uses the composed master schema
 * Provides detailed validation with component-specific configuration checking
 */
export declare class EnhancedSchemaValidator {
    private dependencies;
    private ajv;
    private masterSchema;
    private compiledMaster;
    private configValidators;
    constructor(dependencies: EnhancedSchemaValidatorDependencies);
    /**
     * Validate a manifest against the composed master schema
     */
    validateManifest(manifest: any): Promise<ValidationResult>;
    /**
     * Process raw AJV errors into structured validation errors
     */
    private processSchemaErrors;
    /**
     * Validate individual components with their specific schemas
     */
    private validateComponents;
    /**
     * Validate a single component
     */
    private validateComponent;
    /**
     * Validate component configuration against its specific schema
     */
    private validateComponentConfig;
    /**
     * Validate required fields for a component
     */
    private validateRequiredFields;
    /**
     * Locate component information from AJV instance path
     */
    private locateComponentFromInstancePath;
    /**
     * Format JSON path for better readability
     */
    private formatJsonPath;
    /**
     * Extract component type from validation path
     */
    private extractComponentTypeFromPath;
    /**
     * Determine error severity based on the validation rule
     */
    private determineErrorSeverity;
    /**
     * Generate a detailed validation report
     */
    generateValidationReport(result: ValidationResult): string;
    /**
     * Get schema composition statistics
     */
    getSchemaStats(): any;
}
//# sourceMappingURL=enhanced-schema-validator.d.ts.map