/**
 * Auto Scaling Group Component
 * 
 * A managed auto scaling group with launch template and compliance hardening.
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
  ComponentCapabilities,
  ConfigBuilder,
  ComponentConfigSchema,
  ComputeAsgCapability,
  ConfigBuilderContext
} from '../../contracts';

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
export const AUTO_SCALING_GROUP_CONFIG_SCHEMA: ComponentConfigSchema = {
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
export class AutoScalingGroupConfigBuilder extends ConfigBuilder<AutoScalingGroupConfig> {
  
  constructor(context: ConfigBuilderContext) {
    super(context, AUTO_SCALING_GROUP_CONFIG_SCHEMA);
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<AutoScalingGroupConfig> {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.context.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    // Resolve environment interpolations
    const resolvedConfig = this.resolveEnvironmentInterpolations(mergedConfig);
    
    // Validate against schema
    const validationResult = this.validateConfiguration(resolvedConfig);
    if (!validationResult.valid) {
      throw new Error(`AutoScalingGroup configuration validation failed: ${JSON.stringify(validationResult.errors)}`);
    }
    
    return validationResult.validatedConfig as AutoScalingGroupConfig;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Get platform-wide defaults for AutoScalingGroup
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      launchTemplate: {
        instanceType: this.getDefaultInstanceType(),
        ami: {
          namePattern: 'amzn2-ami-hvm-*-x86_64-gp2',
          owner: 'amazon'
        }
      },
      autoScaling: {
        minCapacity: 1,
        maxCapacity: 3,
        desiredCapacity: 2
      },
      storage: {
        rootVolumeSize: this.getDefaultVolumeSize(),
        rootVolumeType: this.getDefaultVolumeType(),
        encrypted: false
      },
      healthCheck: {
        type: 'EC2',
        gracePeriod: this.getDefaultGracePeriod()
      },
      terminationPolicies: ['Default']
    };
  }

  /**
   * Get compliance framework specific defaults
   */
  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          launchTemplate: {
            instanceType: this.getInstanceClass('fedramp-moderate')
          },
          storage: {
            rootVolumeSize: 50, // Larger for compliance logging
            encrypted: true
          },
          healthCheck: {
            gracePeriod: 180 // Faster recovery
          }
        };
        
      case 'fedramp-high':
        return {
          launchTemplate: {
            instanceType: this.getInstanceClass('fedramp-high')
          },
          storage: {
            rootVolumeSize: 100, // Even larger for enhanced logging
            rootVolumeType: 'gp3', // Better performance for compliance workloads
            encrypted: true
          },
          healthCheck: {
            gracePeriod: 120 // Even faster recovery
          }
        };
        
      default: // commercial
        return {
          storage: {
            encrypted: false // Optional for commercial
          }
        };
    }
  }

  /**
   * Get instance class based on compliance framework
   */
  private getInstanceClass(framework: string): string {
    switch (framework) {
      case 'fedramp-high':
        return 'm5.large'; // More powerful for enhanced logging/monitoring
      case 'fedramp-moderate':
        return 't3.medium'; // Moderate performance requirements
      default:
        return 't3.micro'; // Cost-optimized for commercial
    }
  }

  /**
   * Get default instance type for platform
   */
  private getDefaultInstanceType(): string {
    return this.getInstanceClass(this.context.context.complianceFramework);
  }

  /**
   * Get default volume size based on compliance framework
   */
  private getDefaultVolumeSize(): number {
    switch (this.context.context.complianceFramework) {
      case 'fedramp-high':
        return 100;
      case 'fedramp-moderate':
        return 50;
      default:
        return 20;
    }
  }

  /**
   * Get default volume type
   */
  private getDefaultVolumeType(): string {
    return this.context.context.complianceFramework === 'fedramp-high' ? 'gp3' : 'gp3';
  }

  /**
   * Get default health check grace period
   */
  private getDefaultGracePeriod(): number {
    switch (this.context.context.complianceFramework) {
      case 'fedramp-high':
        return 120;
      case 'fedramp-moderate':
        return 180;
      default:
        return 300;
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

  /**
   * Synthesis phase - Create Auto Scaling Group with compliance hardening
   */
  public synth(): void {
    // Build configuration
    this.config = this.buildConfigSync();
    
    // Create KMS key for EBS encryption if needed
    this.createKmsKeyIfNeeded();
    
    // Create IAM role and instance profile
    this.createInstanceRole();
    
    // Create security group
    this.createSecurityGroup();
    
    // Create launch template
    this.createLaunchTemplate();
    
    // Create Auto Scaling Group
    this.createAutoScalingGroup();
    
    // Apply compliance hardening
    this.applyComplianceHardening();
    
    // Register constructs
    this.registerConstruct('autoScalingGroup', this.autoScalingGroup!);
    this.registerConstruct('launchTemplate', this.launchTemplate!);
    this.registerConstruct('securityGroup', this.securityGroup!);
    this.registerConstruct('role', this.role!);
    if (this.kmsKey) {
      this.registerConstruct('kmsKey', this.kmsKey);
    }
    
    // Register capabilities
    this.registerCapability('compute:asg', this.buildAutoScalingGroupCapability());
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
    return 'auto-scaling-group';
  }

  /**
   * Create KMS key for EBS encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    if (this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EbsEncryptionKey', {
        description: `EBS encryption key for ${this.spec.name} Auto Scaling Group`,
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
   * Create IAM role and instance profile
   */
  private createInstanceRole(): void {
    this.role = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: `IAM role for ${this.spec.name} Auto Scaling Group instances`,
      managedPolicies: this.getBaseManagedPolicies()
    });

    // Apply compliance-specific policies
    this.applyCompliancePolicies();

    // Create instance profile
    this.instanceProfile = new iam.InstanceProfile(this, 'InstanceProfile', {
      instanceProfileName: `${this.context.serviceName}-${this.spec.name}-asg-profile`,
      role: this.role
    });
  }

  /**
   * Create security group
   */
  private createSecurityGroup(): void {
    const vpc = this.config!.vpc?.vpcId ? 
      ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: this.config!.vpc.vpcId }) :
      ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });

    this.securityGroup = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
      vpc,
      description: `Security group for ${this.spec.name} Auto Scaling Group`,
      allowAllOutbound: !this.isComplianceFramework()
    });

    // Apply security group rules
    this.applySecurityGroupRules();
  }

  /**
   * Create launch template
   */
  private createLaunchTemplate(): void {
    // Get AMI
    const ami = this.getInstanceAmi();

    // Build user data
    const userData = this.buildUserData();

    this.launchTemplate = new ec2.LaunchTemplate(this, 'LaunchTemplate', {
      launchTemplateName: `${this.context.serviceName}-${this.spec.name}`,
      instanceType: new ec2.InstanceType(this.config!.launchTemplate?.instanceType || 't3.micro'),
      machineImage: ami,
      userData,
      keyName: this.config!.launchTemplate?.keyName,
      securityGroup: this.securityGroup!,
      role: this.role!,
      blockDevices: this.buildBlockDevices(),
      detailedMonitoring: !!this.shouldEnableDetailedMonitoring(),
      requireImdsv2: !!this.shouldRequireImdsv2()
    });
  }

  /**
   * Create the Auto Scaling Group
   */
  private createAutoScalingGroup(): void {
    const vpc = this.config!.vpc?.vpcId ? 
      ec2.Vpc.fromLookup(this, 'VpcForAsg', { vpcId: this.config!.vpc.vpcId }) :
      ec2.Vpc.fromLookup(this, 'DefaultVpcForAsg', { isDefault: true });

    this.autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
      autoScalingGroupName: `${this.context.serviceName}-${this.spec.name}`,
      vpc,
      vpcSubnets: this.getVpcSubnets(),
      launchTemplate: this.launchTemplate!,
      minCapacity: this.config!.autoScaling?.minCapacity || 1,
      maxCapacity: this.config!.autoScaling?.maxCapacity || 3,
      desiredCapacity: this.config!.autoScaling?.desiredCapacity || 2,
      healthCheck: this.getHealthCheckType(),
      // Health check grace period handled by health check type
      terminationPolicies: this.getTerminationPolicies(),
      updatePolicy: this.getUpdatePolicy()
    });

    // Apply tags
    this.applyAutoScalingGroupTags();
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
    this.role!.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
    );
  }

  private applyFedrampModerateHardening(): void {
    // Apply commercial hardening
    this.applyCommercialHardening();

    // Add SSM for patch management
    this.role!.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    // Enable more frequent health checks
    if (this.autoScalingGroup) {
      // Shorter health check grace period for faster recovery
      const cfnAsg = this.autoScalingGroup.node.defaultChild as autoscaling.CfnAutoScalingGroup;
      cfnAsg.healthCheckGracePeriod = 180;
    }
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Force replacement of instances on launch template changes
    if (this.autoScalingGroup) {
      this.autoScalingGroup.applyCloudFormationInit(
        ec2.CloudFormationInit.fromElements(),
        {
          configSets: ['install'],
          printLog: true,
          ignoreFailures: false
        }
      );
    }

    // Add immutable infrastructure tags
    if (this.autoScalingGroup) {
      cdk.Tags.of(this.autoScalingGroup).add('ImmutableInfrastructure', 'true');
      cdk.Tags.of(this.autoScalingGroup).add('STIGCompliant', 'true');
    }
  }

  /**
   * Get base managed policies
   */
  private getBaseManagedPolicies(): iam.IManagedPolicy[] {
    const policies = [];

    if (this.isComplianceFramework()) {
      policies.push(
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
      );
    }

    return policies;
  }

  /**
   * Apply compliance-specific IAM policies
   */
  private applyCompliancePolicies(): void {
    // CloudWatch permissions
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
      // Additional permissions for compliance logging
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
    // Allow HTTP/HTTPS inbound for web applications
    this.securityGroup!.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'HTTP from internet'
    );

    this.securityGroup!.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'HTTPS from internet'
    );

    if (this.isComplianceFramework()) {
      // Restrict SSH to VPC only
      const vpcCidr = this.config!.vpc?.vpcId ? '10.0.0.0/16' : '172.31.0.0/16';
      this.securityGroup!.addIngressRule(
        ec2.Peer.ipv4(vpcCidr),
        ec2.Port.tcp(22),
        'SSH from VPC only'
      );

      // Allow HTTPS outbound for updates
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

    // Add custom user data if provided
    if (this.config!.launchTemplate?.userData) {
      userData.addCommands(this.config!.launchTemplate.userData);
    }

    // Add compliance-specific setup
    if (this.isComplianceFramework()) {
      userData.addCommands(
        '#!/bin/bash',
        'yum update -y',
        'yum install -y amazon-cloudwatch-agent amazon-ssm-agent',
        'systemctl enable amazon-cloudwatch-agent',
        'systemctl start amazon-cloudwatch-agent',
        'systemctl enable amazon-ssm-agent',
        'systemctl start amazon-ssm-agent'
      );

      if (this.context.complianceFramework === 'fedramp-high') {
        userData.addCommands(
          '# STIG hardening',
          'yum install -y aide',
          'aide --init',
          'mv /var/lib/aide/aide.db.new.gz /var/lib/aide/aide.db.gz',
          'systemctl enable auditd',
          'systemctl start auditd'
        );
      }
    }

    return userData;
  }

  /**
   * Build block device mapping
   */
  private buildBlockDevices(): ec2.BlockDevice[] {
    const devices: ec2.BlockDevice[] = [];

    const rootVolumeSize = this.config!.storage?.rootVolumeSize || 20;
    const encrypted = this.shouldEnableEbsEncryption();

    devices.push({
      deviceName: '/dev/xvda',
      volume: ec2.BlockDeviceVolume.ebs(rootVolumeSize, {
        volumeType: this.getEbsVolumeType(),
        encrypted: !!encrypted,
        kmsKey: this.kmsKey,
        deleteOnTermination: true
      })
    });

    return devices;
  }

  /**
   * Apply Auto Scaling Group tags
   */
  private applyAutoScalingGroupTags(): void {
    if (this.autoScalingGroup) {
      cdk.Tags.of(this.autoScalingGroup).add('Name', `${this.context.serviceName}-${this.spec.name}`);
      cdk.Tags.of(this.autoScalingGroup).add('Environment', this.context.environment);
      cdk.Tags.of(this.autoScalingGroup).add('Service', this.context.serviceName);
      cdk.Tags.of(this.autoScalingGroup).add('Component', this.spec.name);
      cdk.Tags.of(this.autoScalingGroup).add('ComplianceFramework', this.context.complianceFramework);
    }
  }

  /**
   * Build Auto Scaling Group capability data shape
   */
  private buildAutoScalingGroupCapability(): ComputeAsgCapability {
    return {
      asgArn: this.autoScalingGroup!.autoScalingGroupArn,
      asgName: this.autoScalingGroup!.autoScalingGroupName,
      roleArn: this.role!.roleArn
    };
  }

  /**
   * Helper methods for compliance decisions and configurations
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private shouldEnableEbsEncryption(): boolean {
    return this.context.complianceFramework !== 'commercial' || !!this.config!.storage?.encrypted;
  }

  private shouldEnableDetailedMonitoring(): boolean {
    return this.isComplianceFramework();
  }

  private shouldRequireImdsv2(): boolean {
    return this.context.complianceFramework !== 'commercial';
  }

  private isComplianceFramework(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getInstanceAmi(): ec2.IMachineImage {
    if (this.config!.launchTemplate?.ami?.amiId) {
      return ec2.MachineImage.genericLinux({ 
        [this.context.region]: this.config!.launchTemplate.ami.amiId 
      });
    }

    return ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
    });
  }

  private getVpcSubnets(): ec2.SubnetSelection {
    if (this.config!.vpc?.subnetIds) {
      return { subnetFilters: [ec2.SubnetFilter.byIds(this.config!.vpc.subnetIds)] };
    }

    return {
      subnetType: this.isComplianceFramework() ? 
        ec2.SubnetType.PRIVATE_WITH_EGRESS : ec2.SubnetType.PUBLIC
    };
  }

  private getEbsVolumeType(): ec2.EbsDeviceVolumeType {
    const volumeType = this.config!.storage?.rootVolumeType || 'gp3';
    
    switch (volumeType) {
      case 'gp2': return ec2.EbsDeviceVolumeType.GP2;
      case 'gp3': return ec2.EbsDeviceVolumeType.GP3;
      case 'io1': return ec2.EbsDeviceVolumeType.IO1;
      case 'io2': return ec2.EbsDeviceVolumeType.IO2;
      default: return ec2.EbsDeviceVolumeType.GP3;
    }
  }

  private getHealthCheckType(): autoscaling.HealthCheck {
    return this.config!.healthCheck?.type === 'ELB' ? 
      autoscaling.HealthCheck.elb({ 
        grace: cdk.Duration.minutes(5) 
      }) : autoscaling.HealthCheck.ec2({ 
        grace: cdk.Duration.minutes(5) 
      });
  }

  private getTerminationPolicies(): autoscaling.TerminationPolicy[] {
    if (this.config!.terminationPolicies) {
      return this.config!.terminationPolicies.map(policy => {
        switch (policy) {
          case 'OldestInstance': return autoscaling.TerminationPolicy.OLDEST_INSTANCE;
          case 'NewestInstance': return autoscaling.TerminationPolicy.NEWEST_INSTANCE;
          case 'OldestLaunchConfiguration': return autoscaling.TerminationPolicy.OLDEST_LAUNCH_CONFIGURATION;
          case 'ClosestToNextInstanceHour': return autoscaling.TerminationPolicy.CLOSEST_TO_NEXT_INSTANCE_HOUR;
          default: return autoscaling.TerminationPolicy.DEFAULT;
        }
      });
    }

    return [autoscaling.TerminationPolicy.DEFAULT];
  }

  private getUpdatePolicy(): autoscaling.UpdatePolicy {
    if (this.config!.updatePolicy?.rollingUpdate) {
      const rolling = this.config!.updatePolicy.rollingUpdate;
      return autoscaling.UpdatePolicy.rollingUpdate({
        minInstancesInService: rolling.minInstancesInService || 1,
        maxBatchSize: rolling.maxBatchSize || 1,
        pauseTime: rolling.pauseTime ? 
          cdk.Duration.parse(rolling.pauseTime) : cdk.Duration.minutes(5)
      });
    }

    // Default to replacing instances for compliance frameworks
    return this.isComplianceFramework() ?
      autoscaling.UpdatePolicy.replacingUpdate() :
      autoscaling.UpdatePolicy.rollingUpdate();
  }

  /**
   * Simplified config building for demo purposes
   */
  private buildConfigSync(): AutoScalingGroupConfig {
    const config: AutoScalingGroupConfig = {
      launchTemplate: {
        instanceType: this.spec.config?.launchTemplate?.instanceType || 't3.micro',
        ami: this.spec.config?.launchTemplate?.ami || {
          namePattern: 'amzn2-ami-hvm-*-x86_64-gp2',
          owner: 'amazon'
        },
        userData: this.spec.config?.launchTemplate?.userData,
        keyName: this.spec.config?.launchTemplate?.keyName
      },
      autoScaling: {
        minCapacity: this.spec.config?.autoScaling?.minCapacity || 1,
        maxCapacity: this.spec.config?.autoScaling?.maxCapacity || 3,
        desiredCapacity: this.spec.config?.autoScaling?.desiredCapacity || 2
      },
      vpc: this.spec.config?.vpc,
      storage: {
        rootVolumeSize: this.spec.config?.storage?.rootVolumeSize || 20,
        rootVolumeType: this.spec.config?.storage?.rootVolumeType || 'gp3',
        encrypted: this.shouldEnableEbsEncryption()
      },
      healthCheck: {
        type: this.spec.config?.healthCheck?.type || 'EC2',
        gracePeriod: this.spec.config?.healthCheck?.gracePeriod || 300
      },
      terminationPolicies: this.spec.config?.terminationPolicies || ['Default']
    };

    return config;
  }
}