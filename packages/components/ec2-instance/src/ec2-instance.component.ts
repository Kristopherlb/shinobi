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
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

/**
 * Configuration interface for EC2 Instance component
 */
export interface Ec2InstanceConfig {
  /** Instance type */
  instanceType?: string;
  
  /** AMI ID or lookup criteria */
  ami?: {
    /** AMI ID */
    amiId?: string;
    /** AMI name pattern for lookup */
    namePattern?: string;
    /** AMI owner */
    owner?: string;
  };
  
  /** VPC configuration */
  vpc?: {
    /** VPC ID */
    vpcId?: string;
    /** Subnet ID */
    subnetId?: string;
    /** Security group IDs */
    securityGroupIds?: string[];
  };
  
  /** User data script */
  userData?: {
    /** User data script content */
    script?: string;
    /** User data from file */
    fromFile?: string;
  };
  
  /** Key pair for SSH access */
  keyPair?: {
    /** Key pair name */
    keyName?: string;
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
    /** Delete on termination */
    deleteOnTermination?: boolean;
  };
  
  /** Monitoring configuration */
  monitoring?: {
    /** Enable detailed monitoring */
    detailed?: boolean;
    /** CloudWatch agent config */
    cloudWatchAgent?: boolean;
  };
  
  /** Security configuration */
  security?: {
    /** Disable IMDSv1 */
    requireImdsv2?: boolean;
    /** Instance metadata hop limit */
    httpTokens?: 'optional' | 'required';
    /** Enable Nitro Enclaves */
    nitroEnclaves?: boolean;
  };
}

/**
 * Configuration schema for EC2 Instance component
 */
