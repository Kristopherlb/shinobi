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
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  SECURITY = 'SECURITY',
  CONFIGURATION = 'CONFIGURATION',
  FILE_SYSTEM = 'FILE_SYSTEM',
  NETWORK = 'NETWORK',
  INTERNAL = 'INTERNAL'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
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
export function createStandardError(
  category: ErrorCategory,
  severity: ErrorSeverity,
  code: string,
  message: string,
  details?: Record<string, any>,
  suggestion?: string
): string {
  const error: StandardError = {
    category,
    severity,
    code,
    message,
    ...(details && { details }),
    ...(suggestion && { suggestion })
  };

  return `[${category}:${severity}] ${code}: ${message}${details ? ` | Details: ${JSON.stringify(details)}` : ''}${suggestion ? ` | Suggestion: ${suggestion}` : ''}`;
}

/**
 * Common error codes for platform services
 */
export const ErrorCodes = {
  // Validation errors
  INVALID_YAML_SYNTAX: 'INVALID_YAML_SYNTAX',
  INVALID_MANIFEST_STRUCTURE: 'INVALID_MANIFEST_STRUCTURE',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_ENVIRONMENT: 'INVALID_ENVIRONMENT',
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
  CIRCULAR_REFERENCE: 'CIRCULAR_REFERENCE',

  // Security errors
  PATH_TRAVERSAL_ATTEMPT: 'PATH_TRAVERSAL_ATTEMPT',
  SYSTEM_DIRECTORY_ACCESS: 'SYSTEM_DIRECTORY_ACCESS',
  UNAUTHORIZED_FILE_ACCESS: 'UNAUTHORIZED_FILE_ACCESS',

  // Configuration errors
  CONFIG_LOAD_FAILED: 'CONFIG_LOAD_FAILED',
  SCHEMA_NOT_LOADED: 'SCHEMA_NOT_LOADED',
  UNSUPPORTED_FILE_FORMAT: 'UNSUPPORTED_FILE_FORMAT',

  // File system errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_READ_FAILED: 'FILE_READ_FAILED',
  MANIFEST_NOT_FOUND: 'MANIFEST_NOT_FOUND',

  // Internal errors
  COMPONENT_REFERENCE_ERROR: 'COMPONENT_REFERENCE_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED'
} as const;

/**
 * Pre-built error message creators for common scenarios
 */
