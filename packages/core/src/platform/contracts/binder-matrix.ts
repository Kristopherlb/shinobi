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
 * Optimized with Map-based lookups for O(1) performance
 */
export class BinderMatrix implements IBinderMatrix {
  // Map-based storage for O(1) lookups by sourceType
  private bindingStrategyMap = new Map<string, IBinderStrategy[]>();
  private triggerStrategyMap = new Map<string, ITriggerStrategy[]>();
  
  // Keep arrays for backward compatibility and full matrix operations
  private bindingStrategies: IBinderStrategy[] = [];
  private triggerStrategies: ITriggerStrategy[] = [];
  
  /**
   * Register a binding strategy
   */
  registerBindingStrategy(strategy: IBinderStrategy): void {
    // Add to legacy array for backward compatibility
    this.bindingStrategies.push(strategy);
    
    // Add to optimized map structure for fast lookups
    const compatibility = strategy.getCompatibilityMatrix();
    if (compatibility.length === 0) {
      console.warn(`Warning: Binding strategy '${strategy.constructor.name}' was registered but has an empty compatibility matrix.`);
      return;
    }
    
    // A single strategy can handle multiple source types
    const sourceTypes = new Set(compatibility.map(entry => entry.sourceType));
    
    sourceTypes.forEach(sourceType => {
      if (!this.bindingStrategyMap.has(sourceType)) {
        this.bindingStrategyMap.set(sourceType, []);
      }
      this.bindingStrategyMap.get(sourceType)!.push(strategy);
    });
  }
  
  /**
   * Register a trigger strategy
   */
  registerTriggerStrategy(strategy: ITriggerStrategy): void {
    // Add to legacy array for backward compatibility
    this.triggerStrategies.push(strategy);
    
    // Add to optimized map structure for fast lookups
    const compatibility = strategy.getCompatibilityMatrix();
    if (compatibility.length === 0) {
      console.warn(`Warning: Trigger strategy '${strategy.constructor.name}' was registered but has an empty compatibility matrix.`);
      return;
    }
    
    // A single strategy can handle multiple source types
    const sourceTypes = new Set(compatibility.map(entry => entry.sourceType));
    
    sourceTypes.forEach(sourceType => {
      if (!this.triggerStrategyMap.has(sourceType)) {
        this.triggerStrategyMap.set(sourceType, []);
      }
      this.triggerStrategyMap.get(sourceType)!.push(strategy);
    });
  }
  
  /**
   * Find compatible binding strategy - O(1) optimized lookup
   */
  findBindingStrategy(sourceType: string, targetCapability: string): IBinderStrategy | null {
    // Get the small, pre-filtered list of strategies for this source type
    const potentialStrategies = this.bindingStrategyMap.get(sourceType);
    
    if (!potentialStrategies) {
      return null; // No strategies can handle this source at all
    }
    
    // Now iterate over the much smaller, pre-filtered list
    return potentialStrategies.find(strategy =>
      strategy.canHandle(sourceType, targetCapability)
    ) || null;
  }
  
  /**
   * Find compatible trigger strategy - O(1) optimized lookup
   */
  findTriggerStrategy(sourceType: string, targetType: string, eventType: string): ITriggerStrategy | null {
    // Get the small, pre-filtered list of strategies for this source type
    const potentialStrategies = this.triggerStrategyMap.get(sourceType);
    
    if (!potentialStrategies) {
      return null; // No strategies can handle this source at all
    }
    
    // Now iterate over the much smaller, pre-filtered list
    return potentialStrategies.find(strategy =>
      strategy.canHandle(sourceType, targetType, eventType)
    ) || null;
  }
  
  /**
   * Get all supported bindings for a source type - O(1) optimized lookup
   */
  getSupportedBindings(sourceType: string): CompatibilityEntry[] {
    const supportedBindings: CompatibilityEntry[] = [];
    
    // Use optimized map lookup to get only relevant strategies
    const potentialStrategies = this.bindingStrategyMap.get(sourceType);
    
    if (!potentialStrategies) {
      return []; // No strategies support this source type
    }
    
    for (const strategy of potentialStrategies) {
      const matrix = strategy.getCompatibilityMatrix();
      supportedBindings.push(...matrix.filter(entry => entry.sourceType === sourceType));
    }
    
    return supportedBindings;
  }
  
  /**
   * Get all supported triggers for a source type - O(1) optimized lookup
   */
  getSupportedTriggers(sourceType: string): TriggerCompatibilityEntry[] {
    const supportedTriggers: TriggerCompatibilityEntry[] = [];
    
    // Use optimized map lookup to get only relevant strategies
    const potentialStrategies = this.triggerStrategyMap.get(sourceType);
    
    if (!potentialStrategies) {
      return []; // No strategies support this source type
    }
    
    for (const strategy of potentialStrategies) {
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
  
  /**
   * Get performance diagnostics for the optimized lookup system
   */
  getPerformanceDiagnostics(): {
    totalStrategies: number;
    mapEfficiency: {
      bindingSourceTypes: number;
      triggerSourceTypes: number;
      avgStrategiesPerBindingSource: number;
      avgStrategiesPerTriggerSource: number;
    };
    lookupOptimization: {
      worstCaseArrayScan: number;
      bestCaseMapLookup: number;
      optimizationRatio: string;
    };
  } {
    const bindingSourceTypes = this.bindingStrategyMap.size;
    const triggerSourceTypes = this.triggerStrategyMap.size;
    
    const totalBindingMappings = Array.from(this.bindingStrategyMap.values())
      .reduce((sum, strategies) => sum + strategies.length, 0);
    const totalTriggerMappings = Array.from(this.triggerStrategyMap.values())
      .reduce((sum, strategies) => sum + strategies.length, 0);
    
    const avgStrategiesPerBindingSource = bindingSourceTypes > 0 
      ? totalBindingMappings / bindingSourceTypes 
      : 0;
    const avgStrategiesPerTriggerSource = triggerSourceTypes > 0 
      ? totalTriggerMappings / triggerSourceTypes 
      : 0;
    
    const worstCaseArrayScan = this.bindingStrategies.length + this.triggerStrategies.length;
    const bestCaseMapLookup = Math.max(avgStrategiesPerBindingSource, avgStrategiesPerTriggerSource);
    const optimizationRatio = worstCaseArrayScan > 0 
      ? `${(worstCaseArrayScan / Math.max(bestCaseMapLookup, 1)).toFixed(1)}x faster`
      : 'N/A';
    
    return {
      totalStrategies: worstCaseArrayScan,
      mapEfficiency: {
        bindingSourceTypes,
        triggerSourceTypes,
        avgStrategiesPerBindingSource: Math.round(avgStrategiesPerBindingSource * 100) / 100,
        avgStrategiesPerTriggerSource: Math.round(avgStrategiesPerTriggerSource * 100) / 100
      },
      lookupOptimization: {
        worstCaseArrayScan,
        bestCaseMapLookup: Math.round(bestCaseMapLookup * 100) / 100,
        optimizationRatio
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
    
    bindingsBySource.forEach((entries, sourceType) => {
      report += `\n${sourceType}:\n`;
      entries.forEach(entry => {
        report += `  → ${entry.targetType} (${entry.capability}): ${entry.description}\n`;
      });
    });
    
    report += '\n\nTRIGGER COMPATIBILITY\n';
    report += '====================\n';
    
    triggersBySource.forEach((entries, sourceType) => {
      report += `\n${sourceType}:\n`;
      entries.forEach(entry => {
        report += `  → ${entry.targetType} (${entry.eventType}): ${entry.description}\n`;
      });
    });
    
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