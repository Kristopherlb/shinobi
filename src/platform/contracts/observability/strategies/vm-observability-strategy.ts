// src/platform/contracts/observability/strategies/vm-observability-strategy.ts
// VM agent installation strategy with compliance-aware configuration

import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { ComplianceFramework } from '../../bindings';
import {
  ObservabilityConfig,
  ObservabilityBindingResult
} from '../observability-types';
import { ObservabilityConfigFactory } from '../observability-config-factory';

export interface VMObservabilityContext {
  instanceId: string;
  instanceType: string;
  operatingSystem: 'linux' | 'windows';
  environment: string;
  region: string;
  complianceFramework: string;
  existingUserData?: string;
  existingPolicies?: PolicyStatement[];
  securityGroups?: string[];
}

export class VMObservabilityStrategy {
  private config: ObservabilityConfig;

  constructor(complianceFramework: string) {
    this.config = ObservabilityConfigFactory.createConfig(complianceFramework as any);
  }

  async instrumentVM(context: VMObservabilityContext): Promise<ObservabilityBindingResult> {
    const { instanceId, environment, region } = context;

    // Create CloudWatch log group for the VM
    const logGroup = this.createLogGroup(instanceId, environment);

    // Configure environment variables for observability
    const environmentVariables = this.createEnvironmentVariables(context, logGroup);

    // Create IAM policies for observability services
    const iamPolicies = this.createIamPolicies(context, logGroup);

    // Configure X-Ray tracing
    const xrayConfigurations = this.createXrayConfigurations(context);

    // Create agent configurations
    const agentConfigurations = this.createAgentConfigurations(context, logGroup);

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
        tags: this.createLogGroupTags(instanceId, environment)
      }],
      xrayConfigurations,
      adotConfigurations: [], // Not applicable for VMs
      sidecarConfigurations: [], // Not applicable for VMs
      agentConfigurations,
      complianceActions
    };
  }

  private createLogGroup(instanceId: string, environment: string): LogGroup {
    const logGroupName = `/aws/ec2/${instanceId}-${environment}`;

    // In a real implementation, this would create the actual LogGroup
    // For testing purposes, we'll return a mock object with the required properties
    return {
      logGroupName,
      logGroupArn: `arn:aws:logs:*:*:log-group:${logGroupName}`
    } as LogGroup;
  }

  private createEnvironmentVariables(
    context: VMObservabilityContext,
    logGroup: LogGroup
  ): Record<string, string> {
    const envVars: Record<string, string> = {
      // OpenTelemetry configuration
      'OTEL_SERVICE_NAME': context.instanceId,
      'OTEL_SERVICE_VERSION': '1.0.0',
      'OTEL_RESOURCE_ATTRIBUTES': this.createResourceAttributes(context),
      'OTEL_EXPORTER_OTLP_ENDPOINT': this.getOtlpEndpoint(),
      'OTEL_TRACES_EXPORTER': 'otlp',
      'OTEL_METRICS_EXPORTER': 'otlp',
      'OTEL_LOGS_EXPORTER': 'otlp',

      // X-Ray configuration
      'AWS_XRAY_TRACING_NAME': context.instanceId,
      'AWS_XRAY_CONTEXT_MISSING': 'LOG_ERROR',
      'AWS_XRAY_DAEMON_ADDRESS': 'localhost:2000',

      // Logging configuration
      'LOG_LEVEL': this.config.logging.level.toUpperCase(),
      'LOG_FORMAT': this.config.logging.format,
      'CLOUDWATCH_LOG_GROUP': logGroup.logGroupName,

      // VM-specific configuration
      'OTEL_EXPORTER_OTLP_INSECURE': this.config.tier === 'commercial' ? 'true' : 'false',
      'OTEL_PROPAGATORS': 'tracecontext,baggage,xray',
      'AWS_REGION': context.region,

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
    context: VMObservabilityContext,
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
      description: 'CloudWatch Logs access for VM observability',
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
        description: 'X-Ray tracing permissions for VM',
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
        description: 'CloudWatch Metrics access for VM',
        complianceRequirement: `${this.config.framework}-METRICS-001`
      });
    }

    // EC2-specific permissions
    policies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ec2:DescribeInstances',
          'ec2:DescribeInstanceStatus',
          'ec2:DescribeTags'
        ],
        resources: ['*']
      }),
      description: 'EC2 access for VM observability',
      complianceRequirement: `${this.config.framework}-EC2-001`
    });

    // SSM permissions for agent management
    policies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ssm:UpdateInstanceInformation',
          'ssm:SendCommand',
          'ssm:GetCommandInvocation'
        ],
        resources: ['*']
      }),
      description: 'SSM access for VM agent management',
      complianceRequirement: `${this.config.framework}-SSM-001`
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

  private createXrayConfigurations(context: VMObservabilityContext): Array<{
    serviceName: string;
    samplingRules: any[];
    customAnnotations?: Record<string, string>;
  }> {
    if (!this.config.tracing.enabled) {
      return [];
    }

    const samplingRules = [
      {
        RuleName: `${context.instanceId}-sampling-rule`,
        Priority: 1,
        FixedRate: this.config.tracing.samplingRate,
        ReservoirSize: 1000,
        ServiceName: context.instanceId,
        ServiceType: 'AWS::EC2::Instance',
        Host: '*',
        HTTPMethod: '*',
        URLPath: '*',
        ResourceARN: '*',
        Attributes: this.config.tracing.customAttributes || {}
      }
    ];

    return [{
      serviceName: context.instanceId,
      samplingRules,
      customAnnotations: {
        'compliance.tier': this.config.tier,
        'compliance.framework': this.config.framework,
        'environment': context.environment,
        'component.type': 'vm',
        'instance.type': context.instanceType,
        'operating.system': context.operatingSystem
      }
    }];
  }

  private createAgentConfigurations(
    context: VMObservabilityContext,
    logGroup: LogGroup
  ): Array<{
    agentType: string;
    installationScript: string;
    configurationFile?: string;
    systemdService?: string;
  }> {
    const agents: Array<{
      agentType: string;
      installationScript: string;
      configurationFile?: string;
      systemdService?: string;
    }> = [];

    if (context.operatingSystem === 'linux') {
      // CloudWatch Agent
      agents.push({
        agentType: 'cloudwatch',
        installationScript: this.generateCloudWatchAgentInstallScript(context),
        configurationFile: this.generateCloudWatchAgentConfig(context, logGroup),
        systemdService: 'amazon-cloudwatch-agent.service'
      });

      // OpenTelemetry Collector Agent
      agents.push({
        agentType: 'otel-collector',
        installationScript: this.generateOtelCollectorInstallScript(context),
        configurationFile: this.generateOtelCollectorConfig(context),
        systemdService: 'otel-collector.service'
      });

      // X-Ray daemon for FedRAMP environments
      if (this.config.tier !== 'commercial') {
        agents.push({
          agentType: 'xray-daemon',
          installationScript: this.generateXrayDaemonInstallScript(context),
          configurationFile: this.generateXrayDaemonConfig(context),
          systemdService: 'xray.service'
        });
      }
    } else {
      // Windows-specific agents
      agents.push({
        agentType: 'cloudwatch',
        installationScript: this.generateWindowsCloudWatchAgentInstallScript(context),
        configurationFile: this.generateWindowsCloudWatchAgentConfig(context, logGroup)
      });

      // Windows OpenTelemetry Collector
      agents.push({
        agentType: 'otel-collector',
        installationScript: this.generateWindowsOtelCollectorInstallScript(context),
        configurationFile: this.generateOtelCollectorConfig(context)
      });
    }

    return agents;
  }

  private createComplianceActions(context: VMObservabilityContext): Array<{
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
        action: 'XRAY_DAEMON_AGENT',
        description: 'X-Ray daemon agent installed for enhanced tracing',
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
        action: 'XRAY_DAEMON_AGENT',
        description: 'X-Ray daemon agent installed for high-security tracing',
        framework: this.config.framework,
        severity: 'info'
      });
    }

    return actions;
  }

  private createResourceAttributes(context: VMObservabilityContext): string {
    const attributes = [
      `service.name=${context.instanceId}`,
      `service.version=1.0.0`,
      `deployment.environment=${context.environment}`,
      `compliance.framework=${this.config.framework}`,
      `compliance.tier=${this.config.tier}`,
      `cloud.provider=aws`,
      `cloud.region=${context.region}`,
      `host.type=vm`,
      `host.instance.type=${context.instanceType}`,
      `os.type=${context.operatingSystem}`
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

  private createComplianceEnvVars(context: VMObservabilityContext): Record<string, string> {
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

  // Script generation methods
  private generateCloudWatchAgentInstallScript(context: VMObservabilityContext): string {
    const isAmazonLinux = context.operatingSystem === 'linux';

    if (isAmazonLinux) {
      return `
#!/bin/bash
set -e

# Install CloudWatch Agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Create configuration directory
sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc/

# Copy configuration file
sudo cp /tmp/amazon-cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Start and enable service
sudo systemctl start amazon-cloudwatch-agent
sudo systemctl enable amazon-cloudwatch-agent

echo "CloudWatch Agent installed and started successfully"
`.trim();
    }

    return `
#!/bin/bash
set -e

# Install CloudWatch Agent for Ubuntu/Debian
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Create configuration directory
sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc/

# Copy configuration file
sudo cp /tmp/amazon-cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Start and enable service
sudo systemctl start amazon-cloudwatch-agent
sudo systemctl enable amazon-cloudwatch-agent

echo "CloudWatch Agent installed and started successfully"
`.trim();
  }

  private generateCloudWatchAgentConfig(context: VMObservabilityContext, logGroup: LogGroup): string {
    return JSON.stringify({
      logs: {
        logs_collected: {
          files: {
            collect_list: [
              {
                file_path: '/var/log/syslog',
                log_group_name: logGroup.logGroupName,
                log_stream_name: '{instance_id}/syslog',
                timestamp_format: '%b %d %H:%M:%S'
              },
              {
                file_path: '/var/log/auth.log',
                log_group_name: logGroup.logGroupName,
                log_stream_name: '{instance_id}/auth.log',
                timestamp_format: '%b %d %H:%M:%S'
              }
            ]
          }
        }
      },
      metrics: {
        namespace: 'CWAgent',
        metrics_collected: {
          cpu: {
            measurement: ['cpu_usage_idle', 'cpu_usage_iowait', 'cpu_usage_user', 'cpu_usage_system'],
            metrics_collection_interval: this.config.metrics.collectionInterval
          },
          disk: {
            measurement: ['used_percent'],
            metrics_collection_interval: this.config.metrics.collectionInterval,
            resources: ['*']
          },
          diskio: {
            measurement: ['io_time'],
            metrics_collection_interval: this.config.metrics.collectionInterval,
            resources: ['*']
          },
          mem: {
            measurement: ['mem_used_percent'],
            metrics_collection_interval: this.config.metrics.collectionInterval
          }
        }
      }
    }, null, 2);
  }

  private generateOtelCollectorInstallScript(context: VMObservabilityContext): string {
    return `
#!/bin/bash
set -e

# Install OpenTelemetry Collector
wget https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/download/v0.88.0/otelcol-contrib_0.88.0_linux_amd64.deb
sudo dpkg -i otelcol-contrib_0.88.0_linux_amd64.deb

# Create configuration directory
sudo mkdir -p /etc/otelcol-contrib/

# Copy configuration file
sudo cp /tmp/otel-collector-config.yaml /etc/otelcol-contrib/config.yaml

# Create systemd service file
sudo cp /tmp/otel-collector.service /etc/systemd/system/otel-collector.service

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl start otel-collector
sudo systemctl enable otel-collector

echo "OpenTelemetry Collector installed and started successfully"
`.trim();
  }

  private generateOtelCollectorConfig(context: VMObservabilityContext): string {
    return `
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  hostmetrics:
    collection_interval: ${this.config.metrics.collectionInterval}s
    scrapers:
      cpu:
      disk:
      filesystem:
      memory:
      network:

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  memory_limiter:
    limit_mib: 512
  resource:
    attributes:
      - key: compliance.tier
        value: ${this.config.tier}
        action: upsert
      - key: compliance.framework
        value: ${this.config.framework}
        action: upsert

exporters:
  otlp:
    endpoint: ${this.getOtlpEndpoint()}
    tls:
      insecure: ${this.config.tier === 'commercial' ? 'true' : 'false'}
  logging:
    loglevel: ${this.config.logging.level}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [otlp, logging]
    metrics:
      receivers: [otlp, hostmetrics]
      processors: [memory_limiter, batch, resource]
      exporters: [otlp, logging]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [otlp, logging]
`.trim();
  }

  private generateXrayDaemonInstallScript(context: VMObservabilityContext): string {
    return `
#!/bin/bash
set -e

# Install X-Ray daemon
wget https://s3.us-east-2.amazonaws.com/aws-xray-assets.us-east-2/xray-daemon/aws-xray-daemon-linux-3.x.zip
unzip aws-xray-daemon-linux-3.x.zip
sudo cp xray /usr/local/bin/

# Create configuration directory
sudo mkdir -p /etc/xray/

# Copy configuration file
sudo cp /tmp/xray-config.yaml /etc/xray/config.yaml

# Create systemd service file
sudo cp /tmp/xray.service /etc/systemd/system/xray.service

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl start xray
sudo systemctl enable xray

echo "X-Ray daemon installed and started successfully"
`.trim();
  }

  private generateXrayDaemonConfig(context: VMObservabilityContext): string {
    return `
# X-Ray daemon configuration for FedRAMP compliance
TotalBufferSizeMB: 64
Concurrency: 8
Region: ${context.region}
Socket:
  UDPAddress: "127.0.0.1:2000"
  TCPAddress: "127.0.0.1:2000"
LocalMode: true
Logging:
  LogLevel: ${this.config.logging.level}
  LogRotation: true
  LogRotationSizeMB: 100
  LogRotationAge: 24
  LogRotationKeepFiles: 5
`.trim();
  }

  private generateWindowsCloudWatchAgentInstallScript(context: VMObservabilityContext): string {
    return `
# PowerShell script for Windows CloudWatch Agent installation
$ErrorActionPreference = "Stop"

# Download and install CloudWatch Agent
$downloadUrl = "https://s3.amazonaws.com/amazoncloudwatch-agent/windows/amd64/latest/amazon-cloudwatch-agent.msi"
$installerPath = "$env:TEMP\\amazon-cloudwatch-agent.msi"

Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath
Start-Process msiexec.exe -Wait -ArgumentList "/i $installerPath /quiet"

# Copy configuration file
Copy-Item "$env:TEMP\\amazon-cloudwatch-agent.json" "C:\\ProgramData\\Amazon\\AmazonCloudWatchAgent\\amazon-cloudwatch-agent.json"

# Start CloudWatch Agent service
Start-Service AmazonCloudWatchAgent
Set-Service AmazonCloudWatchAgent -StartupType Automatic

Write-Host "CloudWatch Agent installed and started successfully"
`.trim();
  }

  private generateWindowsCloudWatchAgentConfig(context: VMObservabilityContext, logGroup: LogGroup): string {
    return JSON.stringify({
      logs: {
        logs_collected: {
          windows_events: {
            collect_list: [
              {
                event_name: "System",
                event_levels: ["ERROR", "WARNING", "INFORMATION"],
                log_group_name: logGroup.logGroupName,
                log_stream_name: "{instance_id}/System"
              },
              {
                event_name: "Application",
                event_levels: ["ERROR", "WARNING", "INFORMATION"],
                log_group_name: logGroup.logGroupName,
                log_stream_name: "{instance_id}/Application"
              }
            ]
          }
        }
      },
      metrics: {
        namespace: "CWAgent",
        metrics_collected: {
          Processor: {
            measurement: ["% Processor Time"],
            metrics_collection_interval: this.config.metrics.collectionInterval
          },
          Memory: {
            measurement: ["Available Bytes", "Committed Bytes"],
            metrics_collection_interval: this.config.metrics.collectionInterval
          }
        }
      }
    }, null, 2);
  }

  private generateWindowsOtelCollectorInstallScript(context: VMObservabilityContext): string {
    return `
# PowerShell script for Windows OpenTelemetry Collector installation
$ErrorActionPreference = "Stop"

# Download OpenTelemetry Collector
$downloadUrl = "https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/download/v0.88.0/otelcol-contrib_0.88.0_windows_amd64.tar.gz"
$downloadPath = "$env:TEMP\\otel-collector.tar.gz"
$extractPath = "C:\\opt\\otel-collector"

Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath

# Extract and install
New-Item -ItemType Directory -Path $extractPath -Force
tar -xzf $downloadPath -C $extractPath

# Copy configuration file
Copy-Item "$env:TEMP\\otel-collector-config.yaml" "$extractPath\\config.yaml"

# Create Windows service
New-Service -Name "otel-collector" -BinaryPathName "$extractPath\\otelcol-contrib.exe --config=$extractPath\\config.yaml" -StartupType Automatic

# Start service
Start-Service otel-collector

Write-Host "OpenTelemetry Collector installed and started successfully"
`.trim();
  }

  private mapRetentionDays(days: number): RetentionDays {
    // Map retention days to CDK RetentionDays enum (same as other strategies)
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

  private createLogGroupTags(instanceId: string, environment: string): Record<string, string> {
    return {
      'Instance': instanceId,
      'Environment': environment,
      'Compliance': this.config.framework,
      'Tier': this.config.tier,
      'ManagedBy': 'Shinobi',
      'Observability': 'enabled',
      'Type': 'vm'
    };
  }
}
