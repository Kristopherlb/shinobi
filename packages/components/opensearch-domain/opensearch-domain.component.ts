import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';
import {
  OpenSearchDomainComponentConfigBuilder,
  OpenSearchDomainConfig,
  OpenSearchAlarmConfig,
  OpenSearchLogConfig
} from './opensearch-domain.builder';

interface LoggingResources {
  slowSearch?: logs.ILogGroup;
  slowIndex?: logs.ILogGroup;
  application?: logs.ILogGroup;
  audit?: logs.ILogGroup;
}

export class OpenSearchDomainComponent extends Component {
  private domain?: opensearch.Domain;
  private vpc?: ec2.IVpc;
  private managedSecurityGroup?: ec2.SecurityGroup;
  private config?: OpenSearchDomainConfig;
  private createdLogGroups: Record<string, logs.LogGroup> = {};

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    const startTime = Date.now();
    this.logComponentEvent('synthesis_start', 'Starting OpenSearch domain synthesis');

    try {
      const builder = new OpenSearchDomainComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.logComponentEvent('config_resolved', 'Resolved OpenSearch domain configuration', {
        domainName: this.config.domainName,
        version: this.config.version,
        dataNodes: this.config.cluster.instanceCount,
        hardeningProfile: this.config.hardeningProfile
      });

      this.resolveVpc();
      this.createSecurityGroupIfNeeded();
      const loggingResources = this.configureLogging();
      this.createDomain(loggingResources);
      this.applyStandardTags(this.domain!, {
        'domain-name': this.config.domainName,
        'opensearch-version': this.config.version,
        'hardening-profile': this.config.hardeningProfile
      });

      this.configureMonitoring();
      this.logHardeningProfile();

      this.registerConstruct('main', this.domain!);
      this.registerConstruct('domain', this.domain!);
      if (this.managedSecurityGroup) {
        this.registerConstruct('securityGroup', this.managedSecurityGroup);
      }
      Object.entries(this.createdLogGroups).forEach(([key, logGroup]) => {
        this.registerConstruct(`logGroup:${key}`, logGroup);
      });

      this.registerCapability('search:opensearch', this.buildDomainCapability());

      this.logPerformanceMetric('component_synthesis', Date.now() - startTime, {
        resourcesCreated: Object.keys(this.capabilities).length
      });

      this.logComponentEvent('synthesis_complete', 'OpenSearch domain synthesis completed');
    } catch (error) {
      this.logError(error as Error, 'opensearch-domain synthesis');
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'opensearch-domain';
  }

