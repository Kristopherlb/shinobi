"use strict";
/**
 * Schema Error Formatter
 * Provides human-readable error messages for service.yml validation failures
 *
 * This utility transforms raw JSON Schema validation errors into clear,
 * actionable feedback that helps developers quickly understand and fix
 * issues in their service manifests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaErrorFormatter = void 0;
class SchemaErrorFormatter {
    static ERROR_MESSAGES = {
        // Required field errors
        'required': (error) => ({
            path: SchemaErrorFormatter.formatPath(error.instancePath),
            message: `Missing required field: ${error.params.missingProperty}`,
            suggestion: SchemaErrorFormatter.getRequiredFieldSuggestion(error.params.missingProperty),
            severity: 'error'
        }),
        // OneOf constraint errors (binding target enforcement)
        'oneOf': (error) => {
            if (error.instancePath.includes('/binds/')) {
                return {
                    path: SchemaErrorFormatter.formatPath(error.instancePath),
                    message: 'Binding target is ambiguous or invalid',
                    suggestion: 'Specify either "to" (direct component name) or "select" (component selector) to identify the target',
                    severity: 'error'
                };
            }
            return {
                path: SchemaErrorFormatter.formatPath(error.instancePath),
                message: 'Configuration does not match any valid pattern',
                suggestion: 'Check the documentation for valid configuration options',
                severity: 'error'
            };
        },
        // Array constraints
        'minItems': (error) => ({
            path: SchemaErrorFormatter.formatPath(error.instancePath),
            message: `Array must have at least ${error.params.limit} item(s)`,
            suggestion: SchemaErrorFormatter.getArraySuggestion(error.instancePath, error.params.limit),
            severity: 'error'
        }),
        'maxItems': (error) => ({
            path: SchemaErrorFormatter.formatPath(error.instancePath),
            message: `Array cannot have more than ${error.params.limit} item(s)`,
            suggestion: 'Remove excess items or consider splitting into multiple components',
            severity: 'error'
        }),
        // String constraints
        'pattern': (error) => ({
            path: SchemaErrorFormatter.formatPath(error.instancePath),
            message: `Invalid format for ${SchemaErrorFormatter.getFieldName(error.instancePath)}`,
            suggestion: SchemaErrorFormatter.getPatternSuggestion(error.instancePath, error.params.pattern),
            severity: 'error'
        }),
        'minLength': (error) => ({
            path: SchemaErrorFormatter.formatPath(error.instancePath),
            message: `${SchemaErrorFormatter.getFieldName(error.instancePath)} must be at least ${error.params.limit} characters`,
            suggestion: 'Provide a longer value',
            severity: 'error'
        }),
        'maxLength': (error) => ({
            path: SchemaErrorFormatter.formatPath(error.instancePath),
            message: `${SchemaErrorFormatter.getFieldName(error.instancePath)} cannot exceed ${error.params.limit} characters`,
            suggestion: 'Provide a shorter value',
            severity: 'error'
        }),
        // Enum constraints
        'enum': (error) => ({
            path: SchemaErrorFormatter.formatPath(error.instancePath),
            message: `Invalid value for ${SchemaErrorFormatter.getFieldName(error.instancePath)}`,
            suggestion: `Must be one of: ${error.params.allowedValues.join(', ')}`,
            severity: 'error'
        }),
        // Type constraints
        'type': (error) => ({
            path: SchemaErrorFormatter.formatPath(error.instancePath),
            message: `Invalid data type for ${SchemaErrorFormatter.getFieldName(error.instancePath)}`,
            suggestion: `Expected ${error.params.type}, got ${typeof error.data}`,
            severity: 'error'
        }),
        // Format constraints
        'format': (error) => ({
            path: SchemaErrorFormatter.formatPath(error.instancePath),
            message: `Invalid format for ${SchemaErrorFormatter.getFieldName(error.instancePath)}`,
            suggestion: SchemaErrorFormatter.getFormatSuggestion(error.params.format),
            severity: 'error'
        })
    };
    /**
     * Formats a list of JSON Schema validation errors into human-readable messages
     */
    static formatErrors(errors) {
        return errors.map(error => this.formatError(error));
    }
    /**
     * Formats a single JSON Schema validation error
     */
    static formatError(error) {
        const formatter = this.ERROR_MESSAGES[error.keyword];
        if (formatter) {
            return formatter(error);
        }
        // Fallback for unknown error types
        return {
            path: this.formatPath(error.instancePath),
            message: error.message || 'Validation error',
            suggestion: 'Check the documentation for valid configuration options',
            severity: 'error'
        };
    }
    /**
     * Formats a JSON Pointer path into a human-readable field path
     */
    static formatPath(instancePath) {
        if (!instancePath)
            return 'root';
        const segments = instancePath.split('/').filter(segment => segment !== '');
        const result = [];
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            // Convert array indices to more readable format
            if (/^\d+$/.test(segment)) {
                // If previous segment exists, append to it, otherwise start with bracket
                if (result.length > 0) {
                    result[result.length - 1] += `[${segment}]`;
                }
                else {
                    result.push(`[${segment}]`);
                }
            }
            else {
                result.push(segment);
            }
        }
        return result.join('.');
    }
    /**
     * Gets a human-readable field name from a path
     */
    static getFieldName(instancePath) {
        const segments = instancePath.split('/').filter(s => s !== '');
        const lastSegment = segments[segments.length - 1];
        if (/^\d+$/.test(lastSegment)) {
            return segments[segments.length - 2] || 'field';
        }
        return lastSegment || 'field';
    }
    /**
     * Provides specific suggestions for required field errors
     */
    static getRequiredFieldSuggestion(field) {
        const suggestions = {
            'service': 'Provide a unique service name (e.g., "user-api", "order-processor")',
            'owner': 'Specify the team or individual responsible for this service',
            'components': 'Define at least one infrastructure component',
            'name': 'Provide a unique name for this component within the service',
            'type': 'Specify the component type (e.g., "lambda-api", "rds-postgres", "s3-bucket")',
            'capability': 'Specify the target capability (e.g., "db:postgres", "storage:object", "api:rest")',
            'access': 'Specify the access level: "read", "write", "readwrite", or "admin"',
            'event': 'Specify the event that triggers the action (e.g., "objectCreated", "messageReceived")',
            'target': 'Specify the name of the target component to invoke'
        };
        return suggestions[field] || 'This field is required and cannot be empty';
    }
    /**
     * Provides specific suggestions for array constraint errors
     */
    static getArraySuggestion(path, minItems) {
        if (path.includes('/components')) {
            return `Define at least ${minItems} infrastructure component(s) for your service`;
        }
        if (path.includes('/binds')) {
            return `Define at least ${minItems} binding(s) to connect this component to others`;
        }
        if (path.includes('/triggers')) {
            return `Define at least ${minItems} trigger(s) for event-driven behavior`;
        }
        return `Add at least ${minItems} item(s) to this array`;
    }
    /**
     * Provides specific suggestions for pattern validation errors
     */
    static getPatternSuggestion(path, pattern) {
        if (path.includes('service') || path.includes('name')) {
            return 'Use lowercase letters, numbers, and hyphens only (e.g., "user-api", "order-processor")';
        }
        if (path.includes('capability')) {
            return 'Use format "category:type" (e.g., "db:postgres", "storage:object", "api:rest")';
        }
        return 'Check the pattern requirements in the documentation';
    }
    /**
     * Provides specific suggestions for format validation errors
     */
    static getFormatSuggestion(format) {
        const suggestions = {
            'date': 'Use ISO 8601 date format (YYYY-MM-DD)',
            'date-time': 'Use ISO 8601 datetime format (YYYY-MM-DDTHH:mm:ssZ)',
            'email': 'Use a valid email address format',
            'uri': 'Use a valid URI format',
            'hostname': 'Use a valid hostname format'
        };
        return suggestions[format] || 'Use the correct format as specified in the documentation';
    }
    /**
     * Generates a comprehensive error report with grouped errors
     * Supports both human-readable and machine-readable formats for CI/CD consumption
     */
    static generateErrorReport(errors, format = 'human') {
        const formattedErrors = this.formatErrors(errors);
        if (formattedErrors.length === 0) {
            return format === 'json'
                ? JSON.stringify({ valid: true, errors: [], summary: { errors: 0, warnings: 0 } })
                : '✅ Service manifest is valid!';
        }
        const errorCount = formattedErrors.filter(e => e.severity === 'error').length;
        const warningCount = formattedErrors.filter(e => e.severity === 'warning').length;
        if (format === 'json') {
            // Machine-readable format for CI/CD consumption
            const report = {
                valid: false,
                summary: {
                    errors: errorCount,
                    warnings: warningCount,
                    total: formattedErrors.length
                },
                errors: formattedErrors,
                groupedErrors: this.groupErrorsByPath(formattedErrors)
            };
            return JSON.stringify(report, null, 2);
        }
        // Human-readable format (default)
        let report = `❌ Service manifest validation failed:\n\n`;
        report += `📊 Summary: ${errorCount} error(s), ${warningCount} warning(s)\n\n`;
        // Group errors by path for better readability
        const groupedErrors = this.groupErrorsByPath(formattedErrors);
        for (const [path, pathErrors] of Object.entries(groupedErrors)) {
            report += `📍 ${path}:\n`;
            for (const error of pathErrors) {
                const icon = error.severity === 'error' ? '❌' : '⚠️';
                report += `  ${icon} ${error.message}\n`;
                report += `     💡 ${error.suggestion}\n`;
            }
            report += '\n';
        }
        return report;
    }
    /**
     * Groups errors by their path for better organization
     */
    static groupErrorsByPath(errors) {
        const grouped = {};
        for (const error of errors) {
            if (!grouped[error.path]) {
                grouped[error.path] = [];
            }
            grouped[error.path].push(error);
        }
        return grouped;
    }
}
exports.SchemaErrorFormatter = SchemaErrorFormatter;
