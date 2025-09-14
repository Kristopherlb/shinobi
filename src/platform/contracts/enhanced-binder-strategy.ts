/**
 * Enhanced Binder Strategy Interface
 * Async contract for handling component bindings with compliance enforcement
 */

import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  EnhancedBindingContext,
  EnhancedBindingResult,
  Capability,
  ComplianceAction
} from './bindings';

/**
 * Abstract base class for enhanced binder strategies
 * Provides common functionality and enforces async contract
 */
export abstract class EnhancedBinderStrategy {

  /**
   * Get the strategy name for identification and logging
   */
  abstract getStrategyName(): string;

  /**
   * Check if this strategy can handle the given source type and capability
   * @param sourceType - Type of the source component
   * @param capability - Target capability type
   * @returns true if this strategy can handle the binding
   */
  abstract canHandle(sourceType: string, capability: Capability): boolean;

  /**
   * Execute the binding operation asynchronously
   * @param context - Complete binding context with source, target, and directive
   * @returns Promise resolving to binding result with IAM, SG, env vars, and compliance actions
   */
  abstract bind(context: EnhancedBindingContext): Promise<EnhancedBindingResult>;

  /**
   * Validate binding context before processing
   * @param context - Binding context to validate
   * @throws Error if context is invalid
   */
  protected validateBindingContext(context: EnhancedBindingContext): void {
    if (!context.source) {
      throw new Error('Source component is required');
    }
    if (!context.target) {
      throw new Error('Target component is required');
    }
    if (!context.directive) {
      throw new Error('Binding directive is required');
    }
    if (!context.directive.capability) {
      throw new Error('Capability is required in binding directive');
    }
    if (!context.directive.access) {
      throw new Error('Access level is required in binding directive');
    }
    if (!context.targetCapabilityData) {
      throw new Error('Target capability data is required');
    }
  }

  /**
   * Generate environment variables from capability data
   * @param context - Binding context
   * @param defaultMappings - Default environment variable mappings
   * @param capabilityData - Capability data to extract from
   * @returns Record of environment variable name -> value
   */
  protected generateEnvironmentVariables(
    context: EnhancedBindingContext,
    defaultMappings: Record<string, string>,
    capabilityData: Record<string, any>
  ): Record<string, string> {
    const envVars: Record<string, string> = {};
    const mappings = context.directive.env && Object.keys(context.directive.env).length > 0
      ? context.directive.env
      : defaultMappings;

    for (const key in mappings) {
      if (Object.prototype.hasOwnProperty.call(mappings, key)) {
        const envVarName = mappings[key];
        const capabilityValue = capabilityData[key];
        if (capabilityValue !== undefined) {
          envVars[envVarName] = String(capabilityValue);
        }
      }
    }
    return envVars;
  }

  /**
   * Create a compliance action for audit trail
   * @param ruleId - Unique rule identifier
   * @param severity - Action severity level
   * @param message - Human-readable message
   * @param framework - Compliance framework
   * @param remediation - Optional remediation steps
   * @param metadata - Optional additional metadata
   * @returns Compliance action object
   */
  protected createComplianceAction(
    ruleId: string,
    severity: 'error' | 'warning' | 'info',
    message: string,
    framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high',
    remediation?: string,
    metadata?: Record<string, unknown>
  ): ComplianceAction {
    return {
      ruleId,
      severity,
      message,
      framework,
      remediation,
      metadata
    };
  }

  /**
   * Create binding result with immutable arrays
   * @param environmentVariables - Environment variables to inject
   * @param iamPolicies - IAM policies to apply
   * @param securityGroupRules - Security group rules to configure
   * @param complianceActions - Compliance actions taken
   * @param metadata - Optional metadata
   * @returns Immutable binding result
   */
  protected createBindingResult(
    environmentVariables: Record<string, string>,
    iamPolicies: Array<{ statement: PolicyStatement; description: string; complianceRequirement: string }>,
    securityGroupRules: Array<{ type: 'ingress' | 'egress'; peer: any; port: any; description: string }>,
    complianceActions: ComplianceAction[],
    metadata?: Record<string, unknown>
  ): EnhancedBindingResult {
    return {
      environmentVariables: Object.freeze({ ...environmentVariables }),
      iamPolicies: Object.freeze([...iamPolicies]),
      securityGroupRules: Object.freeze([...securityGroupRules]),
      complianceActions: Object.freeze([...complianceActions]),
      metadata: metadata ? Object.freeze({ ...metadata }) : undefined
    };
  }

  /**
   * Get supported component types for this strategy
   * @returns Array of supported source component types
   */
  protected getSupportedSourceTypes(): string[] {
    return ['lambda-api', 'ecs-service', 'ec2-instance', 'fargate-service'];
  }

  /**
   * Check if access level is valid for this capability
   * @param access - Access level to validate
   * @param validAccessLevels - Array of valid access levels
   * @returns true if access level is valid
   */
  protected isValidAccessLevel(access: string, validAccessLevels: string[]): boolean {
    return validAccessLevels.includes(access);
  }

  /**
   * Create error with context information
   * @param message - Error message
   * @param context - Binding context for additional context
   * @returns Error with enhanced message
   */
  protected createContextualError(message: string, context: EnhancedBindingContext): Error {
    const sourceName = context.source?.getName() || 'unknown';
    const targetName = context.target?.getName() || 'unknown';
    const capability = context.directive?.capability || 'unknown';
    return new Error(`${message} (${sourceName} -> ${targetName}:${capability})`);
  }
}