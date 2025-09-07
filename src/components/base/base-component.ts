/**
 * Base Component Interface and Abstract Class
 * Provides common structure for all platform components (regular and import)
 * 
 * NOTE: This class is deprecated and will be replaced by the Component API Contract.
 * New components should extend src/contracts/component.ts instead.
 */

import { Construct } from 'constructs';

/**
 * Context provided to components during synthesis
 * @deprecated Use ComponentContext from src/contracts/interfaces.ts
 */
export interface ComponentContext {
  environment: string;
  region: string;
  accountId: string;
  serviceName: string;
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
}

/**
 * Capabilities that a component can expose for binding
 * @deprecated Use ComponentCapabilities from src/contracts/interfaces.ts
 */
export interface ComponentCapabilities {
  [capabilityName: string]: {
    description: string;
    bindings: {
      [accessLevel: string]: {
        description: string;
        environmentVariables: {
          [varName: string]: string; // Description of the environment variable
        };
      };
    };
  };
}

/**
 * Base abstract class for all components
 * Provides common lifecycle methods and interfaces
 * 
 * @deprecated Use Component from src/contracts/component.ts for new components.
 * This class is maintained for backward compatibility with existing components.
 */
export abstract class BaseComponent<TConfig = any> extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  /**
   * Synthesis phase - Create or import AWS resources
   * Called during the CDK synthesis process
   */
  abstract synth(context: ComponentContext): Promise<void>;

  /**
   * Get the capabilities this component provides for binding
   * Used by the binding system to understand what this component offers
   */
  abstract getCapabilities(): ComponentCapabilities;

  /**
   * Get resource references for CloudFormation outputs or cross-component binding
   * Returns CDK constructs and other references that can be used by binding strategies
   */
  abstract getResourceReferences(): Record<string, any>;
}