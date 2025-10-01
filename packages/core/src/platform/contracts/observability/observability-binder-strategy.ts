// src/platform/contracts/observability/observability-binder-strategy.ts
// Observability binder strategy that integrates with the existing binder system

import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { EnhancedBinderStrategy } from '../enhanced-binder-strategy.js';
import {
  EnhancedBindingContext,
  EnhancedBindingResult,
  Capability,
  ComplianceFramework
} from '../bindings.js';
import {
  ObservabilityConfig,
  ObservabilityBindingResult,
  ComponentObservabilityCapability
} from './observability-types.js';
import { ObservabilityConfigFactory } from './observability-config-factory.js';
import { BaseComponentObservability } from './base-component-observability.js';

export class ObservabilityBinderStrategy extends EnhancedBinderStrategy {
  private observabilityConfig: ObservabilityConfig;

  constructor(complianceFramework: ComplianceFramework) {
    super();
    this.observabilityConfig = ObservabilityConfigFactory.createConfig(complianceFramework);
  }

  getStrategyName(): string {
    return 'ObservabilityBinderStrategy';
  }

  canHandle(sourceType: string, capability: Capability): boolean {
    // This strategy handles observability for all component types
    return true; // All components need observability
  }

  async bind(context: EnhancedBindingContext): Promise<EnhancedBindingResult> {
    const observability = new BaseComponentObservability(context.complianceFramework);

    // Configure observability for the source component
    const observabilityResult = await observability.configureObservability({
      componentName: context.source.getName(),
      componentType: context.source.getType(),
      environment: context.environment,
      region: process.env.AWS_REGION || 'us-east-1',
      complianceFramework: context.complianceFramework,
      construct: context.source as any, // Cast to Construct
      existingEnvVars: context.source.getCapabilityData() as any,
      existingPolicies: []
    });

    // Convert observability result to binding result format
    const iamPolicies = observabilityResult.iamPolicies.map(policy => ({
      statement: policy.statement,
      description: policy.description,
      complianceRequirement: policy.complianceRequirement
    }));

    const securityGroupRules = this.createSecurityGroupRules(context, observabilityResult).map(rule => {
      let peer: { kind: 'sg'; id: string } | { kind: 'cidr'; cidr: string };

      if (rule.source?.type === 'sg' || rule.target?.type === 'sg') {
        peer = { kind: 'sg', id: rule.source?.value || rule.target?.value || 'sg-unknown' };
      } else {
        peer = { kind: 'cidr', cidr: rule.source?.value || rule.target?.value || '0.0.0.0/0' };
      }

      return {
        type: rule.type,
        peer,
        port: {
          from: rule.port || (rule.portRange?.from || 0),
          to: rule.port || (rule.portRange?.to || 65535),
          protocol: (rule.protocol || 'tcp') as 'tcp' | 'udp' | 'icmp'
        },
        description: rule.description
      };
    });
    const complianceActions = observabilityResult.complianceActions.map(action => ({
      ruleId: action.action,
      severity: action.severity as 'info' | 'warning' | 'error',
      message: action.description,
      framework: action.framework,
      remediation: `Apply ${action.action} for compliance`
    }));

    return {
      environmentVariables: Object.freeze(observabilityResult.environmentVariables),
      iamPolicies: Object.freeze(iamPolicies),
      securityGroupRules: Object.freeze(securityGroupRules),
      complianceActions: Object.freeze(complianceActions),
      metadata: Object.freeze({
        observability: {
          config: this.observabilityConfig,
          cloudWatchLogGroups: observabilityResult.cloudWatchLogGroups,
          xrayConfigurations: observabilityResult.xrayConfigurations,
          adotConfigurations: observabilityResult.adotConfigurations,
          sidecarConfigurations: observabilityResult.sidecarConfigurations,
          agentConfigurations: observabilityResult.agentConfigurations
        }
      })
    };
  }

