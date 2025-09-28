/**
 * RDS PostgreSQL Component
 *
 * A managed PostgreSQL relational database with comprehensive controls that are
 * fully driven by configuration defaults supplied via the ConfigBuilder. The
 * component no longer embeds compliance-specific decision trees; instead it
 * consumes the resolved configuration and applies infrastructure as code
 * accordingly.
 */

import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
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
  RdsPostgresComponentConfigBuilder,
  RdsPostgresConfig,
  RdsPostgresLogConfig,
  RdsPostgresMonitoringAlarmsConfig,
  RdsPostgresAlarmConfig
} from './rds-postgres.builder';

/**
 * RDS PostgreSQL Component implementing Component API Contract v1.0
 */
export class RdsPostgresComponent extends Component {
  private database?: rds.DatabaseInstance;
  private secret?: secretsmanager.Secret;
  private securityGroup?: ec2.SecurityGroup;
  private kmsKey?: kms.Key;
  private parameterGroup?: rds.ParameterGroup;
  private config?: RdsPostgresConfig;
  private vpc?: ec2.IVpc;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  private configureSecretRotation(): void {
    if (!this.database || !this.secret) {
      return;
    }

    const rotation = this.config?.rotation;
    if (!rotation?.enabled) {
      return;
    }

    const automaticallyAfter = cdk.Duration.days(rotation.scheduleInDays ?? 30);

    if (rotation.mode === 'multi-user') {
      this.database.addRotationMultiUser('DatabaseRotationMultiUser', {
        secret: this.secret,
        automaticallyAfter
      });
    } else {
      this.database.addRotationSingleUser({
        automaticallyAfter
      });
    }
  }

  private resolveLogRetention(days: number): logs.RetentionDays {
    const retentionMap = logs.RetentionDays as unknown as Record<number, logs.RetentionDays>;
    return retentionMap[days] ?? logs.RetentionDays.THREE_MONTHS;
  }

  private resolveComparisonOperator(value?: string): cloudwatch.ComparisonOperator {
    switch (value) {
      case 'gt':
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
      case 'lt':
        return cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;
      case 'lte':
        return cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'gte':
      default:
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
    }
  }

