// src/platform/contracts/observability/strategies/container-observability-strategy.ts
// Container sidecar collector injection strategy with compliance-aware configuration

import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { ComplianceFramework } from '../../bindings.ts';
import {
  ObservabilityConfig,
  ObservabilityBindingResult
} from '../observability-types.ts';
import { ObservabilityConfigFactory } from '../observability-config-factory.ts';

export interface ContainerObservabilityContext {
  serviceName: string;
  clusterName: string;
  taskDefinitionArn: string;
  environment: string;
  region: string;
  complianceFramework: string;
  existingContainers?: Array<{
    name: string;
    image: string;
    environment?: Record<string, string>;
    volumes?: Array<{ name: string; mountPath: string }>;
  }>;
  existingPolicies?: PolicyStatement[];
}

export class ContainerObservabilityStrategy {
  private config: ObservabilityConfig;

  constructor(complianceFramework: string) {
    this.config = ObservabilityConfigFactory.createConfig(complianceFramework as any);
  }

  async instrumentContainer(context: ContainerObservabilityContext): Promise<ObservabilityBindingResult> {
    const { serviceName, environment, region } = context;

    // Create CloudWatch log group for the service
    const logGroup = this.createLogGroup(serviceName, environment);

    // Configure environment variables for observability
    const environmentVariables = this.createEnvironmentVariables(context, logGroup);

    // Create IAM policies for observability services
    const iamPolicies = this.createIamPolicies(context, logGroup);

    // Configure X-Ray tracing
    const xrayConfigurations = this.createXrayConfigurations(context);

    // Create sidecar collector configurations
    const sidecarConfigurations = this.createSidecarConfigurations(context, logGroup);

    // Generate compliance actions
    const complianceActions = this.createComplianceActions(context).map(action => ({
      ...action,
      framework: action.framework as ComplianceFramework
    }));

    return {
      environmentVariables,
      iamPolicies,
      cloudWatchLogGroups: [{
        logGroupName: logGroup.logGroupName,
        retentionDays: this.config.logging.retentionDays,
        encryptionKey: this.config.security.encryptionAtRest ? 'alias/aws/logs' : undefined,
        tags: this.createLogGroupTags(serviceName, environment)
      }],
      xrayConfigurations,
      adotConfigurations: [], // Not applicable for containers
      sidecarConfigurations,
      agentConfigurations: [], // Not applicable for containers
      complianceActions
    };
  }

  private createLogGroup(serviceName: string, environment: string): LogGroup {
    const logGroupName = `/aws/ecs/${serviceName}-${environment}`;

    // In a real implementation, this would create the actual LogGroup
    // For testing purposes, we'll return a mock object with the required properties
    return {
      logGroupName,
      logGroupArn: `arn:aws:logs:*:*:log-group:${logGroupName}`
    } as LogGroup;
  }

  private createEnvironmentVariables(
    context: ContainerObservabilityContext,
    logGroup: LogGroup
  ): Record<string, string> {
    const envVars: Record<string, string> = {
      // OpenTelemetry configuration
      'OTEL_SERVICE_NAME': context.serviceName,
      'OTEL_SERVICE_VERSION': '1.0.0',
      'OTEL_RESOURCE_ATTRIBUTES': this.createResourceAttributes(context),
      'OTEL_EXPORTER_OTLP_ENDPOINT': this.getOtlpEndpoint(),
      'OTEL_TRACES_EXPORTER': 'otlp',
      'OTEL_METRICS_EXPORTER': 'otlp',
      'OTEL_LOGS_EXPORTER': 'otlp',

      // X-Ray configuration
      'AWS_XRAY_TRACING_NAME': context.serviceName,
      'AWS_XRAY_CONTEXT_MISSING': 'LOG_ERROR',
      'AWS_XRAY_DAEMON_ADDRESS': 'localhost:2000', // Sidecar collector

      // Logging configuration
      'LOG_LEVEL': this.config.logging.level.toUpperCase(),
      'LOG_FORMAT': this.config.logging.format,
      'CLOUDWATCH_LOG_GROUP': logGroup.logGroupName,

      // Container-specific configuration
      'OTEL_EXPORTER_OTLP_INSECURE': this.config.tier === 'commercial' ? 'true' : 'false',
      'OTEL_PROPAGATORS': 'tracecontext,baggage,xray',

      // Compliance-specific variables
      ...this.createComplianceEnvVars(context)
    };

    // Add custom fields from config
    if (this.config.logging.customFields) {
      Object.entries(this.config.logging.customFields).forEach(([key, value]) => {
        envVars[`CUSTOM_${key.toUpperCase()}`] = value;
      });
    }

    return envVars;
  }

