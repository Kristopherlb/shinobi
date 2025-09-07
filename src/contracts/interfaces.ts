/**
 * Core interfaces for the Component API Contract
 * 
 * These interfaces define the data structures and contracts that all
 * components must adhere to for consistent platform integration.
 */

/**
 * Component specification from the service.yml manifest.
 * This represents the developer's configuration for a component instance.
 */
export interface ComponentSpec {
  /** Unique name for this component instance within the service */
  name: string;
  
  /** Component type identifier (e.g., 'rds-postgres', 'lambda-api') */
  type: string;
  
  /** Component-specific configuration as defined by the component's schema */
  config?: Record<string, any>;
  
  /** Declarative bindings to other components */
  binds?: ComponentBinding[];
  
  /** Labels for this component instance */
  labels?: Record<string, string>;
  
  /** Fine-grained overrides for underlying resources */
  overrides?: ComponentOverrides;
  
  /** Component-specific policy and governance settings */
  policy?: ComponentPolicy;
}

/**
 * Context provided to components during synthesis.
 * Contains service-wide information needed for compliance and configuration.
 */
export interface ComponentContext {
  /** Environment identifier (e.g., 'dev', 'qa', 'prod') */
  environment: string;
  
  /** AWS region for deployment */
  region: string;
  
  /** AWS account ID */
  accountId: string;
  
  /** Service name from the manifest */
  serviceName: string;
  
  /** Compliance framework to apply */
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  
  /** Service-wide labels */
  serviceLabels?: Record<string, string>;
  
  /** Environment-specific configuration values */
  environmentConfig?: Record<string, any>;
}

/**
 * Capabilities that a component provides for binding.
 * Maps capability keys to their data shapes as defined in the Standard Capability Vocabulary.
 */
export interface ComponentCapabilities {
  [capabilityKey: string]: any;
}

/**
 * Binding directive from the service.yml manifest.
 * Defines how one component connects to another component's capability.
 */
export interface ComponentBinding {
  /** Target component name (mutually exclusive with select) */
  to?: string;
  
  /** Component selector for dynamic binding (mutually exclusive with to) */
  select?: ComponentSelector;
  
  /** Capability key from Standard Capability Vocabulary */
  capability: string;
  
  /** Access level required (read, write, readwrite, admin) */
  access: 'read' | 'write' | 'readwrite' | 'admin';
  
  /** Custom environment variable names for injected values */
  env?: Record<string, string>;
  
  /** Advanced, binder-specific options */
  options?: Record<string, any>;
}

/**
 * Component selector for dynamic binding.
 * Allows binding to components by type and labels rather than explicit names.
 */
export interface ComponentSelector {
  /** Component type to select */
  type: string;
  
  /** Labels that the target component must have */
  withLabels?: Record<string, string>;
  
  /** Additional selection criteria */
  where?: Record<string, any>;
}

/**
 * Component overrides configuration.
 * Allows developers to tune specific properties of underlying CDK constructs.
 */
export interface ComponentOverrides {
  /** Override values organized by construct handle and property path */
  [constructHandle: string]: {
    [propertyPath: string]: any;
  };
}

/**
 * Component policy and governance settings.
 * Defines security, compliance, and operational requirements.
 */
export interface ComponentPolicy {
  /** Security policy settings */
  security?: {
    /** Encryption requirements */
    encryption?: {
      atRest: boolean;
      inTransit: boolean;
      keyRotation?: boolean;
    };
    
    /** Network access controls */
    network?: {
      allowPublicAccess: boolean;
      requiredVpcId?: string;
      allowedCidrs?: string[];
    };
  };
  
  /** Backup and recovery requirements */
  backup?: {
    enabled: boolean;
    retentionDays?: number;
    crossRegionReplication?: boolean;
  };
  
  /** Monitoring and observability requirements */
  monitoring?: {
    metricsEnabled: boolean;
    logsRetentionDays?: number;
    alerting?: {
      enabled: boolean;
      targets?: string[];
    };
  };
  
  /** Cost management settings */
  cost?: {
    budget?: number;
    autoScaling?: boolean;
    scheduledShutdown?: boolean;
  };
}