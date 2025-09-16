/**
 * @platform/contracts - Shared interfaces and types
 * Core contracts used across all platform components and engines
 */
import { Construct, IConstruct } from 'constructs';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
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
    scope: Construct;
    vpc?: IVpc;
    region?: string;
    accountId?: string;
    serviceLabels?: Record<string, string>;
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
    /** Retrieves a handle to a synthesized CDK construct */
    getConstruct(handle: string): IConstruct | undefined;
    /** Get security group handle for binding operations */
    _getSecurityGroupHandle(role: 'source' | 'target'): any;
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
export * from './component';