export const ErrorMessages = {
  // Validation errors
  invalidYamlSyntax: (filePath: string, originalError: string) =>
    createStandardError(
      ErrorCategory.VALIDATION,
      ErrorSeverity.HIGH,
      ErrorCodes.INVALID_YAML_SYNTAX,
      `Invalid YAML syntax in file: ${filePath}`,
      { filePath, originalError },
      'Check YAML syntax and ensure proper indentation and formatting'
    ),

  invalidManifestStructure: (reason: string) =>
    createStandardError(
      ErrorCategory.VALIDATION,
      ErrorSeverity.HIGH,
      ErrorCodes.INVALID_MANIFEST_STRUCTURE,
      `Invalid manifest structure: ${reason}`,
      { reason },
      'Ensure manifest follows the required schema structure'
    ),

  missingRequiredField: (field: string, context: string) =>
    createStandardError(
      ErrorCategory.VALIDATION,
      ErrorSeverity.HIGH,
      ErrorCodes.MISSING_REQUIRED_FIELD,
      `Missing required field '${field}' in ${context}`,
      { field, context },
      'Add the missing required field to complete the configuration'
    ),

  invalidEnvironment: (environment: string) =>
    createStandardError(
      ErrorCategory.VALIDATION,
      ErrorSeverity.HIGH,
      ErrorCodes.INVALID_ENVIRONMENT,
      `Environment "${environment}" not defined in manifest`,
      { environment },
      'Define the environment in the manifest or use a valid environment name'
    ),

  circularReference: (refPath: string) =>
    createStandardError(
      ErrorCategory.VALIDATION,
      ErrorSeverity.HIGH,
      ErrorCodes.CIRCULAR_REFERENCE,
      `Circular reference detected: ${refPath}`,
      { refPath },
      'Remove the circular dependency in your configuration references'
    ),

  // Security errors
  pathTraversalAttempt: (path: string, service: string) =>
    createStandardError(
      ErrorCategory.SECURITY,
      ErrorSeverity.CRITICAL,
      ErrorCodes.PATH_TRAVERSAL_ATTEMPT,
      `Security violation: Path "${path}" contains directory traversal characters`,
      { path, service },
      'Use relative paths within the project directory only'
    ),

  systemDirectoryAccess: (path: string, service: string) =>
    createStandardError(
      ErrorCategory.SECURITY,
      ErrorSeverity.CRITICAL,
      ErrorCodes.SYSTEM_DIRECTORY_ACCESS,
      `Security violation: Path "${path}" attempts to access system directories`,
      { path, service },
      'Restrict file access to project directories only'
    ),

  unauthorizedFileAccess: (refPath: string) =>
    createStandardError(
      ErrorCategory.SECURITY,
      ErrorSeverity.CRITICAL,
      ErrorCodes.UNAUTHORIZED_FILE_ACCESS,
      `Security violation: $ref path "${refPath}" attempts to access files outside the service repository`,
      { refPath },
      'Use relative paths within the project directory only'
    ),

  // Configuration errors
  configLoadFailed: (configPath: string, originalError: string) =>
    createStandardError(
      ErrorCategory.CONFIGURATION,
      ErrorSeverity.HIGH,
      ErrorCodes.CONFIG_LOAD_FAILED,
      `Failed to load configuration from ${configPath}`,
      { configPath, originalError },
      'Verify the configuration file exists and is accessible'
    ),

  schemaNotLoaded: () =>
    createStandardError(
      ErrorCategory.CONFIGURATION,
      ErrorSeverity.HIGH,
      ErrorCodes.SCHEMA_NOT_LOADED,
      'Schema not loaded. Call loadSchema() first',
      {},
      'Initialize the schema before performing validation'
    ),

  unsupportedFileFormat: (refPath: string, supportedFormats: string[]) =>
    createStandardError(
      ErrorCategory.CONFIGURATION,
      ErrorSeverity.MEDIUM,
      ErrorCodes.UNSUPPORTED_FILE_FORMAT,
      `Unsupported file format for $ref: ${refPath}`,
      { refPath, supportedFormats },
      `Use one of the supported formats: ${supportedFormats.join(', ')}`
    ),

  // File system errors
  fileNotFound: (filePath: string, context: string) =>
    createStandardError(
      ErrorCategory.FILE_SYSTEM,
      ErrorSeverity.HIGH,
      ErrorCodes.FILE_NOT_FOUND,
      `File not found: ${filePath}`,
      { filePath, context },
      'Verify the file exists and the path is correct'
    ),

  fileReadFailed: (filePath: string, originalError: string) =>
    createStandardError(
      ErrorCategory.FILE_SYSTEM,
      ErrorSeverity.HIGH,
      ErrorCodes.FILE_READ_FAILED,
      `Failed to read file: ${filePath}`,
      { filePath, originalError },
      'Check file permissions and ensure the file is not corrupted'
    ),

  manifestNotFound: () =>
    createStandardError(
      ErrorCategory.FILE_SYSTEM,
      ErrorSeverity.MEDIUM,
      ErrorCodes.MANIFEST_NOT_FOUND,
      'No service.yml or service.yaml manifest file found in this project directory or its parents',
      {},
      'Create a service.yml file in your project root or run from the correct directory'
    ),

  // Internal errors
  componentReferenceError: (componentName: string, context: string) =>
    createStandardError(
      ErrorCategory.INTERNAL,
      ErrorSeverity.HIGH,
      ErrorCodes.COMPONENT_REFERENCE_ERROR,
      `Reference to non-existent component '${componentName}' in ${context}`,
      { componentName, context },
      'Verify the component exists and is properly defined'
    ),

  validationFailed: (errorReport: string) =>
    createStandardError(
      ErrorCategory.INTERNAL,
      ErrorSeverity.HIGH,
      ErrorCodes.VALIDATION_FAILED,
      'Validation failed',
      { errorReport },
      'Review the validation errors and fix the configuration issues'
    )
} as const;
