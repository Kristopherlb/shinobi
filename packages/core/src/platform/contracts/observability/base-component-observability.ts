// src/platform/contracts/observability/base-component-observability.ts
// BaseComponent observability configuration methods

import { Construct } from 'constructs';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { ComplianceFramework } from '../bindings.ts';
import {
  ObservabilityConfig,
  ObservabilityBindingResult,
  ComponentObservabilityCapability
} from './observability-types.ts';
import { ObservabilityConfigFactory } from './observability-config-factory.ts';
import { LambdaObservabilityStrategy } from './strategies/lambda-observability-strategy.ts';
import { ContainerObservabilityStrategy } from './strategies/container-observability-strategy.ts';
import { VMObservabilityStrategy } from './strategies/vm-observability-strategy.ts';

export interface BaseComponentObservabilityContext {
  componentName: string;
  componentType: string;
  environment: string;
  region: string;
  complianceFramework: string;
  construct: Construct;
  existingEnvVars?: Record<string, string>;
  existingPolicies?: PolicyStatement[];
}

export class BaseComponentObservability {
  private config: ObservabilityConfig;

  constructor(complianceFramework: string) {
    this.config = ObservabilityConfigFactory.createConfig(complianceFramework as any);
  }

  /**
   * Configure observability for a component based on its type and compliance framework
   */
  async configureObservability(context: BaseComponentObservabilityContext): Promise<ObservabilityBindingResult> {
    const capability = this.determineObservabilityCapability(context);

    switch (capability.instrumentationType) {
      case 'lambda':
        return this.configureLambdaObservability(context);
      case 'container':
        return this.configureContainerObservability(context);
      case 'vm':
        return this.configureVMObservability(context);
      case 'api':
        return this.configureApiObservability(context);
      case 'database':
        return this.configureDatabaseObservability(context);
      default:
        throw new Error(`Unsupported instrumentation type: ${capability.instrumentationType}`);
    }
  }

  /**
   * Determine the observability capability for a component
   */
  private determineObservabilityCapability(context: BaseComponentObservabilityContext): ComponentObservabilityCapability {
    const componentType = context.componentType.toLowerCase();

    // Lambda-based components
    if (componentType.includes('lambda') || componentType.includes('function')) {
      return {
        componentType: context.componentType,
        supportsTracing: true,
        supportsLogging: true,
        supportsMetrics: true,
        instrumentationType: 'lambda',
        requiredLayers: ['aws-otel-nodejs'],
        requiredEnvVars: {
          'OTEL_SERVICE_NAME': context.componentName,
          'AWS_XRAY_TRACING_NAME': context.componentName
        }
      };
    }

    // Container-based components
    if (componentType.includes('ecs') || componentType.includes('container') ||
      componentType.includes('fargate') || componentType.includes('docker')) {
      return {
        componentType: context.componentType,
        supportsTracing: true,
        supportsLogging: true,
        supportsMetrics: true,
        instrumentationType: 'container',
        requiredSidecars: ['otel-collector'],
        requiredEnvVars: {
          'OTEL_SERVICE_NAME': context.componentName,
          'AWS_XRAY_TRACING_NAME': context.componentName
        }
      };
    }

    // VM-based components
    if (componentType.includes('ec2') || componentType.includes('instance') ||
      componentType.includes('vm') || componentType.includes('compute')) {
      return {
        componentType: context.componentType,
        supportsTracing: true,
        supportsLogging: true,
        supportsMetrics: true,
        instrumentationType: 'vm',
        requiredAgents: ['cloudwatch-agent', 'otel-collector'],
        requiredEnvVars: {
          'OTEL_SERVICE_NAME': context.componentName,
          'AWS_XRAY_TRACING_NAME': context.componentName
        }
      };
    }

    // API Gateway components
    if (componentType.includes('api-gateway') || componentType.includes('api')) {
      return {
        componentType: context.componentType,
        supportsTracing: true,
        supportsLogging: true,
        supportsMetrics: true,
        instrumentationType: 'api',
        requiredEnvVars: {
          'AWS_XRAY_TRACING_NAME': context.componentName
        }
      };
    }

    // Database components
    if (componentType.includes('rds') || componentType.includes('database') ||
      componentType.includes('postgres') || componentType.includes('mysql')) {
      return {
        componentType: context.componentType,
        supportsTracing: false, // Databases typically don't support tracing
        supportsLogging: true,
        supportsMetrics: true,
        instrumentationType: 'database',
        requiredEnvVars: {
          'DB_LOGGING_ENABLED': 'true'
        }
      };
    }

    // Default to container instrumentation
    return {
      componentType: context.componentType,
      supportsTracing: true,
      supportsLogging: true,
      supportsMetrics: true,
      instrumentationType: 'container',
      requiredSidecars: ['otel-collector'],
      requiredEnvVars: {
        'OTEL_SERVICE_NAME': context.componentName
      }
    };
  }

