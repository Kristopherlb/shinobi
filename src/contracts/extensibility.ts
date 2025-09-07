/**
 * Extensibility Contract
 * 
 * This file defines the official mechanisms for developers to customize
 * component behavior beyond the standard config through overrides and patches.
 */

import * as cdk from 'aws-cdk-lib';
import { Component } from './component';

/**
 * Override specification for fine-grained customization of CDK constructs.
 * 
 * Overrides allow developers to tune specific, non-critical properties of
 * underlying L2 constructs while maintaining platform compliance and security.
 */
export interface ComponentOverrideSpec {
  /** 
   * The construct handle to override (e.g., 'database', 'securityGroup').
   * This must be a handle registered by the component during synthesis.
   */
  handle: string;
  
  /** 
   * Property path to override using dot notation (e.g., 'instance.instanceClass').
   * Only properties on the component's allow-list can be overridden.
   */
  propertyPath: string;
  
  /** The new value for the property */
  value: any;
  
  /** Optional justification for the override (for audit purposes) */
  justification?: string;
}

/**
 * Override registry for a component type.
 * 
 * Components must define which properties can be safely overridden without
 * compromising security, compliance, or system stability.
 */
export interface ComponentOverrideRegistry {
  /** Component type this registry applies to */
  componentType: string;
  
  /** Map of construct handle to allowed override paths */
  allowedOverrides: {
    [constructHandle: string]: AllowedOverridePath[];
  };
}

/**
 * Definition of an allowed override path.
 */
export interface AllowedOverridePath {
  /** Property path in dot notation */
  path: string;
  
  /** Description of what this property controls */
  description: string;
  
  /** Type of values accepted for this property */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  
  /** Default value if not overridden */
  defaultValue?: any;
  
  /** Allowed values for enum-like properties */
  allowedValues?: any[];
  
  /** Validation function for complex property types */
  validator?: (value: any) => boolean;
  
  /** Warning message for potentially risky overrides */
  warning?: string;
}

/**
 * Override processor for applying validated overrides to CDK constructs.
 */
export interface OverrideProcessor {
  /**
   * Applies a set of overrides to a component after synthesis.
   * 
   * @param component The synthesized component
   * @param overrides Array of override specifications
   * @throws Error if any override is not allowed or fails validation
   */
  applyOverrides(
    component: Component,
    overrides: ComponentOverrideSpec[]
  ): void;
  
  /**
   * Validates that an override is allowed for the component type.
   * 
   * @param componentType The component type
   * @param override The override specification
   * @returns True if override is allowed
   */
  isOverrideAllowed(
    componentType: string,
    override: ComponentOverrideSpec
  ): boolean;
  
  /**
   * Gets the override registry for a component type.
   * 
   * @param componentType The component type
   * @returns The override registry or undefined if none exists
   */
  getOverrideRegistry(componentType: string): ComponentOverrideRegistry | undefined;
}

/**
 * Patch context provided to patch functions.
 * 
 * Patches provide a governed "escape hatch" for making structural changes
 * to the CDK construct tree that cannot be achieved through standard
 * configuration or overrides.
 */
export interface PatchContext {
  /** The CDK stack containing all components */
  stack: cdk.Stack;
  
  /** Map of component names to their instantiated Component objects */
  components: Map<string, Component>;
  
  /** Service-wide context */
  context: import('./interfaces').ComponentContext;
  
  /** Environment configuration values */
  environmentConfig: Record<string, any>;
}

/**
 * Patch function signature.
 * 
 * Patch functions are exported from patches.ts files and registered in
 * the service manifest's extensions.patches block.
 */
export type PatchFunction = (context: PatchContext) => void | Promise<void>;

/**
 * Patch registration in the service manifest.
 */
export interface PatchRegistration {
  /** Name of the patch function to execute */
  function: string;
  
  /** Human-readable description of what this patch does */
  description: string;
  
  /** Team or individual responsible for this patch */
  owner: string;
  
  /** 
   * Expiration date for this patch (ISO 8601 format).
   * Patches should be temporary solutions with migration plans to standard features.
   */
  expirationDate: string;
  
