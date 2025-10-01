/**
 * Platform Binding & Trigger Specification v1.0
 * Comprehensive specification for all component interactions, covering both 
 * outbound connections (binds) and inbound, event-driven invocations (triggers).
 * 
 * Status: Published
 * Last Updated: September 6, 2025
 */

import { IComponent } from './component-interfaces.js';

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
} as const;

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
} as const;

/**
 * Binding and trigger validation utilities
 */
export class SpecificationValidator {
  static validateBindingDirective(directive: BindingDirective): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
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
  
  static validateTriggerDirective(directive: TriggerDirective): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
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