  /**
   * Configure observability for Lambda components
   */
  private async configureLambdaObservability(context: BaseComponentObservabilityContext): Promise<ObservabilityBindingResult> {
    const strategy = new LambdaObservabilityStrategy(context.complianceFramework);

    // Extract Lambda function from construct (this would need to be adapted based on actual CDK constructs)
    const lambdaFunction = this.extractLambdaFunction(context.construct);

    return strategy.instrumentLambda({
      function: lambdaFunction,
      componentName: context.componentName,
      environment: context.environment,
      region: context.region,
      complianceFramework: context.complianceFramework,
      existingEnvVars: context.existingEnvVars,
      existingPolicies: context.existingPolicies
    });
  }

  /**
   * Configure observability for Container components
   */
  private async configureContainerObservability(context: BaseComponentObservabilityContext): Promise<ObservabilityBindingResult> {
    const strategy = new ContainerObservabilityStrategy(context.complianceFramework);

    return strategy.instrumentContainer({
      serviceName: context.componentName,
      clusterName: `${context.componentName}-cluster`,
      taskDefinitionArn: `arn:aws:ecs:${context.region}:*:task-definition/${context.componentName}:*`,
      environment: context.environment,
      region: context.region,
      complianceFramework: context.complianceFramework,
      existingPolicies: context.existingPolicies
    });
  }

  /**
   * Configure observability for VM components
   */
  private async configureVMObservability(context: BaseComponentObservabilityContext): Promise<ObservabilityBindingResult> {
    const strategy = new VMObservabilityStrategy(context.complianceFramework);

    return strategy.instrumentVM({
      instanceId: context.componentName,
      instanceType: 't3.medium', // Default instance type
      operatingSystem: 'linux', // Default OS
      environment: context.environment,
      region: context.region,
      complianceFramework: context.complianceFramework,
      existingPolicies: context.existingPolicies
    });
  }

  /**
   * Configure observability for API Gateway components
   */
  private async configureApiObservability(context: BaseComponentObservabilityContext): Promise<ObservabilityBindingResult> {
    // API Gateway observability is typically configured through CloudWatch and X-Ray
    const environmentVariables = this.createApiEnvironmentVariables(context);
    const iamPolicies = this.createApiIamPolicies(context);
    const xrayConfigurations = this.createApiXrayConfigurations(context);
    const complianceActions = this.createApiComplianceActions(context).map(action => ({
      ...action,
      framework: action.framework as ComplianceFramework
    }));

    return {
      environmentVariables,
      iamPolicies,
      cloudWatchLogGroups: [], // API Gateway manages its own log groups
      xrayConfigurations,
      adotConfigurations: [],
      sidecarConfigurations: [],
      agentConfigurations: [],
      complianceActions
    };
  }

  /**
   * Configure observability for Database components
   */
  private async configureDatabaseObservability(context: BaseComponentObservabilityContext): Promise<ObservabilityBindingResult> {
    // Database observability is typically through CloudWatch and enhanced monitoring
    const environmentVariables = this.createDatabaseEnvironmentVariables(context);
    const iamPolicies = this.createDatabaseIamPolicies(context);
    const complianceActions = this.createDatabaseComplianceActions(context).map(action => ({
      ...action,
      framework: action.framework as ComplianceFramework
    }));

    return {
      environmentVariables,
      iamPolicies,
      cloudWatchLogGroups: [], // RDS manages its own log groups
      xrayConfigurations: [], // Databases don't support X-Ray
      adotConfigurations: [],
      sidecarConfigurations: [],
      agentConfigurations: [],
      complianceActions
    };
  }

  /**
   * Extract Lambda function from CDK construct
   */
  private extractLambdaFunction(construct: Construct): any {
    // This is a placeholder - in practice, you'd need to traverse the construct tree
    // to find the actual Lambda function construct
    // For now, we'll create a mock object with the required interface

    return {
      functionName: 'mock-function',
      addLayers: (layerArn: string) => {
        console.log(`Adding layer: ${layerArn}`);
      },
      logGroupArn: 'arn:aws:logs:*:*:log-group:/aws/lambda/mock-function'
    };
  }

  // Helper methods for API observability
  private createApiEnvironmentVariables(context: BaseComponentObservabilityContext): Record<string, string> {
    return {
      'AWS_XRAY_TRACING_NAME': context.componentName,
      'AWS_XRAY_CONTEXT_MISSING': 'LOG_ERROR',
      'LOG_LEVEL': this.config.logging.level.toUpperCase(),
      'COMPLIANCE_FRAMEWORK': this.config.framework,
      'COMPLIANCE_TIER': this.config.tier
    };
  }