  /** 
   * Business justification for why this patch is necessary.
   * Required for audit and compliance purposes.
   */
  justification: string;
  
  /** 
   * Risk level assessment: low, medium, high.
   * Determines approval requirements and monitoring.
   */
  riskLevel: 'low' | 'medium' | 'high';
  
  /** 
   * Components affected by this patch.
   * Used for impact analysis and dependency tracking.
   */
  affectedComponents?: string[];
}

/**
 * Patch execution engine.
 * 
 * Handles loading, validation, and execution of patch functions with
 * proper error handling and audit logging.
 */
export interface PatchEngine {
  /**
   * Loads patch functions from the service's patches.ts file.
   * 
   * @param patchesFilePath Path to the patches.ts file
   * @returns Map of function names to patch functions
   */
  loadPatchFunctions(patchesFilePath: string): Promise<Map<string, PatchFunction>>;
  
  /**
   * Executes registered patches in the correct order.
   * 
   * @param patches Array of patch registrations from the manifest
   * @param context Patch execution context
   */
  executePatches(
    patches: PatchRegistration[],
    context: PatchContext
  ): Promise<void>;
  
  /**
   * Validates patch registrations for compliance and safety.
   * 
   * @param patches Array of patch registrations
   * @returns Validation results
   */
  validatePatchRegistrations(
    patches: PatchRegistration[]
  ): PatchValidationResult[];
  
  /**
   * Checks if any patches have expired and should be removed.
   * 
   * @param patches Array of patch registrations
   * @returns Array of expired patches
   */
  checkExpiredPatches(patches: PatchRegistration[]): PatchRegistration[];
}

/**
 * Patch validation result.
 */
export interface PatchValidationResult {
  /** The patch registration being validated */
  patch: PatchRegistration;
  
  /** Whether the patch registration is valid */
  valid: boolean;
  
  /** Validation errors if invalid */
  errors?: string[];
  
  /** Warnings for risky or deprecated patterns */
  warnings?: string[];
  
  /** Whether the patch has expired */
  expired: boolean;
}

/**
 * Extensions configuration from the service manifest.
 * 
 * Defines all extensibility mechanisms used by the service.
 */
export interface ExtensionsConfig {
  /** Patch registrations */
  patches?: PatchRegistration[];
  
  /** Custom override registries */
  overrideRegistries?: ComponentOverrideRegistry[];
  
  /** Custom validation rules */
  validation?: {
    /** Custom schema validators */
    schemas?: Record<string, string>;
    
    /** Custom policy validators */
    policies?: Record<string, string>;
  };
}

/**
 * Example override registry for RDS PostgreSQL component.
 * Demonstrates how components define their allowed override paths.
 */
export const RDS_POSTGRES_OVERRIDE_REGISTRY: ComponentOverrideRegistry = {
  componentType: 'rds-postgres',
  allowedOverrides: {
    'database': [
      {
        path: 'instance.instanceClass',
        description: 'EC2 instance class for the database',
        type: 'string',
        defaultValue: 'db.t3.micro',
        allowedValues: ['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.r5.large', 'db.r5.xlarge']
      },
      {
        path: 'instance.allocatedStorage',
        description: 'Initial storage allocation in GB',
        type: 'number',
        defaultValue: 20,
        validator: (value: number) => value >= 20 && value <= 65536
      },
      {
        path: 'instance.maxAllocatedStorage',
        description: 'Maximum storage for auto-scaling',
        type: 'number',
        validator: (value: number) => value >= 100 && value <= 65536
      },
      {
        path: 'instance.backupRetention',
        description: 'Backup retention period in days',
        type: 'number',
        defaultValue: 7,
        validator: (value: number) => value >= 1 && value <= 35,
        warning: 'Consider compliance requirements for backup retention'
      }
    ],
    'parameterGroup': [
      {
        path: 'parameters.shared_preload_libraries',
        description: 'PostgreSQL shared preload libraries',
        type: 'string',
        warning: 'Custom libraries may affect performance and security'
      }
    ]
  }
};