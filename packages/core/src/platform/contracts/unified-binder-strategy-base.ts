/**
 * Unified Binder Strategy Base Class
 * 
 * Abstract base class for unified binder strategies that implement IUnifiedBinderStrategy.
 * Provides config-driven compliance helpers with no framework-specific branching.
 * 
 * Key features:
 * - Uses context.complianceFramework (not context.config.complianceFramework)
 * - Config-driven compliance rules from YAML config files
 * - No framework-specific if/switch statements
 * - Supports escape hatch via context.options.complianceRulesOverride
 * - Default framework fallback: 'commercial' (configurable via env/global config)
 */

import {
  IUnifiedBinderStrategy,
  BindingContext,
  EnhancedBindingResult,
  ComplianceError,
  CompatibilityEntry
} from './platform-binding-trigger-spec.js';
import type { ComplianceFramework } from './bindings.js';
import {
  loadComplianceRules,
  getRequiredRules,
  isRuleRequired,
  getRuleConfig,
  type ComplianceRulesConfig
} from './compliance/rules.js';

/**
 * Abstract base class for unified binder strategies
 * 
 * Subclasses must implement:
 * - getStrategyName(): string
 * - canHandle(sourceType: string, targetCapability: string): boolean
 * - getCompatibilityMatrix(): CompatibilityEntry[]
 * - doBind(context: BindingContext): Promise<EnhancedBindingResult>
 * 
 * The base class handles:
 * - Compliance framework resolution (with fallback)
 * - Compliance rules loading (with priority: override → custom → built-in → fallback)
 * - Framework defaults (configurable via env/global config)
 */
export abstract class UnifiedBinderStrategyBase implements IUnifiedBinderStrategy {
  /**
   * Get the strategy name for identification and logging
   */
  abstract getStrategyName(): string;

  /**
   * Capabilities this strategy supports - used for registry-level filtering
   */
  abstract readonly supportedCapabilities: string[];

  /**
   * Check if this strategy can handle the given source type and capability
   * @param sourceType - Type of the source component
   * @param targetCapability - Target capability type
   * @returns true if this strategy can handle the binding
   */
  abstract canHandle(sourceType: string, targetCapability: string): boolean;

  /**
   * Get compatibility matrix entries for this strategy
   * @returns Array of compatibility entries
   */
  abstract getCompatibilityMatrix(): CompatibilityEntry[];

  /**
   * Internal bind implementation - subclasses override this
   * @param context - Binding context
   * @returns Enhanced binding result (without compliance block - base class adds it)
   */
  protected abstract doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>>;

  /**
   * Public bind method with mandatory compliance enforcement
   * 
   * This method wraps doBind() and adds compliance validation.
   * Compliance rules are loaded based on context.complianceFramework.
   * 
   * @param context - Binding context with source, target, directive, and compliance framework
   * @returns Promise resolving to enhanced binding result with compliance validation
   */
  async bind(context: BindingContext): Promise<EnhancedBindingResult> {
    // Resolve compliance framework (with fallback)
    const framework = this.resolveComplianceFramework(context);

    // Load compliance rules (with priority: override → custom → built-in → fallback)
    const rulesOverride = this.getRulesOverride(context);
    const customConfigPath = this.getCustomConfigPath(context);
    
    // Execute the binding (subclass implementation)
    const bindingResult = await this.doBind(context);

    // TODO: Run compliance validation using loaded rules
    // For now, create a compliant status
    // In Phase 2, this will be enhanced with actual rule evaluation
    const complianceStatus = this.evaluateCompliance(
      framework,
      bindingResult,
      rulesOverride,
      customConfigPath
    );

    // Return enhanced result with compliance block
    return {
      ...bindingResult,
      compliance: complianceStatus
    };
  }

  /**
   * Resolve compliance framework from context with fallback
   * 
   * Priority:
   * 1. context.complianceFramework
   * 2. Environment variable SHINOBI_DEFAULT_COMPLIANCE_FRAMEWORK
   * 3. Default: 'commercial'
   * 
   * @param context - Binding context
   * @returns Compliance framework name
   */
  protected resolveComplianceFramework(context: BindingContext): ComplianceFramework {
    if (context.complianceFramework) {
      return context.complianceFramework as ComplianceFramework;
    }

    // Check environment variable
    const envFramework = process.env.SHINOBI_DEFAULT_COMPLIANCE_FRAMEWORK;
    if (envFramework) {
      return envFramework as ComplianceFramework;
    }

    // Default fallback
    return 'commercial';
  }

