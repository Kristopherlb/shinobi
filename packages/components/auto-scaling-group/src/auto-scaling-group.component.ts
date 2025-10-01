/**
 * Auto Scaling Group Component
 * * A managed auto scaling group with launch template and compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@shinobi/core';
import {
  AutoScalingGroupConfig,
  AutoScalingGroupComponentConfigBuilder,
  AutoScalingGroupAlarmConfig
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
  private cpuAlarm?: cloudwatch.Alarm;
  private inServiceAlarm?: cloudwatch.Alarm;

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
      this.configureObservabilityForAsg();

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
      this.registerCapability('monitoring:auto-scaling-group', {
        cpuAlarmArn: this.cpuAlarm?.alarmArn,
        inServiceAlarmArn: this.inServiceAlarm?.alarmArn
      });

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
    // Example: Allow inbound web traffic
    this.securityGroup!.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
  }

  private buildUserData(): ec2.UserData {
    const userData = ec2.UserData.forLinux();
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
    if (this.config.launchTemplate.installAgents.cloudwatch) {
      userData.addCommands(
        'yum install -y amazon-cloudwatch-agent',
        'systemctl enable amazon-cloudwatch-agent'
      );
    }
    if (this.config.launchTemplate.installAgents.stigHardening) {
      userData.addCommands('# Apply STIG hardening scripts');
    }
    return userData;
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
  private configureObservabilityForAsg(): void {
    // CPU Utilization Alarm - Aggregated across all instances
    const cpuAlarmConfig = this.config.monitoring.alarms.cpuHigh;
    if (cpuAlarmConfig.enabled) {
      this.cpuAlarm = new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/AutoScaling',
          metricName: 'CPUUtilization',
          dimensionsMap: {
            AutoScalingGroupName: this.autoScalingGroup!.autoScalingGroupName
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(cpuAlarmConfig.periodMinutes ?? 5)
        }),
        threshold: cpuAlarmConfig.threshold ?? 80,
        evaluationPeriods: cpuAlarmConfig.evaluationPeriods ?? 2,
        comparisonOperator: this.mapComparisonOperator(cpuAlarmConfig.comparisonOperator ?? 'GT'),
        treatMissingData: this.mapTreatMissingData(cpuAlarmConfig.treatMissingData ?? 'not-breaching'),
        alarmDescription: `CPU utilization high for Auto Scaling Group ${this.spec.name}`,
        alarmName: `${this.context.serviceName}-${this.spec.name}-cpu-high`
      });

      this.applyStandardTags(this.cpuAlarm, { 'alarm-type': 'cpu-high' });
      this.registerConstruct('cpuAlarm', this.cpuAlarm);
    }

    const inServiceConfig = this.config.monitoring.alarms.inService;
    if (inServiceConfig.enabled) {
      this.inServiceAlarm = new cloudwatch.Alarm(this, 'InServiceInstancesAlarm', {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/AutoScaling',
          metricName: 'GroupInServiceInstances',
          dimensionsMap: {
            AutoScalingGroupName: this.autoScalingGroup!.autoScalingGroupName
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(inServiceConfig.periodMinutes ?? 1)
        }),
        threshold: inServiceConfig.threshold ?? this.config.autoScaling.minCapacity,
        evaluationPeriods: inServiceConfig.evaluationPeriods ?? 2,
        comparisonOperator: this.mapComparisonOperator(inServiceConfig.comparisonOperator ?? 'LT'),
        treatMissingData: this.mapTreatMissingData(inServiceConfig.treatMissingData ?? 'breaching'),
        alarmDescription: `In-service instances below minimum capacity for Auto Scaling Group ${this.spec.name}`,
        alarmName: `${this.context.serviceName}-${this.spec.name}-instances-low`
      });

      this.applyStandardTags(this.inServiceAlarm, { 'alarm-type': 'in-service' });
      this.registerConstruct('instancesAlarm', this.inServiceAlarm);
    }

    this.logComponentEvent('observability_configured', 'Configured Auto Scaling Group monitoring');
  }

  private mapComparisonOperator(operator: AutoScalingGroupAlarmConfig['comparisonOperator']): cloudwatch.ComparisonOperator {
    switch (operator) {
      case 'LT':
        return cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;
      case 'LTE':
        return cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'GTE':
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'GT':
      default:
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
    }
  }

  private mapTreatMissingData(mode: AutoScalingGroupAlarmConfig['treatMissingData']): cloudwatch.TreatMissingData {
    switch (mode) {
      case 'breaching':
        return cloudwatch.TreatMissingData.BREACHING;
      case 'ignore':
        return cloudwatch.TreatMissingData.IGNORE;
      case 'missing':
        return cloudwatch.TreatMissingData.MISSING;
      case 'not-breaching':
      default:
        return cloudwatch.TreatMissingData.NOT_BREACHING;
    }
  }
}
