/**
 * Platform Binding & Trigger Specification v1.0
 * Comprehensive specification for all component interactions, covering both
 * outbound connections (binds) and inbound, event-driven invocations (triggers).
 *
 * Status: Published
 * Last Updated: September 6, 2025
 */
import { IComponent } from './component-interfaces.js';
import type { IamPolicy, SecurityGroupRule, ComplianceAction } from './bindings.js';
import type { ComplianceViolation } from './compliance/compliance-violation.js';
/**
 * Fundamental interaction types in the platform
 */
export type InteractionType = 'binding' | 'trigger';
/**
 * Access levels for component interactions
 */
export type AccessLevel = 'read' | 'write' | 'readwrite' | 'admin' | 'invoke' | 'publish' | 'subscribe';
/**
 * Target selection modes for component connections
 */
export interface ComponentSelector {
    /** Direct reference to specific component by name */
    to?: string;
    /** Selection by component type and optional labels */
    select?: {
        type: string;
        withLabels?: Record<string, string>;
    };
}
/**
 * Part A: The binds Directive (Compute-to-Resource)
 * Outbound, synchronous-style connections where a compute component
 * needs permission to access a target resource.
 */
export interface BindingDirective extends ComponentSelector {
    /** The capability being requested from the target component */
    capability: string;
    /** Access level required for the binding */
    access: Exclude<AccessLevel, 'invoke' | 'publish' | 'subscribe'>;
    /** Optional granular IAM actions override. If provided, replaces the actions from the coarse access level.
     * Can be either a string (action profile name) or array of action strings (e.g., ['sqs:ReceiveMessage', 'sqs:DeleteMessage']).
     * Profile names are resolved from framework-specific config files.
     */
    actions?: string | string[];
    /** Custom environment variable mappings */
    env?: Record<string, string>;
    /** Additional binding options */
    options?: Record<string, any>;
    /** Binding-specific metadata */
    metadata?: {
        description?: string;
        tags?: Record<string, string>;
    };
}
/**
 * Part B: The triggers Directive (Resource-to-Compute)
 * Inbound, asynchronous, event-driven connections where a resource
 * event invokes another component.
 */
export interface TriggerDirective extends ComponentSelector {
    /** The event type that triggers the invocation */
    eventType: string;
    /** Target component that will be invoked */
    target: ComponentSelector;
    /** Access level for the trigger invocation */
    access: Extract<AccessLevel, 'invoke' | 'publish' | 'subscribe'>;
    /** Event filtering configuration */
    filter?: {
        /** Event source patterns */
        source?: string[];
        /** Event detail patterns */
        detail?: Record<string, any>;
        /** Custom filter expressions */
        expressions?: string[];
    };
    /** Trigger transformation configuration */
    transform?: {
        /** Input transformation mappings */
        input?: Record<string, string>;
        /** Output transformation mappings */
        output?: Record<string, string>;
    };
    /** Trigger-specific options */
    options?: {
        /** Retry configuration */
        retry?: {
            maxAttempts?: number;
            backoffStrategy?: 'linear' | 'exponential';
        };
        /** Dead letter queue configuration */
        deadLetter?: {
            enabled: boolean;
            maxRetries?: number;
        };
        /** Batching configuration for batch triggers */
        batching?: {
            size?: number;
            window?: number;
        };
    };
    /** Trigger-specific metadata */
    metadata?: {
        description?: string;
        tags?: Record<string, string>;
    };
}
/**
 * Enhanced Component Specification to support binds and triggers
 */
export interface ExtendedComponentSpec {
    name: string;
    type: string;
    config: Record<string, any>;
    /** Outbound connections (binds) */
    binds?: BindingDirective[];
    /** Inbound event-driven invocations (triggers) */
    triggers?: TriggerDirective[];
    labels?: Record<string, string>;
    overrides?: Record<string, any>;
    policy?: Record<string, any>;
}
/**
 * Context for binding operations
 */
