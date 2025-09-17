/**
 * Strategy Pattern Implementation for Component Binding
 * Handles different binding types between components cleanly
 */

import {
  IComponent,
  BindingContext,
  BindingResult,
  IBinderStrategy
} from '../platform/contracts';

export interface BindingDirective {
  to?: string;
  select?: {
    type: string;
    withLabels?: Record<string, string>;
  };
  capability: string;
  access: 'read' | 'write' | 'readwrite' | 'admin';
  env?: Record<string, string>;
  options?: Record<string, any>;
}

/**
 * Strategy interface for different binding types
 */
export abstract class BinderStrategy implements IBinderStrategy {
  abstract canHandle(sourceType: string, targetCapability: string): boolean;
  abstract bind(context: BindingContext): BindingResult;

  protected generateSecureDescription(context: BindingContext): string {
    return `${context.source.getType()}-${context.source.getName()} -> ${context.target.getType()}-${context.target.getName()}`;
  }
}

/**
 * Registry for managing binder strategies
 */
export class BinderRegistry {
  private strategies: BinderStrategy[] = [];

  register(strategy: BinderStrategy): void {
    this.strategies.push(strategy);
  }

  findStrategy(sourceType: string, targetCapability: string): BinderStrategy | null {
    return this.strategies.find(strategy =>
      strategy.canHandle(sourceType, targetCapability)
    ) || null;
  }

  getCompatibleTargets(sourceType: string): Array<{ targetType: string; capability: string }> {
    const compatibleTargets: Array<{ targetType: string; capability: string }> = [];

    // This would be populated based on registered strategies
    // For now, return empty array as concrete strategies will be in component packages

    return compatibleTargets;
  }
}

/**
 * Component binder that uses registered strategies
 */
export class ComponentBinder {
  constructor(private binderRegistry: BinderRegistry) { }

  bind(context: BindingContext): BindingResult {
    const targetCapabilities = Object.keys(context.target.getCapabilities());
    const primaryCapability = targetCapabilities[0];

    if (!primaryCapability) {
      throw new Error(`Target component ${context.target.getName()} has no capabilities`);
    }

    const strategy = this.binderRegistry.findStrategy(
      context.source.getType(),
      primaryCapability
    );

    if (!strategy) {
      const compatibleTargets = this.binderRegistry.getCompatibleTargets(context.source.getType());
      const suggestion = compatibleTargets.length > 0
        ? `Available bindings: ${compatibleTargets.map(t => t.capability).join(', ')}`
        : 'No compatible bindings available';

      throw new Error(
        `No binding strategy found for ${context.source.getType()} -> ${primaryCapability}. ${suggestion}`
      );
    }

    return strategy.bind(context);
  }
}