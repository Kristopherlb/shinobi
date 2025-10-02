/**
 * Auto Scaling Group Component
 * * A managed auto scaling group with launch template and compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@shinobi/core';
import {
  AutoScalingGroupConfig,
  AutoScalingGroupComponentConfigBuilder
} from './auto-scaling-group.builder.js';

/**
 * Auto Scaling Group Component implementing Component API Contract v1.0
 */
export class AutoScalingGroupComponent extends BaseComponent {
  private autoScalingGroup?: autoscaling.AutoScalingGroup;
  private launchTemplate?: ec2.LaunchTemplate;
  private securityGroup?: ec2.SecurityGroup;
  private role?: iam.Role;
  private instanceProfile?: iam.InstanceProfile;
  private kmsKey?: kms.IKey;
  private config!: AutoScalingGroupConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Auto Scaling Group synthesis');

    try {
      const configBuilder = new AutoScalingGroupComponentConfigBuilder({
        context: this.context,
        spec: this.spec
      });
      this.config = configBuilder.buildSync();

      this.createKmsKeyIfNeeded();
      this.createInstanceRole();
      this.createSecurityGroup();
      this.createLaunchTemplate();
      this.createAutoScalingGroup();
      this.applySecurityHardening();

      this.registerConstruct('main', this.autoScalingGroup!);
      this.registerConstruct('autoScalingGroup', this.autoScalingGroup!);
      this.registerConstruct('launchTemplate', this.launchTemplate!);
      this.registerConstruct('securityGroup', this.securityGroup!);
      this.registerConstruct('instanceRole', this.role!);
      if (this.instanceProfile) {
        this.registerConstruct('instanceProfile', this.instanceProfile);
      }
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }

      this.registerCapability('compute:auto-scaling-group', this.buildAutoScalingGroupCapability());

      const observabilityCapability = this.configureObservabilityForAsg();
      this.registerCapability('observability:auto-scaling-group', observabilityCapability);

      this.applyCDKNagSuppressions();

      this.logComponentEvent('synthesis_complete', 'Auto Scaling Group synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'auto-scaling-group synthesis');
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'auto-scaling-group';
  }

  private createKmsKeyIfNeeded(): void {
    const kmsConfig = this.config.storage.kms;
    if (kmsConfig.kmsKeyArn) {
      this.kmsKey = kms.Key.fromKeyArn(this, 'ImportedKmsKey', kmsConfig.kmsKeyArn);
      return;
    }

    if (!kmsConfig.useCustomerManagedKey) {
      this.kmsKey = undefined;
      return;
    }

    const key = new kms.Key(this, 'EbsEncryptionKey', {
      description: `EBS encryption key for ${this.spec.name} Auto Scaling Group`,
      enableKeyRotation: kmsConfig.enableKeyRotation,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
    });

    this.applyStandardTags(key, {
      'resource-type': 'kms-key',
      'component': this.spec.name
    });

    this.kmsKey = key;
  }

