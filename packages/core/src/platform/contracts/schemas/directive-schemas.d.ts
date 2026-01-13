/**
 * Directive Schema Definitions
 *
 * JSON Schema definitions for directive.options per capability type.
 * Also includes environment variable allow-lists per capability.
 *
 * SECURITY: These schemas prevent injection attacks by validating
 * all user-controlled input before binding execution.
 */
/**
 * Get JSON Schema for a capability's directive.options
 *
 * @param capability - Capability type (e.g., 's3:bucket', 'kms:key')
 * @returns JSON Schema for options validation, or undefined if no schema defined
 */
export declare function getDirectiveSchema(capability: string): any | undefined;
/**
 * Get environment variable allow-list for a capability
 *
 * @param capability - Capability type (e.g., 's3:bucket', 'kms:key')
 * @returns Array of allowed environment variable keys, or undefined if no allow-list defined
 */
export declare function getEnvAllowList(capability: string): string[] | undefined;
/**
 * Register a custom schema for a capability
 *
 * @param capability - Capability type
 * @param schema - JSON Schema for options validation
 */
export declare function registerDirectiveSchema(capability: string, schema: any): void;
/**
 * Register a custom environment variable allow-list for a capability
 *
 * @param capability - Capability type
 * @param allowList - Array of allowed environment variable keys
 */
export declare function registerEnvAllowList(capability: string, allowList: string[]): void;
//# sourceMappingURL=directive-schemas.d.ts.map