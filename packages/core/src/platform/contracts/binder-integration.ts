/**
 * Binder Integration Module
 * Demonstrates how to integrate enhanced binder strategies into the component synthesis process
 */

import {
  EnhancedBindingContext,
  EnhancedBindingResult,
  CapabilityData,
  BindingDirective
} from './enhanced-binding-context.js';
import { EnhancedBinderRegistry } from './enhanced-binder-registry.js';
import { Component } from './component.js';

/**
 * Integration example for component synthesis process
 */
export class BinderIntegration {
  private binderRegistry: EnhancedBinderRegistry;

  constructor() {
    this.binderRegistry = new EnhancedBinderRegistry();
  }

  /**
   * Process component bindings during synthesis
   */
  async processComponentBindings(
    components: Component[],
    environment: string = 'dev',
    complianceFramework: string = 'commercial'
  ): Promise<Array<{ source: string; target: string; result: EnhancedBindingResult }>> {

    const bindingResults: Array<{ source: string; target: string; result: EnhancedBindingResult }> = [];

    // Process each component's bindings
    for (const sourceComponent of components) {
      if (!sourceComponent.spec.binds || !Array.isArray(sourceComponent.spec.binds)) {
        continue;
      }

      for (const bindDirective of sourceComponent.spec.binds) {
        try {
          // Resolve target component
          const targetComponent = this.resolveTargetComponent(bindDirective, components);

          if (!targetComponent) {
            throw new Error(`Cannot resolve target component for binding: ${JSON.stringify(bindDirective)}`);
          }

          // Get target capability data
          const targetCapabilityData = this.extractCapabilityData(targetComponent, bindDirective.capability);

          if (!targetCapabilityData) {
            throw new Error(`Target component ${targetComponent.spec.name} does not provide capability ${bindDirective.capability}`);
          }

          // Create enhanced binding context
          const bindingContext: EnhancedBindingContext = {
            source: sourceComponent,
            target: targetComponent,
            directive: bindDirective,
            environment,
            complianceFramework: complianceFramework as any,
            targetCapabilityData,
            options: bindDirective.options
          };

          // Validate binding context
          const validation = this.binderRegistry.validateBindingContext(bindingContext);
          if (!validation.valid) {
            throw new Error(`Invalid binding context: ${validation.errors.join(', ')}`);
          }

          // Execute binding with compliance enforcement
          const bindingResult = await this.binderRegistry.bind(bindingContext);

          bindingResults.push({
            source: sourceComponent.spec.name,
            target: targetComponent.spec.name,
            result: bindingResult
          });

          console.log(`✅ Bound ${sourceComponent.spec.name} -> ${targetComponent.spec.name} (${bindDirective.capability})`);

        } catch (error) {
          console.error(`❌ Failed to bind ${sourceComponent.spec.name} -> ${bindDirective.to || 'selector'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      }
    }

    return bindingResults;
  }

  /**
   * Resolve target component from binding directive
   */
  private resolveTargetComponent(directive: BindingDirective, components: Component[]): Component | null {
    if (directive.to) {
      // Direct component name reference
      return components.find(comp => comp.spec.name === directive.to) || null;
    }

    if (directive.select) {
      // Component selector
      return components.find(comp => {
        if (comp.spec.type !== directive.select!.type) {
          return false;
        }

        if (directive.select!.withLabels) {
          const componentLabels = comp.spec.labels || {};
          return Object.entries(directive.select!.withLabels).every(([key, value]) =>
            componentLabels[key] === value
          );
        }

        return true;
      }) || null;
    }

    return null;
  }

  /**
   * Extract capability data from target component
   */
  private extractCapabilityData(targetComponent: Component, capability: string): CapabilityData | null {
    const capabilities = targetComponent.getCapabilities();

    if (!capabilities || !capabilities[capability]) {
      return null;
    }

    const capabilityInfo = capabilities[capability];

    // Transform component capability data to standardized format
    return {
      type: capability,
      endpoints: capabilityInfo.endpoints || {},
      resources: capabilityInfo.resources || {},
      securityGroups: capabilityInfo.securityGroups || [],
      secrets: capabilityInfo.secrets || {},
      ...capabilityInfo // Include any additional capability-specific data
    };
  }

  /**
   * Apply binding results to components
   */
  applyBindingResults(
    components: Component[],
    bindingResults: Array<{ source: string; target: string; result: EnhancedBindingResult }>
  ): void {

    for (const bindingResult of bindingResults) {
      const sourceComponent = components.find(comp => comp.spec.name === bindingResult.source);

      if (!sourceComponent) {
        console.warn(`Source component ${bindingResult.source} not found for applying binding results`);
        continue;
      }

      // Apply environment variables
      const envVars = bindingResult.result.environmentVariables;
      Object.entries(envVars).forEach(([key, value]) => {
        // This would integrate with the component's environment variable system
        console.log(`Setting ${key}=${value} for ${sourceComponent.spec.name}`);
      });

      // Apply IAM policies
      const iamPolicies = bindingResult.result.iamPolicies;
      iamPolicies.forEach(policy => {
        // This would integrate with the component's IAM role system
        console.log(`Applying IAM policy: ${policy.description} to ${sourceComponent.spec.name}`);
      });

      // Apply security group rules
      const securityGroupRules = bindingResult.result.securityGroupRules;
      securityGroupRules.forEach(rule => {
        // This would integrate with the component's security group system
        console.log(`Applying security group rule: ${rule.description} for ${sourceComponent.spec.name}`);
      });

      // Log compliance actions
      const complianceActions = bindingResult.result.complianceActions;
      complianceActions.forEach(action => {
        console.log(`Compliance action: ${action.description} (${action.framework})`);
      });
    }
  }

  /**
   * Get binding statistics
   */
  getBindingStatistics(bindingResults: Array<{ source: string; target: string; result: EnhancedBindingResult }>): {
    totalBindings: number;
    byCapability: Record<string, number>;
    byComplianceFramework: Record<string, number>;
    complianceViolations: number;
  } {
    const stats = {
      totalBindings: bindingResults.length,
      byCapability: {} as Record<string, number>,
      byComplianceFramework: {} as Record<string, number>,
      complianceViolations: 0
    };

    bindingResults.forEach(({ result }) => {
      // Count by capability (from binding result metadata)
      const capability = 'unknown'; // This would be extracted from the binding context
      stats.byCapability[capability] = (stats.byCapability[capability] || 0) + 1;

      // Count by compliance framework
      const framework = result.metadata.framework;
      stats.byComplianceFramework[framework] = (stats.byComplianceFramework[framework] || 0) + 1;

      // Count compliance violations
      stats.complianceViolations += result.complianceActions.length;
    });

    return stats;
  }

  /**
   * Validate all bindings for compliance
   */
  validateBindingsCompliance(
    components: Component[],
    complianceFramework: string = 'commercial'
  ): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];

    for (const component of components) {
      if (!component.spec.binds) continue;

      for (const bindDirective of component.spec.binds) {
        try {
          const targetComponent = this.resolveTargetComponent(bindDirective, components);
          if (!targetComponent) {
            violations.push(`Cannot resolve target for ${component.spec.name} -> ${bindDirective.to || 'selector'}`);
            continue;
          }

          const targetCapabilityData = this.extractCapabilityData(targetComponent, bindDirective.capability);
          if (!targetCapabilityData) {
            violations.push(`Target ${targetComponent.spec.name} does not provide capability ${bindDirective.capability}`);
            continue;
          }

          const bindingContext: EnhancedBindingContext = {
            source: component,
            target: targetComponent,
            directive: bindDirective,
            environment: 'validation',
            complianceFramework: complianceFramework as any,
            targetCapabilityData
          };

          const complianceResult = this.binderRegistry.getComplianceStatus(bindingContext);
          if (!complianceResult.compliant) {
            const errorViolations = complianceResult.violations
              .filter(v => v.severity === 'error')
              .map(v => `${component.spec.name}: ${v.description}`);
            violations.push(...errorViolations);
          }

        } catch (error) {
          violations.push(`${component.spec.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }
}
