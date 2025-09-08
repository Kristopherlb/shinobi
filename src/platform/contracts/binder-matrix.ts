/**
 * Binder Matrix Implementation
 * Central registry for all supported component interactions (bindings and triggers)
 */

import { 
  IBinderMatrix,
  IBinderStrategy,
  ITriggerStrategy,
  CompatibilityEntry,
  TriggerCompatibilityEntry
} from './platform-binding-trigger-spec';

/**
 * Implementation of the Binder Matrix - Central registry for all supported component interactions
 */
export class BinderMatrix implements IBinderMatrix {
  private bindingStrategies: IBinderStrategy[] = [];
  private triggerStrategies: ITriggerStrategy[] = [];
  
  /**
   * Register a binding strategy
   */
  registerBindingStrategy(strategy: IBinderStrategy): void {
    this.bindingStrategies.push(strategy);
  }
  
  /**
   * Register a trigger strategy
   */
  registerTriggerStrategy(strategy: ITriggerStrategy): void {
    this.triggerStrategies.push(strategy);
  }
  
  /**
   * Find compatible binding strategy
   */
  findBindingStrategy(sourceType: string, targetCapability: string): IBinderStrategy | null {
    return this.bindingStrategies.find(strategy =>
      strategy.canHandle(sourceType, targetCapability)
    ) || null;
  }
  
  /**
   * Find compatible trigger strategy
   */
  findTriggerStrategy(sourceType: string, targetType: string, eventType: string): ITriggerStrategy | null {
    return this.triggerStrategies.find(strategy =>
      strategy.canHandle(sourceType, targetType, eventType)
    ) || null;
  }
  
  /**
   * Get all supported bindings for a source type
   */
  getSupportedBindings(sourceType: string): CompatibilityEntry[] {
    const supportedBindings: CompatibilityEntry[] = [];
    
    for (const strategy of this.bindingStrategies) {
      const matrix = strategy.getCompatibilityMatrix();
      supportedBindings.push(...matrix.filter(entry => entry.sourceType === sourceType));
    }
    
    return supportedBindings;
  }
  
  /**
   * Get all supported triggers for a source type
   */
  getSupportedTriggers(sourceType: string): TriggerCompatibilityEntry[] {
    const supportedTriggers: TriggerCompatibilityEntry[] = [];
    
    for (const strategy of this.triggerStrategies) {
      const matrix = strategy.getCompatibilityMatrix();
      supportedTriggers.push(...matrix.filter(entry => entry.sourceType === sourceType));
    }
    
    return supportedTriggers;
  }
  
  /**
   * Get full compatibility matrix
   */
  getFullCompatibilityMatrix(): {
    bindings: CompatibilityEntry[];
    triggers: TriggerCompatibilityEntry[];
  } {
    const bindings: CompatibilityEntry[] = [];
    const triggers: TriggerCompatibilityEntry[] = [];
    
    for (const strategy of this.bindingStrategies) {
      bindings.push(...strategy.getCompatibilityMatrix());
    }
    
    for (const strategy of this.triggerStrategies) {
      triggers.push(...strategy.getCompatibilityMatrix());
    }
    
    return { bindings, triggers };
  }
  
  /**
   * Get compatibility summary for a specific source type
   */
  getCompatibilitySummary(sourceType: string): {
    bindings: CompatibilityEntry[];
    triggers: TriggerCompatibilityEntry[];
    summary: {
      totalBindings: number;
      totalTriggers: number;
      supportedTargetTypes: string[];
      supportedCapabilities: string[];
      supportedEventTypes: string[];
    };
  } {
    const bindings = this.getSupportedBindings(sourceType);
    const triggers = this.getSupportedTriggers(sourceType);
    
    const supportedTargetTypes = new Set<string>();
    const supportedCapabilities = new Set<string>();
    const supportedEventTypes = new Set<string>();
    
    bindings.forEach(entry => {
      supportedTargetTypes.add(entry.targetType);
      supportedCapabilities.add(entry.capability);
    });
    
    triggers.forEach(entry => {
      supportedTargetTypes.add(entry.targetType);
      supportedEventTypes.add(entry.eventType);
    });
    
    return {
      bindings,
      triggers,
      summary: {
        totalBindings: bindings.length,
        totalTriggers: triggers.length,
        supportedTargetTypes: Array.from(supportedTargetTypes),
        supportedCapabilities: Array.from(supportedCapabilities),
        supportedEventTypes: Array.from(supportedEventTypes)
      }
    };
  }
  
  /**
   * Validate that a binding is supported
   */
  isBindingSupported(sourceType: string, targetType: string, capability: string): boolean {
    const bindings = this.getSupportedBindings(sourceType);
    return bindings.some(entry => 
      entry.targetType === targetType && entry.capability === capability
    );
  }
  
  /**
   * Validate that a trigger is supported
   */
  isTriggerSupported(sourceType: string, targetType: string, eventType: string): boolean {
    const triggers = this.getSupportedTriggers(sourceType);
    return triggers.some(entry =>
      entry.targetType === targetType && entry.eventType === eventType
    );
  }
  
