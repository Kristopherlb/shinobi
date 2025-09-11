/**
 * Schema Error Formatter
 * Provides human-readable error messages for service.yml validation failures
 *
 * This utility transforms raw JSON Schema validation errors into clear,
 * actionable feedback that helps developers quickly understand and fix
 * issues in their service manifests.
 */
import { ErrorObject } from 'ajv';
export interface FormattedError {
    path: string;
    message: string;
    suggestion: string;
    severity: 'error' | 'warning';
}
export declare class SchemaErrorFormatter {
    private static readonly ERROR_MESSAGES;
    /**
     * Formats a list of JSON Schema validation errors into human-readable messages
     */
    static formatErrors(errors: ErrorObject[]): FormattedError[];
    /**
     * Formats a single JSON Schema validation error
     */
    private static formatError;
    /**
     * Formats a JSON Pointer path into a human-readable field path
     */
    private static formatPath;
    /**
     * Gets a human-readable field name from a path
     */
    private static getFieldName;
    /**
     * Provides specific suggestions for required field errors
     */
    private static getRequiredFieldSuggestion;
    /**
     * Provides specific suggestions for array constraint errors
     */
    private static getArraySuggestion;
    /**
     * Provides specific suggestions for pattern validation errors
     */
    private static getPatternSuggestion;
    /**
     * Provides specific suggestions for format validation errors
     */
    private static getFormatSuggestion;
    /**
     * Generates a comprehensive error report with grouped errors
     * Supports both human-readable and machine-readable formats for CI/CD consumption
     */
    static generateErrorReport(errors: ErrorObject[], format?: 'human' | 'json'): string;
    /**
     * Groups errors by their path for better organization
     */
    private static groupErrorsByPath;
}
