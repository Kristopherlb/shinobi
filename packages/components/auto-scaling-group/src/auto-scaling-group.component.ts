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
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

/**
 * Configuration interface for Auto Scaling Group component
 */
export interface AutoScalingGroupConfig {
  /** Launch template configuration */
  launchTemplate?: {
    /** Instance type */
    instanceType?: string;
    /** AMI ID or lookup criteria */
    ami?: {
      amiId?: string;
      namePattern?: string;
      owner?: string;
    };
    /** User data script */
    userData?: string;
    /** Key pair name */
    keyName?: string;
  };

  /** Auto Scaling configuration */
  autoScaling?: {
    /** Minimum capacity */
    minCapacity?: number;
    /** Maximum capacity */
    maxCapacity?: number;
    /** Desired capacity */
    desiredCapacity?: number;
  };

  /** VPC configuration */
  vpc?: {
    vpcId?: string;
    subnetIds?: string[];
    securityGroupIds?: string[];
  };

  /** EBS configuration */
  storage?: {
    /** Root volume size in GB */
    rootVolumeSize?: number;
    /** Root volume type */
    rootVolumeType?: string;
    /** Enable encryption */
    encrypted?: boolean;
    /** KMS key ARN */
    kmsKeyArn?: string;
  };

  /** Health check configuration */
  healthCheck?: {
    /** Health check type */
    type?: 'EC2' | 'ELB';
    /** Health check grace period */
    gracePeriod?: number;
  };

  /** Termination policies */
  terminationPolicies?: Array<'Default' | 'OldestInstance' | 'NewestInstance' | 'OldestLaunchConfiguration' | 'ClosestToNextInstanceHour'>;

  /** Update policy */
  updatePolicy?: {
    /** Rolling update configuration */
    rollingUpdate?: {
      minInstancesInService?: number;
      maxBatchSize?: number;
      pauseTime?: string;
    };
  };
}

/**
 * Configuration schema for Auto Scaling Group component
 */
