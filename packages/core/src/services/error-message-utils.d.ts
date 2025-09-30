/**
 * Standardized Error Message Utilities
 *
 * Provides consistent error message formatting across all platform services
 * following the Platform Error Standard v1.0
 *
 * @fileoverview Standardized error message utilities for consistent error reporting
 */
/**
 * Error categories for consistent error handling
 */
export declare enum ErrorCategory {
    VALIDATION = "VALIDATION",
    SECURITY = "SECURITY",
    CONFIGURATION = "CONFIGURATION",
    FILE_SYSTEM = "FILE_SYSTEM",
    NETWORK = "NETWORK",
    INTERNAL = "INTERNAL"
}
/**
 * Error severity levels
 */
export declare enum ErrorSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
/**
 * Standardized error message structure
 */
export interface StandardError {
    category: ErrorCategory;
    severity: ErrorSeverity;
    code: string;
    message: string;
    details?: Record<string, any>;
    suggestion?: string;
}
/**
 * Creates a standardized error message
 * @param category Error category
 * @param severity Error severity
 * @param code Unique error code
 * @param message Human-readable error message
 * @param details Additional error details
 * @param suggestion Suggested remediation
 * @returns Formatted error message string
 */
export declare function createStandardError(category: ErrorCategory, severity: ErrorSeverity, code: string, message: string, details?: Record<string, any>, suggestion?: string): string;
/**
 * Common error codes for platform services
 */
export declare const ErrorCodes: {
    readonly INVALID_YAML_SYNTAX: "INVALID_YAML_SYNTAX";
    readonly INVALID_MANIFEST_STRUCTURE: "INVALID_MANIFEST_STRUCTURE";
    readonly MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD";
    readonly INVALID_ENVIRONMENT: "INVALID_ENVIRONMENT";
    readonly INVALID_DATE_FORMAT: "INVALID_DATE_FORMAT";
    readonly CIRCULAR_REFERENCE: "CIRCULAR_REFERENCE";
    readonly PATH_TRAVERSAL_ATTEMPT: "PATH_TRAVERSAL_ATTEMPT";
    readonly SYSTEM_DIRECTORY_ACCESS: "SYSTEM_DIRECTORY_ACCESS";
    readonly UNAUTHORIZED_FILE_ACCESS: "UNAUTHORIZED_FILE_ACCESS";
    readonly CONFIG_LOAD_FAILED: "CONFIG_LOAD_FAILED";
    readonly SCHEMA_NOT_LOADED: "SCHEMA_NOT_LOADED";
    readonly UNSUPPORTED_FILE_FORMAT: "UNSUPPORTED_FILE_FORMAT";
    readonly FILE_NOT_FOUND: "FILE_NOT_FOUND";
    readonly FILE_READ_FAILED: "FILE_READ_FAILED";
    readonly MANIFEST_NOT_FOUND: "MANIFEST_NOT_FOUND";
    readonly COMPONENT_REFERENCE_ERROR: "COMPONENT_REFERENCE_ERROR";
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
};
/**
 * Pre-built error message creators for common scenarios
 */
export declare const ErrorMessages: {
    readonly invalidYamlSyntax: (filePath: string, originalError: string) => string;
    readonly invalidManifestStructure: (reason: string) => string;
    readonly missingRequiredField: (field: string, context: string) => string;
    readonly invalidEnvironment: (environment: string) => string;
    readonly circularReference: (refPath: string) => string;
    readonly pathTraversalAttempt: (path: string, service: string) => string;
    readonly systemDirectoryAccess: (path: string, service: string) => string;
    readonly unauthorizedFileAccess: (refPath: string) => string;
    readonly configLoadFailed: (configPath: string, originalError: string) => string;
    readonly schemaNotLoaded: () => string;
    readonly unsupportedFileFormat: (refPath: string, supportedFormats: string[]) => string;
    readonly fileNotFound: (filePath: string, context: string) => string;
    readonly fileReadFailed: (filePath: string, originalError: string) => string;
    readonly manifestNotFound: () => string;
    readonly componentReferenceError: (componentName: string, context: string) => string;
    readonly validationFailed: (errorReport: string) => string;
};
//# sourceMappingURL=error-message-utils.d.ts.map