/**
 * Trigger System Interfaces
 * Implementation interfaces for the trigger system defined in the Platform Binding & Trigger Specification v1.0
 */

import { Component } from './component.ts';
import { 
  TriggerDirective, 
  TriggerContext, 
  TriggerResult, 
  ITriggerStrategy,
  TriggerCompatibilityEntry,
  AccessLevel 
} from './platform-binding-trigger-spec.ts';

/**
 * Abstract base class for trigger strategies
 */
export abstract class TriggerStrategy implements ITriggerStrategy {
  abstract canHandle(sourceType: string, targetType: string, eventType: string): boolean;
  abstract trigger(context: TriggerContext): TriggerResult;
  abstract getCompatibilityMatrix(): TriggerCompatibilityEntry[];
  
  protected generateSecureDescription(context: TriggerContext): string {
    return `${context.source.getType()}-${context.source.node.id} -> ${context.target.getType()}-${context.target.node.id} (${context.directive.eventType})`;
  }
  
  protected validateAccess(access: AccessLevel): boolean {
    return ['invoke', 'publish', 'subscribe'].includes(access);
  }
}

/**
 * Registry for managing trigger strategies
 */
export class TriggerRegistry {
  private strategies: TriggerStrategy[] = [];
  
  register(strategy: TriggerStrategy): void {
    this.strategies.push(strategy);
  }
  
  findStrategy(sourceType: string, targetType: string, eventType: string): TriggerStrategy | null {
    return this.strategies.find(strategy =>
      strategy.canHandle(sourceType, targetType, eventType)
    ) || null;
  }
  
  getSupportedTriggers(sourceType: string): TriggerCompatibilityEntry[] {
    const supportedTriggers: TriggerCompatibilityEntry[] = [];
    
    for (const strategy of this.strategies) {
      const matrix = strategy.getCompatibilityMatrix();
      supportedTriggers.push(...matrix.filter(entry => entry.sourceType === sourceType));
    }
    
    return supportedTriggers;
  }
  
  getAllCompatibilityEntries(): TriggerCompatibilityEntry[] {
    const allEntries: TriggerCompatibilityEntry[] = [];
    
    for (const strategy of this.strategies) {
      allEntries.push(...strategy.getCompatibilityMatrix());
    }
    
    return allEntries;
  }
}

/**
 * Component trigger executor that uses registered strategies
 */
export class ComponentTrigger {
  constructor(private triggerRegistry: TriggerRegistry) {}
  
  trigger(context: TriggerContext): TriggerResult {
    const strategy = this.triggerRegistry.findStrategy(
      context.source.getType(),
      context.target.getType(),
      context.directive.eventType
    );
    
    if (!strategy) {
      const supportedTriggers = this.triggerRegistry.getSupportedTriggers(context.source.getType());
      const suggestion = supportedTriggers.length > 0
        ? `Available triggers: ${supportedTriggers.map(t => `${t.targetType}:${t.eventType}`).join(', ')}`
        : 'No compatible triggers available';
      
      throw new Error(
        `No trigger strategy found for ${context.source.getType()} -> ${context.target.getType()} (${context.directive.eventType}). ${suggestion}`
      );
    }
    
    return strategy.trigger(context);
  }
}

/**
 * Event source mapping for different AWS services
 */
export interface EventSourceMapping {
  serviceName: string;
  eventTypes: string[];
  resourceArn: string;
  configurationOptions: Record<string, any>;
}

/**
 * Trigger configuration builder for complex trigger setups
 */
export class TriggerConfigurationBuilder {
  private directive: Partial<TriggerDirective> = {};
  
  eventType(eventType: string): this {
    this.directive.eventType = eventType;
    return this;
  }
  
  target(target: { to?: string; select?: { type: string; withLabels?: Record<string, string> } }): this {
    this.directive.target = target;
    return this;
  }
  
  access(access: Extract<AccessLevel, 'invoke' | 'publish' | 'subscribe'>): this {
    this.directive.access = access;
    return this;
  }
  
  filter(filter: {
    source?: string[];
    detail?: Record<string, any>;
    expressions?: string[];
  }): this {
    this.directive.filter = filter;
    return this;
  }
  
  transform(transform: {
    input?: Record<string, string>;
    output?: Record<string, string>;
  }): this {
    this.directive.transform = transform;
    return this;
  }
  
  options(options: {
    retry?: { maxAttempts?: number; backoffStrategy?: 'linear' | 'exponential' };
    deadLetter?: { enabled: boolean; maxRetries?: number };
    batching?: { size?: number; window?: number };
  }): this {
    this.directive.options = options;
    return this;
  }
  
  metadata(metadata: { description?: string; tags?: Record<string, string> }): this {
    this.directive.metadata = metadata;
    return this;
  }
  
  build(): TriggerDirective {
    if (!this.directive.eventType) {
      throw new Error('Event type is required for trigger directive');
    }
    if (!this.directive.target) {
      throw new Error('Target is required for trigger directive');
    }
    if (!this.directive.access) {
      throw new Error('Access level is required for trigger directive');
    }
    
    return this.directive as TriggerDirective;
  }
}

/**
 * Trigger validator for runtime validation of trigger configurations
 */
export class TriggerValidator {
  static validateTriggerContext(context: TriggerContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!context.source) {
      errors.push('Source component is required');
    }
    
    if (!context.target) {
      errors.push('Target component is required');
    }
    
    if (!context.directive) {
      errors.push('Trigger directive is required');
    }
    
    if (context.directive && !['invoke', 'publish', 'subscribe'].includes(context.directive.access)) {
      errors.push('Invalid access level for trigger. Must be invoke, publish, or subscribe');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  static validateTriggerResult(result: TriggerResult): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!result.triggerConfiguration) {
      errors.push('Trigger configuration is required in result');
    }
    
    if (result.triggerConfiguration && !result.triggerConfiguration.targetArn) {
      errors.push('Target ARN is required in trigger configuration');
    }
    
    return { valid: errors.length === 0, errors };
  }
}