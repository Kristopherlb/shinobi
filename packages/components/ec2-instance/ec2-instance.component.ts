/**
 * EC2 Instance Component
 * 
 * A managed EC2 compute instance with compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// File system operations are now handled by the abstract ConfigBuilder base class
import { BaseComponent } from '../@shinobi/core/component.js';
import {
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '../@shinobi/core/component-interfaces.js';
import { Ec2InstanceComponentConfigBuilder, Ec2InstanceConfig } from './ec2-instance.builder.js';



/**
 * EC2 Instance Component implementing Component API Contract v1.0
 */
export class Ec2InstanceComponent extends BaseComponent {
  private instance?: ec2.Instance;
  private securityGroup?: ec2.SecurityGroup;
  private instanceProfile?: iam.InstanceProfile;
  private role?: iam.Role;
  private kmsKey?: kms.Key;
  private config?: Ec2InstanceConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create EC2 instance with compliance hardening
   * Follows the 6-step pattern from Platform Component API Contract
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting EC2 Instance synthesis');

    try {
      // Step 1: Build configuration using ConfigBuilder
      const configBuilder = new Ec2InstanceComponentConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();

      // Step 2: Create helper resources (KMS key for compliance)
      this.createKmsKeyIfNeeded();

      // Step 3: Create IAM role and instance profile
      this.createInstanceRole();

      // Step 4: Create security group
      this.createSecurityGroup();

      // Step 5: Create EC2 instance
      this.createInstance();

      // Apply compliance hardening
      this.applyComplianceHardening();

      // Configure observability (required by OpenTelemetry standard)
      this.configureObservabilityForInstance();

      // Step 6a: Apply standard tags to all resources
      this.applyStandardTags(this.instance!);
      this.applyStandardTags(this.securityGroup!);
      this.applyStandardTags(this.role!);
      if (this.kmsKey) {
        this.applyStandardTags(this.kmsKey);
      }

      // Step 6b: Register constructs
      this.registerConstruct('instance', this.instance!);
      this.registerConstruct('securityGroup', this.securityGroup!);
      this.registerConstruct('role', this.role!);
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }

      // Step 6c: Register capabilities
      this.registerCapability('compute:ec2', this.buildInstanceCapability());

      // Validate that synthesis was successful
      this.validateSynthesized();

      this.logComponentEvent('synthesis_complete', 'EC2 Instance synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'EC2 Instance synthesis');
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
    return 'ec2-instance';
  }

