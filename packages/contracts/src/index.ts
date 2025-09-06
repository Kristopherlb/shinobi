/**
 * @platform/contracts - Shared interfaces and types
 * Core contracts used across all platform components and engines
 */

import { Construct, IConstruct } from 'constructs';
import { IVpc } from 'aws-cdk-lib/aws-ec2';

// Re-export CDK types for convenience
export { Construct, IConstruct };
export { IVpc };

/**
 * Component specification interface
 */
export interface ComponentSpec {
  name: string;
  type: string;
  config: Record<string, any>;
  binds?: Array<any>;
  labels?: Record<string, string>;
  overrides?: Record<string, any>;
  policy?: Record<string, any>;
}

/**
 * Component capabilities interface
 */
export interface ComponentCapabilities {
  [key: string]: {
    [field: string]: any;
  };
}

/**
 * Component context interface with strong CDK typing
 */
export interface ComponentContext {
  serviceName: string;
  environment: string;
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  scope: Construct; // CDK Construct scope - strongly typed
  vpc?: IVpc; // VPC construct for components that need it - strongly typed
  region?: string;
  accountId?: string;
}

/**
 * Base component interface that all concrete components must implement
 */
export interface IComponent {
  spec: ComponentSpec;
  synth(): void;
  getCapabilities(): ComponentCapabilities;
  getType(): string;
  getConstruct(handle: string): IConstruct | undefined;
  getAllConstructs(): Map<string, IConstruct>;
  hasConstruct(handle: string): boolean;
  getName(): string;
}

/**
 * Binding context for component connections
 */
export interface BindingContext {
  source: IComponent;
  target: IComponent;
  directive: any;
  environment: string;
  complianceFramework: string;
}

/**
 * Result of component binding operation
 */
export interface BindingResult {
  environmentVariables: Record<string, string>;
}

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

/**
 * Binder strategy interface for component connections
 */
export interface IBinderStrategy {
  canHandle(sourceType: string, targetCapability: string): boolean;
  bind(context: BindingContext): BindingResult;
}

/**
 * Component factory interface for Abstract Factory pattern
 */
export interface IComponentFactory {
  createRegistry(): IComponentRegistry;
  getSupportedComponents(): string[];
  getComplianceFramework(): string;
}