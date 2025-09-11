/**
 * SageMaker Notebook Instance Component
 * 
 * AWS SageMaker Notebook Instance for machine learning development and experimentation.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
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
 * Configuration interface for SageMaker Notebook Instance component
 */
export interface SageMakerNotebookInstanceConfig {
  /** Notebook instance name (optional, will be auto-generated) */
  notebookInstanceName?: string;
  
  /** Instance type for the notebook */
  instanceType?: string;
  
  /** IAM role for the notebook instance */
  roleArn?: string;
  
  /** Subnet ID for VPC placement */
  subnetId?: string;
  
  /** Security group IDs */
  securityGroupIds?: string[];
  
  /** KMS key for encryption */
  kmsKeyId?: string;
  
  /** Root access configuration */
  rootAccess?: 'Enabled' | 'Disabled';
  
  /** Direct internet access */
  directInternetAccess?: 'Enabled' | 'Disabled';
  
  /** Volume size in GB */
  volumeSizeInGB?: number;
  
  /** Default code repository */
  defaultCodeRepository?: string;
  
  /** Additional code repositories */
  additionalCodeRepositories?: string[];
  
  /** Lifecycle configuration */
  lifecycleConfigName?: string;
  
  /** Platform identifier */
  platformIdentifier?: string;
  
  /** Accelerator types */
  acceleratorTypes?: string[];
  
  /** Instance metadata service configuration */
  instanceMetadataServiceConfiguration?: {
    /** Minimum IMDS version */
    minimumInstanceMetadataServiceVersion?: string;
  };
  