  /**
   * Create KMS key for EBS encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    if (this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EbsEncryptionKey', {
        description: `EBS encryption key for ${this.spec.name} EC2 instance`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });

      // Grant EC2 service access to the key
      this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowEC2Service',
        principals: [new iam.ServicePrincipal('ec2.amazonaws.com')],
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey*',
          'kms:ReEncrypt*',
          'kms:DescribeKey'
        ],
        resources: ['*']
      }));
    }
  }

  /**
   * Create IAM role and instance profile for the EC2 instance
   */
  private createInstanceRole(): void {
    this.role = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: `IAM role for ${this.spec.name} EC2 instance`,
      managedPolicies: this.getBaseManagedPolicies()
    });

    // Apply compliance-specific policies
    this.applyCompliancePolicies();

    // Create instance profile
    this.instanceProfile = new iam.InstanceProfile(this, 'InstanceProfile', {
      instanceProfileName: `${this.context.serviceName}-${this.spec.name}-profile`,
      role: this.role
    });
  }

  /**
   * Create security group for the EC2 instance
   */
  private createSecurityGroup(): void {
    // Use provided VPC or default
    const vpc = this.config!.vpc?.vpcId ?
      ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: this.config!.vpc.vpcId }) :
      ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });

    this.securityGroup = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
      vpc,
      description: `Security group for ${this.spec.name} EC2 instance`,
      allowAllOutbound: !this.isComplianceFramework() // Restrict outbound for compliance
    });

    // Apply basic security rules
    this.applySecurityGroupRules();
  }

  /**
   * Create the EC2 instance
   */
  private createInstance(): void {
    const vpc = this.config!.vpc?.vpcId ?
      ec2.Vpc.fromLookup(this, 'VpcForInstance', { vpcId: this.config!.vpc.vpcId }) :
      ec2.Vpc.fromLookup(this, 'DefaultVpcForInstance', { isDefault: true });

    // Get AMI
    const ami = this.getInstanceAmi();

    // Build user data
    const userData = this.buildUserData();

    // Validate instance type
    const instanceType = this.config!.instanceType || 't3.micro';
    this.validateInstanceType(instanceType);

    const instanceProps: ec2.InstanceProps = {
      instanceType: new ec2.InstanceType(instanceType),
      machineImage: ami,
      vpc,
      vpcSubnets: this.getVpcSubnets(),
      securityGroup: this.securityGroup!,
      role: this.role!,
      userData: userData,
      keyPair: this.config!.keyPair?.keyName ?
        ec2.KeyPair.fromKeyPairName(this, 'KeyPair', this.config!.keyPair.keyName) :
        undefined,
      blockDevices: this.buildBlockDevices(),
      detailedMonitoring: !!this.shouldEnableDetailedMonitoring(),
      requireImdsv2: this.shouldRequireImdsv2(), // Use CDK's built-in IMDSv2 support
      sourceDestCheck: !this.isComplianceFramework() // Disable for NAT instances in compliance
    };

    this.instance = new ec2.Instance(this, 'Instance', instanceProps);

    // Apply additional tags
    this.applyInstanceTags();
  }

  /**
   * Apply compliance-specific hardening
   */
  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }

  private applyCommercialHardening(): void {
    // Basic CloudWatch monitoring
    if (this.instance) {
      // Enable CloudWatch agent
      this.role!.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
      );
    }
  }

  private applyFedrampModerateHardening(): void {
    // Apply commercial hardening
    this.applyCommercialHardening();

    // Enhanced monitoring and logging
    this.role!.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    // Install SSM agent via user data
    if (this.instance) {
      this.instance.userData.addCommands(
        'yum update -y',
        'yum install -y amazon-ssm-agent',
        'systemctl enable amazon-ssm-agent',
        'systemctl start amazon-ssm-agent'
      );
    }
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Additional high-security configurations
    if (this.instance) {
      // Install security agents and STIG hardening
      this.instance.userData.addCommands(
        '# STIG hardening commands',
        'yum install -y aide',
        'aide --init',
        'mv /var/lib/aide/aide.db.new.gz /var/lib/aide/aide.db.gz',

        '# Configure auditd',
        'systemctl enable auditd',
        'systemctl start auditd',

        '# Disable unnecessary services',
        'systemctl disable bluetooth',
        'systemctl disable cups',
        'systemctl disable avahi-daemon',

        '# Set up log forwarding to central logging',
        'echo "*.* @@logs.internal.company.com:514" >> /etc/rsyslog.conf',
        'systemctl restart rsyslog'
      );

      // FedRAMP High tags will be applied in applyInstanceTags() method
    }
  }

  /**
   * Get base managed policies for the instance role
   */
  private getBaseManagedPolicies(): iam.IManagedPolicy[] {
    const policies = [];

    // Always include SSM for compliance frameworks
    if (this.isComplianceFramework()) {
      policies.push(
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
      );
    }

    return policies;
  }

  /**
   * Apply compliance-specific IAM policies
   */
  private applyCompliancePolicies(): void {
    // CloudWatch permissions for logging and monitoring
    this.role!.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
        'ec2:DescribeVolumes',
        'ec2:DescribeTags',
        'logs:PutLogEvents',
        'logs:CreateLogGroup',
        'logs:CreateLogStream'
      ],
      resources: ['*']
    }));

    if (this.context.complianceFramework === 'fedramp-high') {
      // Additional permissions for STIG compliance
      this.role!.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject'
        ],
        resources: [`arn:aws:s3:::${this.context.serviceName}-compliance-logs/*`]
      }));
    }
  }

  /**
   * Apply security group rules
   */
  private applySecurityGroupRules(): void {
    if (this.context.complianceFramework === 'commercial') {
      // Allow SSH from anywhere (not recommended for production)
      this.securityGroup!.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(22),
        'SSH access'
      );
    } else {
      // Restrict SSH to VPC only
      const vpcCidr = this.config!.vpc?.vpcId ? '10.0.0.0/16' : '172.31.0.0/16';
      this.securityGroup!.addIngressRule(
        ec2.Peer.ipv4(vpcCidr),
        ec2.Port.tcp(22),
        'SSH access from VPC only'
      );
    }

    // Allow HTTPS outbound for updates and package downloads
    if (this.isComplianceFramework()) {
      this.securityGroup!.addEgressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(443),
        'HTTPS outbound'
      );
    }
  }

  /**
   * Build user data script
   */
  private buildUserData(): ec2.UserData {
    const userData = ec2.UserData.forLinux();

    // Add custom user data script if provided
    if (this.config!.userData?.script) {
      userData.addCommands(this.config!.userData.script);
    }

    // Add CloudWatch agent installation for compliance frameworks
    if (this.isComplianceFramework()) {
      userData.addCommands(
        '#!/bin/bash',
        'yum update -y',
        'yum install -y amazon-cloudwatch-agent',

        // Configure CloudWatch agent
        'cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF',
        JSON.stringify({
          metrics: {
            namespace: 'EC2/CustomMetrics',
            metrics_collected: {
              cpu: { measurement: ['cpu_usage_idle', 'cpu_usage_iowait'] },
              disk: { measurement: ['used_percent'], resources: ['*'] },
              diskio: { measurement: ['io_time'], resources: ['*'] },
              mem: { measurement: ['mem_used_percent'] },
              netstat: { measurement: ['tcp_established', 'tcp_time_wait'] }
            }
          },
          logs: {
            logs_collected: {
              files: {
                collect_list: [
                  {
                    file_path: '/var/log/messages',
                    log_group_name: `/aws/ec2/${this.context.serviceName}`,
                    log_stream_name: '{instance_id}/messages'
                  }
                ]
              }
            }
          }
        }, null, 2),
        'EOF',

        'systemctl enable amazon-cloudwatch-agent',
        'systemctl start amazon-cloudwatch-agent'
      );
    }

    return userData;
  }

  /**
   * Build block device mapping for EBS volumes
   */
  private buildBlockDevices(): ec2.BlockDevice[] {
    const devices: ec2.BlockDevice[] = [];

    const rootVolumeSize = this.config!.storage?.rootVolumeSize || 20;
    const encrypted = this.shouldEnableEbsEncryption();
    const volumeType = this.getEbsVolumeType();

    // Build EBS options
    const ebsOptions: any = {
      volumeType: volumeType,
      encrypted: !!encrypted,
      kmsKey: this.kmsKey,
      deleteOnTermination: this.config!.storage?.deleteOnTermination !== false
    };

    // Add IOPS if specified and required for volume type
    if (this.config!.storage?.iops && (volumeType === ec2.EbsDeviceVolumeType.IO1 || volumeType === ec2.EbsDeviceVolumeType.IO2)) {
      ebsOptions.iops = this.config!.storage.iops;
    }

    devices.push({
      deviceName: '/dev/xvda',
      volume: ec2.BlockDeviceVolume.ebs(rootVolumeSize, ebsOptions)
    });

    return devices;
  }

  /**
   * Configure OpenTelemetry observability for the EC2 instance per Platform Observability Standard
   * Implements comprehensive observability with OTel environment variables and CloudWatch alarms
   */
  private configureObservabilityForInstance(): void {
    if (!this.instance) {
      return;
    }

    // Get standardized OpenTelemetry environment variables for EC2 instance
    const otelEnvVars = this.configureObservability(this.instance, {
      serviceName: `${this.context.serviceName}-ec2-instance`,
      serviceVersion: '1.0.0',
      componentType: 'ec2-instance',
      complianceFramework: this.context.complianceFramework,
      customAttributes: {
        'instance.type': this.config!.instanceType || 't3.micro',
        'instance.architecture': 'x86_64',
        'aws.region': this.context.region || 'us-east-1'
      }
    });

    // Store OTel environment variables for EC2 user data
    // These will be applied to the instance via user data script
    this.registerCapability('otel:environment', otelEnvVars);

    // Create CloudWatch alarms for observability

    // CPU Utilization Alarm - alerts on sustained high CPU
    const cpuAlarm = new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-cpu-high`,
      alarmDescription: `High CPU utilization for EC2 instance ${this.spec.name}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          InstanceId: this.instance.instanceId
        },
        statistic: 'Average'
      }),
      threshold: this.getCpuAlarmThreshold(),
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // System Status Check Failed Alarm - alerts on underlying hardware issues  
    const systemCheckAlarm = new cloudwatch.Alarm(this, 'SystemStatusCheckAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-system-check-failed`,
      alarmDescription: `System status check failed for EC2 instance ${this.spec.name}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'StatusCheckFailed_System',
        dimensionsMap: {
          InstanceId: this.instance.instanceId
        },
        statistic: 'Maximum'
      }),
      threshold: 1,
      evaluationPeriods: 2,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Instance Status Check Failed Alarm - alerts on instance-level configuration issues
    const instanceCheckAlarm = new cloudwatch.Alarm(this, 'InstanceStatusCheckAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-instance-check-failed`,
      alarmDescription: `Instance status check failed for EC2 instance ${this.spec.name}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'StatusCheckFailed_Instance',
        dimensionsMap: {
          InstanceId: this.instance.instanceId
        },
        statistic: 'Maximum'
      }),
      threshold: 1,
      evaluationPeriods: 2,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Apply compliance-specific alarm thresholds
    if (this.context.complianceFramework === 'fedramp-moderate' || this.context.complianceFramework === 'fedramp-high') {
      // FedRAMP requires more aggressive monitoring
      cpuAlarm.addAlarmAction({
        bind: () => ({ alarmActionArn: `arn:aws:sns:${this.context.region}:${this.context.accountId}:fedramp-alerts` })
      });
      systemCheckAlarm.addAlarmAction({
        bind: () => ({ alarmActionArn: `arn:aws:sns:${this.context.region}:${this.context.accountId}:fedramp-alerts` })
      });
      instanceCheckAlarm.addAlarmAction({
        bind: () => ({ alarmActionArn: `arn:aws:sns:${this.context.region}:${this.context.accountId}:fedramp-alerts` })
      });
    }

    // Register alarms as constructs for visibility
    this.registerConstruct('cpuAlarm', cpuAlarm);
    this.registerConstruct('systemCheckAlarm', systemCheckAlarm);
    this.registerConstruct('instanceCheckAlarm', instanceCheckAlarm);

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to EC2 Instance', {
      otelServiceName: otelEnvVars['OTEL_SERVICE_NAME'],
      otelExporterEndpoint: otelEnvVars['OTEL_EXPORTER_OTLP_ENDPOINT'],
      alarmsCreated: 3
    });
  }

  /**
   * Get CPU alarm threshold based on compliance framework
   */
  private getCpuAlarmThreshold(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 70; // More aggressive monitoring for high security
      case 'fedramp-moderate':
        return 75; // Moderate monitoring
      default:
        return 80; // Standard commercial monitoring
    }
  }

  /**
   * Apply instance tags using base class standard tags + EC2-specific compliance tags
   */
  private applyInstanceTags(): void {
    if (this.instance) {
      // Build EC2-specific compliance tags
      const complianceTags: Record<string, string> = {};

      if (this.context.complianceFramework === 'fedramp-high') {
        complianceTags['ImmutableInfrastructure'] = 'true';
        complianceTags['STIGCompliant'] = 'true';
      } else if (this.context.complianceFramework === 'fedramp-moderate') {
        complianceTags['STIGCompliant'] = 'true';
      }

      // Apply standard platform tags + EC2-specific compliance tags in one call
      this.applyStandardTags(this.instance, complianceTags);
    }
  }

  /**
   * Build instance capability data shape
   */
  private buildInstanceCapability(): any {
    return {
      instanceId: this.instance!.instanceId,
      privateIp: this.instance!.instancePrivateIp,
      publicIp: this.instance!.instancePublicIp,
      roleArn: this.role!.roleArn,
      securityGroupId: this.securityGroup!.securityGroupId,
      availabilityZone: this.instance!.instanceAvailabilityZone
    };
  }

  /**
   * Validate instance type
   */
  private validateInstanceType(instanceType: string): void {
    const validInstanceTypePattern = /^[a-z][0-9]+[a-z]*\.(nano|micro|small|medium|large|xlarge|[0-9]+xlarge)$/;
    if (!validInstanceTypePattern.test(instanceType)) {
      throw new Error(`Invalid instance type: ${instanceType}. Must be in format like 't3.micro', 'm5.large', etc.`);
    }
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private shouldEnableEbsEncryption(): boolean {
    // Config has already been built through proper precedence chain
    return this.config?.storage?.encrypted ?? false;
  }

  private shouldEnableDetailedMonitoring(): boolean {
    // Config has already been built through proper precedence chain
    return this.config?.monitoring?.detailed ?? false;
  }

  private shouldRequireImdsv2(): boolean {
    // Config has already been built through proper precedence chain:
    // Platform Defaults → Compliance Framework → Environment → Service-Level → Component Overrides
    return this.config?.security?.requireImdsv2 ?? false;
  }

  private isComplianceFramework(): boolean {
    return this.context.complianceFramework === 'fedramp-moderate' || this.context.complianceFramework === 'fedramp-high';
  }

  private getInstanceAmi(): ec2.IMachineImage {
    if (this.config!.ami?.amiId) {
      const amiMap: { [key: string]: string } = {};
      amiMap[this.context.region || 'us-east-1'] = this.config!.ami!.amiId!;
      return ec2.MachineImage.genericLinux(amiMap);
    }

    // Use latest Amazon Linux 2023
    return ec2.MachineImage.latestAmazonLinux2023();
  }

  private getVpcSubnets(): ec2.SubnetSelection {
    if (this.config!.vpc?.subnetId) {
      return { subnetFilters: [ec2.SubnetFilter.byIds([this.config!.vpc.subnetId])] };
    }

    // Use private subnets for compliance frameworks
    return {
      subnetType: this.isComplianceFramework() ?
        ec2.SubnetType.PRIVATE_WITH_EGRESS : ec2.SubnetType.PUBLIC
    };
  }

  private getEbsVolumeType(): ec2.EbsDeviceVolumeType {
    const volumeType = this.config!.storage?.rootVolumeType || 'gp3';

    switch (volumeType) {
      case 'gp2':
        return ec2.EbsDeviceVolumeType.GP2;
      case 'gp3':
        return ec2.EbsDeviceVolumeType.GP3;
      case 'io1':
        return ec2.EbsDeviceVolumeType.IO1;
      case 'io2':
        return ec2.EbsDeviceVolumeType.IO2;
      default:
        return ec2.EbsDeviceVolumeType.GP3;
    }
  }

}