export const EC2_INSTANCE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'EC2 Instance Configuration',
  description: 'Configuration for creating an EC2 compute instance with compliance hardening',
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
    vpc: {
      type: 'object',
      description: 'VPC configuration',
      properties: {
        vpcId: {
          type: 'string',
          description: 'VPC ID to deploy into',
          pattern: '^vpc-[a-f0-9]{8,17}$'
        },
        subnetId: {
          type: 'string',
          description: 'Subnet ID for the instance',
          pattern: '^subnet-[a-f0-9]{8,17}$'
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
    userData: {
      type: 'object',
      description: 'User data script configuration',
      properties: {
        script: {
          type: 'string',
          description: 'User data script content'
        },
        fromFile: {
          type: 'string',
          description: 'Path to user data script file'
        }
      },
      additionalProperties: false
    },
    keyPair: {
      type: 'object',
      description: 'Key pair configuration for SSH access',
      properties: {
        keyName: {
          type: 'string',
          description: 'EC2 key pair name'
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
        },
        deleteOnTermination: {
          type: 'boolean',
          description: 'Delete volume on instance termination',
          default: true
        }
      },
      additionalProperties: false
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring configuration',
      properties: {
        detailed: {
          type: 'boolean',
          description: 'Enable detailed CloudWatch monitoring',
          default: false
        },
        cloudWatchAgent: {
          type: 'boolean',
          description: 'Enable CloudWatch agent installation',
          default: false
        }
      },
      additionalProperties: false
    },
    security: {
      type: 'object',
      description: 'Security configuration',
      properties: {
        requireImdsv2: {
          type: 'boolean',
          description: 'Disable IMDSv1 and require IMDSv2',
          default: false
        },
        httpTokens: {
          type: 'string',
          description: 'Instance metadata service token requirement',
          enum: ['optional', 'required'],
          default: 'optional'
        },
        nitroEnclaves: {
          type: 'boolean',
          description: 'Enable AWS Nitro Enclaves',
          default: false
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false,
  defaults: {
    instanceType: 't3.micro',
    ami: {
      namePattern: 'amzn2-ami-hvm-*-x86_64-gp2',
      owner: 'amazon'
    },
    storage: {
      rootVolumeSize: 20,
      rootVolumeType: 'gp3',
      encrypted: false,
      deleteOnTermination: true
    },
    monitoring: {
      detailed: false,
      cloudWatchAgent: false
    },
    security: {
      requireImdsv2: false,
      httpTokens: 'optional',
      nitroEnclaves: false
    }
  }
};

/**
 * Ec2InstanceConfigBuilder - Handles configuration building and defaults for EC2 Instance
 */
export class Ec2InstanceConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<Ec2InstanceConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): Ec2InstanceConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    // Resolve environment interpolations (sync version)
    const resolvedConfig = this.resolveEnvironmentInterpolationsSync(mergedConfig);
    
    return resolvedConfig as Ec2InstanceConfig;
  }

  /**
   * Synchronous version of environment interpolation resolution
   */
  private resolveEnvironmentInterpolationsSync(config: Record<string, any>): Record<string, any> {
    // For now, return config as-is since we don't have environment config in sync context
    // In a real implementation, this would resolve ${env:key} patterns
    return config;
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
   * Get platform-wide defaults for EC2 Instance
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      instanceType: this.getDefaultInstanceType(),
      ami: {
        namePattern: 'amzn2-ami-hvm-*-x86_64-gp2',
        owner: 'amazon'
      },
      storage: {
        rootVolumeSize: this.getDefaultVolumeSize(),
        rootVolumeType: this.getDefaultVolumeType(),
        encrypted: false,
        deleteOnTermination: true
      },
      monitoring: {
        detailed: false,
        cloudWatchAgent: false
      },
      security: {
        requireImdsv2: false,
        httpTokens: 'optional',
        nitroEnclaves: false
      }
    };
  }

  /**
   * Get compliance framework specific defaults
   */
  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          instanceType: this.getInstanceClass('fedramp-moderate'),
          storage: {
            rootVolumeSize: 50, // Larger for compliance logging
            encrypted: true
          },
          monitoring: {
            detailed: true,
            cloudWatchAgent: true
          },
          security: {
            requireImdsv2: true,
            httpTokens: 'required'
          }
        };
        
      case 'fedramp-high':
        return {
          instanceType: this.getInstanceClass('fedramp-high'),
          storage: {
            rootVolumeSize: 100, // Even larger for enhanced logging
            rootVolumeType: 'gp3', // Better performance for compliance workloads
            encrypted: true
          },
          monitoring: {
            detailed: true,
            cloudWatchAgent: true
          },
          security: {
            requireImdsv2: true,
            httpTokens: 'required',
            nitroEnclaves: true
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
    return this.getInstanceClass(this.context.complianceFramework);
  }

  /**
   * Get default volume size based on compliance framework
   */
  private getDefaultVolumeSize(): number {
    switch (this.context.complianceFramework) {
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
    return this.context.complianceFramework === 'fedramp-high' ? 'gp3' : 'gp3';
  }
}

/**
 * EC2 Instance Component implementing Component API Contract v1.0
 */
export class Ec2InstanceComponent extends Component {
  private instance?: ec2.Instance;
  private securityGroup?: ec2.SecurityGroup;
  private instanceProfile?: iam.InstanceProfile;
  private role?: iam.Role;
  private kmsKey?: kms.Key;
  private config?: Ec2InstanceConfig;
  private configBuilder?: Ec2InstanceConfigBuilder;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create EC2 instance with compliance hardening
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting EC2 Instance synthesis');
    
    try {
      // Build configuration using ConfigBuilder
      this.configBuilder = new Ec2InstanceConfigBuilder(this.context, this.spec);
      this.config = this.configBuilder.buildSync();
    
    // Create KMS key for EBS encryption if needed
    this.createKmsKeyIfNeeded();
    
    // Create IAM role and instance profile
    this.createInstanceRole();
    
    // Create security group
    this.createSecurityGroup();
    
    // Create EC2 instance
    this.createInstance();
    
    // Apply compliance hardening
    this.applyComplianceHardening();
    
    // Register constructs
    this.registerConstruct('instance', this.instance!);
    this.registerConstruct('securityGroup', this.securityGroup!);
    this.registerConstruct('role', this.role!);
    if (this.kmsKey) {
      this.registerConstruct('kmsKey', this.kmsKey);
    }
    
      // Register capabilities
      this.registerCapability('compute:ec2', this.buildInstanceCapability());
      
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

    const instanceProps: ec2.InstanceProps = {
      instanceType: new ec2.InstanceType(this.config!.instanceType || 't3.micro'),
      machineImage: ami,
      vpc,
      vpcSubnets: this.getVpcSubnets(),
      securityGroup: this.securityGroup!,
      role: this.role!,
      userData: userData,
      keyName: this.config!.keyPair?.keyName,
      blockDevices: this.buildBlockDevices(),
      detailedMonitoring: !!this.shouldEnableDetailedMonitoring(),
      requireImdsv2: !!this.shouldRequireImdsv2(),
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

      // Apply immutable infrastructure tags
      cdk.Tags.of(this.instance).add('ImmutableInfrastructure', 'true');
      cdk.Tags.of(this.instance).add('STIGCompliant', 'true');
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

    devices.push({
      deviceName: '/dev/xvda',
      volume: ec2.BlockDeviceVolume.ebs(rootVolumeSize, {
        volumeType: this.getEbsVolumeType(),
        encrypted: !!encrypted,
        kmsKey: this.kmsKey,
        deleteOnTermination: this.config!.storage?.deleteOnTermination !== false
      })
    });

    return devices;
  }

  /**
   * Apply instance tags
   */
  private applyInstanceTags(): void {
    if (this.instance) {
      cdk.Tags.of(this.instance).add('Name', `${this.context.serviceName}-${this.spec.name}`);
      cdk.Tags.of(this.instance).add('Environment', this.context.environment);
      cdk.Tags.of(this.instance).add('Service', this.context.serviceName);
      cdk.Tags.of(this.instance).add('Component', this.spec.name);
      cdk.Tags.of(this.instance).add('ComplianceFramework', this.context.complianceFramework);
    }
  }

  /**
   * Build instance capability data shape
   */
  private buildInstanceCapability(): ComputeEc2Capability {
    return {
      instanceId: this.instance!.instanceId,
      privateIp: this.instance!.instancePrivateIp,
      roleArn: this.role!.roleArn
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private shouldEnableEbsEncryption(): boolean {
    return this.context.complianceFramework !== 'commercial' || !!this.config!.storage?.encrypted;
  }

  private shouldEnableDetailedMonitoring(): boolean {
    return this.isComplianceFramework() || !!this.config!.monitoring?.detailed;
  }

  private shouldRequireImdsv2(): boolean {
    return this.context.complianceFramework !== 'commercial';
  }

  private isComplianceFramework(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getInstanceAmi(): ec2.IMachineImage {
    if (this.config!.ami?.amiId) {
      const amiMap: { [key: string]: string } = {};
      amiMap[this.context.region || 'us-east-1'] = this.config!.ami!.amiId!;
      return ec2.MachineImage.genericLinux(amiMap);
    }

    // Use lookup for latest AMI
    return ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
    });
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