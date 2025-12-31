/**
 * Platform Binding & Trigger Specification v1.0
 * Comprehensive specification for all component interactions, covering both
 * outbound connections (binds) and inbound, event-driven invocations (triggers).
 *
 * Status: Published
 * Last Updated: September 6, 2025
 */
/**
 * Standard capability vocabulary - defines the contract for component capabilities
 */
export const STANDARD_CAPABILITIES = {
    // Database capabilities
    'db:postgres': 'PostgreSQL database access',
    'db:mysql': 'MySQL database access',
    'db:redis': 'Redis cache access',
    // Storage capabilities
    'storage:s3': 'S3 bucket access',
    'storage:efs': 'EFS file system access',
    // Messaging capabilities
    'messaging:sns': 'SNS topic publishing',
    'messaging:sqs': 'SQS queue access',
    'messaging:eventbridge': 'EventBridge event handling',
    // Compute capabilities
    'compute:lambda': 'Lambda function invocation',
    'compute:ecs': 'ECS service access',
    // API capabilities
    'api:rest': 'REST API endpoint',
    'api:graphql': 'GraphQL API endpoint',
    'api:websocket': 'WebSocket API endpoint',
    // Security capabilities
    'security:secrets': 'Secrets Manager access',
    'security:kms': 'KMS key access',
    // Monitoring capabilities
    'monitoring:logs': 'CloudWatch Logs access',
    'monitoring:metrics': 'CloudWatch Metrics access',
    'monitoring:traces': 'X-Ray tracing access'
};
/**
 * Standard event types vocabulary
 */
export const STANDARD_EVENT_TYPES = {
    // Database events
    'database.change': 'Database record change event',
    'database.backup': 'Database backup completion event',
    // Storage events
    'object.created': 'Object created in storage',
    'object.deleted': 'Object deleted from storage',
    'object.modified': 'Object modified in storage',
    // API events
    'api.request': 'API request received',
    'api.response': 'API response sent',
    // System events
    'system.health': 'System health check event',
    'system.error': 'System error event',
    'system.alert': 'System alert event',
    // Custom events
    'custom.business': 'Custom business logic event',
    'custom.workflow': 'Custom workflow event'
};
/**
 * Binding and trigger validation utilities
 */
export class SpecificationValidator {
    static validateBindingDirective(directive) {
        const errors = [];
        if (!directive.capability) {
            errors.push('Capability is required for binding directive');
        }
        if (!directive.access) {
            errors.push('Access level is required for binding directive');
        }
        if (!directive.to && !directive.select) {
            errors.push('Either "to" or "select" must be specified for target selection');
        }
        if (directive.to && directive.select) {
            errors.push('Cannot specify both "to" and "select" for target selection');
        }
        return { valid: errors.length === 0, errors };
    }
    static validateTriggerDirective(directive) {
        const errors = [];
        if (!directive.eventType) {
            errors.push('Event type is required for trigger directive');
        }
        if (!directive.target) {
            errors.push('Target is required for trigger directive');
        }
        if (!directive.access) {
            errors.push('Access level is required for trigger directive');
        }
        if (!['invoke', 'publish', 'subscribe'].includes(directive.access)) {
            errors.push('Trigger access level must be one of: invoke, publish, subscribe');
        }
        return { valid: errors.length === 0, errors };
    }
}
//# sourceMappingURL=platform-binding-trigger-spec.js.map