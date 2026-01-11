/**
 * Platform Component Reference Resolution Utility
 * 
 * Provides a consistent, platform-wide approach to resolving component references
 * that avoids CloudFormation early validation errors.
 * 
 * ROOT CAUSE: CloudFormation's early validation runs BEFORE custom resources execute.
 * When components try to reference other components by traversing the construct tree,
 * CloudFormation may not be able to validate the reference exists during early validation.
 * This causes `AWS::EarlyValidation::ResourceExistenceCheck` errors.
 * 
 * SOLUTION: Use CDK's proper construct references and ensure explicit dependencies
 * are set. This utility provides a consistent pattern for resolving component references
 * across all platform components.
 * 
 * @module @shinobi/core/platform/utils/component-resolver
 */

import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import type { IComponent } from '../contracts/component-interfaces.js';

export interface ComponentResolutionOptions {
  /** Name of the component to resolve */
  componentName: string;
  
  /** Construct handle to retrieve (default: 'main') */
  constructHandle?: string;
  
  /** Expected capability type (for validation) */
  expectedCapability?: string;
  
  /** Component name for error messages */
  requestingComponentName?: string;
}

/**
 * Resolve a component reference to a construct.
 * 
 * This function ensures consistent component resolution across all platform components,
 * avoiding CloudFormation early validation errors by:
 * 1. Finding the component in the stack by name
 * 2. Validating it provides the expected capability
 * 3. Retrieving the construct using the registered handle
 * 4. Ensuring proper dependency ordering
 * 
 * **WHY THIS MATTERS:**
 * - EventSourceMappings need to reference SQS queues created in the same stack
 * - CloudFormation early validation checks resource existence before deployment
 * - Manual construct tree traversal is fragile and can fail validation
 * - This utility provides a consistent, validated approach
 * 
 * @param scope - CDK construct scope (typically the component requesting the reference)
 * @param options - Component resolution options
 * @returns The resolved construct from the referenced component
 * @throws Error if component not found, doesn't provide expected capability, or construct not registered
 * 
 * @example
 * ```typescript
 * // Resolve an SQS queue component
 * const queue = resolveComponentConstruct(this, {
 *   componentName: 'file-processing-queue',
 *   constructHandle: 'main',
 *   expectedCapability: 'messaging:sqs',
 *   requestingComponentName: 'queue-processor'
 * }) as sqs.IQueue;
 * ```
 */
export function resolveComponentConstruct<T extends Construct = Construct>(
  scope: Construct,
  options: ComponentResolutionOptions
): T {
  const {
    componentName,
    constructHandle = 'main',
    expectedCapability,
    requestingComponentName = 'component'
  } = options;

  // Find the component in the stack by traversing construct tree
  const stack = cdk.Stack.of(scope);
  
  // Search for component by name
  const component = findComponentInStack(stack, componentName, expectedCapability);
  
  if (!component) {
    const capabilityMsg = expectedCapability 
      ? ` that provides '${expectedCapability}' capability`
      : '';
    throw new Error(
      `Component '${componentName}'${capabilityMsg} not found in stack. ` +
      `Make sure it is defined before '${requestingComponentName}' in service.yml`
    );
  }

  try {
    // Validate capability if expected
    if (expectedCapability) {
      const capabilities = component.getCapabilities();
      if (!capabilities || !capabilities[expectedCapability]) {
        throw new Error(
          `Component '${componentName}' does not provide '${expectedCapability}' capability`
        );
      }
    }

    // Get the construct using the registered handle
    // NOTE: This requires the component to be synthesized first.
    // If the component hasn't been synthesized yet, getConstruct will fail.
    // Components should be ordered in service.yml so dependencies are synthesized first.
    let construct: Construct | undefined;
    try {
      construct = component.getConstruct(constructHandle);
    } catch (error) {
      // Component might not be synthesized yet - check if it's in the synthesis order
      // getConstructHandles() is on BaseComponent, not IComponent interface
      const componentWithHandles = component as any;
      const handles = typeof componentWithHandles.getConstructHandles === 'function' 
        ? componentWithHandles.getConstructHandles() 
        : [];
      if (handles.length === 0) {
        throw new Error(
          `Component '${componentName}' has not been synthesized yet. ` +
          `Make sure '${componentName}' is defined before '${requestingComponentName}' in service.yml. ` +
          `Components are synthesized in manifest order, so dependencies must come first.`
        );
      }
      // Component is synthesized but construct handle doesn't exist
      throw error;
    }
    
    if (!construct) {
      // getConstructHandles() is on BaseComponent, not IComponent interface
      const componentWithHandles = component as any;
      const handles = typeof componentWithHandles.getConstructHandles === 'function' 
        ? componentWithHandles.getConstructHandles() 
        : [];
      throw new Error(
        `Component '${componentName}' does not have a '${constructHandle}' construct registered. ` +
        `Available handles: ${handles.length > 0 ? handles.join(', ') : 'none'}`
      );
    }

    // Ensure explicit dependency for CloudFormation ordering
    // This helps CloudFormation's early validation understand the dependency
    if (scope instanceof Construct && construct instanceof Construct) {
      scope.node.addDependency(construct);
    }

    return construct as T;
  } catch (error) {
    throw new Error(
      `Failed to resolve construct '${constructHandle}' from component '${componentName}': ` +
      (error instanceof Error ? error.message : 'Unknown error')
    );
  }
}

/**
 * Find a component in the stack by name and optional capability.
 * 
 * @param stack - CDK stack to search
 * @param componentName - Name of the component to find
 * @param expectedCapability - Optional capability to validate
 * @returns The component if found, undefined otherwise
 */
function findComponentInStack(
  stack: cdk.Stack,
  componentName: string,
  expectedCapability?: string
): IComponent | undefined {
  // Search direct children first (most common case)
  for (const child of stack.node.children) {
    if (child.node.id === componentName && isComponent(child)) {
      if (expectedCapability) {
        try {
          const capabilities = (child as IComponent).getCapabilities();
          if (capabilities && capabilities[expectedCapability]) {
            return child as IComponent;
          }
        } catch {
          // Component might not be synthesized yet, continue searching
          continue;
        }
      } else {
        return child as IComponent;
      }
    }
  }

  // If not found in direct children, search recursively (for nested stacks/components)
  return findComponentRecursive(stack, componentName, expectedCapability);
}

/**
 * Recursively search for a component in the construct tree.
 * 
 * @param node - Construct node to search
 * @param componentName - Name of the component to find
 * @param expectedCapability - Optional capability to validate
 * @returns The component if found, undefined otherwise
 */
function findComponentRecursive(
  node: Construct,
  componentName: string,
  expectedCapability?: string
): IComponent | undefined {
  for (const child of node.node.children) {
    if (child.node.id === componentName && isComponent(child)) {
      if (expectedCapability) {
        try {
          const capabilities = (child as IComponent).getCapabilities();
          if (capabilities && capabilities[expectedCapability]) {
            return child as IComponent;
          }
        } catch {
          // Component might not be synthesized yet, continue searching
        }
      } else {
        return child as IComponent;
      }
    }

    // Recursively search children
    const found = findComponentRecursive(child, componentName, expectedCapability);
    if (found) {
      return found;
    }
  }

  return undefined;
}

/**
 * Check if a construct is a component (implements IComponent interface).
 * 
 * @param construct - Construct to check
 * @returns True if construct is a component
 */
function isComponent(construct: Construct): construct is IComponent {
  const component = construct as any;
  return (
    typeof component.getCapabilities === 'function' &&
    typeof component.getConstruct === 'function' &&
    typeof component.getConstructHandles === 'function'
  );
}