  private createApiIamPolicies(context: BaseComponentObservabilityContext): Array<{
    statement: PolicyStatement;
    description: string;
    complianceRequirement: string;
  }> {
    const policies: Array<{ statement: PolicyStatement; description: string; complianceRequirement: string }> = [];

    if (this.config.tracing.enabled) {
      policies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
          resources: ['*']
        }),
        description: 'X-Ray tracing permissions for API Gateway',
        complianceRequirement: `${this.config.framework}-XRAY-001`
      });
    }

    return policies;
  }

  private createApiXrayConfigurations(context: BaseComponentObservabilityContext): Array<{
    serviceName: string;
    samplingRules: any[];
    customAnnotations?: Record<string, string>;
  }> {
    if (!this.config.tracing.enabled) {
      return [];
    }

    return [{
      serviceName: context.componentName,
      samplingRules: [{
        RuleName: `${context.componentName}-api-sampling-rule`,
        Priority: 1,
        FixedRate: this.config.tracing.samplingRate,
        ReservoirSize: 1000,
        ServiceName: context.componentName,
        ServiceType: 'AWS::ApiGateway::RestApi'
      }],
      customAnnotations: {
        'compliance.tier': this.config.tier,
        'compliance.framework': this.config.framework,
        'environment': context.environment,
        'component.type': 'api'
      }
    }];
  }

  private createApiComplianceActions(context: BaseComponentObservabilityContext): Array<{
    action: string;
    description: string;
    framework: string;
    severity: 'info' | 'warning' | 'error';
  }> {
    const actions: Array<{
      action: string;
      description: string;
      framework: string;
      severity: 'info' | 'warning' | 'error';
    }> = [];

    if (this.config.tier === 'fedramp-moderate' || this.config.tier === 'fedramp-high') {
      actions.push({
        action: 'ENHANCED_API_MONITORING',
        description: 'Enhanced API monitoring enabled for FedRAMP compliance',
        framework: this.config.framework,
        severity: 'info'
      });
    }

    return actions;
  }

  // Helper methods for Database observability
  private createDatabaseEnvironmentVariables(context: BaseComponentObservabilityContext): Record<string, string> {
    return {
      'DB_LOGGING_ENABLED': 'true',
      'DB_PERFORMANCE_INSIGHTS_ENABLED': this.config.tier !== 'commercial' ? 'true' : 'false',
      'DB_ENHANCED_MONITORING_ENABLED': this.config.tier !== 'commercial' ? 'true' : 'false',
      'LOG_LEVEL': this.config.logging.level.toUpperCase(),
      'COMPLIANCE_FRAMEWORK': this.config.framework,
      'COMPLIANCE_TIER': this.config.tier
    };
  }

  private createDatabaseIamPolicies(context: BaseComponentObservabilityContext): Array<{
    statement: PolicyStatement;
    description: string;
    complianceRequirement: string;
  }> {
    const policies: Array<{ statement: PolicyStatement; description: string; complianceRequirement: string }> = [];

    policies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['rds:DescribeDBInstances', 'rds:DescribeDBLogFiles'],
        resources: ['*']
      }),
      description: 'RDS monitoring permissions',
      complianceRequirement: `${this.config.framework}-RDS-001`
    });

    if (this.config.metrics.enabled) {
      policies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['cloudwatch:PutMetricData'],
          resources: ['*']
        }),
        description: 'CloudWatch Metrics access for database',
        complianceRequirement: `${this.config.framework}-METRICS-001`
      });
    }

    return policies;
  }

  private createDatabaseComplianceActions(context: BaseComponentObservabilityContext): Array<{
    action: string;
    description: string;
    framework: string;
    severity: 'info' | 'warning' | 'error';
  }> {
    const actions: Array<{
      action: string;
      description: string;
      framework: string;
      severity: 'info' | 'warning' | 'error';
    }> = [];

    if (this.config.tier === 'fedramp-moderate' || this.config.tier === 'fedramp-high') {
      actions.push({
        action: 'ENHANCED_DB_MONITORING',
        description: 'Enhanced database monitoring enabled for FedRAMP compliance',
        framework: this.config.framework,
        severity: 'info'
      });

      actions.push({
        action: 'PERFORMANCE_INSIGHTS_ENABLED',
        description: 'Performance Insights enabled for detailed database monitoring',
        framework: this.config.framework,
        severity: 'info'
      });
    }

    return actions;
  }

  /**
   * Get the current observability configuration
   */
  getConfig(): ObservabilityConfig {
    return this.config;
  }

  /**
   * Check if a specific observability feature is enabled
   */
  isFeatureEnabled(feature: 'tracing' | 'logging' | 'metrics' | 'audit'): boolean {
    switch (feature) {
      case 'tracing':
        return this.config.tracing.enabled;
      case 'logging':
        return this.config.logging.enabled;
      case 'metrics':
        return this.config.metrics.enabled;
      case 'audit':
        return this.config.logging.auditLogging;
      default:
        return false;
    }
  }

  /**
   * Get compliance-specific configuration values
   */
  getComplianceConfig(): {
    isFipsRequired: boolean;
    isStigRequired: boolean;
    retentionDays: number;
    samplingRate: number;
  } {
    return {
      isFipsRequired: this.config.security.fipsCompliant,
      isStigRequired: this.config.security.stigHardened,
      retentionDays: this.config.logging.retentionDays,
      samplingRate: this.config.tracing.samplingRate
    };
  }
}