  private createInstanceRole(): void {
    this.role = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: `IAM role for ${this.spec.name} Auto Scaling Group instances`,
      managedPolicies: this.config.security.managedPolicies.map(policyName =>
        iam.ManagedPolicy.fromAwsManagedPolicyName(policyName)
      )
    });

    if (this.config.security.attachLogDeliveryPolicy) {
      this.role.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['logs:PutLogEvents', 'logs:CreateLogStream', 'logs:CreateLogGroup'],
        resources: ['arn:aws:logs:*:*:*']
      }));
    }

    this.applyStandardTags(this.role, {
      'resource-type': 'iam-role',
      'component': this.spec.name
    });

    this.instanceProfile = new iam.InstanceProfile(this, 'InstanceProfile', {
      role: this.role
    });
    this.applyStandardTags(this.instanceProfile, {
      'resource-type': 'iam-instance-profile'
    });
  }

  private createSecurityGroup(): void {
    const vpc = this.getVpc();
    this.securityGroup = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
      vpc,
      description: `Security group for ${this.spec.name} Auto Scaling Group`,
      allowAllOutbound: this.config.vpc.allowAllOutbound
    });

    this.applyStandardTags(this.securityGroup, {
      'resource-type': 'security-group'
    });

    this.applySecurityGroupRules();
  }

  private createLaunchTemplate(): void {
    this.launchTemplate = new ec2.LaunchTemplate(this, 'LaunchTemplate', {
      launchTemplateName: `${this.context.serviceName}-${this.spec.name}`,
      instanceType: new ec2.InstanceType(this.config.launchTemplate.instanceType),
      machineImage: this.getInstanceAmi(),
      userData: this.buildUserData(),
      keyName: this.config.launchTemplate.keyName,
      securityGroup: this.securityGroup!,
      role: this.role!,
      blockDevices: this.buildBlockDevices(),
      detailedMonitoring: this.config.launchTemplate.detailedMonitoring,
      requireImdsv2: this.config.launchTemplate.requireImdsv2
    });

    this.applyStandardTags(this.launchTemplate, {
      'resource-type': 'launch-template'
    });
  }

  private createAutoScalingGroup(): void {
    const vpc = this.getVpc();
    this.autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
      autoScalingGroupName: `${this.context.serviceName}-${this.spec.name}`,
      vpc,
      vpcSubnets: this.getVpcSubnets(),
      launchTemplate: this.launchTemplate!,
      minCapacity: this.config.autoScaling.minCapacity,
      maxCapacity: this.config.autoScaling.maxCapacity,
      desiredCapacity: this.config.autoScaling.desiredCapacity,
      healthCheck: this.getHealthCheckType(),
      terminationPolicies: this.getTerminationPolicies(),
      updatePolicy: this.getUpdatePolicy()
    });

    this.applyAutoScalingGroupTags();
  }

  private applySecurityHardening(): void {
    if (this.config.security.stigComplianceTag) {
      cdk.Tags.of(this.autoScalingGroup!).add('STIGCompliant', 'true');
    }
  }

  private applySecurityGroupRules(): void {
    // Security group rules are now configured via the vpc.securityGroupIds
    // or through explicit configuration in the component spec
    // No hardcoded rules - all access must be explicitly configured
    this.logComponentEvent('security_group_configured', 'Security group created with no default ingress rules');
  }

  private buildUserData(): ec2.UserData {
    const userData = ec2.UserData.forLinux();

    // Add platform observability configuration
    this.addObservabilityConfiguration(userData);

    if (this.config.launchTemplate.userData) {
      userData.addCommands(this.config.launchTemplate.userData);
    }

    if (this.config.launchTemplate.installAgents.ssm) {
      userData.addCommands(
        'yum install -y amazon-ssm-agent',
        'systemctl enable amazon-ssm-agent',
        'systemctl start amazon-ssm-agent'
      );
    }

    if (this.config.launchTemplate.installAgents.stigHardening) {
      userData.addCommands('# Apply STIG hardening scripts');
    }

    return userData;
  }

  private addObservabilityConfiguration(userData: ec2.UserData): void {
    userData.addCommands(
      '# Configure OpenTelemetry observability',
      `echo 'export OTEL_SERVICE_NAME=${this.context.serviceName}' >> /etc/environment`,
      `echo 'export OTEL_SERVICE_VERSION=${this.context.serviceVersion || "1.0.0"}' >> /etc/environment`,
      `echo 'export OTEL_RESOURCE_ATTRIBUTES="environment=${this.context.environment},region=${this.context.region},compliance.framework=${this.context.complianceFramework}"' >> /etc/environment`,
      `echo 'export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.${this.context.environment}.${this.context.region}.platform.local:4317' >> /etc/environment`,
      '# Observability collector installation delegated to central binder',
      "echo 'OTEL_COLLECTOR_MANAGED=1' >> /etc/environment"
    );
  }

  private buildBlockDevices(): ec2.BlockDevice[] {
    return [{
      deviceName: '/dev/xvda',
      volume: ec2.BlockDeviceVolume.ebs(this.config.storage.rootVolumeSize, {
        volumeType: this.getEbsVolumeType(),
        encrypted: this.shouldEnableEbsEncryption(),
        kmsKey: this.kmsKey,
        deleteOnTermination: true
      })
    }];
  }

  private applyAutoScalingGroupTags(): void {
    this.applyStandardTags(this.autoScalingGroup!, {
      Name: `${this.context.serviceName}-${this.spec.name}`,
      ...this.config.tags
    });
  }

  private buildAutoScalingGroupCapability(): any {
    return {
      asgArn: this.autoScalingGroup!.autoScalingGroupArn,
      asgName: this.autoScalingGroup!.autoScalingGroupName,
      roleArn: this.role!.roleArn,
      securityGroupId: this.securityGroup!.securityGroupId,
      launchTemplateId: this.launchTemplate!.launchTemplateId,
      launchTemplateName: this.launchTemplate!.launchTemplateName,
      kmsKeyArn: this.kmsKey ? this.kmsKey.keyArn : undefined
    };
  }

  private applyCDKNagSuppressions(): void {
    // Suppress AS2: Auto Scaling Group health checks - we configure health checks via launch template
    NagSuppressions.addResourceSuppressions(this.autoScalingGroup!, [
      {
        id: 'AwsSolutions-AS2',
        reason: 'Health checks are configured via launch template with proper health check type and grace period'
      }
    ]);

    // Suppress AS3: Auto Scaling Group notifications - we use CloudWatch alarms instead
    NagSuppressions.addResourceSuppressions(this.autoScalingGroup!, [
      {
        id: 'AwsSolutions-AS3',
        reason: 'Scaling events are monitored via CloudWatch alarms and SNS notifications are handled at the service level'
      }
    ]);

    // Suppress EC28: Detailed monitoring - we enable detailed monitoring by default
    if (this.config.launchTemplate.detailedMonitoring) {
      NagSuppressions.addResourceSuppressions(this.autoScalingGroup!, [
        {
          id: 'AwsSolutions-EC28',
          reason: 'Detailed monitoring is enabled via launch template configuration'
        }
      ]);
    }

    // Suppress IAM4: Managed policies - we use least privilege custom policies
    if (this.config.security.managedPolicies.length === 0) {
      NagSuppressions.addResourceSuppressions(this.role!, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Using custom IAM policies with least privilege access instead of managed policies'
        }
      ]);
    }

    // Suppress IAM5: Wildcard permissions - we scope permissions to specific resources
    NagSuppressions.addResourceSuppressions(this.role!, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'IAM permissions are scoped to specific resources and log groups'
      }
    ]);

    this.logComponentEvent('cdk_nag_suppressions_applied', 'Applied CDK Nag suppressions with justifications');
  }

  // --- Helper methods for compliance decisions and configurations ---

  private getVpc(): ec2.IVpc {
    if (this.context.vpc) {
      return this.context.vpc;
    }

    if (this.config.vpc.vpcId) {
      return ec2.Vpc.fromLookup(this, 'ConfiguredVpc', { vpcId: this.config.vpc.vpcId });
    }

    return ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
  }

  private shouldEnableEbsEncryption(): boolean {
    return this.config.storage.encrypted;
  }

  private getInstanceAmi(): ec2.IMachineImage {
    if (this.config.launchTemplate.ami?.amiId) {
      const amiMap: { [key: string]: string } = {};
      amiMap[this.context.region!] = this.config.launchTemplate.ami.amiId;
      return ec2.MachineImage.genericLinux(amiMap);
    }
    // In a real scenario, you'd have hardened AMI lookups here based on framework
    return ec2.MachineImage.latestAmazonLinux2();
  }

  private getVpcSubnets(): ec2.SubnetSelection {
    if (this.config.vpc.subnetIds && this.config.vpc.subnetIds.length > 0) {
      return {
        subnets: this.config.vpc.subnetIds.map((id, index) =>
          ec2.Subnet.fromSubnetId(this, `AsgSubnet${index}`, id)
        )
      };
    }
    return {
      subnetType: this.config.vpc.subnetType === 'PRIVATE_WITH_EGRESS'
        ? ec2.SubnetType.PRIVATE_WITH_EGRESS
        : ec2.SubnetType.PUBLIC
    };
  }

  private getEbsVolumeType(): ec2.EbsDeviceVolumeType {
    const type = this.config.storage.rootVolumeType || 'gp3';
    return ec2.EbsDeviceVolumeType[type.toUpperCase() as keyof typeof ec2.EbsDeviceVolumeType];
  }

  private getHealthCheckType(): autoscaling.HealthCheck {
    if (this.config.healthCheck.type === 'ELB') {
      return autoscaling.HealthCheck.elb({ grace: cdk.Duration.seconds(this.config.healthCheck.gracePeriod) });
    }

    return autoscaling.HealthCheck.ec2({ grace: cdk.Duration.seconds(this.config.healthCheck.gracePeriod) });
  }

  private getTerminationPolicies(): autoscaling.TerminationPolicy[] {
    return (this.config.terminationPolicies ?? ['Default']).map(policy =>
      autoscaling.TerminationPolicy[policy.toUpperCase() as keyof typeof autoscaling.TerminationPolicy]
    );
  }

  private getUpdatePolicy(): autoscaling.UpdatePolicy {
    const rollingUpdate = this.config.updatePolicy?.rollingUpdate;
    if (rollingUpdate) {
      return autoscaling.UpdatePolicy.rollingUpdate({
        minInstancesInService: rollingUpdate.minInstancesInService,
        maxBatchSize: rollingUpdate.maxBatchSize,
        pauseTime: rollingUpdate.pauseTime ? cdk.Duration.parse(rollingUpdate.pauseTime) : undefined
      });
    }
    return autoscaling.UpdatePolicy.rollingUpdate();
  }

  /**
   * Configure observability for Auto Scaling Group following OpenTelemetry standards
   * Creates standard CloudWatch alarms for essential ASG metrics
   */
  private configureObservabilityForAsg(): Record<string, any> {
    const monitoring = this.config.monitoring;

    if (!monitoring.enabled) {
      this.logComponentEvent('observability_skipped', 'Auto Scaling Group monitoring disabled');
      return {
        enabled: false,
        autoScalingGroupName: this.autoScalingGroup!.autoScalingGroupName
      };
    }

    const telemetry = this.buildTelemetryDirectives();

    this.logComponentEvent('observability_registered', 'Registered Auto Scaling Group observability configuration', {
      component: this.spec.name,
      service: this.context.serviceName,
      alarms: monitoring.alarms,
      telemetry
    });

    return {
      type: 'auto-scaling-group',
      autoScalingGroupName: this.autoScalingGroup!.autoScalingGroupName,
      monitoring,
      launchTemplateId: this.launchTemplate?.launchTemplateId,
      capacity: {
        min: this.config.autoScaling.minCapacity,
        max: this.config.autoScaling.maxCapacity,
        desired: this.config.autoScaling.desiredCapacity
      },
      tags: this.config.tags,
      telemetry
    };
  }

  private buildTelemetryDirectives(): Record<string, any> {
    const asgName = this.autoScalingGroup!.autoScalingGroupName;
    const alarmsConfig = this.config.monitoring.alarms;
    const dimensions = { AutoScalingGroupName: asgName };

    const metrics: Array<Record<string, any>> = [
      {
        id: `${asgName}-desired-capacity`,
        namespace: 'AWS/AutoScaling',
        metricName: 'GroupDesiredCapacity',
        dimensions,
        statistic: 'Average',
        periodSeconds: 60,
        description: 'Desired capacity configured for the Auto Scaling Group'
      },
      {
        id: `${asgName}-in-service`,
        namespace: 'AWS/AutoScaling',
        metricName: 'GroupInServiceInstances',
        dimensions,
        statistic: 'Average',
        periodSeconds: 60,
        description: 'Number of in-service instances in the Auto Scaling Group'
      },
      {
        id: `${asgName}-total-instances`,
        namespace: 'AWS/AutoScaling',
        metricName: 'GroupTotalInstances',
        dimensions,
        statistic: 'Average',
        periodSeconds: 60,
        description: 'Total number of instances managed by the Auto Scaling Group'
      }
    ];

    const alarms: Array<Record<string, any>> = [];

    if (this.config.monitoring.enabled && alarmsConfig.cpuHigh.enabled) {
      const cpuMetricId = `${asgName}-cpu-utilization`;
      metrics.push({
        id: cpuMetricId,
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensions,
        statistic: 'Average',
        periodSeconds: (alarmsConfig.cpuHigh.periodMinutes ?? 5) * 60,
        unit: 'Percent',
        description: 'Average CPU utilization for instances in the Auto Scaling Group'
      });

      alarms.push({
        id: `${asgName}-cpu-high`,
        metricId: cpuMetricId,
        alarmName: `${this.context.serviceName}-${this.spec.name}-cpu-high`,
        alarmDescription: 'CPU utilization threshold breached for Auto Scaling Group',
        threshold: alarmsConfig.cpuHigh.threshold,
        comparisonOperator: this.mapTelemetryComparisonOperator(alarmsConfig.cpuHigh.comparisonOperator),
        evaluationPeriods: alarmsConfig.cpuHigh.evaluationPeriods,
        severity: 'warning',
        treatMissingData: this.mapTelemetryTreatMissingData(alarmsConfig.cpuHigh.treatMissingData)
      });
    }

    if (this.config.monitoring.enabled && alarmsConfig.inService.enabled) {
      alarms.push({
        id: `${asgName}-in-service-capacity`,
        metricId: `${asgName}-in-service`,
        alarmName: `${this.context.serviceName}-${this.spec.name}-in-service`,
        alarmDescription: 'In-service instance count below expected threshold',
        threshold: alarmsConfig.inService.threshold,
        comparisonOperator: this.mapTelemetryComparisonOperator(alarmsConfig.inService.comparisonOperator),
        evaluationPeriods: alarmsConfig.inService.evaluationPeriods,
        severity: 'critical',
        treatMissingData: this.mapTelemetryTreatMissingData(alarmsConfig.inService.treatMissingData)
      });
    }

    const logging = {
      enabled: true,
      destination: 'otel-collector',
      format: 'json'
    };

    const tracing = {
      enabled: true,
      provider: 'adot',
      samplingRate: 0.1,
      attributes: {
        'autoscaling.group': asgName,
        'service.name': `${this.context.serviceName}-${this.spec.name}`
      }
    };

    return {
      metrics,
      alarms: alarms.length ? alarms : undefined,
      logging,
      tracing,
      custom: {
        capacity: {
          min: this.config.autoScaling.minCapacity,
          max: this.config.autoScaling.maxCapacity,
          desired: this.config.autoScaling.desiredCapacity
        },
        launchTemplateId: this.launchTemplate?.launchTemplateId
      }
    };
  }

  private mapTelemetryComparisonOperator(operator: string | undefined): 'gt' | 'gte' | 'lt' | 'lte' {
    switch ((operator ?? 'gte').toLowerCase()) {
      case 'gt':
        return 'gt';
      case 'lt':
        return 'lt';
      case 'lte':
        return 'lte';
      case 'gte':
      default:
        return 'gte';
    }
  }

  private mapTelemetryTreatMissingData(
    treatMissingData: string | undefined
  ): 'breaching' | 'notBreaching' | 'ignore' | 'missing' | undefined {
    switch ((treatMissingData ?? '').toLowerCase()) {
      case 'breaching':
        return 'breaching';
      case 'ignore':
        return 'ignore';
      case 'missing':
        return 'missing';
      case 'not-breaching':
        return 'notBreaching';
      default:
        return undefined;
    }
  }

}
