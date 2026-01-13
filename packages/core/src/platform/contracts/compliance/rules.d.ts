/**
 * Compliance Rules Catalog
 *
 * Loads compliance rules from YAML config files in a config-driven approach.
 * Supports built-in framework packs, custom packs, and runtime overrides.
 *
 * Priority order:
 * 1. User override (context.options.complianceRulesOverride)
 * 2. Custom user config file (customConfigPath)
 * 3. Built-in framework config (config/{framework}.yml)
 * 4. Fallback minimal rules
 */
import type { ComplianceFramework } from '../bindings.js';
/**
 * Compliance rule configuration from YAML
 */
export interface ComplianceRuleConfig {
    categories: string[];
    severity?: 'error' | 'warning' | 'info';
    description?: string;
}
/**
 * Compliance rules configuration map
 * Key: rule name (e.g., 'encryptionAtRest')
 * Value: rule configuration
 */
export interface ComplianceRulesConfig {
    [ruleName: string]: ComplianceRuleConfig;
}
/**
 * Load compliance rules from config YAML file
 *
 * Supports:
 * - Built-in packs (config/commercial.yml, config/fedramp-moderate.yml, etc.)
 * - Custom user packs via customConfigPath
 * - Escape hatch via rulesOverride in context.options (commercial framework only)
 *
 * SECURITY: Rules override is restricted to 'commercial' framework only.
 * FedRAMP frameworks (fedramp-moderate, fedramp-high) reject overrides
 * to prevent compliance violations.
 *
 * Expected YAML structure:
 * ```yaml
 * defaults:
 *   compliance:
 *     rules:
 *       encryptionAtRest:
 *         categories: ['database', 'storage']
 *         severity: error
 *       encryptionInTransit:
 *         categories: ['database', 'storage', 'messaging']
 *         severity: error
 * ```
 *
 * @param framework - Compliance framework name
 * @param customConfigPath - Optional path to custom config file
 * @param rulesOverride - Optional runtime override rules (commercial framework only)
 * @returns Compliance rules configuration map
 * @throws Error if override attempted in non-commercial framework
 */
export declare function loadComplianceRules(framework: ComplianceFramework, customConfigPath?: string, rulesOverride?: ComplianceRulesConfig): ComplianceRulesConfig;
/**
 * Get required rules for a category under a specific framework
 *
 * @param framework - Compliance framework
 * @param category - Category name (e.g., 'database', 'storage', 'all')
 * @param customConfigPath - Optional custom config path
 * @param rulesOverride - Optional runtime override
 * @returns Array of required rule names
 */
export declare function getRequiredRules(framework: ComplianceFramework, category: string, customConfigPath?: string, rulesOverride?: ComplianceRulesConfig): string[];
/**
 * Check if a rule is required for a category under a framework
 *
 * @param framework - Compliance framework
 * @param ruleName - Rule name to check
 * @param category - Category name
 * @param customConfigPath - Optional custom config path
 * @param rulesOverride - Optional runtime override
 * @returns True if rule is required for the category
 */
export declare function isRuleRequired(framework: ComplianceFramework, ruleName: string, category: string, customConfigPath?: string, rulesOverride?: ComplianceRulesConfig): boolean;
/**
 * Get rule configuration for a specific rule
 *
 * @param framework - Compliance framework
 * @param ruleName - Rule name
 * @param customConfigPath - Optional custom config path
 * @param rulesOverride - Optional runtime override
 * @returns Rule configuration or undefined if not found
 */
export declare function getRuleConfig(framework: ComplianceFramework, ruleName: string, customConfigPath?: string, rulesOverride?: ComplianceRulesConfig): ComplianceRuleConfig | undefined;
//# sourceMappingURL=rules.d.ts.map