export interface BindingContext {
    source: IComponent;
    target: IComponent;
    directive: BindingDirective;
    environment: string;
    complianceFramework: string;
}
/**
 * Context for trigger operations
 */
export interface TriggerContext {
    source: IComponent;
    target: IComponent;
    directive: TriggerDirective;
    environment: string;
    complianceFramework: string;
}
/**
 * Result of binding operations
 *
 * Updated to follow Direct Composition pattern - binders now modify
 * CDK constructs directly instead of returning configuration objects.
 */
export interface BindingResult {
    environmentVariables: Record<string, string>;
    metadata?: Record<string, any>;
}
/**
 * Enhanced binding result with mandatory compliance validation
 *
 * Extends the base BindingResult with structured compliance reporting,
 * IAM policies, security group rules, and mandatory compliance status.
 * All bindings must return this structure with populated compliance block.
 */
export interface EnhancedBindingResult {
    environmentVariables: Record<string, string>;
    iamPolicies: Array<IamPolicy>;
    securityGroupRules: Array<SecurityGroupRule>;
    compliance: {
        status: 'compliant' | 'non-compliant' | 'partially-compliant';
        framework: string;
        actionsTaken: ComplianceAction[];
        violations?: ComplianceViolation[];
    };
    metrics?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}
/**
 * Compliance error thrown when binding fails compliance validation
 */
export declare class ComplianceError extends Error {
    readonly violations: ComplianceViolation[];
    constructor(violations: ComplianceViolation[], message?: string);
}
/**
 * Result of trigger operations
 */
export interface TriggerResult {
    triggerConfiguration: {
        eventSourceArn?: string;
        eventPattern?: Record<string, any>;
        targetArn: string;
    };
    iamPolicies?: string[];
    environmentVariables?: Record<string, string>;
    metadata?: Record<string, any>;
}
/**
 * Binder strategy interface for handling outbound connections
 *
 * This is the base interface. For new implementations, use IUnifiedBinderStrategy
 * which extends this interface with compliance enforcement and enhanced results.
 */
export interface IBinderStrategy {
    canHandle(sourceType: string, targetCapability: string): boolean;
    bind(context: BindingContext): BindingResult;
    getCompatibilityMatrix(): CompatibilityEntry[];
}
/**
 * Trigger strategy interface for handling inbound event-driven connections
 */
export interface ITriggerStrategy {
    canHandle(sourceType: string, targetType: string, eventType: string): boolean;
    trigger(context: TriggerContext): TriggerResult;
    getCompatibilityMatrix(): TriggerCompatibilityEntry[];
}
/**
 * Unified Binder Strategy Interface
 *
 * The canonical interface for all binder strategies with mandatory compliance enforcement.
 * This interface implements the same contract as IBinderStrategy but with async bind()
 * and enhanced results. It does not extend IBinderStrategy due to incompatible bind()
 * signatures (sync vs async).
 *
 * Key features:
 * - Mandatory compliance validation based on context.complianceFramework
 * - Enhanced binding results with structured compliance reporting
 * - Compatibility matrix support
 * - Config-driven compliance (no framework branching in code)
 *
 * @see IBinderStrategy - Base interface (preserved for reference, sync bind)
 */
export interface IUnifiedBinderStrategy {
    /**
     * Capabilities this strategy supports - used for registry-level filtering
     */
    readonly supportedCapabilities: string[];
    /**
     * Check if this strategy can handle the given source type and capability
     * @param sourceType - Type of the source component
     * @param targetCapability - Target capability type
     * @returns true if this strategy can handle the binding
     */
    canHandle(sourceType: string, targetCapability: string): boolean;
    /**
     * Performs the binding with mandatory compliance enforcement.
     * Compliance rules are selected based on context.complianceFramework
     * (e.g., 'fedramp-moderate', 'fedramp-high', 'hipaa') — NO hard-coded branching.
     *
     * @param context - Binding context with source, target, directive, and compliance framework
     * @returns Promise resolving to enhanced binding result with compliance validation
     */
    bind(context: BindingContext): Promise<EnhancedBindingResult>;
    /**
     * Get compatibility matrix entries for this strategy
     * @returns Array of compatibility entries
     */
    getCompatibilityMatrix(): CompatibilityEntry[];
}
/**
 * Compatibility matrix entry for binding strategies
 */