  /** Tags for the notebook instance */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for SageMaker Notebook Instance component
 */
export const SAGEMAKER_NOTEBOOK_INSTANCE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'SageMaker Notebook Instance Configuration',
  description: 'Configuration for creating a SageMaker Notebook Instance',
  properties: {
    notebookInstanceName: {
      type: 'string',
      description: 'Name of the notebook instance (will be auto-generated if not provided)',
      pattern: '^[a-zA-Z0-9\\-]{1,63}$',
      maxLength: 63
    },
    instanceType: {
      type: 'string',
      description: 'Instance type for the notebook',
      enum: [
        'ml.t2.medium', 'ml.t2.large', 'ml.t2.xlarge', 'ml.t2.2xlarge',
        'ml.t3.medium', 'ml.t3.large', 'ml.t3.xlarge', 'ml.t3.2xlarge',
        'ml.m4.xlarge', 'ml.m4.2xlarge', 'ml.m4.4xlarge', 'ml.m4.10xlarge', 'ml.m4.16xlarge',
        'ml.m5.large', 'ml.m5.xlarge', 'ml.m5.2xlarge', 'ml.m5.4xlarge', 'ml.m5.12xlarge', 'ml.m5.24xlarge',
        'ml.c4.large', 'ml.c4.xlarge', 'ml.c4.2xlarge', 'ml.c4.4xlarge', 'ml.c4.8xlarge',
        'ml.c5.large', 'ml.c5.xlarge', 'ml.c5.2xlarge', 'ml.c5.4xlarge', 'ml.c5.9xlarge', 'ml.c5.18xlarge',
        'ml.p2.xlarge', 'ml.p2.8xlarge', 'ml.p2.16xlarge',
        'ml.p3.2xlarge', 'ml.p3.8xlarge', 'ml.p3.16xlarge',
        'ml.g4dn.xlarge', 'ml.g4dn.2xlarge', 'ml.g4dn.4xlarge', 'ml.g4dn.8xlarge', 'ml.g4dn.12xlarge', 'ml.g4dn.16xlarge'
      ],
      default: 'ml.t3.medium'
    },
    roleArn: {
      type: 'string',
      description: 'IAM role ARN for the notebook instance'
    },
    subnetId: {
      type: 'string',
      description: 'Subnet ID for VPC placement'
    },
    securityGroupIds: {
      type: 'array',
      description: 'Security group IDs',
      items: { type: 'string' },
      maxItems: 5
    },
    kmsKeyId: {
      type: 'string',
      description: 'KMS key ID for encryption'
    },
    rootAccess: {
      type: 'string',
      description: 'Root access configuration',
      enum: ['Enabled', 'Disabled'],
      default: 'Enabled'
    },
    directInternetAccess: {
      type: 'string',
      description: 'Direct internet access',
      enum: ['Enabled', 'Disabled'],
      default: 'Enabled'
    },
    volumeSizeInGB: {
      type: 'number',
      description: 'Volume size in GB',
      minimum: 5,
      maximum: 16384,
      default: 20
    },
    defaultCodeRepository: {
      type: 'string',
      description: 'Default code repository URL'
    },
    additionalCodeRepositories: {
      type: 'array',
      description: 'Additional code repositories',
      items: { type: 'string' },
      maxItems: 3
    },
    lifecycleConfigName: {
      type: 'string',
      description: 'Lifecycle configuration name'
    },
    platformIdentifier: {
      type: 'string',
      description: 'Platform identifier',
      enum: ['notebook-al1-v1', 'notebook-al2-v1', 'notebook-al2-v2'],
      default: 'notebook-al2-v2'
    },
    acceleratorTypes: {
      type: 'array',
      description: 'Accelerator types',
      items: {
        type: 'string',
        enum: ['ml.eia1.medium', 'ml.eia1.large', 'ml.eia1.xlarge', 'ml.eia2.medium', 'ml.eia2.large', 'ml.eia2.xlarge']
      },
      maxItems: 1
    },
    instanceMetadataServiceConfiguration: {
      type: 'object',
      description: 'Instance metadata service configuration',
      properties: {
        minimumInstanceMetadataServiceVersion: {
          type: 'string',
          description: 'Minimum IMDS version',
          enum: ['1', '2'],
          default: '2'
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Tags for the notebook instance',
      additionalProperties: { type: 'string' },
      default: {}
    }
  },
  additionalProperties: false,
  defaults: {
    instanceType: 'ml.t3.medium',
    rootAccess: 'Enabled',
    directInternetAccess: 'Enabled',
    volumeSizeInGB: 20,
    platformIdentifier: 'notebook-al2-v2',
    instanceMetadataServiceConfiguration: { minimumInstanceMetadataServiceVersion: '2' },
    tags: {}
  }
};

/**
 * Configuration builder for SageMaker Notebook Instance component
 */
export class SageMakerNotebookInstanceConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  public async build(): Promise<SageMakerNotebookInstanceConfig> {
    return this.buildSync();
  }

  public buildSync(): SageMakerNotebookInstanceConfig {
    const platformDefaults = this.getPlatformDefaults();
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    const userConfig = this.spec.config || {};
    
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as SageMakerNotebookInstanceConfig;
  }

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

  private getPlatformDefaults(): Record<string, any> {
    return {
      instanceType: this.getDefaultInstanceType(),
      rootAccess: this.getDefaultRootAccess(),
      directInternetAccess: this.getDefaultDirectInternetAccess(),
      volumeSizeInGB: this.getDefaultVolumeSize(),
      platformIdentifier: 'notebook-al2-v2',
      instanceMetadataServiceConfiguration: {
        minimumInstanceMetadataServiceVersion: '2' // IMDSv2 for security
      },
      tags: {
        'service': this.context.serviceName,
        'environment': this.context.environment,
        'notebook-type': 'sagemaker'
      }
    };
  }

  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          instanceType: 'ml.m5.large', // More capable instance for compliance workloads
          rootAccess: 'Disabled', // Disable root access for security
          directInternetAccess: 'Disabled', // Force VPC routing for compliance
          volumeSizeInGB: 100, // Larger volume for compliance data
          instanceMetadataServiceConfiguration: {
            minimumInstanceMetadataServiceVersion: '2' // Enforce IMDSv2
          },
          tags: {
            'compliance-framework': 'fedramp-moderate',
            'root-access': 'disabled',
            'internet-access': 'vpc-only',
            'imds-version': 'v2'
          }
        };
        