  private createSecurityGroupRules(
    context: EnhancedBindingContext,
    observabilityResult: ObservabilityBindingResult
  ): Array<{
    type: 'ingress' | 'egress';
    protocol: 'tcp' | 'udp' | 'icmp' | 'all';
    port?: number;
    portRange?: { from: number; to: number };
    source?: { type: 'cidr' | 'sg' | 'prefix-list'; value: string };
    target?: { type: 'cidr' | 'sg' | 'prefix-list'; value: string };
    description: string;
    complianceRequirement: string;
  }> {
    const rules: Array<{
      type: 'ingress' | 'egress';
      protocol: 'tcp' | 'udp' | 'icmp' | 'all';
      port?: number;
      portRange?: { from: number; to: number };
      source?: { type: 'cidr' | 'sg' | 'prefix-list'; value: string };
      target?: { type: 'cidr' | 'sg' | 'prefix-list'; value: string };
      description: string;
      complianceRequirement: string;
    }> = [];

    // Add security group rules for observability endpoints
    if (observabilityResult.sidecarConfigurations && observabilityResult.sidecarConfigurations.length > 0) {
      // Allow traffic to OpenTelemetry Collector
      rules.push({
        type: 'ingress',
        protocol: 'tcp',
        port: 4317,
        source: { type: 'cidr', value: '0.0.0.0/0' },
        description: 'OpenTelemetry Collector gRPC endpoint',
        complianceRequirement: `${this.observabilityConfig.framework}-OTEL-001`
      });

      rules.push({
        type: 'ingress',
        protocol: 'tcp',
        port: 4318,
        source: { type: 'cidr', value: '0.0.0.0/0' },
        description: 'OpenTelemetry Collector HTTP endpoint',
        complianceRequirement: `${this.observabilityConfig.framework}-OTEL-002`
      });
    }

    if (observabilityResult.agentConfigurations && observabilityResult.agentConfigurations.length > 0) {
      // Allow traffic to X-Ray daemon
      rules.push({
        type: 'ingress',
        protocol: 'udp',
        port: 2000,
        source: { type: 'cidr', value: '0.0.0.0/0' },
        description: 'X-Ray daemon UDP endpoint',
        complianceRequirement: `${this.observabilityConfig.framework}-XRAY-001`
      });

      rules.push({
        type: 'ingress',
        protocol: 'tcp',
        port: 2000,
        source: { type: 'cidr', value: '0.0.0.0/0' },
        description: 'X-Ray daemon TCP endpoint',
        complianceRequirement: `${this.observabilityConfig.framework}-XRAY-002`
      });
    }

    // For FedRAMP environments, restrict access to specific CIDRs
    if (this.observabilityConfig.tier !== 'commercial') {
      rules.forEach(rule => {
        if (rule.source && rule.source.type === 'cidr' && rule.source.value === '0.0.0.0/0') {
          // Restrict to VPC CIDR for FedRAMP
          rule.source.value = '10.0.0.0/8'; // Example VPC CIDR
          rule.description += ' (FedRAMP restricted)';
        }
      });
    }

    return rules;
  }

  /**
   * Get observability configuration for a specific compliance framework
   */
  static getObservabilityConfig(framework: ComplianceFramework): ObservabilityConfig {
    return ObservabilityConfigFactory.createConfig(framework);
  }

  /**
   * Check if observability is required for a component type
   */
  static isObservabilityRequired(componentType: string): boolean {
    const exemptTypes = ['vpc', 'subnet', 'route-table', 'internet-gateway'];
    return !exemptTypes.some(type => componentType.toLowerCase().includes(type));
  }

  /**
   * Get the appropriate observability strategy for a component type
   */
  static getObservabilityStrategy(componentType: string): 'lambda' | 'container' | 'vm' | 'api' | 'database' {
    const type = componentType.toLowerCase();

    if (type.includes('lambda') || type.includes('function')) {
      return 'lambda';
    }

    if (type.includes('ecs') || type.includes('container') || type.includes('fargate')) {
      return 'container';
    }

    if (type.includes('ec2') || type.includes('instance') || type.includes('vm')) {
      return 'vm';
    }

    if (type.includes('api-gateway') || type.includes('api')) {
      return 'api';
    }

    if (type.includes('rds') || type.includes('database')) {
      return 'database';
    }

    return 'container'; // Default
  }