export interface CompatibilityEntry {
    sourceType: string;
    targetType: string;
    capability: string;
    supportedAccess: AccessLevel[];
    description: string;
    examples?: string[];
}
/**
 * Compatibility matrix entry for trigger strategies
 */
export interface TriggerCompatibilityEntry {
    sourceType: string;
    targetType: string;
    eventType: string;
    supportedAccess: Extract<AccessLevel, 'invoke' | 'publish' | 'subscribe'>[];
    description: string;
    examples?: string[];
}
/**
 * The Binder Matrix - Central registry for all supported component interactions
 */
export interface IBinderMatrix {
    /** Register a binding strategy */
    registerBindingStrategy(strategy: IBinderStrategy): void;
    /** Register a trigger strategy */
    registerTriggerStrategy(strategy: ITriggerStrategy): void;
    /** Find compatible binding strategy */
    findBindingStrategy(sourceType: string, targetCapability: string): IBinderStrategy | null;
    /** Find compatible trigger strategy */
    findTriggerStrategy(sourceType: string, targetType: string, eventType: string): ITriggerStrategy | null;
    /** Get all supported bindings for a source type */
    getSupportedBindings(sourceType: string): CompatibilityEntry[];
    /** Get all supported triggers for a source type */
    getSupportedTriggers(sourceType: string): TriggerCompatibilityEntry[];
    /** Get full compatibility matrix */
    getFullCompatibilityMatrix(): {
        bindings: CompatibilityEntry[];
        triggers: TriggerCompatibilityEntry[];
    };
}
/**
 * Standard capability vocabulary - defines the contract for component capabilities
 */
export declare const STANDARD_CAPABILITIES: {
    readonly 'db:postgres': "PostgreSQL database access";
    readonly 'db:mysql': "MySQL database access";
    readonly 'db:redis': "Redis cache access";
    readonly 'storage:s3': "S3 bucket access";
    readonly 'storage:efs': "EFS file system access";
    readonly 'messaging:sns': "SNS topic publishing";
    readonly 'messaging:sqs': "SQS queue access";
    readonly 'messaging:eventbridge': "EventBridge event handling";
    readonly 'compute:lambda': "Lambda function invocation";
    readonly 'compute:ecs': "ECS service access";
    readonly 'api:rest': "REST API endpoint";
    readonly 'api:graphql': "GraphQL API endpoint";
    readonly 'api:websocket': "WebSocket API endpoint";
    readonly 'security:secrets': "Secrets Manager access";
    readonly 'security:kms': "KMS key access";
    readonly 'monitoring:logs': "CloudWatch Logs access";
    readonly 'monitoring:metrics': "CloudWatch Metrics access";
    readonly 'monitoring:traces': "X-Ray tracing access";
};
/**
 * Standard event types vocabulary
 */
export declare const STANDARD_EVENT_TYPES: {
    readonly 'database.change': "Database record change event";
    readonly 'database.backup': "Database backup completion event";
    readonly 'object.created': "Object created in storage";
    readonly 'object.deleted': "Object deleted from storage";
    readonly 'object.modified': "Object modified in storage";
    readonly 'api.request': "API request received";
    readonly 'api.response': "API response sent";
    readonly 'system.health': "System health check event";
    readonly 'system.error': "System error event";
    readonly 'system.alert': "System alert event";
    readonly 'custom.business': "Custom business logic event";
    readonly 'custom.workflow': "Custom workflow event";
};
/**
 * Binding and trigger validation utilities
 */
export declare class SpecificationValidator {
    static validateBindingDirective(directive: BindingDirective): {
        valid: boolean;
        errors: string[];
    };
    static validateTriggerDirective(directive: TriggerDirective): {
        valid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=platform-binding-trigger-spec.d.ts.map