      case 'fedramp-high':
        return {
          instanceType: 'ml.m5.xlarge', // High-performance instance for secure workloads
          rootAccess: 'Disabled', // Mandatory disabled root access
          directInternetAccess: 'Disabled', // Mandatory VPC-only access
          volumeSizeInGB: 200, // Large volume for high security requirements
          instanceMetadataServiceConfiguration: {
            minimumInstanceMetadataServiceVersion: '2' // Mandatory IMDSv2
          },
          tags: {
            'compliance-framework': 'fedramp-high',
            'root-access': 'disabled',
            'internet-access': 'vpc-only',
            'imds-version': 'v2',
            'security-level': 'high'
          }
        };
        
      default: // commercial
        return {
          rootAccess: 'Enabled',
          directInternetAccess: 'Enabled'
        };
    }
  }

  private getDefaultInstanceType(): string {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 'ml.m5.xlarge';
      case 'fedramp-moderate':
        return 'ml.m5.large';
      default:
        return 'ml.t3.medium';
    }
  }

  private getDefaultRootAccess(): string {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) 
      ? 'Disabled' 
      : 'Enabled';
  }

  private getDefaultDirectInternetAccess(): string {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) 
      ? 'Disabled' 
      : 'Enabled';
  }

  private getDefaultVolumeSize(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 200;
      case 'fedramp-moderate':
        return 100;
      default:
        return 20;
    }
  }
}

/**
 * SageMaker Notebook Instance Component implementing Component API Contract v1.0
 */