  /**
   * Validate observability configuration against compliance requirements
   */
  static validateObservabilityConfig(config: ObservabilityConfig): Array<{
    rule: string;
    description: string;
    severity: 'warning' | 'error';
    remediation: string;
  }> {
    const violations: Array<{
      rule: string;
      description: string;
      severity: 'warning' | 'error';
      remediation: string;
    }> = [];

    // FedRAMP High requirements
    if (config.tier === 'fedramp-high') {
      if (!config.security.fipsCompliant) {
        violations.push({
          rule: 'FEDRAMP-HIGH-FIPS-001',
          description: 'FIPS-140-2 compliance required for FedRAMP High',
          severity: 'error',
          remediation: 'Use FIPS-compliant endpoints and libraries'
        });
      }

      if (!config.security.stigHardened) {
        violations.push({
          rule: 'FEDRAMP-HIGH-STIG-001',
          description: 'STIG hardening required for FedRAMP High',
          severity: 'error',
          remediation: 'Apply STIG-hardened configurations'
        });
      }

      if (config.logging.retentionDays < 2555) { // 7 years
        violations.push({
          rule: 'FEDRAMP-HIGH-RETENTION-001',
          description: 'Extended log retention required for FedRAMP High',
          severity: 'warning',
          remediation: 'Set log retention to at least 7 years (2555 days)'
        });
      }
    }

    // FedRAMP Moderate requirements
    if (config.tier === 'fedramp-moderate') {
      if (!config.logging.auditLogging) {
        violations.push({
          rule: 'FEDRAMP-MODERATE-AUDIT-001',
          description: 'Audit logging required for FedRAMP Moderate',
          severity: 'error',
          remediation: 'Enable audit logging for compliance'
        });
      }

      if (config.logging.retentionDays < 90) {
        violations.push({
          rule: 'FEDRAMP-MODERATE-RETENTION-001',
          description: 'Extended log retention recommended for FedRAMP Moderate',
          severity: 'warning',
          remediation: 'Consider extending log retention to at least 90 days'
        });
      }
    }

    // General compliance requirements
    if (!config.security.encryptionAtRest) {
      violations.push({
        rule: 'COMPLIANCE-ENCRYPTION-001',
        description: 'Encryption at rest required for all compliance frameworks',
        severity: 'error',
        remediation: 'Enable encryption at rest for log storage'
      });
    }

    if (!config.security.encryptionInTransit) {
      violations.push({
        rule: 'COMPLIANCE-ENCRYPTION-002',
        description: 'Encryption in transit required for all compliance frameworks',
        severity: 'error',
        remediation: 'Enable TLS encryption for all network traffic'
      });
    }

    return violations;
  }

  /**
   * Get compliance-specific recommendations for observability
   */
  static getObservabilityRecommendations(config: ObservabilityConfig): Array<{
    recommendation: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }> {
    const recommendations: Array<{
      recommendation: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
    }> = [];

    // High priority recommendations
    if (config.tracing.samplingRate < 0.1) {
      recommendations.push({
        recommendation: 'INCREASE_TRACE_SAMPLING',
        description: 'Consider increasing trace sampling rate for better observability',
        priority: 'high'
      });
    }

    // Medium priority recommendations
    if (config.metrics.collectionInterval > 60) {
      recommendations.push({
        recommendation: 'DECREASE_METRIC_INTERVAL',
        description: 'Consider decreasing metric collection interval for more granular monitoring',
        priority: 'medium'
      });
    }

    // Low priority recommendations
    if (!config.logging.performanceLogging) {
      recommendations.push({
        recommendation: 'ENABLE_PERFORMANCE_LOGGING',
        description: 'Consider enabling performance logging for better debugging',
        priority: 'low'
      });
    }

    return recommendations;
  }
}