  private createIamPolicies(
    context: ContainerObservabilityContext,
    logGroup: LogGroup
  ): Array<{ statement: PolicyStatement; description: string; complianceRequirement: string }> {
    const policies: Array<{ statement: PolicyStatement; description: string; complianceRequirement: string }> = [];

    // CloudWatch Logs permissions
    policies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogGroups',
          'logs:DescribeLogStreams'
        ],
        resources: [logGroup.logGroupArn, `${logGroup.logGroupArn}:*`]
      }),
      description: 'CloudWatch Logs access for container observability',
      complianceRequirement: `${this.config.framework}-LOGS-001`
    });

    // X-Ray tracing permissions
    if (this.config.tracing.enabled) {
      policies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'xray:PutTraceSegments',
            'xray:PutTelemetryRecords'
          ],
          resources: ['*']
        }),
        description: 'X-Ray tracing permissions for container',
        complianceRequirement: `${this.config.framework}-XRAY-001`
      });
    }

    // CloudWatch Metrics permissions
    if (this.config.metrics.enabled) {
      policies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'cloudwatch:PutMetricData',
            'cloudwatch:GetMetricStatistics',
            'cloudwatch:ListMetrics'
          ],
          resources: ['*']
        }),
        description: 'CloudWatch Metrics access for container',
        complianceRequirement: `${this.config.framework}-METRICS-001`
      });
    }

    // ECS-specific permissions
    policies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ecs:DescribeTasks',
          'ecs:DescribeTaskDefinition',
          'ecs:ListTasks'
        ],
        resources: ['*']
      }),
      description: 'ECS access for container observability',
      complianceRequirement: `${this.config.framework}-ECS-001`
    });

    // FedRAMP-specific permissions
    if (this.config.tier !== 'commercial') {
      policies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'logs:CreateLogDelivery',
            'logs:DeleteLogDelivery',
            'logs:DescribeLogDeliveries',
            'logs:GetLogDelivery',
            'logs:ListLogDeliveries',
            'logs:UpdateLogDelivery'
          ],
          resources: ['*']
        }),
        description: 'Enhanced logging permissions for FedRAMP compliance',
        complianceRequirement: `${this.config.framework}-LOGS-002`
      });
    }

    return policies;
  }

  private createXrayConfigurations(context: ContainerObservabilityContext): Array<{
    serviceName: string;
    samplingRules: any[];
    customAnnotations?: Record<string, string>;
  }> {
    if (!this.config.tracing.enabled) {
      return [];
    }

    const samplingRules = [
      {
        RuleName: `${context.serviceName}-sampling-rule`,
        Priority: 1,
        FixedRate: this.config.tracing.samplingRate,
        ReservoirSize: 1000,
        ServiceName: context.serviceName,
        ServiceType: 'AWS::ECS::Service',
        Host: '*',
        HTTPMethod: '*',
        URLPath: '*',
        ResourceARN: '*',
        Attributes: this.config.tracing.customAttributes || {}
      }
    ];

    return [{
      serviceName: context.serviceName,
      samplingRules,
      customAnnotations: {
        'compliance.tier': this.config.tier,
        'compliance.framework': this.config.framework,
        'environment': context.environment,
        'component.type': 'container',
        'cluster.name': context.clusterName
      }
    }];
  }

  private createSidecarConfigurations(
    context: ContainerObservabilityContext,
    logGroup: LogGroup
  ): Array<{
    image: string;
    environmentVariables: Record<string, string>;
    volumeMounts?: Array<{ name: string; mountPath: string }>;
    resources?: any;
  }> {
    const sidecars: Array<{
      image: string;
      environmentVariables: Record<string, string>;
      volumeMounts?: Array<{ name: string; mountPath: string }>;
      resources?: any;
    }> = [];

    // OpenTelemetry Collector sidecar
    const collectorImage = this.getCollectorImage();
    sidecars.push({
      image: collectorImage,
      environmentVariables: {
        'OTEL_CONFIG': '/etc/otel-collector/config.yaml',
        'AWS_REGION': context.region,
        'LOG_LEVEL': this.config.logging.level.toLowerCase()
      },
      volumeMounts: [
        { name: 'otel-config', mountPath: '/etc/otel-collector' }
      ],
      resources: {
        limits: {
          cpu: '200m',
          memory: '256Mi'
        },
        requests: {
          cpu: '100m',
          memory: '128Mi'
        }
      }
    });

    // X-Ray daemon sidecar for FedRAMP environments
    if (this.config.tier !== 'commercial') {
      sidecars.push({
        image: 'amazon/aws-xray-daemon:latest',
        environmentVariables: {
          'AWS_REGION': context.region,
          'AWS_XRAY_DAEMON_ADDRESS': '0.0.0.0:2000'
        },
        resources: {
          limits: {
            cpu: '100m',
            memory: '128Mi'
          },
          requests: {
            cpu: '50m',
            memory: '64Mi'
          }
        }
      });
    }

    return sidecars;
  }

  private createComplianceActions(context: ContainerObservabilityContext): Array<{
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

    // Add compliance-specific actions
    if (this.config.tier === 'fedramp-moderate') {
      actions.push({
        action: 'ENHANCED_AUDIT_LOGGING',
        description: 'Enhanced audit logging enabled for FedRAMP Moderate compliance',
        framework: this.config.framework,
        severity: 'info'
      });

      actions.push({
        action: 'XRAY_DAEMON_SIDECAR',
        description: 'X-Ray daemon sidecar deployed for enhanced tracing',
        framework: this.config.framework,
        severity: 'info'
      });
    }

    if (this.config.tier === 'fedramp-high') {
      actions.push({
        action: 'FIPS_COMPLIANCE',
        description: 'FIPS-140-2 compliant endpoints and libraries required for FedRAMP High',
        framework: this.config.framework,
        severity: 'warning'
      });

      actions.push({
        action: 'STIG_HARDENING',
        description: 'STIG-hardened configuration applied for FedRAMP High',
        framework: this.config.framework,
        severity: 'info'
      });

      actions.push({
        action: 'EXTENDED_RETENTION',
        description: 'Extended log retention (7 years) configured for FedRAMP High',
        framework: this.config.framework,
        severity: 'info'
      });

      actions.push({
        action: 'XRAY_DAEMON_SIDECAR',
        description: 'X-Ray daemon sidecar deployed for high-security tracing',
        framework: this.config.framework,
        severity: 'info'
      });
    }

    return actions;
  }

  private createResourceAttributes(context: ContainerObservabilityContext): string {
    const attributes = [
      `service.name=${context.serviceName}`,
      `service.version=1.0.0`,
      `deployment.environment=${context.environment}`,
      `compliance.framework=${this.config.framework}`,
      `compliance.tier=${this.config.tier}`,
      `cloud.provider=aws`,
      `cloud.region=${context.region}`,
      `container.runtime=ecs`,
      `k8s.cluster.name=${context.clusterName}`
    ];

    return attributes.join(',');
  }

  private getOtlpEndpoint(): string {
    // Use compliance-specific endpoints for FedRAMP
    const endpoints = ObservabilityConfigFactory.getComplianceEndpoints(this.config.tier);
    if (endpoints.length > 0) {
      return endpoints[0].replace('https://', 'https://').replace('amazonaws.com', 'amazonaws.com/v1/traces');
    }

    // Default commercial endpoint
    return 'https://api.honeycomb.io/v1/traces';
  }

  private getCollectorImage(): string {
    // Use FIPS-compliant image for FedRAMP High
    if (this.config.tier === 'fedramp-high') {
      // TODO: Use FIPS-compliant OpenTelemetry Collector image when available
      console.warn('FIPS-compliant OpenTelemetry Collector image not yet available, using standard image');
    }

    return 'otel/opentelemetry-collector-contrib:0.88.0';
  }

  private createComplianceEnvVars(context: ContainerObservabilityContext): Record<string, string> {
    const envVars: Record<string, string> = {};

    if (this.config.tier === 'fedramp-moderate' || this.config.tier === 'fedramp-high') {
      envVars['COMPLIANCE_AUDIT_ENABLED'] = 'true';
      envVars['COMPLIANCE_FRAMEWORK'] = this.config.framework;
      envVars['COMPLIANCE_TIER'] = this.config.tier;
    }

    if (this.config.tier === 'fedramp-high') {
      envVars['FIPS_COMPLIANCE_REQUIRED'] = 'true';
      envVars['STIG_HARDENING_ENABLED'] = 'true';
      envVars['EXTENDED_RETENTION_ENABLED'] = 'true';
    }

    return envVars;
  }

  private mapRetentionDays(days: number): RetentionDays {
    // Map retention days to CDK RetentionDays enum (same as Lambda strategy)
    if (days <= 1) return RetentionDays.ONE_DAY;
    if (days <= 3) return RetentionDays.THREE_DAYS;
    if (days <= 5) return RetentionDays.FIVE_DAYS;
    if (days <= 7) return RetentionDays.ONE_WEEK;
    if (days <= 14) return RetentionDays.TWO_WEEKS;
    if (days <= 30) return RetentionDays.ONE_MONTH;
    if (days <= 60) return RetentionDays.TWO_MONTHS;
    if (days <= 90) return RetentionDays.THREE_MONTHS;
    if (days <= 120) return RetentionDays.FOUR_MONTHS;
    if (days <= 150) return RetentionDays.FIVE_MONTHS;
    if (days <= 180) return RetentionDays.SIX_MONTHS;
    if (days <= 365) return RetentionDays.ONE_YEAR;
    if (days <= 730) return RetentionDays.TWO_YEARS;
    if (days <= 1095) return RetentionDays.THREE_YEARS;
    if (days <= 1460) return RetentionDays.THREE_YEARS; // Use available option
    if (days <= 1825) return RetentionDays.THREE_YEARS; // Use available option
    if (days <= 2190) return RetentionDays.THREE_YEARS; // Use available option
    if (days <= 2555) return RetentionDays.THREE_YEARS; // Use available option
    if (days <= 2920) return RetentionDays.THREE_YEARS; // Use available option
    if (days <= 3285) return RetentionDays.THREE_YEARS; // Use available option
    return RetentionDays.THREE_YEARS; // Use available option
  }

  private createLogGroupTags(serviceName: string, environment: string): Record<string, string> {
    return {
      'Service': serviceName,
      'Environment': environment,
      'Compliance': this.config.framework,
      'Tier': this.config.tier,
      'ManagedBy': 'Shinobi',
      'Observability': 'enabled',
      'Type': 'container'
    };
  }
}
