/**
 * ECS Cluster Component
 * 
 * Foundational component for ECS Service Connect that creates an ECS cluster
 * with optional EC2 capacity and Service Connect namespace for microservices.
 * Implements the Platform ECS Service Connect Standard v1.0.
 */

import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  applySecurityGroupTags
} from '@shinobi/core';
import { EcsClusterConfig, EcsClusterComponentConfigBuilder } from './ecs-cluster.builder.js';
import alarmsConfig from '../observability/alarms-config.json' with { type: 'json' };
import dashboardTemplate from '../observability/otel-dashboard-template.json' with { type: 'json' };
import packageJson from '../package.json' with { type: 'json' };


/**
 * ECS Cluster Component implementing Component API Contract v1.0 and
 * Platform ECS Service Connect Standard v1.0
 */
export class EcsClusterComponent extends BaseComponent {
  private cluster?: ecs.Cluster;
  private namespace?: servicediscovery.IPrivateDnsNamespace;
  private autoScalingGroup?: autoscaling.AutoScalingGroup;
  private capacityProvider?: ecs.AsgCapacityProvider;
  private capacitySecurityGroup?: ec2.ISecurityGroup;
  private readonly config: EcsClusterConfig;
  private resolvedClusterName?: string;
  private appliedLogRetentionInDays?: number;
  private observabilityAlarms: Array<{ id: string; alarm: cloudwatch.Alarm; severity: string }> = [];
  private observabilityDashboardBody?: string;
  private observabilityDashboardName?: string;
  private observabilityDashboard?: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);

    // Build configuration only - no synthesis in constructor
    const configBuilder = new EcsClusterComponentConfigBuilder({ context, spec });
    this.config = configBuilder.buildSync();
  }

  /**
   * Synthesis phase - Create ECS Cluster with Service Connect capability
   */
  public synth(): void {
    if (this.cluster) {
      this.logComponentEvent('synthesis_skipped', 'ECS Cluster already synthesized');
      return;
    }

    this.logComponentEvent('synthesis_start', 'Starting ECS Cluster synthesis');

    const startTime = Date.now();

    try {
      // Create ECS Cluster
      this.createEcsCluster();

      // Create Service Connect namespace
      this.createServiceConnectNamespace();

      // Create optional EC2 capacity
      this.createEc2CapacityIfNeeded();

      // Configure cluster settings
      this.configureClusterSettings();

      // Enforce log retention for Container Insights as required by compliance frameworks
      this.configureContainerInsightsRetention();

      // Configure CloudWatch alarms and dashboards before building the observability capability contract
      this.configureCloudWatchAlarms();
      this.configureObservabilityDashboard();

      // Configure OpenTelemetry observability for ECS tasks
      const observabilityCapability = this.configureOpenTelemetryForEcs();

      // Apply standard platform tags
      this.applyClusterTags();

      // Register constructs for binding access
      this.registerConstruct('cluster', this.cluster!);
      this.registerConstruct('namespace', this.namespace!);
      if (this.autoScalingGroup) {
        this.registerConstruct('autoScalingGroup', this.autoScalingGroup);
      }

      // Register ecs:cluster capability
      this.registerCapability('ecs:cluster', this.buildEcsClusterCapability());
      if (observabilityCapability) {
        this.registerCapability('observability:ecs-cluster', observabilityCapability);
      }

      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });

      this.logComponentEvent('synthesis_complete', 'ECS Cluster synthesis completed successfully', {
        clusterCreated: 1,
        namespaceCreated: 1,
        capacityCreated: !!this.autoScalingGroup
      });

    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'ecs-cluster',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'ecs-cluster';
  }

  /**
   * Create the ECS Cluster
   */
  private createEcsCluster(): void {
    const clusterName = this.config.clusterName ||
      `${this.context.serviceName}-${this.spec.name}`;

    this.resolvedClusterName = clusterName;

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName,
      containerInsights: this.config.containerInsights,
      enableFargateCapacityProviders: true, // Always enable Fargate
      // Service Connect namespace will be configured after namespace creation
    });

    this.logResourceCreation('ecs-cluster', clusterName);
  }

  /**
   * Create Service Connect namespace for service discovery
   */
  private createServiceConnectNamespace(): void {
    if (!this.cluster) {
      throw new Error('ECS Cluster must be created before Service Connect namespace');
    }

    // Get VPC from context or use default
    const vpc = this.getVpcFromContext();

    // Create private DNS namespace for Service Connect and attach to cluster
    this.namespace = this.cluster.addDefaultCloudMapNamespace({
      name: this.config.serviceConnect.namespace,
      type: servicediscovery.NamespaceType.DNS_PRIVATE,
      vpc: vpc
    }) as servicediscovery.IPrivateDnsNamespace;

    this.logResourceCreation('service-connect-namespace', this.config.serviceConnect.namespace);
  }

  /**
   * Create optional EC2 capacity for the cluster
   */
  private createEc2CapacityIfNeeded(): void {
    if (!this.config.capacity || !this.cluster) {
      this.logComponentEvent('ec2_capacity_skipped', 'No EC2 capacity configured - cluster is Fargate-only');
      return;
    }

    const capacityConfig = this.config.capacity;
    const vpc = this.getVpcFromContext();
    const subnetSelection = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
    });

    const userTags = this.config.tags ?? {};

    this.capacitySecurityGroup = new ec2.SecurityGroup(this, 'CapacitySecurityGroup', {
      vpc,
      description: 'Security group for ECS EC2 capacity instances',
      allowAllOutbound: false
    });
    this.capacitySecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow outbound HTTPS to ECS control plane');

    const instanceRole = new iam.Role(this, 'CapacityInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for ECS EC2 capacity instances'
    });

    const partition = this.resolvePartition();
    instanceRole.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      'CapacityEcsManagedPolicy',
      `arn:${partition}:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role`
    ));
    instanceRole.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      'CapacitySsmManagedPolicy',
      `arn:${partition}:iam::aws:policy/AmazonSSMManagedInstanceCore`
    ));

    let kmsKey: kms.IKey | undefined;
    if (capacityConfig.kmsKeyArn) {
      kmsKey = kms.Key.fromKeyArn(this, 'ProvidedCapacityVolumeKey', capacityConfig.kmsKeyArn);
    } else if (this.shouldProvisionKmsKeyForCapacity()) {
      kmsKey = this.createCapacityKmsKey();
    }

    // Create Auto Scaling Group for ECS instances
    this.autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
      vpc,
      vpcSubnets: subnetSelection,
      securityGroup: this.capacitySecurityGroup,
      instanceType: new ec2.InstanceType(capacityConfig.instanceType),
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
      minCapacity: capacityConfig.minSize,
      maxCapacity: capacityConfig.maxSize,
      desiredCapacity: capacityConfig.desiredSize || capacityConfig.minSize,
      keyName: capacityConfig.keyName,
      autoScalingGroupName: `${this.context.serviceName}-${this.spec.name}-asg`,
      role: instanceRole,
      requireImdsv2: true,
      instanceMonitoring: capacityConfig.enableMonitoring ? autoscaling.Monitoring.DETAILED : autoscaling.Monitoring.BASIC,
      groupMetrics: [autoscaling.GroupMetrics.all()],
      newInstancesProtectedFromScaleIn: true,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: autoscaling.BlockDeviceVolume.ebs(50, {
            volumeType: autoscaling.EbsDeviceVolumeType.GP3,
            encrypted: true
          })
        }
      ],
      userData: ec2.UserData.forLinux()
    });

    if (kmsKey) {
      this.applyKmsKeyToLaunchConfiguration(kmsKey);
    }

    this.applyStandardTags(instanceRole, {
      'component-type': 'ecs-asg-role',
      'component-name': this.spec.name,
      ...userTags
    });
    cdk.Tags.of(instanceRole).add('component-name', this.spec.name);

    this.autoScalingGroup.addUserData(
      '#!/bin/bash',
      'set -euxo pipefail',
      `echo ECS_CLUSTER=${this.cluster!.clusterName} >> /etc/ecs/ecs.config`,
      `echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config`,
      'systemctl enable amazon-ssm-agent',
      'systemctl start amazon-ssm-agent'
    );

    if (capacityConfig.enableMonitoring) {
      this.logComponentEvent('monitoring_enabled', 'Detailed CloudWatch monitoring enabled for EC2 instances');
    }

    // Add capacity provider to cluster
    this.capacityProvider = new ecs.AsgCapacityProvider(this, 'CapacityProvider', {
      autoScalingGroup: this.autoScalingGroup,
      enableManagedScaling: true,
      enableManagedTerminationProtection: true
    });

    this.cluster.addAsgCapacityProvider(this.capacityProvider);

    this.registerConstruct('capacitySecurityGroup', this.capacitySecurityGroup);

    this.logResourceCreation('ec2-capacity',
      `${capacityConfig.instanceType} (${capacityConfig.minSize}-${capacityConfig.maxSize} instances)`);
  }

  /**
   * Configure additional cluster settings
   */
  private configureClusterSettings(): void {
    if (!this.cluster) return;

    // Apply compliance-specific settings based on config values (not framework checks)
    const isHighRisk = this.config.highRiskEnvironment ?? false;
    const strategy: ecs.CapacityProviderStrategy[] = [];

    if (this.capacityProvider) {
      strategy.push({ capacityProvider: this.capacityProvider.capacityProviderName, weight: 1 });
    } else {
      strategy.push({ capacityProvider: 'FARGATE', weight: 1 });
      // Omit FARGATE_SPOT for high-risk environments (aligns with FedRAMP requirements)
      if (!isHighRisk) {
        strategy.push({ capacityProvider: 'FARGATE_SPOT', weight: 2 });
      }
    }

    if (strategy.length) {
      this.cluster.addDefaultCapacityProviderStrategy(strategy);
    }

    if (isHighRisk) {
      this.logComponentEvent('compliance_configured', 'Applied high-risk environment compliance settings');
    }
  }

  /**
   * Configure OpenTelemetry observability for ECS tasks according to Platform Observability Standard
   */
  private configureOpenTelemetryForEcs():
    | {
        otelEnvironment: Record<string, string>;
        containerInsightsEnabled: boolean;
        metrics: string[];
        logging: {
          containerInsights: boolean;
          retentionInDays?: number;
          appliedRetentionInDays?: number;
        };
        tracing: {
          adotSidecar: boolean;
          collectorEndpoint?: string;
        };
        alarms: {
          notificationTopicArn?: string;
          severityOverrides?: Record<string, string>;
          alarmNames: string[];
        };
        dashboard: {
          enabled: boolean;
          name?: string;
          body?: string;
        };
      }
    | undefined {
    if (this.config.monitoring?.enabled === false) {
      this.logComponentEvent('observability_skipped', 'Monitoring disabled for ECS Cluster');
      return undefined;
    }

    if (!this.cluster) {
      this.logComponentEvent('otel_skipped', 'ECS Cluster not available for OTel configuration');
      return undefined;
    }

    // Get standardized OpenTelemetry environment variables for ECS tasks
    const otelEnvVars = this.configureObservability(this.cluster, {
      serviceName: `${this.context.serviceName}-ecs-cluster`
    });

    const tracingConfig = this.config.observability?.tracing;
    if (tracingConfig?.collectorEndpoint) {
      otelEnvVars['OTEL_EXPORTER_OTLP_ENDPOINT'] = tracingConfig.collectorEndpoint;
    }

    const adotSidecar = tracingConfig?.adotSidecar ?? true;

    // Store OTel environment variables for ECS task definitions
    // These will be applied to all tasks running in this cluster
    this.registerCapability('otel:environment', otelEnvVars);

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to ECS Cluster', {
      otelServiceName: otelEnvVars['OTEL_SERVICE_NAME'],
      otelExporterEndpoint: otelEnvVars['OTEL_EXPORTER_OTLP_ENDPOINT'],
      adotSidecar
    });

    return {
      otelEnvironment: otelEnvVars,
      containerInsightsEnabled: this.config.containerInsights ?? true,
      metrics: ['AWS/ECS:CPUUtilization', 'AWS/ECS:MemoryUtilization'],
      logging: {
        containerInsights: this.config.containerInsights ?? true,
        retentionInDays: this.config.observability?.logging?.retentionInDays,
        appliedRetentionInDays: this.appliedLogRetentionInDays ?? this.config.observability?.logging?.retentionInDays
      },
      tracing: {
        adotSidecar,
        collectorEndpoint: tracingConfig?.collectorEndpoint
      },
      alarms: {
        notificationTopicArn: this.config.observability?.alarms?.notificationTopicArn,
        severityOverrides: this.config.observability?.alarms?.severityOverrides,
        alarmNames: this.observabilityAlarms.map(({ alarm }) => alarm.alarmName ?? alarm.node.id)
      },
      dashboard: {
        enabled: this.config.observability?.dashboard?.enabled ?? true,
        name: this.config.observability?.dashboard?.name ?? this.observabilityDashboardName,
        body: this.observabilityDashboardBody
      }
    };
  }

  private configureContainerInsightsRetention(): void {
    if (!this.cluster) {
      return;
    }

    const retentionInDays = this.config.observability?.logging?.retentionInDays;
    if (!retentionInDays) {
      // If no retention configured, set appliedRetentionInDays to undefined
      // (will use config value in capability)
      this.appliedLogRetentionInDays = undefined;
      return;
    }

    // Always set appliedRetentionInDays to the configured value (may be overridden by mapping)
    this.appliedLogRetentionInDays = retentionInDays;

    const retentionMapping = this.mapRetentionInDays(retentionInDays);
    const retention = retentionMapping?.retention;
    if (!retention) {
      this.logComponentEvent('log_retention_skipped', `Unsupported retention value: ${retentionInDays} days`);
      // Keep appliedRetentionInDays as the configured value (already set above)
      return;
    }

    // Override with the mapped value if mapping succeeded
    this.appliedLogRetentionInDays = retentionMapping.applied;

    ['performance', 'event'].forEach((suffix) => {
      const id = `ContainerInsights${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}Retention`;
      new logs.LogRetention(this, id, {
        logGroupName: `/aws/ecs/containerinsights/${this.cluster!.clusterName}/${suffix}`,
        retention
      });
    });
  }

  private configureCloudWatchAlarms(): void {
    if (!this.cluster) {
      return;
    }

    const alarmDefinitions = (alarmsConfig as { alarms?: Record<string, any> }).alarms ?? {};
    const notificationTopicArn = this.config.observability?.alarms?.notificationTopicArn;
    const severityOverrides = this.config.observability?.alarms?.severityOverrides ?? {};

    this.observabilityAlarms = [];

    const stackRegion = cdk.Stack.of(this).region;
    const metricRegion = this.context.region ?? stackRegion;

    if (stackRegion && metricRegion && stackRegion !== metricRegion) {
      this.logComponentEvent('observability_alarm_skipped', 'Skipping alarm synthesis due to cross-region mismatch', {
        stackRegion,
        metricRegion
      });
      return;
    }

    Object.entries(alarmDefinitions).forEach(([alarmId, definition]) => {
      if (!definition) {
        return;
      }

      const metric = new cloudwatch.Metric({
        namespace: definition.namespace,
        metricName: definition.metricName,
        statistic: definition.statistic ?? 'Average',
        period: cdk.Duration.seconds(definition.period ?? 300),
        dimensionsMap: this.renderMetricDimensions(definition.dimensions ?? {}),
        region: metricRegion
      });

      const comparisonOperator = this.toComparisonOperator(definition.comparisonOperator);

      const alarm = new cloudwatch.Alarm(this, `Alarm${this.toPascal(alarmId)}`, {
        alarmName: this.renderTemplate(definition.alarmName ?? alarmId),
        alarmDescription: this.renderTemplate(definition.alarmDescription ?? ''),
        metric,
        threshold: definition.threshold,
        evaluationPeriods: definition.evaluationPeriods ?? 1,
        datapointsToAlarm: definition.datapointsToAlarm,
        treatMissingData: this.toTreatMissingData(definition.treatMissingData),
        comparisonOperator
      });

      const resolvedAlarmActions = this.resolveAlarmActions(definition.alarmActions ?? [], notificationTopicArn);
      const resolvedOkActions = this.resolveAlarmActions(definition.okActions ?? [], notificationTopicArn);

      resolvedAlarmActions.forEach((actionArn, index) => {
        const topic = sns.Topic.fromTopicArn(this, `AlarmActionTopic${this.toPascal(alarmId)}${index}`, actionArn);
        alarm.addAlarmAction(new cloudwatchActions.SnsAction(topic));
      });

      resolvedOkActions.forEach((actionArn, index) => {
        const topic = sns.Topic.fromTopicArn(this, `OkActionTopic${this.toPascal(alarmId)}${index}`, actionArn);
        alarm.addOkAction(new cloudwatchActions.SnsAction(topic));
      });

      const alarmTags = this.buildAlarmTags(definition.tags ?? {});
      Object.entries(alarmTags).forEach(([key, value]) => {
        cdk.Tags.of(alarm).add(key, value);
      });

      const severity = severityOverrides[alarmId] ?? definition.tags?.severity ?? 'warning';
      this.observabilityAlarms.push({ id: alarmId, alarm, severity });
    });
  }

  private configureObservabilityDashboard(): void {
    if (!this.cluster) {
      return;
    }

    const dashboardEnabled = this.config.observability?.dashboard?.enabled ?? true;
    if (!dashboardEnabled) {
      return;
    }

    const dashboardName = this.config.observability?.dashboard?.name
      ?? `${this.context.serviceName}-${this.spec.name}-observability`;

    const body = this.buildDashboardBody(dashboardName);
    this.observabilityDashboardBody = body;
    this.observabilityDashboardName = dashboardName;

    // Create dashboard using CfnDashboard to support dashboardBody
    const cfnDashboard = new cloudwatch.CfnDashboard(this, 'EcsClusterDashboard', {
      dashboardName,
      dashboardBody: body
    });
    
    // Also create L2 Dashboard for compatibility
    this.observabilityDashboard = new cloudwatch.Dashboard(this, 'EcsClusterDashboardL2', {
      dashboardName
    });
  }

  private mapRetentionInDays(retentionInDays: number): { retention: logs.RetentionDays; applied: number } | undefined {
    const retentionOrder: Array<{ days: number; value: logs.RetentionDays }> = [
      { days: 1, value: logs.RetentionDays.ONE_DAY },
      { days: 3, value: logs.RetentionDays.THREE_DAYS },
      { days: 5, value: logs.RetentionDays.FIVE_DAYS },
      { days: 7, value: logs.RetentionDays.ONE_WEEK },
      { days: 14, value: logs.RetentionDays.TWO_WEEKS },
      { days: 30, value: logs.RetentionDays.ONE_MONTH },
      { days: 60, value: logs.RetentionDays.TWO_MONTHS },
      { days: 90, value: logs.RetentionDays.THREE_MONTHS },
      { days: 120, value: logs.RetentionDays.FOUR_MONTHS },
      { days: 150, value: logs.RetentionDays.FIVE_MONTHS },
      { days: 180, value: logs.RetentionDays.SIX_MONTHS },
      { days: 365, value: logs.RetentionDays.ONE_YEAR },
      { days: 400, value: logs.RetentionDays.THIRTEEN_MONTHS },
      { days: 545, value: logs.RetentionDays.EIGHTEEN_MONTHS },
      { days: 731, value: logs.RetentionDays.TWO_YEARS },
      { days: 1827, value: logs.RetentionDays.FIVE_YEARS },
      { days: 3653, value: logs.RetentionDays.TEN_YEARS }
    ];

    for (const entry of retentionOrder) {
      if (retentionInDays <= entry.days) {
        return { retention: entry.value, applied: entry.days };
      }
    }

    const fallback = retentionOrder[retentionOrder.length - 1];
    return { retention: fallback.value, applied: fallback.days };
  }

  private renderMetricDimensions(dimensions: Record<string, string>): Record<string, string> {
    return Object.entries(dimensions).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = this.renderTemplate(value);
      return acc;
    }, {});
  }

  private renderTemplate(value: string): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    const replacements: Record<string, string> = {
      '${cluster_name}': this.resolvedClusterName ?? `${this.context.serviceName}-${this.spec.name}`,
      '${environment}': this.context.environment ?? '',
      '${service_name}': this.context.serviceName ?? '',
      '${namespace}': this.namespace?.namespaceName ?? this.config.serviceConnect.namespace,
      '${component_name}': this.spec.name ?? ''
    };

    return Object.entries(replacements).reduce<string>((acc, [token, replacement]) => {
      return acc.replaceAll(token, replacement);
    }, value);
  }

  private toComparisonOperator(operator?: string): cloudwatch.ComparisonOperator {
    if (!operator) {
      return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
    }

    const lookupKey = operator
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase();

    const mapping: Record<string, cloudwatch.ComparisonOperator> = {
      GREATERTHANTHRESHOLD: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      GREATERTHANOREQUALTO: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      LESSERTHANTHRESHOLD: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      LESSERTHANOREQUALTO: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD
    };

    return mapping[lookupKey] ?? cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
  }

  private toTreatMissingData(value?: string): cloudwatch.TreatMissingData {
    if (!value) {
      return cloudwatch.TreatMissingData.NOT_BREACHING;
    }

    const lookup = value.toUpperCase();
    const mapping: Record<string, cloudwatch.TreatMissingData> = {
      BREACHING: cloudwatch.TreatMissingData.BREACHING,
      NOTBREACHING: cloudwatch.TreatMissingData.NOT_BREACHING,
      IGNORE: cloudwatch.TreatMissingData.IGNORE,
      MISSING: cloudwatch.TreatMissingData.MISSING
    };

    return mapping[lookup] ?? cloudwatch.TreatMissingData.NOT_BREACHING;
  }

  private resolveAlarmActions(actions: string[], notificationTopicArn?: string): string[] {
    return actions
      .map((action) => {
        if (action === '${notification_topic_arn}') {
          return notificationTopicArn;
        }
        return action;
      })
      .filter((action): action is string => typeof action === 'string' && action.length > 0);
  }

  private toPascal(value: string): string {
    return value
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join('');
  }

  private buildDashboardBody(dashboardName: string): string {
    const clusterName = this.resolvedClusterName ?? `${this.context.serviceName}-${this.spec.name}`;
    const region = this.context.region ?? cdk.Stack.of(this).region;

    const widgets = [
      {
        type: 'metric',
        width: 12,
        height: 6,
        properties: {
          title: 'ECS Cluster CPU Utilization',
          view: 'timeSeries',
          stacked: false,
          region,
          metrics: [
            ['AWS/ECS', 'CPUUtilization', 'ClusterName', clusterName]
          ],
          stat: 'Average'
        }
      },
      {
        type: 'metric',
        width: 12,
        height: 6,
        properties: {
          title: 'ECS Cluster Memory Utilization',
          view: 'timeSeries',
          stacked: false,
          region,
          metrics: [
            ['AWS/ECS', 'MemoryUtilization', 'ClusterName', clusterName]
          ],
          stat: 'Average'
        }
      }
    ];

    return JSON.stringify({
      start: '-PT6H',
      widgets,
      dashboardName
    });
  }

  private buildAlarmTags(tags: Record<string, string | undefined>): Record<string, string> {
    const baseTags: Record<string, string> = {
      'component-type': 'ecs-cluster',
      'component-name': this.spec.name,
      'service-name': this.context.serviceName,
      environment: this.context.environment ?? ''
    };

    const merged = { ...baseTags };
    for (const [key, value] of Object.entries(tags)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        merged[this.toKebabCase(key)] = value;
      }
    }

    return Object.entries(merged).reduce<Record<string, string>>((acc, [key, value]) => {
      const kebabKey = this.toKebabCase(key);
      if (kebabKey.length > 0 && value.trim().length > 0) {
        acc[kebabKey] = value.trim();
      }
      return acc;
    }, {});
  }

  private toKebabCase(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  /**
   * Apply standard platform tags to ECS Cluster and related resources
   */
  private applyClusterTags(): void {
    const userTags = this.config.tags ?? {};

    if (this.cluster) {
      this.applyStandardTags(this.cluster, {
        'component-type': 'ecs-cluster',
        'service-connect-namespace': this.config.serviceConnect.namespace,
        'component-name': this.spec.name,
        ...userTags
      });
      cdk.Tags.of(this.cluster).add('component-name', this.spec.name);
    }

    if (this.namespace) {
      this.applyStandardTags(this.namespace, {
        'component-type': 'service-connect-namespace',
        'component-name': this.spec.name,
        ...userTags
      });
      cdk.Tags.of(this.namespace).add('component-name', this.spec.name);
    }

    if (this.autoScalingGroup) {
      this.applyStandardTags(this.autoScalingGroup, {
        'component-type': 'ecs-asg',
        'instance-type': this.config.capacity?.instanceType || 'unknown',
        'component-name': this.spec.name,
        ...userTags
      });
      cdk.Tags.of(this.autoScalingGroup).add('component-name', this.spec.name);
    }

    if (this.capacitySecurityGroup) {
      this.applyStandardTags(this.capacitySecurityGroup, {
        'component-type': 'ecs-asg-sg',
        'component-name': this.spec.name,
        ...userTags
      });
      
      // Apply security-group-specific tags (SG-009)
      applySecurityGroupTags(this.capacitySecurityGroup, {
        ingressPolicy: 'binder-managed',
        tier: 'app'
      });
      
      cdk.Tags.of(this.capacitySecurityGroup).add('component-name', this.spec.name);
    }
  }

  /**
   * Build the ecs:cluster capability according to the specification
   */
  private buildEcsClusterCapability() {
    const vpc = this.getVpcFromContext();
    // Use config value instead of framework check
    const isHighRisk = this.config.highRiskEnvironment ?? false;
    const capacityProviders: string[] = ['FARGATE'];
    // Omit FARGATE_SPOT for high-risk environments (aligns with FedRAMP requirements)
    if (!isHighRisk) {
      capacityProviders.push('FARGATE_SPOT');
    }
    // Only add EC2 if capacity is actually configured (not just defaults)
    if (this.config.capacity && this.autoScalingGroup) {
      capacityProviders.push('EC2');
    }

    const tracingConfig = this.config.observability?.tracing;

    return {
      clusterName: this.cluster!.clusterName,
      clusterArn: this.cluster!.clusterArn,
      vpcId: vpc.vpcId,
      serviceConnectNamespace: this.config.serviceConnect.namespace,
      namespaceArn: this.namespace!.namespaceArn,
      namespaceId: this.namespace!.namespaceId,
      hasEc2Capacity: !!this.config.capacity,
      capacityProviders,
      capacitySecurityGroupId: this.capacitySecurityGroup?.securityGroupId,
      observability: {
        containerInsightsEnabled: this.config.containerInsights ?? true,
        logRetentionInDays: this.config.observability?.logging?.retentionInDays,
        appliedLogRetentionInDays: this.appliedLogRetentionInDays,
        adotSidecarRequired: tracingConfig?.adotSidecar ?? true,
        collectorEndpoint: tracingConfig?.collectorEndpoint,
        dashboardEnabled: this.config.observability?.dashboard?.enabled ?? true,
        dashboardName: this.config.observability?.dashboard?.name ?? this.observabilityDashboard?.dashboardName,
        alarms: this.observabilityAlarms.map(({ id, alarm, severity }) => ({
          id,
          alarmName: alarm.alarmName,
          severity
        }))
      },
      alarms: {
        notificationTopicArn: this.config.observability?.alarms?.notificationTopicArn,
        alarmNames: this.observabilityAlarms.map(({ alarm }) => alarm.alarmName)
      }
    };
  }

  /**
   * Get VPC from context or throw error if not available
   */
  private getVpcFromContext(): ec2.IVpc {
    if (this.context.vpc) {
      return this.context.vpc;
    }

    throw new Error('ECS Cluster component requires a VPC provided via context.vpc');
  }

  private shouldProvisionKmsKeyForCapacity(): boolean {
    // Use config value instead of framework check
    // KMS key required for high-risk environments (aligns with FedRAMP requirements)
    return this.config.highRiskEnvironment ?? false;
  }

  private createCapacityKmsKey(): kms.IKey {
    const aliasSuffix = `${this.context.serviceName}/${this.spec.name}/ecs-capacity`.replace(/[^a-zA-Z0-9/\-]/g, '-');
    return new kms.Key(this, 'CapacityVolumeKey', {
      enableKeyRotation: true,
      alias: `alias/${aliasSuffix}`
    });
  }

  private resolvePartition(): string {
    const region = this.context.region ?? cdk.Stack.of(this).region;

    if (!region || region === cdk.Aws.REGION) {
      return cdk.Aws.PARTITION;
    }

    if (region.startsWith('us-gov-')) {
      return 'aws-us-gov';
    }

    if (region.startsWith('cn-')) {
      return 'aws-cn';
    }

    if (region.startsWith('us-iso-b-')) {
      return 'aws-iso-b';
    }

    if (region.startsWith('us-iso-')) {
      return 'aws-iso';
    }

    return 'aws';
  }

  private applyKmsKeyToLaunchConfiguration(kmsKey: kms.IKey): void {
    if (!this.autoScalingGroup) {
      return;
    }

    const launchConfig = this.autoScalingGroup.node.tryFindChild('LaunchConfig') as
      | autoscaling.CfnLaunchConfiguration
      | undefined;

    if (launchConfig) {
      launchConfig.addPropertyOverride('BlockDeviceMappings.0.Ebs.Encrypted', true);
      launchConfig.addPropertyOverride('BlockDeviceMappings.0.Ebs.KmsKeyId', kmsKey.keyArn);
      return;
    }

    const launchTemplate = this.autoScalingGroup.node.tryFindChild('LaunchTemplate') as
      | ec2.CfnLaunchTemplate
      | undefined;

    if (launchTemplate) {
      launchTemplate.addPropertyOverride('LaunchTemplateData.BlockDeviceMappings.0.Ebs.Encrypted', true);
      launchTemplate.addPropertyOverride('LaunchTemplateData.BlockDeviceMappings.0.Ebs.KmsKeyId', kmsKey.keyArn);
    }
  }

  private getComponentVersion(): string {
    return typeof (packageJson as { version?: string }).version === 'string'
      ? (packageJson as { version: string }).version
      : '1.0.0';
  }

  /**
   * Validate that component has been synthesized before accessing capabilities
   */
  protected validateSynthesized(): void {
    if (!this.cluster) {
      throw new Error('ECS Cluster component must be synthesized before accessing capabilities');
    }
  }
}
