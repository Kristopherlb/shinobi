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

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
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

// Types are exported above - available for strategy authors

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
export function loadComplianceRules(
  framework: ComplianceFramework,
  customConfigPath?: string,
  rulesOverride?: ComplianceRulesConfig
): ComplianceRulesConfig {
  // Priority 1: User override (escape hatch) - restricted to commercial framework
  if (rulesOverride) {
    // Validate framework restriction
    if (framework !== 'commercial') {
      const errorMessage = `Compliance rules override is not allowed in ${framework} framework. ` +
        `Override is only permitted in 'commercial' framework for development/testing purposes. ` +
        `This restriction prevents compliance violations in production frameworks.`;
      
      // Audit log
      console.error(`[COMPLIANCE-AUDIT] ${errorMessage}`);
      
      throw new Error(errorMessage);
    }
    
    // Audit log: override allowed in commercial framework
    console.info(`[COMPLIANCE-AUDIT] Compliance rules override applied in commercial framework. ` +
      `Override contains ${Object.keys(rulesOverride).length} rule(s).`);
    
    return rulesOverride;
  }
  
  // Priority 2: Custom user config file
  if (customConfigPath && fs.existsSync(customConfigPath)) {
    try {
      const config = yaml.load(fs.readFileSync(customConfigPath, 'utf8')) as any;
      const rules = config?.defaults?.compliance?.rules || config?.compliance?.rules || {};
      if (Object.keys(rules).length > 0) {
        return validateRulesConfig(rules);
      }
    } catch (error) {
      console.warn(`Failed to load custom compliance rules from ${customConfigPath}:`, error);
    }
  }
  
  // Priority 3: Built-in framework config
  // Support config directory override via environment variable (for CDK synth safety)
  const configDir = process.env.COMPLIANCE_CONFIG_DIR || path.join(process.cwd(), 'config');
  const configPath = path.join(configDir, `${framework}.yml`);
  if (fs.existsSync(configPath)) {
    try {
      const config = yaml.load(fs.readFileSync(configPath, 'utf8')) as any;
      const rules = config?.defaults?.compliance?.rules || config?.compliance?.rules || {};
      if (Object.keys(rules).length > 0) {
        return validateRulesConfig(rules);
      }
    } catch (error) {
      console.warn(`Failed to load compliance rules from ${configPath}:`, error);
    }
  }
  
  // Priority 4: Fallback to minimal rules
  return getDefaultComplianceRules(framework);
}

/**
 * Get required rules for a category under a specific framework
 * 
 * @param framework - Compliance framework
 * @param category - Category name (e.g., 'database', 'storage', 'all')
 * @param customConfigPath - Optional custom config path
 * @param rulesOverride - Optional runtime override
 * @returns Array of required rule names
 */
export function getRequiredRules(
  framework: ComplianceFramework,
  category: string,
  customConfigPath?: string,
  rulesOverride?: ComplianceRulesConfig
): string[] {
  const rules = loadComplianceRules(framework, customConfigPath, rulesOverride);
  return Object.entries(rules)
    .filter(([_, ruleConfig]) => 
      ruleConfig.categories.includes(category) || ruleConfig.categories.includes('all')
    )
    .map(([ruleName]) => ruleName);
}

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
export function isRuleRequired(
  framework: ComplianceFramework,
  ruleName: string,
  category: string,
  customConfigPath?: string,
  rulesOverride?: ComplianceRulesConfig
): boolean {
  const rules = loadComplianceRules(framework, customConfigPath, rulesOverride);
  const ruleConfig = rules[ruleName];
  if (!ruleConfig) {
    return false;
  }
  return ruleConfig.categories.includes(category) || ruleConfig.categories.includes('all');
}

/**
 * Get rule configuration for a specific rule
 * 
 * @param framework - Compliance framework
 * @param ruleName - Rule name
 * @param customConfigPath - Optional custom config path
 * @param rulesOverride - Optional runtime override
 * @returns Rule configuration or undefined if not found
 */
export function getRuleConfig(
  framework: ComplianceFramework,
  ruleName: string,
  customConfigPath?: string,
  rulesOverride?: ComplianceRulesConfig
): ComplianceRuleConfig | undefined {
  const rules = loadComplianceRules(framework, customConfigPath, rulesOverride);
  return rules[ruleName];
}

/**
 * Validate and normalize rules configuration loaded from YAML
 * Provides type safety and prevents runtime errors from malformed config
 * 
 * @param rules - Raw rules object from YAML
 * @returns Validated compliance rules configuration
 */
function validateRulesConfig(rules: any): ComplianceRulesConfig {
  if (!rules || typeof rules !== 'object') {
    return {};
  }
  
  const validated: ComplianceRulesConfig = {};
  for (const [name, config] of Object.entries(rules)) {
    if (config && typeof config === 'object' && Array.isArray((config as any).categories)) {
      validated[name] = {
        categories: (config as any).categories,
        severity: (config as any).severity || 'error',
        description: (config as any).description || ''
      };
    }
  }
  return validated;
}

/**
 * Fallback rules if config file not found
 * Should never be hit if config files exist, but provides safety net
 * 
 * @param framework - Compliance framework
 * @returns Fallback compliance rules configuration
 */
function getDefaultComplianceRules(framework: ComplianceFramework): ComplianceRulesConfig {
  // Core rules as fallback - should never be hit if config files exist
  return {
    leastPrivilegeIAM: {
      categories: ['all'],
      severity: 'error',
      description: 'IAM policies must follow least privilege principle'
    },
    encryptionAtRest: {
      categories: ['database', 'storage'],
      severity: 'error',
      description: 'Sensitive data must be encrypted at rest'
    },
    encryptionInTransit: {
      categories: ['database', 'storage', 'messaging'],
      severity: 'error',
      description: 'Data in transit must be encrypted'
    }
  };
}