  private resolveTreatMissingData(value?: string): cloudwatch.TreatMissingData {
    switch (value) {
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

  /**
   * Synthesis phase - create RDS PostgreSQL database using resolved configuration
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting RDS Postgres component synthesis', {
      component: this.spec.name
    });

    const startTime = Date.now();

    try {
      const configBuilder = new RdsPostgresComponentConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();

      this.logComponentEvent('config_built', 'Resolved RDS Postgres configuration', {
        dbName: this.config.dbName,
        instanceType: this.config.instance?.instanceType,
        multiAz: this.config.instance?.multiAz ?? false
      });

      this.createKmsKeyIfNeeded();
      this.createDatabaseSecret();
      this.createParameterGroupFromConfig();
      this.createSecurityGroup();
      this.createDatabaseInstance();
      this.configureSecretRotation();
      this.configureLogGroups();
      this.configureMonitoringAlarms();
      this.configureObservabilityForDatabase();

      this.registerConstruct('database', this.database!);
      this.registerConstruct('secret', this.secret!);
      this.registerConstruct('securityGroup', this.securityGroup!);
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }
      if (this.parameterGroup) {
        this.registerConstruct('parameterGroup', this.parameterGroup);
      }

      this.registerCapability('db:postgres', this.buildDatabaseCapability());

      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });

      this.logComponentEvent('synthesis_complete', 'RDS Postgres component synthesis completed successfully', {
        databaseCreated: !!this.database,
        secretCreated: !!this.secret,
        kmsKeyCreated: !!this.kmsKey,
        parameterGroupCreated: !!this.parameterGroup
      });
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'rds-postgres',
        stage: 'synthesis'
      });
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
    return 'rds-postgres';
  }

  /**
   * Create KMS key for encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    const encryption = this.config?.encryption;
    if (!encryption?.enabled) {
      if (encryption?.kmsKeyArn) {
        this.kmsKey = kms.Key.fromKeyArn(this, 'ImportedEncryptionKey', encryption.kmsKeyArn);
      }
      return;
    }

    if (encryption?.kmsKeyArn) {
      this.kmsKey = kms.Key.fromKeyArn(this, 'ImportedEncryptionKey', encryption.kmsKeyArn);
      return;
    }

    if (!encryption?.customerManagedKey?.create) {
      this.kmsKey = undefined;
      return;
    }

    this.kmsKey = new kms.Key(this, 'EncryptionKey', {
      description: `Encryption key for ${this.spec.name} PostgreSQL database`,
      enableKeyRotation: encryption.customerManagedKey.enableRotation ?? false,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
    });

    this.applyStandardTags(this.kmsKey, {
      'key-usage': 'rds-encryption',
      'key-rotation-enabled': (encryption.customerManagedKey.enableRotation ?? false).toString()
    });

    this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowRDSService',
      principals: [new iam.ServicePrincipal('rds.amazonaws.com')],
      actions: [
        'kms:Decrypt',
        'kms:GenerateDataKey*',
        'kms:CreateGrant',
        'kms:DescribeKey'
      ],
      resources: ['*']
    }));
  }

  /**
   * Create database secret with generated password
   */
  private createDatabaseSecret(): void {
    this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      description: `Database credentials for ${this.config!.dbName}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: this.config!.username }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        requireEachIncludedType: true,
        passwordLength: 32
      },
      encryptionKey: this.kmsKey
    });
    
    // Apply standard tags to secret
    this.applyStandardTags(this.secret, {
      'secret-type': 'database-credentials',
      'database-name': this.config!.dbName
    });
  }

  /**
   * Create parameter group for STIG compliance in FedRAMP High
   */
  private createParameterGroupFromConfig(): void {
    const parameterGroupConfig = this.config?.parameterGroup;
    if (!parameterGroupConfig?.enabled) {
      this.parameterGroup = undefined;
      return;
    }

    this.parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: this.resolveEngineVersion()
      }),
      description: parameterGroupConfig.description ?? `Parameter group for ${this.spec.name}`,
      parameters: parameterGroupConfig.parameters ?? {}
    });

    this.applyStandardTags(this.parameterGroup, {
      'parameter-group': this.parameterGroup.parameterGroupName,
      'database-engine': 'postgres'
    });
  }

  /**
   * Create security group for database access
   */
  private createSecurityGroup(): void {
    const networking = this.config?.networking ?? {};

    if (networking.vpcId) {
      this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: networking.vpcId });
    } else if (networking.useDefaultVpc ?? true) {
      this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true });
    } else {
      throw new Error('RDS Postgres component requires networking.vpcId or useDefaultVpc to be true.');
    }

    this.securityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: `Security group for ${this.config!.dbName} PostgreSQL database`,
      allowAllOutbound: false
    });

    this.applyStandardTags(this.securityGroup, {
      'security-group-type': 'database',
      'database-engine': 'postgres'
    });

    const ingressCidrs = networking.ingressCidrs ?? [];
    const port = networking.port ?? 5432;

    if (ingressCidrs.length === 0 && this.vpc) {
      this.securityGroup.addIngressRule(
        ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
        ec2.Port.tcp(port),
        'Default PostgreSQL access from VPC'
      );
    } else {
      ingressCidrs.forEach((cidr, index) => {
        this.securityGroup!.addIngressRule(
          ec2.Peer.ipv4(cidr),
          ec2.Port.tcp(port),
          `Configured PostgreSQL access ${index + 1}`
        );
      });
    }
  }

  /**
   * Create the RDS database instance
   */
  private createDatabaseInstance(): void {
    if (!this.vpc) {
      throw new Error('RDS Postgres component attempted to create a database before the VPC was initialised.');
    }

    const instanceConfig = this.config!.instance ?? {};
    const backupConfig = this.config!.backup ?? {};
    const monitoringConfig = this.config!.monitoring ?? {};
    const encryptionEnabled = this.config!.encryption?.enabled ?? false;

    const monitoringInterval = monitoringConfig.enhancedMonitoring?.enabled
      ? cdk.Duration.seconds(monitoringConfig.enhancedMonitoring.intervalSeconds ?? 60)
      : undefined;

    const performanceInsightsEnabled = monitoringConfig.performanceInsights?.enabled ?? false;
    const performanceInsightsRetention = performanceInsightsEnabled
      ? this.resolvePerformanceInsightsRetention()
      : undefined;

    const performanceInsightsKey = (monitoringConfig.performanceInsights?.useCustomerManagedKey ?? false)
      ? this.kmsKey
      : undefined;

    const props: rds.DatabaseInstanceProps = {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: this.resolveEngineVersion()
      }),
      instanceType: new ec2.InstanceType(instanceConfig.instanceType ?? 't3.micro'),
      credentials: rds.Credentials.fromSecret(this.secret!),
      vpc: this.vpc,
      securityGroups: [this.securityGroup!],
      databaseName: this.config!.dbName,
      allocatedStorage: instanceConfig.allocatedStorage ?? 20,
      maxAllocatedStorage: instanceConfig.maxAllocatedStorage,
      storageEncrypted: encryptionEnabled,
      storageEncryptionKey: this.kmsKey,
      backupRetention: cdk.Duration.days(backupConfig.retentionDays ?? 7),
      copyTagsToSnapshot: backupConfig.copyTagsToSnapshots ?? true,
      preferredBackupWindow: backupConfig.preferredWindow,
      deleteAutomatedBackups: false,
      deletionProtection: instanceConfig.deletionProtection ?? false,
      multiAz: instanceConfig.multiAz ?? false,
      parameterGroup: this.parameterGroup,
      monitoringInterval,
      enablePerformanceInsights: performanceInsightsEnabled,
      performanceInsightRetention: performanceInsightsRetention,
      performanceInsightEncryptionKey: performanceInsightsKey,
      iamAuthentication: this.config?.security?.iamAuthentication ?? false,
      removalPolicy: (instanceConfig.removalPolicy ?? 'destroy') === 'retain'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      publiclyAccessible: instanceConfig.publiclyAccessible ?? false,
      cloudwatchLogsExports: this.config?.observability?.logExports
    };

    this.database = new rds.DatabaseInstance(this, 'Database', props);

    this.applyStandardTags(this.database, {
      'database-name': this.config!.dbName,
      'database-engine': 'postgres',
      'database-version': this.config!.instance?.engineVersion ?? '15.4',
      'instance-type': instanceConfig.instanceType ?? 't3.micro',
      'multi-az': (instanceConfig.multiAz ?? false).toString(),
      'backup-retention-days': (backupConfig.retentionDays ?? 7).toString()
    });

    this.logResourceCreation('rds-postgres-instance', this.database.instanceIdentifier, {
      dbName: this.config!.dbName,
      engine: 'postgres',
      instanceType: instanceConfig.instanceType ?? 't3.micro',
      multiAz: instanceConfig.multiAz ?? false,
      encryptionEnabled,
      performanceInsightsEnabled
    });
  }

  private configureLogGroups(): void {
    if (!this.database) {
      return;
    }

    const logging = this.config?.logging;
    this.createLogGroupFromConfig('DatabaseLogs', logging?.database, 'database');
    this.createLogGroupFromConfig('AuditLogs', logging?.audit, 'audit');
  }

  private configureMonitoringAlarms(): void {
    if (!this.database) {
      return;
    }

    const alarms = this.config?.monitoring?.alarms ?? {} as RdsPostgresMonitoringAlarmsConfig;
    const dbIdentifier = this.database.instanceIdentifier;

    this.createAlarmFromConfig(
      'CpuUtilizationAlarm',
      alarms.cpuUtilization,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-db-cpu`,
        metricName: 'CPUUtilization',
        namespace: 'AWS/RDS',
        dimensions: { DBInstanceIdentifier: dbIdentifier }
      }
    );

    this.createAlarmFromConfig(
      'DatabaseConnectionsAlarm',
      alarms.databaseConnections,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-db-connections`,
        metricName: 'DatabaseConnections',
        namespace: 'AWS/RDS',
        dimensions: { DBInstanceIdentifier: dbIdentifier }
      }
    );

    this.createAlarmFromConfig(
      'FreeStorageSpaceAlarm',
      alarms.freeStorageSpaceBytes,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-db-storage`,
        metricName: 'FreeStorageSpace',
        namespace: 'AWS/RDS',
        dimensions: { DBInstanceIdentifier: dbIdentifier }
      }
    );
  }

  private createAlarmFromConfig(
    id: string,
    alarmConfig: RdsPostgresAlarmConfig | undefined,
    options: { alarmName: string; metricName: string; namespace: string; dimensions: Record<string, string> }
  ): void {
    if (!alarmConfig?.enabled) {
      return;
    }

    const period = cdk.Duration.minutes(alarmConfig.periodMinutes ?? 5);
    const metric = new cloudwatch.Metric({
      namespace: options.namespace,
      metricName: options.metricName,
      dimensionsMap: options.dimensions,
      statistic: alarmConfig.statistic ?? 'Average',
      period
    });

    const alarm = new cloudwatch.Alarm(this, id, {
      alarmName: options.alarmName,
      alarmDescription: `${options.metricName} alarm for ${this.spec.name}`,
      metric,
      threshold: alarmConfig.threshold ?? 0,
      evaluationPeriods: alarmConfig.evaluationPeriods ?? 1,
      comparisonOperator: this.resolveComparisonOperator(alarmConfig.comparisonOperator),
      treatMissingData: this.resolveTreatMissingData(alarmConfig.treatMissingData)
    });

    this.applyStandardTags(alarm, {
      'alarm-metric': options.metricName,
      ...(alarmConfig.tags ?? {})
    });

    this.registerConstruct(`${id}Construct`, alarm);
  }

  private createLogGroupFromConfig(
    id: string,
    logConfig: RdsPostgresLogConfig | undefined,
    logType: string
  ): void {
    if (!logConfig?.enabled) {
      return;
    }

    const logGroupName = logConfig.logGroupName
      ?? `/aws/rds/instance/${this.database!.instanceIdentifier}/${logType}`;

    const logGroup = new logs.LogGroup(this, id, {
      logGroupName,
      retention: logConfig.retentionInDays
        ? this.resolveLogRetention(logConfig.retentionInDays)
        : undefined,
      removalPolicy: logConfig.removalPolicy === 'destroy'
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN
    });

    this.applyStandardTags(logGroup, {
      'log-type': logType,
      'database-name': this.config!.dbName,
      ...(logConfig.tags ?? {})
    });

    this.registerConstruct(`${logType}LogGroup`, logGroup);
  }

  /**
   * Build database capability data shape
   */
  private buildDatabaseCapability(): any {
    return {
      host: this.database!.instanceEndpoint.hostname,
      port: this.database!.instanceEndpoint.port,
      dbName: this.config!.dbName,
      secretArn: this.secret!.secretArn,
      sgId: this.securityGroup!.securityGroupId,
      instanceArn: this.database!.instanceArn,
      securityProfile: this.config!.hardeningProfile ?? 'baseline'
    };
  }

  /**
   * Configure OpenTelemetry observability for database monitoring according to Platform Observability Standard
   */
  private configureObservabilityForDatabase(): void {
    if (!this.database) {
      return;
    }

    const instanceConfig = this.config!.instance ?? {};
    const backupConfig = this.config!.backup ?? {};
    const monitoringConfig = this.config!.monitoring ?? {};

    this.configureObservability(this.database, {
      customAttributes: {
        'database.engine': 'postgres',
        'database.version': instanceConfig.engineVersion ?? '15.4',
        'database.name': this.config!.dbName,
        'database.instance.type': instanceConfig.instanceType ?? 't3.micro',
        'database.multi.az': (instanceConfig.multiAz ?? false).toString(),
        'database.backup.retention': (backupConfig.retentionDays ?? 7).toString(),
        'database.performance.insights': (monitoringConfig.performanceInsights?.enabled ?? false).toString()
      }
    });

    const cfnInstance = this.database.node.defaultChild as rds.CfnDBInstance;

    if (monitoringConfig.performanceInsights?.enabled ?? false) {
      cfnInstance.enablePerformanceInsights = true;
      cfnInstance.performanceInsightsRetentionPeriod = this.config!.monitoring!.performanceInsights!.retentionDays ?? 7;
      if ((monitoringConfig.performanceInsights?.useCustomerManagedKey ?? false) && this.kmsKey) {
        cfnInstance.performanceInsightsKmsKeyId = this.kmsKey.keyArn;
      }
    }

    if (monitoringConfig.enhancedMonitoring?.enabled ?? false) {
      cfnInstance.monitoringInterval = monitoringConfig.enhancedMonitoring.intervalSeconds ?? 60;
    } else {
      cfnInstance.monitoringInterval = 0;
    }

    if (this.config?.observability?.logExports?.length) {
      cfnInstance.enableCloudwatchLogsExports = this.config!.observability!.logExports!;
    }
  }


  private resolveEngineVersion(): rds.PostgresEngineVersion {
    const version = this.config?.instance?.engineVersion ?? '15.4';
    const major = version.split('.')[0] ?? '15';
    return rds.PostgresEngineVersion.of(version, major);
  }

  private resolvePerformanceInsightsRetention(): rds.PerformanceInsightRetention | undefined {
    if (!(this.config?.monitoring?.performanceInsights?.enabled ?? false)) {
      return undefined;
    }

    const days = this.config.monitoring.performanceInsights.retentionDays ?? 7;
    return days >= 2555
      ? rds.PerformanceInsightRetention.LONG_TERM
      : rds.PerformanceInsightRetention.DEFAULT;
  }
}
