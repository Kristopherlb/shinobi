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
import { IUnifiedBinderStrategy, BindingContext, EnhancedBindingResult, CompatibilityEntry } from './platform-binding-trigger-spec.js';
import type { ComplianceFramework } from './bindings.js';
import type { ComplianceViolation } from './compliance/compliance-violation.js';
import { type ComplianceRulesConfig } from './compliance/rules.js';
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
export declare abstract class UnifiedBinderStrategyBase implements IUnifiedBinderStrategy {
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
    bind(context: BindingContext): Promise<EnhancedBindingResult>;
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
    protected resolveComplianceFramework(context: BindingContext): ComplianceFramework;
    /**
     * Get compliance rules override from context.options
     *
     * SECURITY: Override is restricted to 'commercial' framework only.
     * FedRAMP frameworks (fedramp-moderate, fedramp-high) reject overrides
     * to prevent compliance violations.
     *
     * @param context - Binding context
     * @returns Rules override if present and allowed, undefined otherwise
     * @throws ComplianceError if override attempted in non-commercial framework
     */
    protected getRulesOverride(context: BindingContext): ComplianceRulesConfig | undefined;
    /**
     * Get custom config path from context.options
     *
     * @param context - Binding context
     * @returns Custom config path if present, undefined otherwise
     */
    protected getCustomConfigPath(context: BindingContext): string | undefined;
    /**
     * Load compliance rules for the given framework
     *
     * @param framework - Compliance framework
     * @param context - Binding context (for override and custom path)
     * @returns Compliance rules configuration
     */
    protected loadComplianceRules(framework: ComplianceFramework, context: BindingContext): ComplianceRulesConfig;
    /**
     * Check if a rule is required for a category
     *
     * @param framework - Compliance framework
     * @param ruleName - Rule name
     * @param category - Category name (e.g., 'database', 'storage', 'all')
     * @param context - Binding context
     * @returns True if rule is required
     */
    protected isRuleRequired(framework: ComplianceFramework, ruleName: string, category: string, context: BindingContext): boolean;
    /**
     * Get required rules for a category
     *
     * @param framework - Compliance framework
     * @param category - Category name
     * @param context - Binding context
     * @returns Array of required rule names
     */
    protected getRequiredRules(framework: ComplianceFramework, category: string, context: BindingContext): string[];
    /**
     * Get rule configuration
     *
     * @param framework - Compliance framework
     * @param ruleName - Rule name
     * @param context - Binding context
     * @returns Rule configuration or undefined
     */
    protected getRuleConfig(framework: ComplianceFramework, ruleName: string, context: BindingContext): import("./compliance/rules.js").ComplianceRuleConfig | undefined;
    /**
     * Get compliance category for this strategy based on capability
     *
     * Maps capabilities to compliance categories for rule evaluation.
     * Subclasses can override to provide custom category mapping.
     *
     * @param capability - Target capability (e.g., 'kms:key', 'secretsmanager:secret')
     * @returns Compliance category (e.g., 'security', 'database', 'storage')
     */
    protected getComplianceCategory(capability: string): string;
    /**
     * Evaluate compliance status for a binding result
     *
     * Loads compliance rules for the framework and category, then evaluates
     * the binding result against those rules. Generates violations for
     * unsatisfied rules and determines compliance status.
     *
     * @param framework - Compliance framework
     * @param context - Binding context (for capability and rule loading)
     * @param bindingResult - Binding result (without compliance block)
     * @param rulesOverride - Optional rules override
     * @param customConfigPath - Optional custom config path
     * @returns Compliance status block with violations and actions
     */
    protected evaluateCompliance(framework: ComplianceFramework, context: BindingContext, bindingResult: Omit<EnhancedBindingResult, 'compliance'>, rulesOverride?: ComplianceRulesConfig, customConfigPath?: string): EnhancedBindingResult['compliance'];
    /**
     * Evaluate a single compliance rule against the binding result
     *
     * Subclasses can override to provide custom rule evaluation logic
     * for specific rules or capabilities.
     *
     * @param ruleName - Rule name (e.g., 'encryptionAtRest', 'leastPrivilegeIAM')
     * @param ruleConfig - Rule configuration from catalog
     * @param framework - Compliance framework
     * @param context - Binding context
     * @param bindingResult - Binding result to evaluate
     * @returns Compliance violation if rule is not satisfied, undefined otherwise
     */
    protected evaluateRule(ruleName: string, ruleConfig: {
        categories: string[];
        severity?: 'error' | 'warning' | 'info';
        description?: string;
    }, framework: ComplianceFramework, context: BindingContext, bindingResult: Omit<EnhancedBindingResult, 'compliance'>): ComplianceViolation | undefined;
    /**
     * Evaluate encryption at rest rule
     * Checks if encryption is configured in environment variables or IAM policies
     */
    protected evaluateEncryptionAtRest(ruleConfig: {
        categories: string[];
        severity?: 'error' | 'warning' | 'info';
        description?: string;
    }, framework: ComplianceFramework, context: BindingContext, bindingResult: Omit<EnhancedBindingResult, 'compliance'>): ComplianceViolation | undefined;
    /**
     * Evaluate encryption in transit rule
     * Checks if TLS/HTTPS is required or configured
     */
    protected evaluateEncryptionInTransit(ruleConfig: {
        categories: string[];
        severity?: 'error' | 'warning' | 'info';
        description?: string;
    }, framework: ComplianceFramework, context: BindingContext, bindingResult: Omit<EnhancedBindingResult, 'compliance'>): ComplianceViolation | undefined;
    /**
     * Evaluate least privilege IAM rule
     * Basic check - can be enhanced with more sophisticated analysis
     */
    protected evaluateLeastPrivilegeIAM(ruleConfig: {
        categories: string[];
        severity?: 'error' | 'warning' | 'info';
        description?: string;
    }, framework: ComplianceFramework, context: BindingContext, bindingResult: Omit<EnhancedBindingResult, 'compliance'>): ComplianceViolation | undefined;
}
//# sourceMappingURL=unified-binder-strategy-base.d.ts.map