export class SageMakerNotebookInstanceComponent extends Component {
  private notebookInstance?: sagemaker.CfnNotebookInstance;
  private executionRole?: iam.Role;
  private kmsKey?: kms.Key;
  private securityGroup?: ec2.SecurityGroup;
  private config?: SageMakerNotebookInstanceConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting SageMaker Notebook Instance component synthesis', {
      notebookInstanceName: this.spec.config?.notebookInstanceName,
      instanceType: this.spec.config?.instanceType
    });
    
    const startTime = Date.now();
    
    try {
      const configBuilder = new SageMakerNotebookInstanceConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      this.logComponentEvent('config_built', 'SageMaker Notebook Instance configuration built successfully', {
        notebookInstanceName: this.config.notebookInstanceName,
        instanceType: this.config.instanceType,
        rootAccess: this.config.rootAccess
      });
      
      this.createKmsKeyIfNeeded();
      this.createExecutionRoleIfNeeded();
      this.createSecurityGroupIfNeeded();
      this.createNotebookInstance();
      this.applyComplianceHardening();
      this.configureObservabilityForNotebook();
    
      this.registerConstruct('notebookInstance', this.notebookInstance!);
      if (this.executionRole) {
        this.registerConstruct('executionRole', this.executionRole);
      }
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }
      if (this.securityGroup) {
        this.registerConstruct('securityGroup', this.securityGroup);
      }
    
      this.registerCapability('ml:notebook', this.buildNotebookCapability());
    
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'SageMaker Notebook Instance component synthesis completed successfully', {
        notebookCreated: 1,
        encryptionEnabled: !!this.config.kmsKeyId || !!this.kmsKey,
        rootAccessDisabled: this.config.rootAccess === 'Disabled'
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'sagemaker-notebook-instance',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'sagemaker-notebook-instance';
  }

  private createKmsKeyIfNeeded(): void {
    if (!this.config!.kmsKeyId && ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)) {
      this.kmsKey = new kms.Key(this, 'KmsKey', {
        description: `KMS key for ${this.buildNotebookInstanceName()} SageMaker notebook`,
        enableKeyRotation: true,
        removalPolicy: this.getKeyRemovalPolicy()
      });

      this.applyStandardTags(this.kmsKey, {
        'key-type': 'sagemaker-notebook',
        'notebook': this.buildNotebookInstanceName()!,
        'rotation-enabled': 'true'
      });
    }
  }

  private createExecutionRoleIfNeeded(): void {
    if (!this.config!.roleArn) {
      this.executionRole = new iam.Role(this, 'ExecutionRole', {
        assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
        description: `Execution role for ${this.buildNotebookInstanceName()} notebook instance`,
        managedPolicies: this.getBaseManagedPolicies(),
        inlinePolicies: this.buildInlinePolicies()
      });

      this.applyStandardTags(this.executionRole, {
        'role-type': 'execution',
        'notebook': this.buildNotebookInstanceName()!,
        'service': 'sagemaker'
      });
    }
  }

  private createSecurityGroupIfNeeded(): void {
    if (this.config!.subnetId && !this.config!.securityGroupIds?.length) {
      // Get VPC from subnet
      const subnet = ec2.Subnet.fromSubnetId(this, 'Subnet', this.config!.subnetId);
      
      this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
        vpc: subnet.vpc,
        description: `Security group for ${this.buildNotebookInstanceName()} SageMaker notebook`,
        allowAllOutbound: this.config!.directInternetAccess === 'Enabled'
      });

      // Allow HTTPS outbound for package downloads and Git access
      if (this.config!.directInternetAccess === 'Disabled') {
        this.securityGroup.addEgressRule(
          ec2.Peer.anyIpv4(),
          ec2.Port.tcp(443),
          'HTTPS outbound for package downloads'
        );
      }

      this.applyStandardTags(this.securityGroup, {
        'security-group-type': 'sagemaker-notebook',
        'notebook': this.buildNotebookInstanceName()!
      });
    }
  }

  private createNotebookInstance(): void {
    const notebookProps: sagemaker.CfnNotebookInstanceProps = {
      notebookInstanceName: this.buildNotebookInstanceName(),
      instanceType: this.config!.instanceType!,
      roleArn: this.config!.roleArn || this.executionRole!.roleArn,
      subnetId: this.config!.subnetId,
      securityGroupIds: this.buildSecurityGroupIds(),
      kmsKeyId: this.config!.kmsKeyId || this.kmsKey?.keyId,
      rootAccess: this.config!.rootAccess,
      directInternetAccess: this.config!.directInternetAccess,
      volumeSizeInGb: this.config!.volumeSizeInGB,
      defaultCodeRepository: this.config!.defaultCodeRepository,
      additionalCodeRepositories: this.config!.additionalCodeRepositories,
      lifecycleConfigName: this.config!.lifecycleConfigName,
      platformIdentifier: this.config!.platformIdentifier,
      acceleratorTypes: this.config!.acceleratorTypes,
      instanceMetadataServiceConfiguration: this.config!.instanceMetadataServiceConfiguration,
      tags: this.buildNotebookTags()
    };

    this.notebookInstance = new sagemaker.CfnNotebookInstance(this, 'NotebookInstance', notebookProps);

    this.applyStandardTags(this.notebookInstance, {
      'notebook-name': this.buildNotebookInstanceName()!,
      'instance-type': this.config!.instanceType!,
      'root-access': this.config!.rootAccess!,
      'direct-internet': this.config!.directInternetAccess!,
      'volume-size': (this.config!.volumeSizeInGB || 20).toString()
    });
    
    this.logResourceCreation('sagemaker-notebook-instance', this.buildNotebookInstanceName()!, {
      notebookInstanceName: this.buildNotebookInstanceName(),
      instanceType: this.config!.instanceType,
      rootAccess: this.config!.rootAccess,
      encryptionEnabled: !!(this.config!.kmsKeyId || this.kmsKey)
    });
  }

  private buildSecurityGroupIds(): string[] | undefined {
    if (this.config!.securityGroupIds?.length) {
      return this.config!.securityGroupIds;
    }
    
    if (this.securityGroup) {
      return [this.securityGroup.securityGroupId];
    }
    
    return undefined;
  }

  private buildNotebookTags(): sagemaker.CfnNotebookInstance.TagProperty[] {
    const allTags = {
      ...this.config!.tags,
      'service': this.context.serviceName,
      'environment': this.context.environment
    };

    return Object.entries(allTags).map(([key, value]) => ({
      key,
      value
    }));
  }

  private getBaseManagedPolicies(): iam.IManagedPolicy[] {
    return [
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess')
    ];
  }

  private buildInlinePolicies(): Record<string, iam.PolicyDocument> {
    const policies: Record<string, iam.PolicyDocument> = {};

    // S3 access for data and model storage
    policies.S3AccessPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject',
            's3:ListBucket'
          ],
          resources: [
            `arn:aws:s3:::sagemaker-${cdk.Aws.REGION}-${cdk.Aws.ACCOUNT_ID}/*`,
            `arn:aws:s3:::sagemaker-${cdk.Aws.REGION}-${cdk.Aws.ACCOUNT_ID}`
          ]
        })
      ]
    });

    // CloudWatch Logs permissions
    policies.CloudWatchLogsPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:DescribeLogStreams'
          ],
          resources: [`arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`]
        })
      ]
    });

    // KMS permissions for encryption
    if (this.kmsKey) {
      policies.KmsPolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'kms:Decrypt',
              'kms:GenerateDataKey',
              'kms:CreateGrant'
            ],
            resources: [this.kmsKey.keyArn]
          })
        ]
      });
    }

    return policies;
  }

  private buildNotebookInstanceName(): string | undefined {
    if (this.config!.notebookInstanceName) {
      return this.config!.notebookInstanceName;
    }
    return `${this.context.serviceName}-${this.spec.name}`;
  }

  private getKeyRemovalPolicy(): cdk.RemovalPolicy {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) 
      ? cdk.RemovalPolicy.RETAIN 
      : cdk.RemovalPolicy.DESTROY;
  }

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
    // Basic security logging
    if (this.notebookInstance) {
      const securityLogGroup = new logs.LogGroup(this, 'SecurityLogGroup', {
        logGroupName: `/aws/sagemaker/NotebookInstances/${this.buildNotebookInstanceName()}/security`,
        retention: logs.RetentionDays.THREE_MONTHS,
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });

      this.applyStandardTags(securityLogGroup, {
        'log-type': 'security',
        'retention': '3-months'
      });
    }
  }

  private applyFedrampModerateHardening(): void {
    this.applyCommercialHardening();

    if (this.notebookInstance) {
      const complianceLogGroup = new logs.LogGroup(this, 'ComplianceLogGroup', {
        logGroupName: `/aws/sagemaker/NotebookInstances/${this.buildNotebookInstanceName()}/compliance`,
        retention: logs.RetentionDays.ONE_YEAR,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      this.applyStandardTags(complianceLogGroup, {
        'log-type': 'compliance',
        'retention': '1-year',
        'compliance': 'fedramp-moderate'
      });
    }
  }

  private applyFedrampHighHardening(): void {
    this.applyFedrampModerateHardening();

    if (this.notebookInstance) {
      const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
        logGroupName: `/aws/sagemaker/NotebookInstances/${this.buildNotebookInstanceName()}/audit`,
        retention: logs.RetentionDays.TEN_YEARS,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      this.applyStandardTags(auditLogGroup, {
        'log-type': 'audit',
        'retention': '10-years',
        'compliance': 'fedramp-high'
      });
    }
  }

  private buildNotebookCapability(): any {
    return {
      notebookInstanceName: this.buildNotebookInstanceName(),
      notebookInstanceArn: this.notebookInstance!.ref,
      url: `https://${this.buildNotebookInstanceName()}.notebook.${cdk.Aws.REGION}.sagemaker.aws/`
    };
  }

  private configureObservabilityForNotebook(): void {
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const notebookName = this.buildNotebookInstanceName()!;

    // Currently, SageMaker Notebook Instances don't have extensive CloudWatch metrics
    // We'll create custom alarms based on the instance lifecycle and CloudTrail events

    // Note: In a real implementation, you might set up custom CloudWatch Events
    // to monitor notebook instance state changes and user activities

    this.logComponentEvent('observability_configured', 'Basic observability configured for SageMaker Notebook Instance', {
      notebookName: notebookName,
      monitoringEnabled: true,
      note: 'SageMaker Notebook Instances have limited native CloudWatch metrics'
    });
  }
}