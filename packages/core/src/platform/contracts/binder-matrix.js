/**
 * Binder Matrix Implementation
 * Central registry for all supported component interactions (bindings and triggers)
 */
/**
 * Implementation of the Binder Matrix - Central registry for all supported component interactions
 * Optimized with Map-based lookups for O(1) performance
 */
export class BinderMatrix {
    // Map-based storage for O(1) lookups by sourceType
    bindingStrategyMap = new Map();
    triggerStrategyMap = new Map();
    // Keep arrays for backward compatibility and full matrix operations
    bindingStrategies = [];
    triggerStrategies = [];
    /**
     * Register a binding strategy
     */
    registerBindingStrategy(strategy) {
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
            this.bindingStrategyMap.get(sourceType).push(strategy);
        });
    }
    /**
     * Register a trigger strategy
     */
    registerTriggerStrategy(strategy) {
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
            this.triggerStrategyMap.get(sourceType).push(strategy);
        });
    }
    /**
     * Find compatible binding strategy - O(1) optimized lookup
     */
    findBindingStrategy(sourceType, targetCapability) {
        // Get the small, pre-filtered list of strategies for this source type
        const potentialStrategies = this.bindingStrategyMap.get(sourceType);
        if (!potentialStrategies) {
            return null; // No strategies can handle this source at all
        }
        // Now iterate over the much smaller, pre-filtered list
        return potentialStrategies.find(strategy => strategy.canHandle(sourceType, targetCapability)) || null;
    }
    /**
     * Find compatible trigger strategy - O(1) optimized lookup
     */
    findTriggerStrategy(sourceType, targetType, eventType) {
        // Get the small, pre-filtered list of strategies for this source type
        const potentialStrategies = this.triggerStrategyMap.get(sourceType);
        if (!potentialStrategies) {
            return null; // No strategies can handle this source at all
        }
        // Now iterate over the much smaller, pre-filtered list
        return potentialStrategies.find(strategy => strategy.canHandle(sourceType, targetType, eventType)) || null;
    }
    /**
     * Get all supported bindings for a source type - O(1) optimized lookup
     */
    getSupportedBindings(sourceType) {
        const supportedBindings = [];
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
    getSupportedTriggers(sourceType) {
        const supportedTriggers = [];
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
    getFullCompatibilityMatrix() {
        const bindings = [];
        const triggers = [];
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
    getCompatibilitySummary(sourceType) {
        const bindings = this.getSupportedBindings(sourceType);
        const triggers = this.getSupportedTriggers(sourceType);
        const supportedTargetTypes = new Set();
        const supportedCapabilities = new Set();
        const supportedEventTypes = new Set();
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
    isBindingSupported(sourceType, targetType, capability) {
        const bindings = this.getSupportedBindings(sourceType);
        return bindings.some(entry => entry.targetType === targetType && entry.capability === capability);
    }
    /**
     * Validate that a trigger is supported
     */
    isTriggerSupported(sourceType, targetType, eventType) {
        const triggers = this.getSupportedTriggers(sourceType);
        return triggers.some(entry => entry.targetType === targetType && entry.eventType === eventType);
    }
    /**
     * Get recommendations for unsupported bindings
     */
    getBindingRecommendations(sourceType, targetType) {
        const allBindings = this.getSupportedBindings(sourceType);
        return allBindings.filter(entry => entry.targetType === targetType);
    }
    /**
     * Get recommendations for unsupported triggers
     */
    getTriggerRecommendations(sourceType, targetType) {
        const allTriggers = this.getSupportedTriggers(sourceType);
        return allTriggers.filter(entry => entry.targetType === targetType);
    }
    /**
     * Export the full matrix as a configuration object
     */
    exportMatrix() {
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
    getPerformanceDiagnostics() {
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
    static generateCompatibilityReport(matrix) {
        const { bindings, triggers } = matrix.getFullCompatibilityMatrix();
        let report = 'Platform Binding & Trigger Compatibility Report\n';
        report += '================================================\n\n';
        report += `Total Bindings: ${bindings.length}\n`;
        report += `Total Triggers: ${triggers.length}\n\n`;
        // Group by source type
        const bindingsBySource = new Map();
        const triggersBySource = new Map();
        bindings.forEach(entry => {
            if (!bindingsBySource.has(entry.sourceType)) {
                bindingsBySource.set(entry.sourceType, []);
            }
            bindingsBySource.get(entry.sourceType).push(entry);
        });
        triggers.forEach(entry => {
            if (!triggersBySource.has(entry.sourceType)) {
                triggersBySource.set(entry.sourceType, []);
            }
            triggersBySource.get(entry.sourceType).push(entry);
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
    static validateMatrix(matrix) {
        const errors = [];
        const warnings = [];
        const { bindings, triggers } = matrix.getFullCompatibilityMatrix();
        // Check for duplicate binding entries
        const bindingKeys = new Set();
        bindings.forEach(entry => {
            const key = `${entry.sourceType}->${entry.targetType}:${entry.capability}`;
            if (bindingKeys.has(key)) {
                warnings.push(`Duplicate binding entry: ${key}`);
            }
            bindingKeys.add(key);
        });
        // Check for duplicate trigger entries
        const triggerKeys = new Set();
        triggers.forEach(entry => {
            const key = `${entry.sourceType}->${entry.targetType}:${entry.eventType}`;
            if (triggerKeys.has(key)) {
                warnings.push(`Duplicate trigger entry: ${key}`);
            }
            triggerKeys.add(key);
        });
        // Validate entry completeness
        bindings.forEach(entry => {
            if (!entry.sourceType)
                errors.push('Binding entry missing sourceType');
            if (!entry.targetType)
                errors.push('Binding entry missing targetType');
            if (!entry.capability)
                errors.push('Binding entry missing capability');
            if (!entry.description)
                warnings.push(`Binding entry missing description: ${entry.sourceType}->${entry.targetType}`);
        });
        triggers.forEach(entry => {
            if (!entry.sourceType)
                errors.push('Trigger entry missing sourceType');
            if (!entry.targetType)
                errors.push('Trigger entry missing targetType');
            if (!entry.eventType)
                errors.push('Trigger entry missing eventType');
            if (!entry.description)
                warnings.push(`Trigger entry missing description: ${entry.sourceType}->${entry.targetType}`);
        });
        return { valid: errors.length === 0, errors, warnings };
    }
}
//# sourceMappingURL=binder-matrix.js.map