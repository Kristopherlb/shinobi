/**
 * SageMaker Notebook Instance Component
 * 
 * AWS SageMaker Notebook Instance for machine learning development and experimentation.
 * Implements platform standards with configuration-driven compliance.
 */

import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent } from '../@shinobi/core';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../@shinobi/core/component-interfaces';
import { SageMakerNotebookInstanceConfig, SageMakerNotebookInstanceComponentConfigBuilder } from './sagemaker-notebook-instance.builder';

/**
 * SageMaker Notebook Instance Component
 * 
 * Creates and manages AWS SageMaker Notebook Instances with platform-standard
 * configuration, security, and observability.
 */
export class SageMakerNotebookInstanceComponent extends BaseComponent {
  private config?: SageMakerNotebookInstanceConfig;
  private notebookInstance?: sagemaker.CfnNotebookInstance;
  private executionRole?: iam.Role;
  private kmsKey?: kms.Key;
  private securityGroup?: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public getType(): string {
    return 'sagemaker-notebook-instance';
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting SageMaker Notebook Instance component synthesis', {
      notebookInstanceName: this.spec.config?.notebookInstanceName,
      instanceType: this.spec.config?.instanceType
    });
    
    const startTime = Date.now();
    
    try {
      const configBuilder = new SageMakerNotebookInstanceComponentConfigBuilder(this.context, this.spec);
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
      this.configureNotebookObservability();
    
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

  private createKmsKeyIfNeeded(): void {
    if (!this.config!.kmsKeyId && this.config!.security?.kmsEncryption) {
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
      // For now, skip security group creation if VPC ID is not provided
      // This is a limitation that should be addressed in a future enhancement
      if (!this.config!.vpcId) {
        console.warn('VPC ID not provided, skipping security group creation');
        return;
      }
      
      this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
        vpc: ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: this.config!.vpcId }),
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
        'notebook': this.buildNotebookInstanceName()!,
        'internet-access': this.config!.directInternetAccess === 'Enabled' ? 'enabled' : 'disabled'
      });
    }
  }

  private createNotebookInstance(): void {
    const notebookProps: sagemaker.CfnNotebookInstanceProps = {
      notebookInstanceName: this.buildNotebookInstanceName(),
      instanceType: this.config!.instanceType!,
      roleArn: this.config!.roleArn || this.executionRole!.roleArn,
      kmsKeyId: this.config!.kmsKeyId || this.kmsKey?.keyId,
      subnetId: this.config!.subnetId,
      securityGroupIds: this.config!.securityGroupIds || (this.securityGroup ? [this.securityGroup.securityGroupId] : undefined),
      rootAccess: this.config!.rootAccess!,
      directInternetAccess: this.config!.directInternetAccess!,
      volumeSizeInGb: this.config!.volumeSizeInGB!,
      platformIdentifier: this.config!.platformIdentifier!,
      instanceMetadataServiceConfiguration: this.config!.instanceMetadataServiceConfiguration ? {
        minimumInstanceMetadataServiceVersion: this.config!.instanceMetadataServiceConfiguration.minimumInstanceMetadataServiceVersion!
      } : undefined,
      tags: this.buildNotebookTags()
    };

    this.notebookInstance = new sagemaker.CfnNotebookInstance(this, 'NotebookInstance', notebookProps);

    this.applyStandardTags(this.notebookInstance, {
      'notebook-type': 'sagemaker',
      'instance-type': this.config!.instanceType!,
      'root-access': this.config!.rootAccess!,
      'internet-access': this.config!.directInternetAccess!
    });

    this.logResourceCreation('sagemaker-notebook-instance', this.buildNotebookInstanceName()!, {
      instanceType: this.config!.instanceType,
      rootAccess: this.config!.rootAccess,
      directInternetAccess: this.config!.directInternetAccess
    });
  }

  private buildNotebookTags(): cdk.CfnTag[] {
    const tags: cdk.CfnTag[] = [
      { key: 'service', value: this.context.serviceName },
      { key: 'environment', value: this.context.environment }
    ];

    // Add compliance framework tags
    if (this.context.complianceFramework) {
      tags.push({ key: 'compliance-framework', value: this.context.complianceFramework });
    }

    // Add component-specific tags
    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        tags.push({ key, value: String(value) });
      });
    }

    return tags;
  }

  private buildNotebookInstanceName(): string {
    return this.config!.notebookInstanceName || `${this.context.serviceName}-${this.spec.name}`;
  }

  private getKeyRemovalPolicy(): cdk.RemovalPolicy {
    return this.context.complianceFramework === 'fedramp-high' ? 
      cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
  }

  private getBaseManagedPolicies(): iam.IManagedPolicy[] {
    return [
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess')
    ];
  }

  private buildInlinePolicies(): Record<string, iam.PolicyDocument> {
    return {
      SageMakerNotebookPolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              's3:GetObject',
              's3:PutObject',
              's3:DeleteObject',
              's3:ListBucket'
            ],
            resources: ['*']
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'ecr:GetAuthorizationToken',
              'ecr:BatchCheckLayerAvailability',
              'ecr:GetDownloadUrlForLayer',
              'ecr:BatchGetImage'
            ],
            resources: ['*']
          })
        ]
      })
    };
  }

  /**
   * Configure observability for the SageMaker Notebook Instance
   * Implements Platform Observability Standard v1.0
   */
  private configureNotebookObservability(): void {
    if (!this.config?.monitoring?.enabled || !this.notebookInstance) {
      return;
    }

    // Create CloudWatch metrics for notebook instance monitoring
    const notebookInstanceName = this.buildNotebookInstanceName();
    
    // CPU Utilization Metric
    new cloudwatch.Metric({
      namespace: 'AWS/SageMaker/NotebookInstance',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        NotebookInstanceName: notebookInstanceName
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5)
    });

    // Memory Utilization Metric
    new cloudwatch.Metric({
      namespace: 'AWS/SageMaker/NotebookInstance',
      metricName: 'MemoryUtilization',
      dimensionsMap: {
        NotebookInstanceName: notebookInstanceName
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5)
    });

    // Disk Utilization Metric
    new cloudwatch.Metric({
      namespace: 'AWS/SageMaker/NotebookInstance',
      metricName: 'DiskUtilization',
      dimensionsMap: {
        NotebookInstanceName: notebookInstanceName
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5)
    });

    // GPU Utilization Metric (if applicable)
    if (this.config.instanceType?.includes('gpu') || this.config.instanceType?.includes('p')) {
      new cloudwatch.Metric({
        namespace: 'AWS/SageMaker/NotebookInstance',
        metricName: 'GPUUtilization',
        dimensionsMap: {
          NotebookInstanceName: notebookInstanceName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      });
    }

    // Create CloudWatch alarms for critical metrics
    this.createCloudWatchAlarms(notebookInstanceName);
  }

  /**
   * Create CloudWatch alarms for the notebook instance
   */
  private createCloudWatchAlarms(notebookInstanceName: string): void {
    // CPU Utilization Alarm
    new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SageMaker/NotebookInstance',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          NotebookInstanceName: notebookInstanceName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: `High CPU utilization for SageMaker notebook instance ${notebookInstanceName}`,
      alarmName: `${notebookInstanceName}-cpu-utilization`
    });

    // Memory Utilization Alarm
    new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SageMaker/NotebookInstance',
        metricName: 'MemoryUtilization',
        dimensionsMap: {
          NotebookInstanceName: notebookInstanceName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 85,
      evaluationPeriods: 2,
      alarmDescription: `High memory utilization for SageMaker notebook instance ${notebookInstanceName}`,
      alarmName: `${notebookInstanceName}-memory-utilization`
    });

    // Disk Utilization Alarm
    new cloudwatch.Alarm(this, 'DiskUtilizationAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SageMaker/NotebookInstance',
        metricName: 'DiskUtilization',
        dimensionsMap: {
          NotebookInstanceName: notebookInstanceName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 90,
      evaluationPeriods: 2,
      alarmDescription: `High disk utilization for SageMaker notebook instance ${notebookInstanceName}`,
      alarmName: `${notebookInstanceName}-disk-utilization`
    });
  }

  private buildNotebookCapability(): any {
    return {
      notebookInstanceName: this.buildNotebookInstanceName(),
      notebookInstanceArn: this.notebookInstance!.ref,
      url: `https://${this.buildNotebookInstanceName()}.notebook.${cdk.Aws.REGION}.sagemaker.aws/`
    };
  }
}