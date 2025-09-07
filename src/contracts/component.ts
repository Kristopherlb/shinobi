/**
 * Component API Contract Specification v1.0
 * 
 * This file defines the core Component abstract class and interfaces that
 * all components in the platform must implement. This contract ensures that
 * every component is a predictable, secure, and composable building block.
 */

import { Construct, IConstruct } from 'constructs';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from './interfaces';

/**
 * Abstract base class that all platform components MUST extend.
 * 
 * This class enforces the implementation of a standard interface that ensures
 * components are:
 * - Predictable: Standard lifecycle methods (synth, getCapabilities)
 * - Secure: Proper construct encapsulation and capability exposure
 * - Composable: Standard binding interface through capabilities
 */
export abstract class Component extends Construct {
  /** The component's specification from the service manifest. */
  protected readonly spec: ComponentSpec;
  
  /** The context of the service this component belongs to. */
  protected readonly context: ComponentContext;
  
  /** A map of handles to the real, synthesized CDK constructs. */
  protected readonly constructs: Map<string, IConstruct> = new Map();
  
  /** A map of the capabilities this component provides after synthesis. */
  protected capabilities: ComponentCapabilities = {};

  /**
   * Constructor for all platform components.
   * 
   * @param scope The CDK scope (typically the service stack)
   * @param id Unique identifier for this component instance
   * @param context Service-wide context including environment, compliance framework
   * @param spec Component specification from the service.yml manifest
   */
  constructor(
    scope: Construct,
    id: string,
    context: ComponentContext,
    spec: ComponentSpec
  ) {
    super(scope, id);
    this.context = context;
    this.spec = spec;
  }

  /**
   * The core synthesis method. This method is responsible for:
   * 1. Using the component's ConfigBuilder to assemble final properties
   * 2. Instantiating the underlying native CDK L2 constructs
   * 3. Populating the `constructs` map with construct handles
   * 4. Populating the `capabilities` map with provided capabilities
   * 
   * This method MUST be implemented by all components.
   * This method MUST populate both `constructs` and `capabilities` maps.
   * This method MUST be idempotent (safe to call multiple times).
   */
  public abstract synth(): void;

  /**
   * Returns the machine-readable capabilities of the component.
   * 
   * Capabilities define what this component provides to other components
   * for binding purposes. Each capability must conform to the Standard
   * Capability Vocabulary defined in the platform contract.
   * 
   * @throws Error if called before synth() has completed
   * @returns ComponentCapabilities mapping capability keys to their data shapes
   */
  public abstract getCapabilities(): ComponentCapabilities;

  /**
   * Returns the component's unique type identifier.
   * 
   * This identifier is used for:
   * - Component registry lookups
   * - Schema validation
   * - Binding strategy selection
   * - Audit and compliance reporting
   * 
   * @returns string The component type (e.g., 'rds-postgres', 'lambda-api')
   */
  public abstract getType(): string;

  /**
   * Retrieves a handle to a synthesized CDK construct.
   * 
   * This method provides controlled access to the underlying CDK constructs
   * for advanced use cases like patches or binding strategies that need
   * direct construct access.
   * 
   * @param handle The key for the construct (e.g., 'main', 'database', 'securityGroup')
   * @returns The CDK construct or undefined if handle doesn't exist
   */
  public getConstruct(handle: string): IConstruct | undefined {
    return this.constructs.get(handle);
  }

  /**
   * Returns all construct handles available from this component.
   * 
   * Useful for debugging, testing, and advanced binding scenarios.
   * 
   * @returns Array of available construct handle names
   */
  public getConstructHandles(): string[] {
    return Array.from(this.constructs.keys());
  }

  /**
   * Validates that the component has been properly synthesized.
   * 
   * This method checks that:
   * - synth() has been called
   * - constructs map is populated
   * - capabilities map is populated
   * 
   * @throws Error if component is not properly synthesized
   */
  protected validateSynthesized(): void {
    if (this.constructs.size === 0) {
      throw new Error(`Component ${this.node.id} has not been synthesized. Call synth() before accessing constructs.`);
    }
    
    if (Object.keys(this.capabilities).length === 0) {
      throw new Error(`Component ${this.node.id} provides no capabilities. Components must expose at least one capability.`);
    }
  }

  /**
   * Registers a CDK construct with a handle for later retrieval.
   * 
   * This method should be called during synth() to register all
   * important constructs that may need to be accessed by binding
   * strategies or patches.
   * 
   * @param handle Unique identifier for this construct
   * @param construct The CDK construct instance
   */
  protected registerConstruct(handle: string, construct: IConstruct): void {
    if (this.constructs.has(handle)) {
      throw new Error(`Construct handle '${handle}' is already registered in component ${this.node.id}`);
    }
    
    this.constructs.set(handle, construct);
  }

  /**
   * Registers a capability that this component provides.
   * 
   * This method should be called during synth() to register all
   * capabilities that other components can bind to.
   * 
   * @param capabilityKey The capability key from Standard Capability Vocabulary
   * @param capabilityData The data shape for this capability
   */
  protected registerCapability(capabilityKey: string, capabilityData: any): void {
    this.capabilities[capabilityKey] = capabilityData;
  }
}