export const AUTO_SCALING_GROUP_CONFIG_SCHEMA = {
  type: 'object',
  title: 'Auto Scaling Group Configuration',
  description: 'Configuration for creating an Auto Scaling Group with launch template and compliance hardening',
  properties: {
    launchTemplate: {
      type: 'object',
      description: 'Launch template configuration',
      properties: {
        instanceType: {
          type: 'string',
          description: 'EC2 instance type',
          enum: [
            't3.micro', 't3.small', 't3.medium', 't3.large', 't3.xlarge', 't3.2xlarge',
            'm5.large', 'm5.xlarge', 'm5.2xlarge', 'm5.4xlarge', 'm5.8xlarge',
            'c5.large', 'c5.xlarge', 'c5.2xlarge', 'c5.4xlarge',
            'r5.large', 'r5.xlarge', 'r5.2xlarge'
          ],
          default: 't3.micro'
        },
        ami: {
          type: 'object',
          description: 'AMI configuration',
          properties: {
            amiId: {
              type: 'string',
              description: 'Specific AMI ID to use',
              pattern: '^ami-[a-f0-9]{8,17}$'
            },
            namePattern: {
              type: 'string',
              description: 'AMI name pattern for lookup',
              default: 'amzn2-ami-hvm-*-x86_64-gp2'
            },
            owner: {
              type: 'string',
              description: 'AMI owner',
              enum: ['amazon', 'self', 'aws-marketplace'],
              default: 'amazon'
            }
          },
          additionalProperties: false
        },
        userData: {
          type: 'string',
          description: 'User data script to run on instance startup'
        },
        keyName: {
          type: 'string',
          description: 'EC2 key pair name for SSH access'
        }
      },
      additionalProperties: false
    },
    autoScaling: {
      type: 'object',
      description: 'Auto scaling configuration',
      properties: {
        minCapacity: {
          type: 'number',
          description: 'Minimum number of instances',
          minimum: 0,
          maximum: 1000,
          default: 1
        },
        maxCapacity: {
          type: 'number',
          description: 'Maximum number of instances',
          minimum: 1,
          maximum: 1000,
          default: 3
        },
        desiredCapacity: {
          type: 'number',
          description: 'Desired number of instances',
          minimum: 0,
          maximum: 1000,
          default: 2
        }
      },
      additionalProperties: false
    },
    vpc: {
      type: 'object',
      description: 'VPC configuration',
      properties: {
        vpcId: {
          type: 'string',
          description: 'VPC ID to deploy into',
          pattern: '^vpc-[a-f0-9]{8,17}$'
        },
        subnetIds: {
          type: 'array',
          description: 'Subnet IDs for the Auto Scaling Group',
          items: {
            type: 'string',
            pattern: '^subnet-[a-f0-9]{8,17}$'
          },
          minItems: 1,
          maxItems: 10
        },
        securityGroupIds: {
          type: 'array',
          description: 'Additional security group IDs',
          items: {
            type: 'string',
            pattern: '^sg-[a-f0-9]{8,17}$'
          },
          maxItems: 5
        }
      },
      additionalProperties: false
    },
    storage: {
      type: 'object',
      description: 'EBS storage configuration',
      properties: {
        rootVolumeSize: {
          type: 'number',
          description: 'Root volume size in GB',
          minimum: 8,
          maximum: 16384,
          default: 20
        },
        rootVolumeType: {
          type: 'string',
          description: 'Root volume type',
          enum: ['gp2', 'gp3', 'io1', 'io2'],
          default: 'gp3'
        },
        encrypted: {
          type: 'boolean',
          description: 'Enable EBS encryption',
          default: false
        },
        kmsKeyArn: {
          type: 'string',
          description: 'KMS key ARN for encryption',
          pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$'
        }
      },
      additionalProperties: false
    },
    healthCheck: {
      type: 'object',
      description: 'Health check configuration',
      properties: {
        type: {
          type: 'string',
          description: 'Health check type',
          enum: ['EC2', 'ELB'],
          default: 'EC2'
        },
        gracePeriod: {
          type: 'number',
          description: 'Health check grace period in seconds',
          minimum: 0,
          maximum: 7200,
          default: 300
        }
      },
      additionalProperties: false
    },
    terminationPolicies: {
      type: 'array',
      description: 'Termination policies for the Auto Scaling Group',
      items: {
        type: 'string',
        enum: ['Default', 'OldestInstance', 'NewestInstance', 'OldestLaunchConfiguration', 'ClosestToNextInstanceHour']
      },
      default: ['Default'],
      maxItems: 5
    },
    updatePolicy: {
      type: 'object',
      description: 'Update policy configuration',
      properties: {
        rollingUpdate: {
          type: 'object',
          description: 'Rolling update configuration',
          properties: {
            minInstancesInService: {
              type: 'number',
              description: 'Minimum instances in service during update',
              minimum: 0,
              default: 1
            },
            maxBatchSize: {
              type: 'number',
              description: 'Maximum batch size for updates',
              minimum: 1,
              default: 1
            },
            pauseTime: {
              type: 'string',
              description: 'Pause time between batches (ISO 8601 duration)',
              pattern: '^PT(?:[0-9]+H)?(?:[0-9]+M)?(?:[0-9]+S)?$',
              default: 'PT5M'
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false,
  defaults: {
    launchTemplate: { 
      instanceType: 't3.micro',
      ami: { namePattern: 'amzn2-ami-hvm-*-x86_64-gp2', owner: 'amazon' }
    },
    autoScaling: { 
      minCapacity: 1, 
      maxCapacity: 3, 
      desiredCapacity: 2 
    },
    storage: {
      rootVolumeSize: 20,
      rootVolumeType: 'gp3',
      encrypted: false
    },
    healthCheck: {
      type: 'EC2',
      gracePeriod: 300
    },
    terminationPolicies: ['Default']
  }
};

/**
 * AutoScalingGroupConfigBuilder - Handles configuration building and defaults for AutoScalingGroup
 */
export class AutoScalingGroupConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;

  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public buildSync(): AutoScalingGroupConfig {
    const platformDefaults = this.getPlatformDefaults();
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    const userConfig = this.spec.config || {};

    // Deep merge with user config taking highest precedence
    const finalConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );

    return finalConfig as AutoScalingGroupConfig;
  }

  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.mergeConfigs(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  }

  private getPlatformDefaults(): Record<string, any> {
    return {
      launchTemplate: { instanceType: 't3.micro' },
      autoScaling: { minCapacity: 1, maxCapacity: 3, desiredCapacity: 2 },
      storage: { rootVolumeSize: 20, rootVolumeType: 'gp3', encrypted: false },
      healthCheck: { type: 'EC2', gracePeriod: 300 },
      terminationPolicies: ['Default']
    };
  }

  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    switch (framework) {
      case 'fedramp-moderate':
        return {
          launchTemplate: { instanceType: 't3.medium' },
          storage: { rootVolumeSize: 50, encrypted: true },
          healthCheck: { gracePeriod: 180 }
        };
      case 'fedramp-high':
        return {
          launchTemplate: { instanceType: 'm5.large' },
          storage: { rootVolumeSize: 100, encrypted: true },
          healthCheck: { gracePeriod: 120 }
        };
      default: // commercial
        return { storage: { encrypted: false } };
    }
  }
}

/**
 * Auto Scaling Group Component implementing Component API Contract v1.0
 */
export class AutoScalingGroupComponent extends Component {
  private autoScalingGroup?: autoscaling.AutoScalingGroup;
  private launchTemplate?: ec2.LaunchTemplate;
  private securityGroup?: ec2.SecurityGroup;
  private role?: iam.Role;
  private instanceProfile?: iam.InstanceProfile;
  private kmsKey?: kms.Key;
  private config?: AutoScalingGroupConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    const configBuilder = new AutoScalingGroupConfigBuilder({
      spec: this.spec,
      context: this.context,
      // These would be populated by the resolver in a real scenario
      environmentConfig: {}, 
      complianceDefaults: {}
    });
    this.config = configBuilder.buildSync();

    this.createKmsKeyIfNeeded();
    this.createInstanceRole();
    this.createSecurityGroup();
    this.createLaunchTemplate();
    this.createAutoScalingGroup();
    this.applyComplianceHardening();

    this.registerConstruct('autoScalingGroup', this.autoScalingGroup!);
    this.registerConstruct('launchTemplate', this.launchTemplate!);
    this.registerConstruct('securityGroup', this.securityGroup!);
    this.registerConstruct('role', this.role!);
    if (this.kmsKey) {
      this.registerConstruct('kmsKey', this.kmsKey);
    }

    this.registerCapability('compute:asg', this.buildAutoScalingGroupCapability());
  }

  public getCapabilities(): ComponentCapabilities {
    this.ensureSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'auto-scaling-group';
  }

  private createKmsKeyIfNeeded(): void {
    if (this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EbsEncryptionKey', {
        description: `EBS encryption key for ${this.spec.name} Auto Scaling Group`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });
    }
  }

  private createInstanceRole(): void {
    this.role = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: `IAM role for ${this.spec.name} Auto Scaling Group instances`,
      managedPolicies: this.getBaseManagedPolicies()
    });

    this.applyCompliancePolicies();

    this.instanceProfile = new iam.InstanceProfile(this, 'InstanceProfile', {
      role: this.role
    });
  }

  private createSecurityGroup(): void {
    const vpc = this.getVpc();
    this.securityGroup = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
      vpc,
      description: `Security group for ${this.spec.name} Auto Scaling Group`,
      allowAllOutbound: !this.isComplianceFramework()
    });
    this.applySecurityGroupRules();
  }

  private createLaunchTemplate(): void {
    this.launchTemplate = new ec2.LaunchTemplate(this, 'LaunchTemplate', {
      launchTemplateName: `${this.context.serviceName}-${this.spec.name}`,
      instanceType: new ec2.InstanceType(this.config!.launchTemplate?.instanceType || 't3.micro'),
      machineImage: this.getInstanceAmi(),
      userData: this.buildUserData(),
      keyName: this.config!.launchTemplate?.keyName,
      securityGroup: this.securityGroup!,
      role: this.role!,
      blockDevices: this.buildBlockDevices(),
      detailedMonitoring: this.shouldEnableDetailedMonitoring(),
      requireImdsv2: this.shouldRequireImdsv2()
    });
  }

  private createAutoScalingGroup(): void {
    const vpc = this.getVpc();
    this.autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
      autoScalingGroupName: `${this.context.serviceName}-${this.spec.name}`,
      vpc,
      vpcSubnets: this.getVpcSubnets(),
      launchTemplate: this.launchTemplate!,
      minCapacity: this.config!.autoScaling?.minCapacity,
      maxCapacity: this.config!.autoScaling?.maxCapacity,
      desiredCapacity: this.config!.autoScaling?.desiredCapacity,
      healthCheck: this.getHealthCheckType(),
      healthCheckGracePeriod: cdk.Duration.seconds(this.config!.healthCheck?.gracePeriod!),
      terminationPolicies: this.getTerminationPolicies(),
      updatePolicy: this.getUpdatePolicy()
    });
    this.applyAutoScalingGroupTags();
  }

  private applyComplianceHardening(): void {
    if(this.isComplianceFramework()){
      this.role!.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
      this.role!.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
    }
    if(this.context.complianceFramework === 'fedramp-high'){
      cdk.Tags.of(this.autoScalingGroup!).add('STIGCompliant', 'true');
    }
  }

  private getBaseManagedPolicies(): iam.IManagedPolicy[] {
    return this.isComplianceFramework() 
      ? [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')] 
      : [];
  }

  private applyCompliancePolicies(): void {
    if (this.isComplianceFramework()) {
        this.role!.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['logs:PutLogEvents', 'logs:CreateLogStream', 'logs:CreateLogGroup'],
        resources: ['arn:aws:logs:*:*:*']
      }));
    }
  }

  private applySecurityGroupRules(): void {
    // Example: Allow inbound web traffic
    this.securityGroup!.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
  }

  private buildUserData(): ec2.UserData {
    const userData = ec2.UserData.forLinux();
    if (this.config?.launchTemplate?.userData) {
      userData.addCommands(this.config.launchTemplate.userData);
    }
    if (this.isComplianceFramework()) {
      userData.addCommands(
        'yum install -y amazon-ssm-agent',
        'systemctl enable amazon-ssm-agent',
        'systemctl start amazon-ssm-agent'
      );
    }
    if (this.context.complianceFramework === 'fedramp-high') {
      userData.addCommands('# STIG hardening scripts here');
    }
    return userData;
  }

  private buildBlockDevices(): ec2.BlockDevice[] {
    return [{
      deviceName: '/dev/xvda',
      volume: ec2.BlockDeviceVolume.ebs(this.config!.storage?.rootVolumeSize!, {
        volumeType: this.getEbsVolumeType(),
        encrypted: this.shouldEnableEbsEncryption(),
        kmsKey: this.kmsKey,
        deleteOnTermination: true
      })
    }];
  }

  private applyAutoScalingGroupTags(): void {
    cdk.Tags.of(this.autoScalingGroup!).add('Name', `${this.context.serviceName}-${this.spec.name}`);
    // ... add other mandatory tags
  }

  private buildAutoScalingGroupCapability(): ComputeAsgCapability {
    this.ensureSynthesized();
    return {
      asgArn: this.autoScalingGroup!.autoScalingGroupArn,
      asgName: this.autoScalingGroup!.autoScalingGroupName,
      roleArn: this.role!.roleArn,
      securityGroupId: this.securityGroup!.securityGroupId
    };
  }

  // --- Helper methods for compliance decisions and configurations ---

  private getVpc(): ec2.IVpc {
      return this.context.vpc || ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
  }

  private isComplianceFramework(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private shouldUseCustomerManagedKey(): boolean {
    return this.isComplianceFramework() && this.config?.storage?.kmsKeyArn === undefined;
  }

  private shouldEnableEbsEncryption(): boolean {
    return this.isComplianceFramework() || this.config?.storage?.encrypted === true;
  }

  private shouldEnableDetailedMonitoring(): boolean {
    return this.isComplianceFramework();
  }

  private shouldRequireImdsv2(): boolean {
    return this.isComplianceFramework();
  }

  private getInstanceAmi(): ec2.IMachineImage {
    if (this.config?.launchTemplate?.ami?.amiId) {
      const amiMap: { [key: string]: string } = {};
      amiMap[this.context.region!] = this.config.launchTemplate.ami.amiId;
      return ec2.MachineImage.genericLinux(amiMap);
    }
    // In a real scenario, you'd have hardened AMI lookups here based on framework
    return ec2.MachineImage.latestAmazonLinux2();
  }

  private getVpcSubnets(): ec2.SubnetSelection {
    if (this.config?.vpc?.subnetIds) {
      return { subnets: this.config.vpc.subnetIds.map(id => ec2.Subnet.fromSubnetId(this, id, id)) };
    }
    return { subnetType: this.isComplianceFramework() ? ec2.SubnetType.PRIVATE_WITH_EGRESS : ec2.SubnetType.PUBLIC };
  }

  private getEbsVolumeType(): ec2.EbsDeviceVolumeType {
      const type = this.config?.storage?.rootVolumeType || 'gp3';
      return ec2.EbsDeviceVolumeType[type.toUpperCase() as keyof typeof ec2.EbsDeviceVolumeType];
  }

  private getHealthCheckType(): autoscaling.HealthCheck {
      return this.config?.healthCheck?.type === 'ELB' 
          ? autoscaling.HealthCheck.elb({ grace: cdk.Duration.seconds(this.config.healthCheck.gracePeriod!) }) 
          : autoscaling.HealthCheck.ec2({ grace: cdk.Duration.seconds(this.config?.healthCheck?.gracePeriod!) });
  }

  private getTerminationPolicies(): autoscaling.TerminationPolicy[] {
      return this.config?.terminationPolicies?.map(p => autoscaling.TerminationPolicy[p.toUpperCase() as keyof typeof autoscaling.TerminationPolicy]) || [autoscaling.TerminationPolicy.DEFAULT];
  }

  private getUpdatePolicy(): autoscaling.UpdatePolicy {
      const rollingUpdate = this.config?.updatePolicy?.rollingUpdate;
      if (rollingUpdate) {
          return autoscaling.UpdatePolicy.rollingUpdate({
              minInstancesInService: rollingUpdate.minInstancesInService,
              maxBatchSize: rollingUpdate.maxBatchSize,
              pauseTime: rollingUpdate.pauseTime ? cdk.Duration.parse(rollingUpdate.pauseTime) : undefined
          });
      }
      return autoscaling.UpdatePolicy.rollingUpdate();
  }
}