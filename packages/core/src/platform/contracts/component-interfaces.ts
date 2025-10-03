/**
 * @platform/contracts - Shared interfaces and types
 * Core contracts used across all platform components and engines
 */

import { Construct } from 'constructs';
import type { IConstruct } from 'constructs';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import type {
  ComponentContext as BaseComponentContext,
  ComponentSpec as BaseComponentSpec,
  ComponentCapabilities as BaseComponentCapabilities
} from '@platform/contracts';
import type { BindingContext, BindingResult, IBinderStrategy } from './platform-binding-trigger-spec.ts';

// Re-export CDK types for convenience
export { Construct };
export type { IConstruct };
export type { IVpc };

// Re-export canonical binding interfaces
export type { BindingContext, BindingResult, IBinderStrategy };

/**
 * Component specification interface
 */
export interface ComponentSpec extends BaseComponentSpec {
  labels?: Record<string, string>;
  overrides?: Record<string, any>;
}

/**
 * Component capabilities interface
 */
export interface ComponentCapabilities extends BaseComponentCapabilities {}

/**
 * Feature flag provider reference configuration captured from manifests/config builders.
 */
export interface FeatureFlagProviderReference {
  name: string;
  clientName?: string;
  module?: string;
  exportName?: string;
  factory?: string;
  options?: Record<string, any>;
}

/**
 * Feature flag runtime configuration made available to components via context.
 */
export interface FeatureFlagRuntimeConfiguration {
  provider?: FeatureFlagProviderReference;
  defaultEvaluationContext?: Record<string, any>;
  targetingKey?: string;
  clientName?: string;
}

/**
 * Component context interface with strong CDK typing
 */
type BaseObservabilityContext = NonNullable<BaseComponentContext['observability']>;

export interface ComponentContext
  extends Omit<BaseComponentContext, 'scope' | 'vpc' | 'observability' | 'tags'> {
  scope: Construct;
  vpc?: IVpc;
  serviceLabels?: Record<string, string>;
  observability?: BaseObservabilityContext & {
    tracesSamplingRate?: number;
    metricsIntervalSeconds?: number;
    logsRetentionDays?: number;
    enableXRayTracing?: boolean;
    enablePerformanceInsights?: boolean;
    customAttributes?: Record<string, string>;
  };
  tags?: Record<string, string>;
  governance?: {
    backupRequired?: boolean;
    monitoringLevel?: string;
  };
  logging?: {
    classification?: string;
    auditRequired?: boolean;
    retentionDays?: number;
  };
  security?: {
    sensitiveKeys?: string[];
    sensitivePatterns?: string[];
    maskValue?: string;
    maxDepth?: number;
  };
  featureFlags?: FeatureFlagRuntimeConfiguration;
}


// BindingContext is now imported from platform-binding-trigger-spec

/**
 * Core component interface - The Public Contract
 * 
 * This is the lean, minimal contract that defines what it means to be a component.
 * The ResolverEngine, Binder strategies, and Platform Services depend on this interface.
 * Implements Interface Segregation Principle by separating contract from implementation.
 */
export interface IComponent extends IConstruct {
  /** The component's specification from the service manifest */
  readonly spec: ComponentSpec;

  /** The context of the service this component belongs to */
  readonly context: ComponentContext;

  /** The core synthesis method - creates AWS resources */
  synth(): void;

  /** Returns the machine-readable capabilities of the component */
  getCapabilities(): ComponentCapabilities;

  /** Returns the component's unique type identifier */
  getType(): string;

  /** Returns the component name */
  getName(): string;

  /** Returns the component ID */
  getId(): string;

  /** Returns the service name this component belongs to */
  getServiceName(): string;

  /** Returns the capability data for this component */
  getCapabilityData(): any;

  /** Retrieves a handle to a synthesized CDK construct */
  getConstruct(handle: string): IConstruct | undefined;

  /** Get security group handle for binding operations */
  _getSecurityGroupHandle(role: 'source' | 'target'): any;
}

// BindingResult is now imported from platform-binding-trigger-spec

/**
 * Component creator interface for Factory Method pattern
 */
export interface IComponentCreator {
  createComponent(spec: ComponentSpec, context: ComponentContext): IComponent;
  processComponent(spec: ComponentSpec, context: ComponentContext): IComponent;
}

/**
 * Component registry interface for managing component types
 */
export interface IComponentRegistry {
  register(type: string, creator: IComponentCreator): void;
  createComponent(spec: ComponentSpec, context: ComponentContext): IComponent;
  getSupportedTypes(): string[];
}

// IBinderStrategy is now imported from platform-binding-trigger-spec

/**
 * Component factory interface for Abstract Factory pattern
 */
export interface IComponentFactory {
  createRegistry(): IComponentRegistry;
  getSupportedComponents(): string[];
  getComplianceFramework(): string;
}

// Export base component classes and interfaces
export * from './component.ts';
