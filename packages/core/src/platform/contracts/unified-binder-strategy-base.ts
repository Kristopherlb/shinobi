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
import type { ComplianceViolation } from './compliance/compliance-violation.js';
import type { ComplianceAction } from './bindings.js';
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

    // Run compliance validation using loaded rules
    const complianceStatus = this.evaluateCompliance(
      framework,
      context,
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
   * Get compliance category for this strategy based on capability
   * 
   * Maps capabilities to compliance categories for rule evaluation.
   * Subclasses can override to provide custom category mapping.
   * 
   * @param capability - Target capability (e.g., 'kms:key', 'secretsmanager:secret')
   * @returns Compliance category (e.g., 'security', 'database', 'storage')
   */
  protected getComplianceCategory(capability: string): string {
    // Map capabilities to categories based on prefix
    if (capability.startsWith('kms:') || capability.startsWith('secretsmanager:') || 
        capability.startsWith('certificate:') || capability.startsWith('auth:')) {
      return 'security';
    }
    if (capability.startsWith('db:') || capability.startsWith('database:') || 
        capability.includes('dynamodb') || capability.includes('rds') || 
        capability.includes('neptune')) {
      return 'database';
    }
    if (capability.startsWith('storage:') || capability.includes('s3') || 
        capability.includes('efs')) {
      return 'storage';
    }
    if (capability.includes('kinesis') || capability.includes('emr')) {
      return 'analytics';
    }
    if (capability.includes('eventbridge') || capability.includes('sqs') || 
        capability.includes('sns') || capability.includes('stepfunctions')) {
      return 'messaging';
    }
    
    // Default to 'all' category if no specific match
    return 'all';
  }

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
  protected evaluateCompliance(
    framework: ComplianceFramework,
    context: BindingContext,
    bindingResult: Omit<EnhancedBindingResult, 'compliance'>,
    rulesOverride?: ComplianceRulesConfig,
    customConfigPath?: string
  ): EnhancedBindingResult['compliance'] {
    // Determine category from capability
    const capability = context.directive.capability;
    const category = this.getComplianceCategory(capability);

    // Load required rules for this category
    const rules = loadComplianceRules(framework, customConfigPath, rulesOverride);
    const requiredRuleNames = getRequiredRules(framework, category, customConfigPath, rulesOverride);

    // Collect actions taken from IAM policies
    const actionsTaken: ComplianceAction[] = bindingResult.iamPolicies
      .filter(policy => policy.complianceRequirement)
      .map(policy => ({
        ruleId: policy.complianceRequirement,
        severity: 'info' as const,
        message: policy.description || 'Compliance action applied',
        remediation: policy.description || '',
        framework
      }));

    // Evaluate each required rule
    const violations: ComplianceViolation[] = [];
    for (const ruleName of requiredRuleNames) {
      const ruleConfig = getRuleConfig(framework, ruleName, customConfigPath, rulesOverride);
      if (!ruleConfig) {
        continue; // Rule not found, skip
      }

      // Evaluate rule - check if binding result satisfies the rule
      const violation = this.evaluateRule(
        ruleName,
        ruleConfig,
        framework,
        context,
        bindingResult
      );

      if (violation) {
        violations.push(violation);
      }
    }

    // Determine compliance status based on violations
    const errorViolations = violations.filter(v => v.severity === 'error');
    const warningViolations = violations.filter(v => v.severity === 'warning');

    let status: 'compliant' | 'non-compliant' | 'partially-compliant';
    if (errorViolations.length > 0) {
      status = 'non-compliant';
    } else if (warningViolations.length > 0) {
      status = 'partially-compliant';
    } else {
      status = 'compliant';
    }

    return {
      status,
      framework,
      actionsTaken,
      violations: violations.length > 0 ? violations : undefined
    };
  }

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
  protected evaluateRule(
    ruleName: string,
    ruleConfig: { categories: string[]; severity?: 'error' | 'warning' | 'info'; description?: string },
    framework: ComplianceFramework,
    context: BindingContext,
    bindingResult: Omit<EnhancedBindingResult, 'compliance'>
  ): ComplianceViolation | undefined {
    // Map rule names to evaluation functions
    switch (ruleName) {
      case 'encryptionAtRest':
        return this.evaluateEncryptionAtRest(ruleConfig, framework, context, bindingResult);
      case 'encryptionInTransit':
        return this.evaluateEncryptionInTransit(ruleConfig, framework, context, bindingResult);
      case 'leastPrivilegeIAM':
        return this.evaluateLeastPrivilegeIAM(ruleConfig, framework, context, bindingResult);
      default:
        // For unknown rules, return undefined (assume satisfied)
        // This allows new rules to be added to config without code changes
        return undefined;
    }
  }

  /**
   * Evaluate encryption at rest rule
   * Checks if encryption is configured in environment variables or IAM policies
   */
  protected evaluateEncryptionAtRest(
    ruleConfig: { categories: string[]; severity?: 'error' | 'warning' | 'info'; description?: string },
    framework: ComplianceFramework,
    context: BindingContext,
    bindingResult: Omit<EnhancedBindingResult, 'compliance'>
  ): ComplianceViolation | undefined {
    // Check environment variables for encryption indicators
    const envVars = bindingResult.environmentVariables;
    const hasEncryption = 
      envVars['KMS_KEY_ID'] || envVars['KMS_KEY_ARN'] ||
      envVars['SECRETS_MANAGER_KMS_KEY_ID'] ||
      envVars['CERTIFICATE_KEY_ALGORITHM'] ||
      // Check IAM policies for KMS encryption actions
      bindingResult.iamPolicies.some(policy => {
        const statementJson = policy.statement.toStatementJson();
        const actions = Array.isArray(statementJson.Action) 
          ? statementJson.Action 
          : [statementJson.Action];
        return actions.some((action: string) => 
          action.includes('kms:Encrypt') || 
          action.includes('kms:Decrypt') ||
          action.includes('kms:GenerateDataKey')
        );
      });

    if (!hasEncryption) {
      return {
        type: 'data_protection',
        severity: ruleConfig.severity || 'error',
        description: ruleConfig.description || 'Encryption at rest is required but not configured',
        ruleId: 'encryptionAtRest',
        framework,
        remediation: 'Enable encryption at rest by configuring KMS keys or encryption settings',
        context: { capability: context.directive.capability }
      };
    }

    return undefined;
  }

  /**
   * Evaluate encryption in transit rule
   * Checks if TLS/HTTPS is required or configured
   */
  protected evaluateEncryptionInTransit(
    ruleConfig: { categories: string[]; severity?: 'error' | 'warning' | 'info'; description?: string },
    framework: ComplianceFramework,
    context: BindingContext,
    bindingResult: Omit<EnhancedBindingResult, 'compliance'>
  ): ComplianceViolation | undefined {
    // Check environment variables for TLS/HTTPS indicators
    const envVars = bindingResult.environmentVariables;
    const hasTls = 
      envVars['REQUIRE_TLS'] === 'true' ||
      envVars['FORCE_HTTPS'] === 'true' ||
      envVars['TLS_ENABLED'] === 'true' ||
      // Check if endpoint URLs use https://
      Object.values(envVars).some(value => 
        typeof value === 'string' && value.startsWith('https://')
      );

    // For security services (KMS, Secrets Manager), encryption in transit is typically handled by AWS
    // So we're more lenient - only flag if there's explicit non-HTTPS configuration
    const capability = context.directive.capability;
    if (capability.startsWith('kms:') || capability.startsWith('secretsmanager:') || 
        capability.startsWith('certificate:')) {
      // AWS services handle TLS by default, assume compliant
      return undefined;
    }

    // For other services, check if TLS is explicitly disabled or missing
    if (envVars['REQUIRE_TLS'] === 'false' || envVars['FORCE_HTTPS'] === 'false') {
      return {
        type: 'network',
        severity: ruleConfig.severity || 'error',
        description: ruleConfig.description || 'Encryption in transit is required but TLS is disabled',
        ruleId: 'encryptionInTransit',
        framework,
        remediation: 'Enable TLS/HTTPS encryption for all network connections',
        context: { capability }
      };
    }

    return undefined;
  }

  /**
   * Evaluate least privilege IAM rule
   * Basic check - can be enhanced with more sophisticated analysis
   */
  protected evaluateLeastPrivilegeIAM(
    ruleConfig: { categories: string[]; severity?: 'error' | 'warning' | 'info'; description?: string },
    framework: ComplianceFramework,
    context: BindingContext,
    bindingResult: Omit<EnhancedBindingResult, 'compliance'>
  ): ComplianceViolation | undefined {
    // Check for overly permissive IAM policies
    for (const policy of bindingResult.iamPolicies) {
      const statementJson = policy.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action) 
        ? statementJson.Action 
        : [statementJson.Action];
      
      // Check for wildcard actions
      if (actions.includes('*') || actions.includes('*:*')) {
        return {
          type: 'iam',
          severity: ruleConfig.severity || 'error',
          description: ruleConfig.description || 'IAM policy contains wildcard actions, violating least privilege',
          ruleId: 'leastPrivilegeIAM',
          framework,
          remediation: 'Replace wildcard actions with specific, least-privilege actions',
          context: { 
            capability: context.directive.capability,
            policyDescription: policy.description
          }
        };
      }

      // Check for wildcard resources (unless it's a service-level permission)
      const resources = Array.isArray(statementJson.Resource)
        ? statementJson.Resource
        : [statementJson.Resource];
      
      const hasWildcardResource = resources.some((resource: string) => 
        resource === '*' || resource.endsWith('/*')
      );
      
      // Allow wildcard resources for some AWS service APIs (like s3:ListBucket)
      // but flag for sensitive operations
      const sensitiveActions = actions.some((action: string) => 
        action.includes(':Put') || 
        action.includes(':Delete') || 
        action.includes(':Create') ||
        action.includes(':*')
      );
      
      if (hasWildcardResource && sensitiveActions) {
        return {
          type: 'iam',
          severity: ruleConfig.severity || 'warning',
          description: ruleConfig.description || 'IAM policy uses wildcard resources with sensitive actions',
          ruleId: 'leastPrivilegeIAM',
          framework,
          remediation: 'Scope IAM policy resources to specific ARNs instead of wildcards',
          context: { 
            capability: context.directive.capability,
            policyDescription: policy.description
          }
        };
      }
    }

    return undefined;
  }
}
