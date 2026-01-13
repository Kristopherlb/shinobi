/**
 * Directive Schema Validator
 *
 * Validates binding directives before execution to prevent injection attacks
 * and ensure type safety. Validates:
 * - directive.options against capability-specific JSON schemas
 * - directive.env against allow-list of permitted keys
 * - Rejects unknown keys in options
 * - Deep freezes directive after validation
 *
 * SECURITY: This validator is critical for preventing directive injection attacks.
 * All directives must be validated before binding execution.
 */
import type { BindingDirective } from './platform-binding-trigger-spec.js';
/**
 * Validation error for directive schema validation failures
 */
export declare class DirectiveValidationError extends Error {
    readonly errors: Array<{
        path: string;
        message: string;
    }>;
    constructor(errors: Array<{
        path: string;
        message: string;
    }>, message?: string);
}
/**
 * Directive Schema Validator
 *
 * Validates binding directives against capability-specific schemas
 * and environment variable allow-lists.
 */
export declare class DirectiveSchemaValidator {
    /**
     * Validate a binding directive
     *
     * @param directive - Binding directive to validate
     * @param capability - Target capability (e.g., 's3:bucket', 'kms:key')
     * @returns Validated and frozen directive
     * @throws DirectiveValidationError if validation fails
     */
    static validate(directive: BindingDirective, capability: string): BindingDirective;
    /**
     * Check if an environment variable name is sensitive and should be blocked
     *
     * @param key - Environment variable key
     * @returns True if the variable is sensitive and should be blocked
     */
    private static isSensitiveEnvVar;
    /**
     * Deep freeze an object to prevent tampering
     *
     * @param obj - Object to freeze
     * @returns Frozen object
     */
    private static deepFreeze;
}
//# sourceMappingURL=directive-schema-validator.d.ts.map