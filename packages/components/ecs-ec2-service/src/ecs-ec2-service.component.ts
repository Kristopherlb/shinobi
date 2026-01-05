/**
 * ECS EC2 Service Component
 *
 * Provisions an EC2-backed ECS service with Service Connect integration.
 */

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent, applySecurityGroupTags } from '@shinobi/core';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
import {
  EcsEc2ServiceConfig,
  EcsEc2ServiceConfigBuilder,
  EcsPlacementConstraintConfig,
  EcsPlacementStrategyConfig
} from './ecs-ec2-service.builder.ts';

export class EcsEc2ServiceComponent extends BaseComponent {
  private service?: ecs.Ec2Service;
  private taskDefinition?: ecs.Ec2TaskDefinition;
  private securityGroup?: ec2.SecurityGroup;
  private logGroup?: logs.ILogGroup;
  private createdLogGroup?: logs.LogGroup;
  private config!: EcsEc2ServiceConfig;
  private configBuilder?: EcsEc2ServiceConfigBuilder;
  private importedCluster?: ecs.ICluster;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting ECS EC2 Service synthesis');

    try {
      this.configBuilder = new EcsEc2ServiceConfigBuilder(this.context, this.spec);
      this.config = this.configBuilder.buildSync();

      this.createTaskDefinition();
      this.createSecurityGroup();
      this.createEc2Service();
      this.configureAutoScaling();
      this.configureObservabilityForEcsService();
      this.applyServiceTags();

      this.registerConstruct('service', this.service!);
      this.registerConstruct('taskDefinition', this.taskDefinition!);
      this.registerConstruct('securityGroup', this.securityGroup!);
      if (this.createdLogGroup) {
        this.registerConstruct('logGroup', this.createdLogGroup);
      }

      this.registerCapability('service:connect', this.buildServiceConnectCapability());

      this.logComponentEvent('synthesis_complete', 'ECS EC2 Service synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'ECS EC2 Service synthesis');
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'ecs-ec2-service';
  }

  private createTaskDefinition(): void {
    this.logGroup = this.resolveLogGroup();

    let taskRole: iam.IRole;
    if (this.config.taskRoleArn) {
      taskRole = iam.Role.fromRoleArn(this, 'TaskRole', this.config.taskRoleArn);
    } else {
      taskRole = new iam.Role(this, 'TaskRole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        description: `Task role for ${this.context.serviceName} ${this.spec.name}`
      });
    }

    this.taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDefinition', {
      family: `${this.context.serviceName}-${this.spec.name}`,
      taskRole,
      networkMode: ecs.NetworkMode.AWS_VPC
    });

    const imageUri = `${this.config.image.repository}:${this.config.image.tag}`;
    const container = this.taskDefinition.addContainer('Container', {
      image: ecs.ContainerImage.fromRegistry(imageUri),
      cpu: this.config.taskCpu,
      memoryLimitMiB: this.config.taskMemory,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: this.config.logging.streamPrefix,
        logGroup: this.logGroup
      }),
      environment: this.config.environment,
      secrets: this.buildSecretsFromConfig()
    });

    container.addPortMappings({
      name: this.config.serviceConnect.portMappingName,
      containerPort: this.config.port,
      protocol: ecs.Protocol.TCP
    });

    if (this.config.healthCheck) {
      this.logComponentEvent('health_check_configured', 'Health check configured for container');
    }

    this.logResourceCreation('ec2-task-definition', this.taskDefinition.family);
  }

  private resolveLogGroup(): logs.ILogGroup {
    const logging = this.config.logging;

    if (!logging.createLogGroup) {
      if (!logging.logGroupName) {
        throw new Error('`config.logging.logGroupName` is required when `createLogGroup` is false.');
      }
      const imported = logs.LogGroup.fromLogGroupName(this, 'ImportedLogGroup', logging.logGroupName);

      new logs.LogRetention(this, 'ImportedLogGroupRetention', {
        logGroupName: logging.logGroupName,
        retention: this.mapLogRetentionDays(logging.retentionInDays),
        logGroupRegion: this.context.region
      });

      return imported;
    }

    const removalPolicy = logging.removalPolicy === 'destroy'
      ? cdk.RemovalPolicy.DESTROY
      : cdk.RemovalPolicy.RETAIN;

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: logging.logGroupName ?? `/ecs/${this.context.serviceName}/${this.spec.name}`,
      retention: this.mapLogRetentionDays(logging.retentionInDays),
      removalPolicy
    });

    this.applyStandardTags(logGroup, {
      'log-type': 'ecs-service',
      'service-name': this.context.serviceName,
      'component-name': this.spec.name
    });

    this.createdLogGroup = logGroup;
    return logGroup;
  }

  private createSecurityGroup(): void {
    const vpc = this.getVpcFromContext();
    const egressPolicy = this.config.network?.egressPolicy ?? 'allow-all';

    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: `Security group for ${this.context.serviceName} ${this.spec.name}`,
      allowAllOutbound: egressPolicy === 'allow-all'
    });

    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(this.config.port),
      'Allow inbound traffic on service port'
    );

    // Apply egress policy if not allow-all
    this.applyEgressPolicy(vpc, egressPolicy);

    // Apply standard tags
    this.applyStandardTags(this.securityGroup, {
      'resource-type': 'security-group'
    });

    // Apply security-group-specific tags (SG-009)
    applySecurityGroupTags(this.securityGroup, {
      ingressPolicy: 'binder-managed',
      tier: 'app'
    });

    this.logResourceCreation('security-group', this.securityGroup.securityGroupId);
  }

  private applyEgressPolicy(vpc: ec2.IVpc, policy: string): void {
    if (policy === 'allow-all') {
      return; // Already configured in constructor
    }

    if (policy === 'vpc-only') {
      this.securityGroup!.addEgressRule(
        ec2.Peer.ipv4(vpc.vpcCidrBlock),
        ec2.Port.allTraffic(),
        'Allow all traffic within VPC'
      );
      this.logComponentEvent('egress_policy_applied', 'VPC-only egress policy configured');
    }

    if (policy === 'vpc-endpoints-only') {
      // HTTPS to VPC CIDR (for VPC endpoints)
      this.securityGroup!.addEgressRule(
        ec2.Peer.ipv4(vpc.vpcCidrBlock),
        ec2.Port.tcp(443),
        'HTTPS to VPC endpoints'
      );

      // Add specific prefix list rules if provided
      if (this.config.network?.vpcEndpoints && this.config.network.vpcEndpoints.length > 0) {
        this.config.network.vpcEndpoints.forEach((prefixListId, index) => {
          this.securityGroup!.addEgressRule(
            ec2.Peer.prefixList(prefixListId),
            ec2.Port.tcp(443),
            `VPC Endpoint ${index + 1}: ${prefixListId}`
          );
        });
      }

      this.logComponentEvent('egress_policy_applied', 'VPC endpoints-only egress policy configured', {
        prefixLists: this.config.network?.vpcEndpoints?.length ?? 0
      });
    }
  }

  private createEc2Service(): void {
    if (!this.taskDefinition || !this.securityGroup) {
      throw new Error('Task definition and security group must be created before EC2 service');
    }

    const cluster = this.getClusterFromBinding();
    const namespace = this.config.serviceConnect.namespace ?? cluster.defaultCloudMapNamespace?.namespaceName;

    if (!namespace) {
      throw new Error('Service Connect namespace must be provided via config or cluster default namespace.');
    }

    const placementConstraints = this.config.placementConstraints.map(constraint =>
      this.buildPlacementConstraint(constraint)
    );

    const placementStrategies = this.config.placementStrategies.map(strategy =>
      this.buildPlacementStrategy(strategy)
    );

    this.service = new ecs.Ec2Service(this, 'Service', {
      cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: this.config.desiredCount,
      serviceName: `${this.context.serviceName}-${this.spec.name}`,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this.securityGroup],
      placementConstraints,
      placementStrategies,
      serviceConnectConfiguration: {
        namespace,
        services: [{
          portMappingName: this.config.serviceConnect.portMappingName,
          dnsName: this.config.serviceConnect.dnsName ?? this.spec.name,
          port: this.config.port
        }]
      },
      enableExecuteCommand: this.config.diagnostics.enableExecuteCommand
    });

    this.logResourceCreation('ec2-service', this.service.serviceName);
  }

  private configureAutoScaling(): void {
    if (!this.service || !this.config.autoScaling) {
      return;
    }

    const scaling = this.service.autoScaleTaskCount({
      minCapacity: this.config.autoScaling.minCapacity,
      maxCapacity: this.config.autoScaling.maxCapacity
    });

    if (this.config.autoScaling.targetCpuUtilization) {
      scaling.scaleOnCpuUtilization('CpuScaling', {
        targetUtilizationPercent: this.config.autoScaling.targetCpuUtilization,
        scaleInCooldown: cdk.Duration.minutes(5),
        scaleOutCooldown: cdk.Duration.minutes(2)
      });
    }

    if (this.config.autoScaling.targetMemoryUtilization) {
      scaling.scaleOnMemoryUtilization('MemoryScaling', {
        targetUtilizationPercent: this.config.autoScaling.targetMemoryUtilization,
        scaleInCooldown: cdk.Duration.minutes(5),
        scaleOutCooldown: cdk.Duration.minutes(2)
      });
    }

    this.logComponentEvent('autoscaling_configured', 'Auto scaling configured for ECS EC2 service', {
      minCapacity: this.config.autoScaling.minCapacity,
      maxCapacity: this.config.autoScaling.maxCapacity
    });
  }

  private configureObservabilityForEcsService(): void {
    if (!this.service || !this.taskDefinition) {
      return;
    }

    const otelEnvVars = this.configureObservability(this.service, {
      serviceName: `${this.context.serviceName}-ecs-ec2-service`,
      componentType: 'ecs-ec2-service',
      customAttributes: {
        'ecs.launch-type': 'EC2',
        'ecs.task-definition': this.taskDefinition.family,
        'container.port': this.config.port.toString(),
        'service.connect.name': this.config.serviceConnect.portMappingName
      }
    });

    this.registerCapability('otel:environment', otelEnvVars);

    // Apply telemetry collectors if configured
    this.applyTelemetryCollectors();

    // Create CloudWatch alarms
    this.createEcsServiceAlarms();

    // Create CloudWatch Dashboard if enabled
    if (this.config.observability?.dashboard?.enabled !== false) {
      this.createServiceDashboard();
    }
  }

  private applyTelemetryCollectors(): void {
    // X-Ray Daemon configuration
    if (this.config.observability?.xray?.enabled) {
      if (this.config.observability.xray.mode === 'sidecar') {
        this.addXRayDaemonSidecar();
      } else {
        this.configureXRayRemote();
      }
    }

    // ADOT Collector configuration
    if (this.config.observability?.adot?.enabled) {
      if (this.config.observability.adot.mode === 'sidecar') {
        this.addAdotCollectorSidecar();
      } else {
        this.configureAdotRemote();
      }
    }
  }

  private addXRayDaemonSidecar(): void {
    if (!this.taskDefinition || !this.logGroup) {
      return;
    }

    const xrayContainer = this.taskDefinition.addContainer('XRayDaemon', {
      image: ecs.ContainerImage.fromRegistry('amazon/aws-xray-daemon:latest'),
      cpu: 128,
      memoryLimitMiB: 256,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'xray',
        logGroup: this.logGroup
      }),
      essential: false  // Don't kill task if daemon fails
    });

    xrayContainer.addPortMappings({
      containerPort: 2000,
      protocol: ecs.Protocol.UDP
    });

    // Grant X-Ray permissions to task role
    this.taskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess')
    );

    // Configure application container to use sidecar
    const appContainer = this.taskDefinition.defaultContainer;
    if (appContainer) {
      appContainer.addEnvironment('AWS_XRAY_DAEMON_ADDRESS', 'localhost:2000');
      appContainer.addEnvironment('AWS_XRAY_TRACING_NAME', this.context.serviceName);
      appContainer.addEnvironment('AWS_XRAY_CONTEXT_MISSING', 'LOG_ERROR');
    }

    this.logComponentEvent('xray_sidecar_configured', 'X-Ray daemon sidecar added to task definition');
  }

  private configureXRayRemote(): void {
    if (!this.taskDefinition) {
      return;
    }

    // Use account-level X-Ray collector
    const appContainer = this.taskDefinition.defaultContainer;
    if (appContainer) {
      appContainer.addEnvironment('AWS_XRAY_DAEMON_ADDRESS',
        `xray-collector.${this.context.environment}.${this.context.region}.platform.local:2000`
      );
      appContainer.addEnvironment('AWS_XRAY_TRACING_NAME', this.context.serviceName);
      appContainer.addEnvironment('AWS_XRAY_CONTEXT_MISSING', 'LOG_ERROR');
    }

    // Still need IAM permissions for centralized collector
    this.taskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess')
    );

    this.logComponentEvent('xray_remote_configured', 'X-Ray configured to use centralized collector');
  }

  private addAdotCollectorSidecar(): void {
    if (!this.taskDefinition || !this.logGroup) {
      return;
    }

    const version = this.config.observability?.adot?.version ?? 'v0.35.0';
    const adotContainer = this.taskDefinition.addContainer('ADOTCollector', {
      image: ecs.ContainerImage.fromRegistry(
        `public.ecr.aws/aws-observability/aws-otel-collector:${version}`
      ),
      cpu: 256,
      memoryLimitMiB: 512,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'adot',
        logGroup: this.logGroup
      }),
      essential: false,
      environment: {
        'AOT_CONFIG_CONTENT': this.buildAdotConfig()
      }
    });

    adotContainer.addPortMappings({
      containerPort: 4317,
      protocol: ecs.Protocol.TCP
    });

    adotContainer.addPortMappings({
      containerPort: 4318,
      protocol: ecs.Protocol.TCP
    });

    // Configure application container to send to ADOT sidecar
    const appContainer = this.taskDefinition.defaultContainer;
    if (appContainer) {
      appContainer.addEnvironment('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4317');
      appContainer.addEnvironment('OTEL_TRACES_EXPORTER', 'otlp');
      appContainer.addEnvironment('OTEL_METRICS_EXPORTER', 'otlp');
      appContainer.addContainerDependencies({
        container: adotContainer,
        condition: ecs.ContainerDependencyCondition.START
      });
    }

    // Grant CloudWatch and X-Ray permissions for ADOT
    this.taskDefinition.taskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:PutLogEvents',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:DescribeLogStreams',
        'logs:DescribeLogGroups'
      ],
      resources: [`${this.logGroup.logGroupArn}:*`]
    }));

    this.taskDefinition.taskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords'
      ],
      resources: ['*']
    }));

    this.taskDefinition.taskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cloudwatch:PutMetricData'
      ],
      resources: ['*']
    }));

    this.logComponentEvent('adot_sidecar_configured', 'ADOT collector sidecar added to task definition', {
      version
    });
  }

  private buildAdotConfig(): string {
    return JSON.stringify({
      receivers: {
        otlp: {
          protocols: {
            grpc: {
              endpoint: '0.0.0.0:4317'
            },
            http: {
              endpoint: '0.0.0.0:4318'
            }
          }
        }
      },
      exporters: {
        awsxray: {
          region: this.context.region
        },
        awsemf: {
          namespace: 'Shinobi/ECS',
          region: this.context.region,
          resource_to_telemetry_conversion: {
            enabled: true
          }
        },
        logging: {
          loglevel: 'info'
        }
      },
      service: {
        pipelines: {
          traces: {
            receivers: ['otlp'],
            exporters: ['awsxray', 'logging']
          },
          metrics: {
            receivers: ['otlp'],
            exporters: ['awsemf', 'logging']
          }
        }
      }
    });
  }

  private configureAdotRemote(): void {
    if (!this.taskDefinition) {
      return;
    }

    // Use account-level ADOT collector
    const appContainer = this.taskDefinition.defaultContainer;
    if (appContainer) {
      appContainer.addEnvironment('OTEL_EXPORTER_OTLP_ENDPOINT',
        `https://adot-collector.${this.context.environment}.${this.context.region}.platform.local:4317`
      );
      appContainer.addEnvironment('OTEL_TRACES_EXPORTER', 'otlp');
      appContainer.addEnvironment('OTEL_METRICS_EXPORTER', 'otlp');
    }

    // Grant permissions for remote collector
    this.taskDefinition.taskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords'
      ],
      resources: ['*']
    }));

    this.logComponentEvent('adot_remote_configured', 'ADOT configured to use centralized collector');
  }

  private createEcsServiceAlarms(): void {
    if (!this.service) {
      return;
    }

    const monitoring = this.config.monitoring;
    if (!monitoring.enabled) {
      return;
    }

    const cluster = this.getClusterFromBinding();
    const serviceName = this.service.serviceName;

    const cpuConfig = monitoring.alarms.cpu;
    if (cpuConfig.enabled) {
      const cpuAlarm = new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-cpu-high`,
        alarmDescription: `High CPU utilization for ECS EC2 service ${serviceName}`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName: 'CPUUtilization',
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            ServiceName: serviceName,
            ClusterName: cluster.clusterName
          }
        }),
        threshold: cpuConfig.threshold,
        evaluationPeriods: cpuConfig.evaluationPeriods,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      this.applyStandardTags(cpuAlarm, {
        'alarm-type': 'cpu-utilization',
        'service-name': serviceName
      });
    }

    const memoryConfig = monitoring.alarms.memory;
    if (memoryConfig.enabled) {
      const memoryAlarm = new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-memory-high`,
        alarmDescription: `High memory utilization for ECS EC2 service ${serviceName}`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName: 'MemoryUtilization',
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            ServiceName: serviceName,
            ClusterName: cluster.clusterName
          }
        }),
        threshold: memoryConfig.threshold,
        evaluationPeriods: memoryConfig.evaluationPeriods,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
      });

      this.applyStandardTags(memoryAlarm, {
        'alarm-type': 'memory-utilization',
        'service-name': serviceName
      });
    }
  }

  private createServiceDashboard(): void {
    if (!this.service) {
      return;
    }

    const cluster = this.getClusterFromBinding();
    const serviceName = this.service.serviceName;
    const widgets = this.config.observability?.dashboard?.widgets ?? ['cpu', 'memory', 'tasks', 'logs'];

    const dashboard = new cloudwatch.Dashboard(this, 'ServiceDashboard', {
      dashboardName: `${this.context.serviceName}-${this.spec.name}`,
      periodOverride: cloudwatch.PeriodOverride.AUTO
    });

    const dashboardWidgets: cloudwatch.IWidget[] = [];

    // CPU and Memory Widget
    if (widgets.includes('cpu') || widgets.includes('memory')) {
      const cpuMetric = new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          ServiceName: serviceName,
          ClusterName: cluster.clusterName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
        label: 'CPU %'
      });

      const memoryMetric = new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'MemoryUtilization',
        dimensionsMap: {
          ServiceName: serviceName,
          ClusterName: cluster.clusterName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
        label: 'Memory %'
      });

      dashboardWidgets.push(
        new cloudwatch.GraphWidget({
          title: 'CPU and Memory Utilization',
          width: 12,
          height: 6,
          left: [cpuMetric],
          right: [memoryMetric],
          leftYAxis: { min: 0, max: 100, label: 'CPU %' },
          rightYAxis: { min: 0, max: 100, label: 'Memory %' }
        })
      );
    }

    // Task Count Widget
    if (widgets.includes('tasks')) {
      dashboardWidgets.push(
        new cloudwatch.GraphWidget({
          title: 'Task Count',
          width: 12,
          height: 6,
          left: [
            new cloudwatch.Metric({
              namespace: 'AWS/ECS',
              metricName: 'DesiredTaskCount',
              dimensionsMap: { ServiceName: serviceName, ClusterName: cluster.clusterName },
              label: 'Desired',
              color: cloudwatch.Color.BLUE
            }),
            new cloudwatch.Metric({
              namespace: 'AWS/ECS',
              metricName: 'RunningTaskCount',
              dimensionsMap: { ServiceName: serviceName, ClusterName: cluster.clusterName },
              label: 'Running',
              color: cloudwatch.Color.GREEN
            }),
            new cloudwatch.Metric({
              namespace: 'AWS/ECS',
              metricName: 'PendingTaskCount',
              dimensionsMap: { ServiceName: serviceName, ClusterName: cluster.clusterName },
              label: 'Pending',
              color: cloudwatch.Color.ORANGE
            })
          ]
        })
      );
    }

    // Service Connect Widget
    if (widgets.includes('service-connect')) {
      dashboardWidgets.push(
        new cloudwatch.GraphWidget({
          title: 'Service Connect Metrics',
          width: 12,
          height: 6,
          left: [
            new cloudwatch.Metric({
              namespace: 'Shinobi/ECS',
              metricName: 'ServiceConnectRequests',
              dimensionsMap: { ServiceName: serviceName },
              statistic: 'Sum',
              label: 'Requests'
            })
          ],
          right: [
            new cloudwatch.Metric({
              namespace: 'Shinobi/ECS',
              metricName: 'ServiceConnectLatency',
              dimensionsMap: { ServiceName: serviceName },
              statistic: 'Average',
              label: 'Latency (ms)'
            })
          ]
        })
      );
    }

    // Log Insights Widget
    if (widgets.includes('logs') && this.logGroup) {
      dashboardWidgets.push(
        new cloudwatch.LogQueryWidget({
          title: 'Recent Errors',
          width: 24,
          height: 6,
          logGroupNames: [this.logGroup.logGroupName],
          queryString: `fields @timestamp, @message, level
| filter level = "ERROR"
| sort @timestamp desc
| limit 20`
        })
      );
    }

    // Alarms Widget
    if (widgets.includes('alarms')) {
      dashboardWidgets.push(
        new cloudwatch.AlarmStatusWidget({
          title: 'Service Alarms',
          width: 24,
          height: 3,
          alarms: [
            cloudwatch.Alarm.fromAlarmArn(
              this,
              'DashboardCpuAlarm',
              `arn:aws:cloudwatch:${this.context.region}:${this.context.accountId}:alarm:${this.context.serviceName}-${this.spec.name}-cpu-high`
            ),
            cloudwatch.Alarm.fromAlarmArn(
              this,
              'DashboardMemoryAlarm',
              `arn:aws:cloudwatch:${this.context.region}:${this.context.accountId}:alarm:${this.context.serviceName}-${this.spec.name}-memory-high`
            )
          ]
        })
      );
    }

    // Add all widgets to dashboard
    dashboard.addWidgets(...dashboardWidgets);

    this.applyStandardTags(dashboard, {
      'dashboard-type': 'service-monitoring',
      'service-name': serviceName,
      'cluster-name': cluster.clusterName
    });

    this.registerConstruct('dashboard', dashboard);

    this.logComponentEvent('dashboard_created', 'CloudWatch Dashboard created', {
      widgetCount: dashboardWidgets.length,
      widgets: widgets.join(',')
    });
  }

  private applyServiceTags(): void {
    const standardTags = {
      'component-type': 'ecs-ec2-service',
      'service-connect-name': this.config.serviceConnect.portMappingName,
      'container-port': this.config.port.toString(),
      'task-cpu': this.config.taskCpu.toString(),
      'task-memory': this.config.taskMemory.toString()
    };

    if (this.service) {
      this.applyStandardTags(this.service, standardTags);
      Object.entries(this.config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.service!).add(key, value);
      });
    }

    if (this.taskDefinition) {
      this.applyStandardTags(this.taskDefinition, standardTags);
      Object.entries(this.config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.taskDefinition!).add(key, value);
      });
    }

    if (this.securityGroup) {
      this.applyStandardTags(this.securityGroup, standardTags);
      Object.entries(this.config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.securityGroup!).add(key, value);
      });
    }

    if (this.createdLogGroup) {
      Object.entries(this.config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.createdLogGroup!).add(key, value);
      });
    }
  }

  private buildServiceConnectCapability() {
    const cluster = this.getClusterFromBinding();
    return {
      serviceName: this.spec.name,
      serviceArn: this.service!.serviceArn,
      clusterName: cluster.clusterName,
      dnsName: `${this.spec.name}.${cluster.defaultCloudMapNamespace?.namespaceName}`,
      port: this.config.port,
      portMappingName: this.config.serviceConnect.portMappingName,
      sgId: this.securityGroup!.securityGroupId,
      securityGroupId: this.securityGroup!.securityGroupId,
      internalEndpoint: `http://${this.spec.name}.internal:${this.config.port}`,
      computeType: 'EC2'
    };
  }

  private buildSecretsFromConfig(): Record<string, ecs.Secret> | undefined {
    if (!this.config.secrets || Object.keys(this.config.secrets).length === 0) {
      return undefined;
    }

    const secrets: Record<string, ecs.Secret> = {};
    Object.entries(this.config.secrets).forEach(([key, secretArn]) => {
      const secret = secretsmanager.Secret.fromSecretCompleteArn(this, `Secret-${key}`, secretArn);
      secrets[key] = ecs.Secret.fromSecretsManager(secret);
    });

    return secrets;
  }

  private buildPlacementConstraint(constraint: EcsPlacementConstraintConfig): ecs.PlacementConstraint {
    switch (constraint.type) {
      case 'memberOf':
        if (!constraint.expression) {
          throw new Error('`memberOf` placement constraint requires an expression.');
        }
        return ecs.PlacementConstraint.memberOf(constraint.expression);
      case 'distinctInstance':
        return ecs.PlacementConstraint.distinctInstances();
      default:
        throw new Error(`Unknown placement constraint type: ${constraint.type}`);
    }
  }

  private buildPlacementStrategy(strategy: EcsPlacementStrategyConfig): ecs.PlacementStrategy {
    switch (strategy.type) {
      case 'random':
        return ecs.PlacementStrategy.randomly();
      case 'spread':
        return strategy.field
          ? ecs.PlacementStrategy.spreadAcross(strategy.field)
          : ecs.PlacementStrategy.spreadAcrossInstances();
      case 'binpack':
        if (!strategy.field || strategy.field === 'cpu') {
          return ecs.PlacementStrategy.packedBy(ecs.BinPackResource.CPU);
        }
        if (strategy.field === 'memory') {
          return ecs.PlacementStrategy.packedBy(ecs.BinPackResource.MEMORY);
        }
        return ecs.PlacementStrategy.packedBy(strategy.field as any);
      default:
        throw new Error(`Unknown placement strategy type: ${strategy.type}`);
    }
  }

  private getClusterFromBinding(): ecs.ICluster {
    if (this.importedCluster) {
      return this.importedCluster;
    }

    if (!this.config.cluster) {
      throw new Error('ECS cluster configuration is required for EC2 service');
    }

    if (this.config.cluster.startsWith('arn:aws:ecs:')) {
      this.importedCluster = ecs.Cluster.fromClusterArn(this, 'ImportedCluster', this.config.cluster);
      return this.importedCluster;
    }

    const clusterName = this.config.cluster.includes('/')
      ? this.config.cluster.split('/').pop() || this.config.cluster
      : this.config.cluster;

    this.importedCluster = ecs.Cluster.fromClusterAttributes(this, 'ImportedCluster', {
      clusterName,
      vpc: this.getVpcFromContext()
    });

    return this.importedCluster;
  }

  private getVpcFromContext(): ec2.IVpc {
    if ((this.context as ComponentContext).vpc) {
      return (this.context as ComponentContext).vpc!;
    }

    return ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
  }

  protected validateSynthesized(): void {
    if (!this.service) {
      throw new Error('ECS EC2 Service component must be synthesized before accessing capabilities');
    }
  }
}
