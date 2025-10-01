import * as efs from 'aws-cdk-lib/aws-efs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@shinobi/core';
import {
  EfsFilesystemComponentConfigBuilder,
  EfsFilesystemConfig,
  EfsAlarmConfig,
  EfsLogConfig
} from './efs-filesystem.builder.js';

interface LoggingResources {
  access?: logs.ILogGroup;
  audit?: logs.ILogGroup;
}

export class EfsFilesystemComponent extends BaseComponent {
  private fileSystem?: efs.FileSystem;
  private config?: EfsFilesystemConfig;
  private vpc?: ec2.IVpc;
  private managedSecurityGroup?: ec2.SecurityGroup;
  private importedSecurityGroup?: ec2.ISecurityGroup;
  private createdKmsKey?: kms.Key;
  private createdLogGroups: Record<string, logs.LogGroup> = {};

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    const start = Date.now();
    this.logComponentEvent('synthesis_start', 'Starting EFS filesystem synthesis');

    try {
      const builder = new EfsFilesystemComponentConfigBuilder({
        context: this.context,
        spec: this.spec
      });
      this.config = builder.buildSync();

      this.logComponentEvent('config_resolved', 'Resolved EFS configuration', {
        fileSystemName: this.config.fileSystemName,
        performanceMode: this.config.performanceMode,
        throughputMode: this.config.throughputMode,
        backupsEnabled: this.config.backups.enabled
      });

      this.resolveVpc();
      this.resolveSecurityGroup();
      const kmsKey = this.resolveKmsKey();
      const loggingResources = this.configureLogging();
      this.createFileSystem(kmsKey, loggingResources);
      this.configureMonitoring();
      this.logHardeningProfile();

      this.registerConstruct('main', this.fileSystem!);
      this.registerConstruct('filesystem', this.fileSystem!);

      if (this.managedSecurityGroup) {
        this.registerConstruct('securityGroup', this.managedSecurityGroup);
      }

      if (this.createdKmsKey) {
        this.registerConstruct('kmsKey', this.createdKmsKey);
      }

      Object.entries(this.createdLogGroups).forEach(([key, logGroup]) => {
        this.registerConstruct(`logGroup:${key}`, logGroup);
      });

      this.registerCapability('storage:efs', this.buildFilesystemCapability());

      this.logPerformanceMetric('component_synthesis', Date.now() - start, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
      this.logComponentEvent('synthesis_complete', 'EFS filesystem synthesis completed');
    } catch (error) {
      this.logError(error as Error, 'efs-filesystem synthesis');
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'efs-filesystem';
  }

  private resolveVpc(): void {
    if (!this.config?.vpc.enabled) {
      throw new Error('EFS filesystem requires vpc configuration. Provide `config.vpc.vpcId` and subnet IDs.');
    }

    if (!this.config.vpc.vpcId) {
      throw new Error('EFS filesystem requires `config.vpc.vpcId` to be set.');
    }

    this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: this.config.vpc.vpcId
    });
  }

  private resolveSecurityGroup(): void {
    if (!this.config?.vpc.enabled) {
      return;
    }

    const sgConfig = this.config.vpc.securityGroup;

    if (sgConfig.securityGroupId) {
      this.importedSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'ImportedSecurityGroup', sgConfig.securityGroupId);
    }

    if (!sgConfig.create) {
      return;
    }

    if (!this.vpc) {
      throw new Error('Unable to create security group without a resolved VPC.');
    }

    const description = sgConfig.description ?? `Security group for ${this.config.fileSystemName} EFS filesystem`;
    const securityGroup = new ec2.SecurityGroup(this, 'EfsSecurityGroup', {
      vpc: this.vpc,
      description,
      allowAllOutbound: true
    });

    sgConfig.ingressRules.forEach(rule => {
      const port = rule.protocol === 'udp' ? ec2.Port.udp(rule.port) : ec2.Port.tcp(rule.port);
      securityGroup.addIngressRule(ec2.Peer.ipv4(rule.cidr), port, rule.description);
    });

    this.applyStandardTags(securityGroup, {
      'resource-type': 'security-group',
      'efs-filesystem': this.config.fileSystemName
    });

    this.logResourceCreation('security-group', securityGroup.securityGroupId);
    this.managedSecurityGroup = securityGroup;
  }

  private resolveKmsKey(): kms.IKey | undefined {
    if (!this.config?.encryption.enabled) {
      return undefined;
    }

    if (this.config.encryption.customerManagedKey.create) {
      const key = new kms.Key(this, 'EfsEncryptionKey', {
        description: `Customer managed key for ${this.config.fileSystemName} EFS filesystem`,
        enableKeyRotation: this.config.encryption.customerManagedKey.enableRotation
      });

      if (this.config.encryption.customerManagedKey.alias) {
        key.addAlias(this.config.encryption.customerManagedKey.alias);
      }

      this.applyStandardTags(key, {
        'resource-type': 'kms-key',
        'managed-by': 'efs-component'
      });

      this.createdKmsKey = key;
      return key;
    }

    if (this.config.encryption.kmsKeyArn) {
      return kms.Key.fromKeyArn(this, 'ImportedEfsKey', this.config.encryption.kmsKeyArn);
    }

    return undefined;
  }

  private configureLogging(): LoggingResources {
    if (!this.config) {
      return {};
    }

    return {
      access: this.prepareLogGroup('access', this.config.logging.access),
      audit: this.prepareLogGroup('audit', this.config.logging.audit)
    };
  }

  private prepareLogGroup(key: string, config: EfsLogConfig): logs.ILogGroup | undefined {
    if (!config.enabled) {
      return undefined;
    }

    if (!config.createLogGroup && config.logGroupName) {
      return logs.LogGroup.fromLogGroupName(this, `${this.toPascalCase(key)}LogGroupImported`, config.logGroupName);
    }

    const logGroupName = config.logGroupName ?? this.generateLogGroupName(key);
    const logGroup = new logs.LogGroup(this, `${this.toPascalCase(key)}LogGroup`, {
      logGroupName,
      retention: this.mapLogRetentionDays(config.retentionInDays ?? 90),
      removalPolicy: this.mapRemovalPolicy(config.removalPolicy ?? 'destroy')
    });

    if (config.tags && Object.keys(config.tags).length > 0) {
      this.applyStandardTags(logGroup, config.tags);
    } else {
      this.applyStandardTags(logGroup, {
        'resource-type': 'log-group',
        'log-channel': key
      });
    }

    this.createdLogGroups[key] = logGroup;
    return logGroup;
  }

  private createFileSystem(kmsKey: kms.IKey | undefined, logging: LoggingResources): void {
    if (!this.vpc) {
      throw new Error('EFS filesystem creation requires a resolved VPC.');
    }

    const securityGroup = this.managedSecurityGroup ?? this.importedSecurityGroup;

    const fileSystemProps: efs.FileSystemProps = {
      vpc: this.vpc,
      securityGroup,
      vpcSubnets: this.buildVpcSubnets(),
      fileSystemName: this.config!.fileSystemName,
      performanceMode: this.mapPerformanceMode(this.config!.performanceMode),
      throughputMode: this.mapThroughputMode(this.config!.throughputMode),
      encrypted: this.config!.encryption.enabled,
      kmsKey,
      lifecyclePolicy: this.mapLifecyclePolicy(this.config!.lifecycle.transitionToIA),
      outOfInfrequentAccessPolicy: this.mapOutOfIAPolicy(this.config!.lifecycle.transitionToPrimary),
      enableAutomaticBackups: this.config!.backups.enabled,
      fileSystemPolicy: this.buildFileSystemPolicy(),
      removalPolicy: this.mapRemovalPolicy(this.config!.removalPolicy)
    };

    if (this.config!.throughputMode === 'provisioned' && this.config!.provisionedThroughputMibps) {
      fileSystemProps.provisionedThroughputPerSecond = cdk.Size.mebibytes(this.config!.provisionedThroughputMibps);
    }

    this.fileSystem = new efs.FileSystem(this, 'EfsFileSystem', fileSystemProps);

    this.applyStandardTags(this.fileSystem, {
      'filesystem-type': 'efs',
      'performance-mode': this.config!.performanceMode,
      'throughput-mode': this.config!.throughputMode,
      'encrypted': this.config!.encryption.enabled.toString(),
      'encrypt-in-transit': this.config!.encryption.encryptInTransit.toString(),
      'backups-enabled': this.config!.backups.enabled.toString(),
      'hardening-profile': this.config!.hardeningProfile,
      ...this.config!.tags
    });

    this.logResourceCreation('efs-filesystem', this.fileSystem.fileSystemId, {
      fileSystemArn: this.fileSystem.fileSystemArn,
      performanceMode: this.config!.performanceMode,
      throughputMode: this.config!.throughputMode
    });
  }

  private buildFileSystemPolicy(): iam.PolicyDocument | undefined {
    if (!this.config?.filesystemPolicy) {
      return undefined;
    }

    return iam.PolicyDocument.fromJson(this.config.filesystemPolicy);
  }

  private buildVpcSubnets(): ec2.SubnetSelection | undefined {
    if (!this.config?.vpc.enabled) {
      return undefined;
    }

    if (this.config.vpc.subnetIds.length > 0) {
      const subnets = this.config.vpc.subnetIds.map((subnetId, index) =>
        ec2.Subnet.fromSubnetId(this, `EfsSubnet${index}`, subnetId)
      );
      return { subnets };
    }

    if (this.vpc) {
      return { subnets: this.vpc.privateSubnets };
    }

    return undefined;
  }

  private configureMonitoring(): void {
    if (!this.config?.monitoring.enabled) {
      return;
    }

    const alarms: Array<{ id: string; config: EfsAlarmConfig; metric: cloudwatch.Metric; defaultThreshold: number }> = [
      {
        id: 'StorageUtilizationAlarm',
        config: this.config.monitoring.alarms.storageUtilization,
        defaultThreshold: 1099511627776,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/EFS',
          metricName: 'StorageBytes',
          statistic: this.config.monitoring.alarms.storageUtilization.statistic ?? 'Average',
          dimensionsMap: this.metricDimensions('Total'),
          period: cdk.Duration.minutes(this.config.monitoring.alarms.storageUtilization.periodMinutes ?? 5)
        })
      },
      {
        id: 'ClientConnectionsAlarm',
        config: this.config.monitoring.alarms.clientConnections,
        defaultThreshold: 1000,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/EFS',
          metricName: 'ClientConnections',
          statistic: this.config.monitoring.alarms.clientConnections.statistic ?? 'Average',
          dimensionsMap: this.metricDimensions(),
          period: cdk.Duration.minutes(this.config.monitoring.alarms.clientConnections.periodMinutes ?? 5)
        })
      },
      {
        id: 'BurstCreditBalanceAlarm',
        config: this.config.monitoring.alarms.burstCreditBalance,
        defaultThreshold: 128,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/EFS',
          metricName: 'BurstCreditBalance',
          statistic: this.config.monitoring.alarms.burstCreditBalance.statistic ?? 'Minimum',
          dimensionsMap: this.metricDimensions(),
          period: cdk.Duration.minutes(this.config.monitoring.alarms.burstCreditBalance.periodMinutes ?? 5)
        })
      }
    ];

    alarms.forEach(alarmDefinition => {
      if (!alarmDefinition.config.enabled) {
        return;
      }

      const alarm = new cloudwatch.Alarm(this, alarmDefinition.id, {
        alarmName: `${this.context.serviceName}-${this.spec.name}-${this.toKebabCase(alarmDefinition.id)}`,
        alarmDescription: `EFS filesystem alarm for ${alarmDefinition.id}`,
        metric: alarmDefinition.metric,
        threshold: alarmDefinition.config.threshold ?? alarmDefinition.defaultThreshold,
        evaluationPeriods: alarmDefinition.config.evaluationPeriods ?? 1,
        comparisonOperator: this.mapComparisonOperator(alarmDefinition.config.comparisonOperator ?? 'gt'),
        treatMissingData: this.mapTreatMissingData(alarmDefinition.config.treatMissingData ?? 'not-breaching')
      });

      this.applyStandardTags(alarm, {
        'resource-type': 'cloudwatch-alarm',
        'alarm-id': alarmDefinition.id,
        ...alarmDefinition.config.tags
      });
    });

    this.logComponentEvent('observability_configured', 'Configured EFS monitoring alarms', {
      fileSystemId: this.fileSystem?.fileSystemId,
      monitoringEnabled: true
    });
  }

  private buildFilesystemCapability(): Record<string, any> {
    return {
      fileSystemId: this.fileSystem!.fileSystemId,
      fileSystemArn: this.fileSystem!.fileSystemArn,
      fileSystemName: this.config!.fileSystemName,
      performanceMode: this.config!.performanceMode,
      throughputMode: this.config!.throughputMode,
      provisionedThroughputMibps: this.config!.provisionedThroughputMibps,
      encryption: {
        atRest: this.config!.encryption.enabled,
        inTransit: this.config!.encryption.encryptInTransit
      },
      backupsEnabled: this.config!.backups.enabled,
      hardeningProfile: this.config!.hardeningProfile
    };
  }

  private mapPerformanceMode(mode: string): efs.PerformanceMode {
    return mode === 'maxIO' ? efs.PerformanceMode.MAX_IO : efs.PerformanceMode.GENERAL_PURPOSE;
  }

  private mapThroughputMode(mode: string): efs.ThroughputMode {
    switch (mode) {
      case 'provisioned':
        return efs.ThroughputMode.PROVISIONED;
      case 'elastic':
        return efs.ThroughputMode.ELASTIC;
      default:
        return efs.ThroughputMode.BURSTING;
    }
  }

  private mapLifecyclePolicy(policy?: EfsFilesystemConfig['lifecycle']['transitionToIA']): efs.LifecyclePolicy | undefined {
    switch (policy) {
      case 'AFTER_7_DAYS':
        return efs.LifecyclePolicy.AFTER_7_DAYS;
      case 'AFTER_14_DAYS':
        return efs.LifecyclePolicy.AFTER_14_DAYS;
      case 'AFTER_30_DAYS':
        return efs.LifecyclePolicy.AFTER_30_DAYS;
      case 'AFTER_60_DAYS':
        return efs.LifecyclePolicy.AFTER_60_DAYS;
      case 'AFTER_90_DAYS':
        return efs.LifecyclePolicy.AFTER_90_DAYS;
      default:
        return undefined;
    }
  }

  private mapOutOfIAPolicy(policy?: EfsFilesystemConfig['lifecycle']['transitionToPrimary']): efs.OutOfInfrequentAccessPolicy | undefined {
    return policy === 'AFTER_1_ACCESS' ? efs.OutOfInfrequentAccessPolicy.AFTER_1_ACCESS : undefined;
  }

  private mapRemovalPolicy(policy: 'retain' | 'destroy'): cdk.RemovalPolicy {
    return policy === 'destroy' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;
  }

  private mapComparisonOperator(operator: string): cloudwatch.ComparisonOperator {
    switch (operator) {
      case 'lt':
        return cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;
      case 'lte':
        return cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'gte':
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'gt':
      default:
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
    }
  }

  private mapTreatMissingData(mode: string): cloudwatch.TreatMissingData {
    switch (mode) {
      case 'breaching':
        return cloudwatch.TreatMissingData.BREACHING;
      case 'ignore':
        return cloudwatch.TreatMissingData.IGNORE;
      case 'missing':
        return cloudwatch.TreatMissingData.MISSING;
      default:
        return cloudwatch.TreatMissingData.NOT_BREACHING;
    }
  }

  private metricDimensions(storageClass?: string): Record<string, string> {
    const dimensions: Record<string, string> = {
      FileSystemId: this.fileSystem!.fileSystemId
    };

    if (storageClass) {
      dimensions.StorageClass = storageClass;
    }

    return dimensions;
  }

  private generateLogGroupName(suffix: string): string {
    return `/aws/efs/${this.config!.fileSystemName}/${suffix}`;
  }

  private toPascalCase(value: string): string {
    return value.replace(/(^|[-_\s])(\w)/g, (_, __, char) => char.toUpperCase());
  }

  private toKebabCase(value: string): string {
    return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  private logHardeningProfile(): void {
    this.logComplianceEvent('hardening_profile_applied', 'Applied EFS hardening profile', {
      hardeningProfile: this.config!.hardeningProfile
    });
  }
}