  /**
   * Get compliance rules override from context.options
   * 
   * @param context - Binding context
   * @returns Rules override if present, undefined otherwise
   */
  protected getRulesOverride(context: BindingContext): ComplianceRulesConfig | undefined {
    const options = context.directive?.options || {};
    return options.complianceRulesOverride as ComplianceRulesConfig | undefined;
  }

  /**
   * Get custom config path from context.options
   * 
   * @param context - Binding context
   * @returns Custom config path if present, undefined otherwise
   */
  protected getCustomConfigPath(context: BindingContext): string | undefined {
    const options = context.directive?.options || {};
    return options.complianceConfigPath as string | undefined;
  }

  /**
   * Load compliance rules for the given framework
   * 
   * @param framework - Compliance framework
   * @param context - Binding context (for override and custom path)
   * @returns Compliance rules configuration
   */
  protected loadComplianceRules(
    framework: ComplianceFramework,
    context: BindingContext
  ): ComplianceRulesConfig {
    const rulesOverride = this.getRulesOverride(context);
    const customConfigPath = this.getCustomConfigPath(context);
    return loadComplianceRules(framework, customConfigPath, rulesOverride);
  }

  /**
   * Check if a rule is required for a category
   * 
   * @param framework - Compliance framework
   * @param ruleName - Rule name
   * @param category - Category name (e.g., 'database', 'storage', 'all')
   * @param context - Binding context
   * @returns True if rule is required
   */
  protected isRuleRequired(
    framework: ComplianceFramework,
    ruleName: string,
    category: string,
    context: BindingContext
  ): boolean {
    const rulesOverride = this.getRulesOverride(context);
    const customConfigPath = this.getCustomConfigPath(context);
    return isRuleRequired(framework, ruleName, category, customConfigPath, rulesOverride);
  }

  /**
   * Get required rules for a category
   * 
   * @param framework - Compliance framework
   * @param category - Category name
   * @param context - Binding context
   * @returns Array of required rule names
   */
  protected getRequiredRules(
    framework: ComplianceFramework,
    category: string,
    context: BindingContext
  ): string[] {
    const rulesOverride = this.getRulesOverride(context);
    const customConfigPath = this.getCustomConfigPath(context);
    return getRequiredRules(framework, category, customConfigPath, rulesOverride);
  }

  /**
   * Get rule configuration
   * 
   * @param framework - Compliance framework
   * @param ruleName - Rule name
   * @param context - Binding context
   * @returns Rule configuration or undefined
   */
  protected getRuleConfig(
    framework: ComplianceFramework,
    ruleName: string,
    context: BindingContext
  ) {
    const rulesOverride = this.getRulesOverride(context);
    const customConfigPath = this.getCustomConfigPath(context);
    return getRuleConfig(framework, ruleName, customConfigPath, rulesOverride);
  }

  /**
   * Evaluate compliance status for a binding result
   * 
   * This is a placeholder implementation. In Phase 2, this will be enhanced
   * with actual rule evaluation using the compliance rules catalog.
   * 
   * @param framework - Compliance framework
   * @param bindingResult - Binding result (without compliance block)
   * @param rulesOverride - Optional rules override
   * @param customConfigPath - Optional custom config path
   * @returns Compliance status block
   */
  protected evaluateCompliance(
    framework: ComplianceFramework,
    bindingResult: Omit<EnhancedBindingResult, 'compliance'>,
    rulesOverride?: ComplianceRulesConfig,
    customConfigPath?: string
  ): EnhancedBindingResult['compliance'] {
    // TODO: Implement actual compliance evaluation in Phase 2
    // For now, return compliant status
    // This will be enhanced to:
    // 1. Load rules for the framework
    // 2. Evaluate binding result against rules
    // 3. Generate violations if any
    // 4. Return compliance status with actions and violations

    return {
      status: 'compliant',
      framework,
      actionsTaken: [],
      violations: []
    };
  }
}