  private resolveVpc(): void {
    if (!this.config?.vpc.enabled || !this.config.vpc.vpcId) {
      return;
    }

    this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: this.config.vpc.vpcId
    });
  }

  private createSecurityGroupIfNeeded(): void {
    if (!this.vpc || !this.config?.vpc.createSecurityGroup) {
      return;
    }

    const securityGroup = new ec2.SecurityGroup(this, 'OpenSearchSecurityGroup', {
      vpc: this.vpc,
      description: `Security group for ${this.config.domainName} OpenSearch domain`,
      allowAllOutbound: true
    });

    this.config.vpc.ingressRules.forEach(rule => {
      const port = rule.protocol === 'udp' ? ec2.Port.udp(rule.port) : ec2.Port.tcp(rule.port);
      securityGroup.addIngressRule(ec2.Peer.ipv4(rule.cidr), port, rule.description);
    });

    this.applyStandardTags(securityGroup, {
      'resource-type': 'security-group',
      'opensearch-domain': this.config.domainName
    });

    this.logResourceCreation('security-group', securityGroup.securityGroupId);
    this.managedSecurityGroup = securityGroup;
  }

  private configureLogging(): LoggingResources {
    if (!this.config) {
      return {};
    }

    const logging: LoggingResources = {};

    logging.slowSearch = this.prepareLogGroup('slow-search', this.config.logging.slowSearch);
    logging.slowIndex = this.prepareLogGroup('slow-index', this.config.logging.slowIndex);
    logging.application = this.prepareLogGroup('application', this.config.logging.application);
    logging.audit = this.prepareLogGroup('audit', this.config.logging.audit);

    return logging;
  }

  private prepareLogGroup(key: string, config: OpenSearchLogConfig): logs.ILogGroup | undefined {
    if (!config.enabled) {
      return undefined;
    }

    if (!config.createLogGroup && config.logGroupName) {
      return logs.LogGroup.fromLogGroupName(this, `${key}LogGroupImported`, config.logGroupName);
    }

    const logGroupName = config.logGroupName ?? this.generateLogGroupName(key);
    const logGroup = new logs.LogGroup(this, `${this.toPascalCase(key)}LogGroup`, {
      logGroupName,
      retention: this.mapRetention(config.retentionInDays ?? 90),
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

  private createDomain(logging: LoggingResources): void {
    if (!this.config) {
      throw new Error('OpenSearch configuration is not initialised');
    }

    const capacity: opensearch.CapacityConfig = {
      dataNodes: this.config.cluster.instanceCount,
      dataNodeInstanceType: this.config.cluster.instanceType,
      masterNodes: this.config.cluster.dedicatedMasterEnabled ? this.config.cluster.masterInstanceCount : undefined,
      masterNodeInstanceType: this.config.cluster.dedicatedMasterEnabled ? this.config.cluster.masterInstanceType : undefined,
      warmNodes: this.config.cluster.warmEnabled ? this.config.cluster.warmInstanceCount : undefined,
      warmInstanceType: this.config.cluster.warmEnabled ? this.config.cluster.warmInstanceType : undefined
    };

    const zoneAwareness: opensearch.ZoneAwarenessConfig | undefined = this.config.cluster.zoneAwarenessEnabled
      ? {
          enabled: true,
          availabilityZoneCount: this.config.cluster.availabilityZoneCount
        }
      : undefined;

    const ebsOptions: opensearch.EbsOptions | undefined = this.config.ebs.enabled
      ? {
          enabled: true,
          volumeType: this.mapVolumeType(this.config.ebs.volumeType),
          volumeSize: this.config.ebs.volumeSize,
          iops: this.config.ebs.iops,
          throughput: this.config.ebs.throughput
        }
      : undefined;

    const domainProps: opensearch.DomainProps = {
      domainName: this.config.domainName,
      version: this.mapEngineVersion(this.config.version),
      capacity,
      zoneAwareness,
      ebs: ebsOptions,
      vpc: this.vpc,
      securityGroups: this.buildSecurityGroups(),
      vpcSubnets: this.buildVpcSubnets(),
      encryptionAtRest: this.buildEncryptionAtRestOptions(),
      nodeToNodeEncryption: this.config.encryption.nodeToNode,
      enforceHttps: this.config.domainEndpoint.enforceHttps,
      tlsSecurityPolicy: this.mapTlsSecurityPolicy(this.config.domainEndpoint.tlsSecurityPolicy),
      fineGrainedAccessControl: this.buildAdvancedSecurityOptions(),
      logging: this.buildLoggingOptions(logging),
      accessPolicies: this.buildAccessPolicies(),
      advancedOptions: this.config.advancedOptions,
      removalPolicy: this.mapRemovalPolicy(this.config.removalPolicy),
      offPeakWindowEnabled: this.config.maintenance.offPeakWindowEnabled,
      automatedSnapshotStartHour: this.config.snapshot.automatedSnapshotStartHour
    };

    this.domain = new opensearch.Domain(this, 'OpenSearchDomain', domainProps);

    this.logResourceCreation('opensearch-domain', this.domain.domainArn, {
      domainName: this.config.domainName,
      version: this.config.version,
      dataNodes: this.config.cluster.instanceCount
    });
  }

  private buildSecurityGroups(): ec2.ISecurityGroup[] | undefined {
    if (!this.config?.vpc.enabled) {
      return undefined;
    }

    const groups: ec2.ISecurityGroup[] = [];
    if (this.managedSecurityGroup) {
      groups.push(this.managedSecurityGroup);
    }

    this.config.vpc.securityGroupIds.forEach((securityGroupId, index) => {
      groups.push(ec2.SecurityGroup.fromSecurityGroupId(this, `ImportedSecurityGroup${index}`, securityGroupId));
    });

    return groups.length > 0 ? groups : undefined;
  }

  private buildVpcSubnets(): ec2.SubnetSelection[] | undefined {
    if (!this.config?.vpc.enabled) {
      return undefined;
    }

    if (this.config.vpc.subnetIds.length > 0) {
      const subnets = this.config.vpc.subnetIds.map((subnetId, index) =>
        ec2.Subnet.fromSubnetId(this, `VpcSubnet${index}`, subnetId)
      );

      return [{ subnets }];
    }

    if (this.vpc) {
      return [{ subnets: this.vpc.privateSubnets }];
    }

    return undefined;
  }

  private buildEncryptionAtRestOptions(): opensearch.EncryptionAtRestOptions | undefined {
    if (!this.config?.encryption.atRest.enabled) {
      return undefined;
    }

    let kmsKey: kms.IKey | undefined;
    if (this.config.encryption.atRest.kmsKeyArn) {
      kmsKey = kms.Key.fromKeyArn(this, 'OpenSearchEncryptionKey', this.config.encryption.atRest.kmsKeyArn);
    }

    return {
      enabled: true,
      kmsKey
    };
  }

  private buildAdvancedSecurityOptions(): opensearch.AdvancedSecurityOptions | undefined {
    if (!this.config?.advancedSecurity.enabled) {
      return undefined;
    }

    const masterUserPassword = this.config.advancedSecurity.masterUserPasswordSecretArn
      ? cdk.SecretValue.secretsManager(this.config.advancedSecurity.masterUserPasswordSecretArn)
      : this.config.advancedSecurity.masterUserPassword
        ? cdk.SecretValue.unsafePlainText(this.config.advancedSecurity.masterUserPassword)
        : undefined;

    return {
      masterUserName: this.config.advancedSecurity.masterUserName,
      masterUserPassword,
      internalUserDatabaseEnabled: this.config.advancedSecurity.internalUserDatabaseEnabled
    };
  }

  private buildLoggingOptions(logging: LoggingResources): opensearch.LoggingOptions | undefined {
    const options: opensearch.LoggingOptions = {
      slowSearchLogEnabled: this.config?.logging.slowSearch.enabled,
      slowSearchLogGroup: logging.slowSearch,
      slowIndexLogEnabled: this.config?.logging.slowIndex.enabled,
      slowIndexLogGroup: logging.slowIndex,
      appLogEnabled: this.config?.logging.application.enabled,
      appLogGroup: logging.application,
      auditLogEnabled: this.config?.logging.audit.enabled,
      auditLogGroup: logging.audit
    };

    return Object.values(options).some(value => value) ? options : undefined;
  }

  private buildAccessPolicies(): iam.PolicyStatement[] | undefined {
    if (!this.config || this.config.accessPolicies.statements.length === 0) {
      return undefined;
    }

    return this.config.accessPolicies.statements.map((statement, index) => {
      const principals = statement.principals?.map(principal =>
        principal.startsWith('arn:') ? new iam.ArnPrincipal(principal) : new iam.ServicePrincipal(principal)
      );

      return new iam.PolicyStatement({
        sid: `Statement${index}`,
        effect: statement.effect === 'Allow' ? iam.Effect.ALLOW : iam.Effect.DENY,
        actions: statement.actions,
        resources: statement.resources && statement.resources.length > 0 ? statement.resources : undefined,
        principals,
        conditions: statement.conditions && Object.keys(statement.conditions).length > 0 ? statement.conditions : undefined
      });
    });
  }

  private configureMonitoring(): void {
    if (!this.config?.monitoring.enabled) {
      return;
    }

    const alarms: Array<{ id: string; config: OpenSearchAlarmConfig; metric: cloudwatch.Metric; defaultThreshold: number }> = [
      {
        id: 'ClusterStatusRedAlarm',
        config: this.config.monitoring.alarms.clusterStatusRed,
        defaultThreshold: 0,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ES',
          metricName: 'ClusterStatus.red',
          statistic: this.config.monitoring.alarms.clusterStatusRed.statistic ?? 'Maximum',
          dimensionsMap: this.metricDimensions(),
          period: cdk.Duration.minutes(this.config.monitoring.alarms.clusterStatusRed.periodMinutes ?? 5)
        })
      },
      {
        id: 'ClusterStatusYellowAlarm',
        config: this.config.monitoring.alarms.clusterStatusYellow,
        defaultThreshold: 0,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ES',
          metricName: 'ClusterStatus.yellow',
          statistic: this.config.monitoring.alarms.clusterStatusYellow.statistic ?? 'Maximum',
          dimensionsMap: this.metricDimensions(),
          period: cdk.Duration.minutes(this.config.monitoring.alarms.clusterStatusYellow.periodMinutes ?? 5)
        })
      },
      {
        id: 'JvmMemoryPressureAlarm',
        config: this.config.monitoring.alarms.jvmMemoryPressure,
        defaultThreshold: 80,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ES',
          metricName: 'JVMMemoryPressure',
          statistic: this.config.monitoring.alarms.jvmMemoryPressure.statistic ?? 'Maximum',
          dimensionsMap: this.metricDimensions(),
          period: cdk.Duration.minutes(this.config.monitoring.alarms.jvmMemoryPressure.periodMinutes ?? 5)
        })
      },
      {
        id: 'FreeStorageSpaceAlarm',
        config: this.config.monitoring.alarms.freeStorageSpace,
        defaultThreshold: 20,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ES',
          metricName: 'FreeStorageSpace',
          statistic: this.config.monitoring.alarms.freeStorageSpace.statistic ?? 'Minimum',
          dimensionsMap: this.metricDimensions(),
          period: cdk.Duration.minutes(this.config.monitoring.alarms.freeStorageSpace.periodMinutes ?? 5)
        })
      }
    ];

    alarms.forEach(alarmDefinition => {
      if (!alarmDefinition.config.enabled) {
        return;
      }

      const alarm = new cloudwatch.Alarm(this, alarmDefinition.id, {
        alarmName: `${this.context.serviceName}-${this.spec.name}-${this.toKebabCase(alarmDefinition.id)}`,
        alarmDescription: `OpenSearch ${this.spec.name} alarm for ${alarmDefinition.id}`,
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

    this.logComponentEvent('observability_configured', 'Configured OpenSearch monitoring alarms', {
      domainName: this.config.domainName,
      monitoringEnabled: true
    });
  }

  private buildDomainCapability(): Record<string, any> {
    return {
      domainArn: this.domain!.domainArn,
      domainName: this.config!.domainName,
      endpoint: this.domain!.domainEndpoint,
      version: this.config!.version,
      hardeningProfile: this.config!.hardeningProfile,
      dataNodes: this.config!.cluster.instanceCount,
      instanceType: this.config!.cluster.instanceType,
      monitoringEnabled: this.config!.monitoring.enabled
    };
  }

  private logHardeningProfile(): void {
    this.logComplianceEvent('hardening_profile_applied', 'Applied OpenSearch hardening profile', {
      hardeningProfile: this.config!.hardeningProfile
    });
  }

  private generateLogGroupName(suffix: string): string {
    return `/aws/opensearch/${this.config!.domainName}/${suffix}`;
  }

  private metricDimensions(): Record<string, string> {
    return {
      DomainName: this.config!.domainName,
      ClientId: this.context.account ?? this.context.accountId ?? this.context.serviceName
    };
  }

  private mapVolumeType(volumeType: string): ec2.EbsDeviceVolumeType {
    switch (volumeType) {
      case 'gp2':
        return ec2.EbsDeviceVolumeType.GP2;
      case 'io1':
        return ec2.EbsDeviceVolumeType.IO1;
      case 'io2':
        return ec2.EbsDeviceVolumeType.IO2;
      default:
        return ec2.EbsDeviceVolumeType.GP3;
    }
  }

  private mapEngineVersion(version: string): opensearch.EngineVersion {
    switch (version) {
      case 'OpenSearch_1.3':
        return opensearch.EngineVersion.OPENSEARCH_1_3;
      case 'OpenSearch_2.3':
        return opensearch.EngineVersion.OPENSEARCH_2_3;
      case 'OpenSearch_2.5':
        return opensearch.EngineVersion.OPENSEARCH_2_5;
      default:
        return opensearch.EngineVersion.OPENSEARCH_2_7;
    }
  }

  private mapTlsSecurityPolicy(policy: string): opensearch.TLSSecurityPolicy {
    return policy === 'Policy-Min-TLS-1-0-2019-07'
      ? opensearch.TLSSecurityPolicy.TLS_1_0
      : opensearch.TLSSecurityPolicy.TLS_1_2;
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

  private mapRetention(days: number): logs.RetentionDays {
    switch (days) {
      case 1:
        return logs.RetentionDays.ONE_DAY;
      case 3:
        return logs.RetentionDays.THREE_DAYS;
      case 5:
        return logs.RetentionDays.FIVE_DAYS;
      case 7:
        return logs.RetentionDays.ONE_WEEK;
      case 14:
        return logs.RetentionDays.TWO_WEEKS;
      case 30:
        return logs.RetentionDays.ONE_MONTH;
      case 60:
        return logs.RetentionDays.TWO_MONTHS;
      case 90:
        return logs.RetentionDays.THREE_MONTHS;
      case 120:
        return logs.RetentionDays.FOUR_MONTHS;
      case 150:
        return logs.RetentionDays.FIVE_MONTHS;
      case 180:
        return logs.RetentionDays.SIX_MONTHS;
      case 365:
        return logs.RetentionDays.ONE_YEAR;
      case 400:
        return logs.RetentionDays.THIRTEEN_MONTHS;
      case 545:
        return logs.RetentionDays.EIGHTEEN_MONTHS;
      case 731:
        return logs.RetentionDays.TWO_YEARS;
      case 1827:
        return logs.RetentionDays.FIVE_YEARS;
      case 3650:
        return logs.RetentionDays.TEN_YEARS;
      default:
        return days > 3650 ? logs.RetentionDays.INFINITE : logs.RetentionDays.THREE_MONTHS;
    }
  }

  private mapRemovalPolicy(removalPolicy: 'retain' | 'destroy'): cdk.RemovalPolicy {
    return removalPolicy === 'retain' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
  }

  private toPascalCase(value: string): string {
    return value.replace(/(^|[-_\s])(\w)/g, (_, __, char) => char.toUpperCase());
  }

  private toKebabCase(value: string): string {
    return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