  /**
   * Get recommendations for unsupported bindings
   */
  getBindingRecommendations(sourceType: string, targetType: string): CompatibilityEntry[] {
    const allBindings = this.getSupportedBindings(sourceType);
    return allBindings.filter(entry => entry.targetType === targetType);
  }
  
  /**
   * Get recommendations for unsupported triggers
   */
  getTriggerRecommendations(sourceType: string, targetType: string): TriggerCompatibilityEntry[] {
    const allTriggers = this.getSupportedTriggers(sourceType);
    return allTriggers.filter(entry => entry.targetType === targetType);
  }
  
  /**
   * Export the full matrix as a configuration object
   */
  exportMatrix(): {
    version: string;
    bindings: CompatibilityEntry[];
    triggers: TriggerCompatibilityEntry[];
    metadata: {
      totalStrategies: number;
      bindingStrategies: number;
      triggerStrategies: number;
      exportedAt: string;
    };
  } {
    const { bindings, triggers } = this.getFullCompatibilityMatrix();
    
    return {
      version: '1.0',
      bindings,
      triggers,
      metadata: {
        totalStrategies: this.bindingStrategies.length + this.triggerStrategies.length,
        bindingStrategies: this.bindingStrategies.length,
        triggerStrategies: this.triggerStrategies.length,
        exportedAt: new Date().toISOString()
      }
    };
  }
}

/**
 * Singleton instance of the global binder matrix
 */
export const globalBinderMatrix = new BinderMatrix();

/**
 * Helper functions for working with the binder matrix
 */
export class BinderMatrixUtils {
  /**
   * Generate human-readable description of supported interactions
   */
  static generateCompatibilityReport(matrix: BinderMatrix): string {
    const { bindings, triggers } = matrix.getFullCompatibilityMatrix();
    
    let report = 'Platform Binding & Trigger Compatibility Report\n';
    report += '================================================\n\n';
    
    report += `Total Bindings: ${bindings.length}\n`;
    report += `Total Triggers: ${triggers.length}\n\n`;
    
    // Group by source type
    const bindingsBySource = new Map<string, CompatibilityEntry[]>();
    const triggersBySource = new Map<string, TriggerCompatibilityEntry[]>();
    
    bindings.forEach(entry => {
      if (!bindingsBySource.has(entry.sourceType)) {
        bindingsBySource.set(entry.sourceType, []);
      }
      bindingsBySource.get(entry.sourceType)!.push(entry);
    });
    
    triggers.forEach(entry => {
      if (!triggersBySource.has(entry.sourceType)) {
        triggersBySource.set(entry.sourceType, []);
      }
      triggersBySource.get(entry.sourceType)!.push(entry);
    });
    
    // Generate report sections
    report += 'BINDING COMPATIBILITY\n';
    report += '====================\n';
    
    for (const [sourceType, entries] of bindingsBySource) {
      report += `\n${sourceType}:\n`;
      entries.forEach(entry => {
        report += `  → ${entry.targetType} (${entry.capability}): ${entry.description}\n`;
      });
    }
    
    report += '\n\nTRIGGER COMPATIBILITY\n';
    report += '====================\n';
    
    for (const [sourceType, entries] of triggersBySource) {
      report += `\n${sourceType}:\n`;
      entries.forEach(entry => {
        report += `  → ${entry.targetType} (${entry.eventType}): ${entry.description}\n`;
      });
    }
    
    return report;
  }
  
  /**
   * Validate matrix consistency
   */
  static validateMatrix(matrix: BinderMatrix): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const { bindings, triggers } = matrix.getFullCompatibilityMatrix();
    
    // Check for duplicate binding entries
    const bindingKeys = new Set<string>();
    bindings.forEach(entry => {
      const key = `${entry.sourceType}->${entry.targetType}:${entry.capability}`;
      if (bindingKeys.has(key)) {
        warnings.push(`Duplicate binding entry: ${key}`);
      }
      bindingKeys.add(key);
    });
    
    // Check for duplicate trigger entries
    const triggerKeys = new Set<string>();
    triggers.forEach(entry => {
      const key = `${entry.sourceType}->${entry.targetType}:${entry.eventType}`;
      if (triggerKeys.has(key)) {
        warnings.push(`Duplicate trigger entry: ${key}`);
      }
      triggerKeys.add(key);
    });
    
    // Validate entry completeness
    bindings.forEach(entry => {
      if (!entry.sourceType) errors.push('Binding entry missing sourceType');
      if (!entry.targetType) errors.push('Binding entry missing targetType');
      if (!entry.capability) errors.push('Binding entry missing capability');
      if (!entry.description) warnings.push(`Binding entry missing description: ${entry.sourceType}->${entry.targetType}`);
    });
    
    triggers.forEach(entry => {
      if (!entry.sourceType) errors.push('Trigger entry missing sourceType');
      if (!entry.targetType) errors.push('Trigger entry missing targetType');
      if (!entry.eventType) errors.push('Trigger entry missing eventType');
      if (!entry.description) warnings.push(`Trigger entry missing description: ${entry.sourceType}->${entry.targetType}`);
    });
    
    return { valid: errors.length === 0, errors, warnings };
  }
}