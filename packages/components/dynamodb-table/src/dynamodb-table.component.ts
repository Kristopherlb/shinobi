import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as applicationautoscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as events from 'aws-cdk-lib/aws-events';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';
import {
  DynamoDbTableComponentConfigBuilder,
  DynamoDbTableConfig,
  DynamoDbMonitoringAlarmConfig,
  DynamoDbProvisionedThroughputConfig,
  DynamoDbGsiConfig
} from './dynamodb-table.builder.js';

export class DynamoDbTableComponent extends Component {
  private table?: dynamodb.Table;
  private kmsKey?: kms.IKey;
  private managedKmsKey?: kms.Key;
  private config?: DynamoDbTableConfig;
  private logger: any;
  private observabilityEnv?: Record<string, string>;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
    this.logger = this.getLogger();
  }

  public synth(): void {
    this.logger.info('Starting DynamoDB table synthesis', {
      context: { action: 'synthesis_start', resource: 'dynamodb_table' },
      data: {
        componentName: this.spec.name,
        componentType: this.getType(),
        environment: this.context.environment,
        complianceFramework: this.context.complianceFramework
      }
    });

    try {
      const builder = new DynamoDbTableComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.logger.info('Resolved DynamoDB table configuration', {
        context: { action: 'config_resolved', resource: 'dynamodb_table' },
        data: {
          tableName: this.config.tableName,
          billingMode: this.config.billingMode,
          pointInTimeRecovery: this.config.pointInTimeRecovery,
          tableClass: this.config.tableClass,
          encryption: this.config.encryption.type,
          monitoringEnabled: this.config.monitoring.enabled,
          hardeningProfile: this.config.hardeningProfile
        }
      });

      this.resolveEncryptionKey();
      this.createTable();
      this.configureMonitoring();
      this.configureObservabilityTelemetry();
      this.configureBackupPlan();

      this.registerConstruct('main', this.table!);
      this.registerConstruct('table', this.table!);
      if (this.managedKmsKey) {
        this.registerConstruct('kmsKey', this.managedKmsKey);
      }

      const capability = this.buildCapability();
      this.registerCapability('db:dynamodb', capability);
      this.registerCapability('dynamodb:table', capability);

      const indexCapabilities = this.buildIndexCapabilities();
      if (indexCapabilities.length > 0) {
        this.registerCapability('dynamodb:index', indexCapabilities);
      }

      const streamCapability = this.buildStreamCapability();
      if (streamCapability) {
        this.registerCapability('dynamodb:stream', streamCapability);
      }

      this.logger.info('DynamoDB table synthesis completed', {
        context: { action: 'synthesis_complete', resource: 'dynamodb_table' },
        data: {
          tableName: this.table!.tableName,
          tableArn: this.table!.tableArn,
          streamArn: this.table!.tableStreamArn,
          encryptionType: this.config.encryption.type,
          kmsKeyArn: this.kmsKey?.keyArn
        }
      });
    } catch (error) {
      this.logger.error('DynamoDB table synthesis failed', error as Error, {
        context: { action: 'synthesis_error', resource: 'dynamodb_table' },
        data: {
          componentName: this.spec.name,
          error: (error as Error).message
        }
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'dynamodb-table';
  }

  private resolveEncryptionKey(): void {
    this.kmsKey = undefined;
    this.managedKmsKey = undefined;

    const encryption = this.config!.encryption;
    if (encryption.type !== 'customer-managed') {
      return;
    }

    if (encryption.kmsKeyArn) {
      this.kmsKey = kms.Key.fromKeyArn(this, 'ImportedTableKey', encryption.kmsKeyArn);
      return;
    }

    if (encryption.customerManagedKey?.create) {
      const key = new kms.Key(this, 'DynamoDbTableKey', {
        description: `Customer managed key for ${this.spec.name} DynamoDB table`,
        enableKeyRotation: encryption.customerManagedKey.enableRotation ?? true
      });

      if (encryption.customerManagedKey.alias) {
        key.addAlias(encryption.customerManagedKey.alias);
      }

      this.applyStandardTags(key, {
        'resource-type': 'kms-key',
        'managed-by': 'shinobi'
      });

      this.kmsKey = key;
      this.managedKmsKey = key;
    }
  }

  private createTable(): void {
    const props: dynamodb.TableProps = {
      tableName: this.config!.tableName,
      partitionKey: this.mapAttribute(this.config!.partitionKey),
      billingMode: this.resolveBillingMode(),
      tableClass: this.resolveTableClass(),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: this.config!.pointInTimeRecovery
        ? { pointInTimeRecoveryEnabled: true }
        : undefined,
      contributorInsightsSpecification: this.config!.monitoring.enabled
        ? { enabled: true, mode: 'ACCESSED_AND_THROTTLED_KEYS' }
        : undefined
    };

    if (this.config!.sortKey) {
      props.sortKey = this.mapAttribute(this.config!.sortKey);
    }

    if (this.config!.billingMode === 'provisioned') {
      props.readCapacity = this.config!.provisioned?.readCapacity;
      props.writeCapacity = this.config!.provisioned?.writeCapacity;
    }

    props.encryption = this.config!.encryption.type === 'customer-managed'
      ? dynamodb.TableEncryption.CUSTOMER_MANAGED
      : dynamodb.TableEncryption.AWS_MANAGED;

    if (this.kmsKey) {
      props.encryptionKey = this.kmsKey;
    }

    if (this.config!.timeToLive?.enabled && this.config!.timeToLive.attributeName) {
      props.timeToLiveAttribute = this.config!.timeToLive.attributeName;
    }

    if (this.config!.stream?.enabled) {
      props.stream = this.resolveStreamView(this.config!.stream.viewType);
    }

    this.table = new dynamodb.Table(this, 'Table', props);

    const cfnTable = this.table.node.defaultChild as dynamodb.CfnTable;
    cfnTable.billingMode = this.config!.billingMode === 'provisioned' ? 'PROVISIONED' : 'PAY_PER_REQUEST';
    cfnTable.sseSpecification = {
      ...cfnTable.sseSpecification,
      sseEnabled: true,
      sseType: 'KMS'
    };

    this.applyStandardTags(this.table, {
      'resource-type': 'dynamodb-table',
      'billing-mode': this.config!.billingMode,
      'table-class': this.config!.tableClass,
      'hardening-profile': this.config!.hardeningProfile,
      ...this.config!.tags
    });

    this.addGlobalSecondaryIndexes();
    this.addLocalSecondaryIndexes();

    if (this.shouldConfigureAutoScaling()) {
      this.configureTableAutoScaling();
    }
  }

  private mapAttribute(attribute: { name: string; type: string }): dynamodb.Attribute {
    return {
      name: attribute.name,
      type: this.resolveAttributeType(attribute.type)
    };
  }

  private resolveAttributeType(type: string): dynamodb.AttributeType {
    switch (type) {
      case 'string':
        return dynamodb.AttributeType.STRING;
      case 'number':
        return dynamodb.AttributeType.NUMBER;
      case 'binary':
        return dynamodb.AttributeType.BINARY;
      default:
        throw new Error(`Unsupported attribute type: ${type}`);
    }
  }

  private resolveBillingMode(): dynamodb.BillingMode {
    return this.config!.billingMode === 'provisioned'
      ? dynamodb.BillingMode.PROVISIONED
      : dynamodb.BillingMode.PAY_PER_REQUEST;
  }

  private resolveTableClass(): dynamodb.TableClass {
    return this.config!.tableClass === 'infrequent-access'
      ? dynamodb.TableClass.STANDARD_INFREQUENT_ACCESS
      : dynamodb.TableClass.STANDARD;
  }

  private resolveStreamView(viewType: string): dynamodb.StreamViewType {
    switch (viewType) {
      case 'keys-only':
        return dynamodb.StreamViewType.KEYS_ONLY;
      case 'new-image':
        return dynamodb.StreamViewType.NEW_IMAGE;
      case 'old-image':
        return dynamodb.StreamViewType.OLD_IMAGE;
      case 'new-and-old-images':
      default:
        return dynamodb.StreamViewType.NEW_AND_OLD_IMAGES;
    }
  }

  private addGlobalSecondaryIndexes(): void {
    (this.config!.globalSecondaryIndexes ?? []).forEach((gsiConfig, index) => {
      this.table!.addGlobalSecondaryIndex({
        indexName: gsiConfig.indexName,
        partitionKey: this.mapAttribute(gsiConfig.partitionKey),
        sortKey: gsiConfig.sortKey ? this.mapAttribute(gsiConfig.sortKey) : undefined,
        projectionType: this.resolveProjectionType(gsiConfig.projectionType),
        nonKeyAttributes: gsiConfig.nonKeyAttributes,
        readCapacity: gsiConfig.provisioned?.readCapacity,
        writeCapacity: gsiConfig.provisioned?.writeCapacity
      });

      if (gsiConfig.provisioned) {
        this.configureGsiAutoScaling(this.config!.tableName, gsiConfig);
      }

      this.logComponentEvent('gsi_added', 'Added global secondary index to DynamoDB table', {
        indexName: gsiConfig.indexName,
        order: index + 1
      });
    });
  }

  private addLocalSecondaryIndexes(): void {
    (this.config!.localSecondaryIndexes ?? []).forEach((lsiConfig, index) => {
      this.table!.addLocalSecondaryIndex({
        indexName: lsiConfig.indexName,
        sortKey: this.mapAttribute(lsiConfig.sortKey),
        projectionType: this.resolveProjectionType(lsiConfig.projectionType),
        nonKeyAttributes: lsiConfig.nonKeyAttributes
      });

      this.logComponentEvent('lsi_added', 'Added local secondary index to DynamoDB table', {
        indexName: lsiConfig.indexName,
        order: index + 1
      });
    });
  }

  private resolveProjectionType(projectionType?: string): dynamodb.ProjectionType {
    switch (projectionType) {
      case 'keys-only':
        return dynamodb.ProjectionType.KEYS_ONLY;
      case 'include':
        return dynamodb.ProjectionType.INCLUDE;
      case 'all':
      default:
        return dynamodb.ProjectionType.ALL;
    }
  }

  private shouldConfigureAutoScaling(): boolean {
    return this.config!.billingMode === 'provisioned';
  }

  private configureTableAutoScaling(): void {
    if (!this.table || !this.config?.provisioned) {
      return;
    }

    this.configureReadAutoScaling(
      'table',
      `table/${this.table.tableName}`,
      this.config.provisioned,
      'dynamodb:table:ReadCapacityUnits'
    );
    this.configureWriteAutoScaling(
      'table',
      `table/${this.table.tableName}`,
      this.config.provisioned,
      'dynamodb:table:WriteCapacityUnits'
    );
  }

  private configureGsiAutoScaling(tableName: string, gsiConfig: DynamoDbGsiConfig): void {
    if (!gsiConfig.provisioned) {
      return;
    }

    const resourceId = `table/${tableName}/index/${gsiConfig.indexName}`;
    this.configureReadAutoScaling(
      `gsi-${gsiConfig.indexName}`,
      resourceId,
      gsiConfig.provisioned,
      'dynamodb:index:ReadCapacityUnits'
    );
    this.configureWriteAutoScaling(
      `gsi-${gsiConfig.indexName}`,
      resourceId,
      gsiConfig.provisioned,
      'dynamodb:index:WriteCapacityUnits'
    );
  }

  private configureReadAutoScaling(
    prefix: string,
    resourceId: string,
    provisioned: DynamoDbProvisionedThroughputConfig,
    dimension: string
  ): void {
    const target = new applicationautoscaling.ScalableTarget(this, `${prefix}-ReadCapacity`, {
      serviceNamespace: applicationautoscaling.ServiceNamespace.DYNAMODB,
      scalableDimension: dimension,
      resourceId,
      minCapacity: provisioned.autoScaling?.minReadCapacity ?? provisioned.readCapacity,
      maxCapacity: provisioned.autoScaling?.maxReadCapacity ?? provisioned.readCapacity * 10
    });

    target.scaleToTrackMetric(`${prefix}-ReadUtilization`, {
      targetValue: provisioned.autoScaling?.targetUtilizationPercent ?? 70,
      predefinedMetric: applicationautoscaling.PredefinedMetric.DYNAMODB_READ_CAPACITY_UTILIZATION,
      scaleInCooldown: cdk.Duration.minutes(1),
      scaleOutCooldown: cdk.Duration.minutes(1)
    });
  }

  private configureWriteAutoScaling(
    prefix: string,
    resourceId: string,
    provisioned: DynamoDbProvisionedThroughputConfig,
    dimension: string
  ): void {
    const target = new applicationautoscaling.ScalableTarget(this, `${prefix}-WriteCapacity`, {
      serviceNamespace: applicationautoscaling.ServiceNamespace.DYNAMODB,
      scalableDimension: dimension,
      resourceId,
      minCapacity: provisioned.autoScaling?.minWriteCapacity ?? provisioned.writeCapacity,
      maxCapacity: provisioned.autoScaling?.maxWriteCapacity ?? provisioned.writeCapacity * 10
    });

    target.scaleToTrackMetric(`${prefix}-WriteUtilization`, {
      targetValue: provisioned.autoScaling?.targetUtilizationPercent ?? 70,
      predefinedMetric: applicationautoscaling.PredefinedMetric.DYNAMODB_WRITE_CAPACITY_UTILIZATION,
      scaleInCooldown: cdk.Duration.minutes(1),
      scaleOutCooldown: cdk.Duration.minutes(1)
    });
  }

  private configureMonitoring(): void {
    const monitoring = this.config!.monitoring;
    if (!monitoring.enabled) {
      return;
    }

    this.createAlarm(
      'ReadThrottleAlarm',
      monitoring.alarms?.readThrottle,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-read-throttles`,
        metricName: 'ReadThrottledRequests',
        statistic: 'Sum'
      }
    );

    this.createAlarm(
      'ConsumedReadCapacityAlarm',
      monitoring.alarms?.consumedReadCapacity,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-consumed-read-capacity`,
        metricName: 'ConsumedReadCapacityUnits',
        statistic: 'Average'
      }
    );

    this.createAlarm(
      'WriteThrottleAlarm',
      monitoring.alarms?.writeThrottle,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-write-throttles`,
        metricName: 'WriteThrottledRequests',
        statistic: 'Sum'
      }
    );

    this.createAlarm(
      'ConsumedWriteCapacityAlarm',
      monitoring.alarms?.consumedWriteCapacity,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-consumed-write-capacity`,
        metricName: 'ConsumedWriteCapacityUnits',
        statistic: 'Average'
      }
    );

    this.createAlarm(
      'SystemErrorsAlarm',
      monitoring.alarms?.systemErrors,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-system-errors`,
        metricName: 'SystemErrors',
        statistic: 'Sum'
      }
    );
  }

  private createAlarm(
    id: string,
    alarmConfig: DynamoDbMonitoringAlarmConfig | undefined,
    options: { alarmName: string; metricName: string; statistic: string }
  ): void {
    if (!alarmConfig?.enabled) {
      return;
    }

    const metric = new cloudwatch.Metric({
      namespace: 'AWS/DynamoDB',
      metricName: options.metricName,
      dimensionsMap: {
        TableName: this.table!.tableName
      },
      statistic: alarmConfig.statistic ?? options.statistic,
      period: cdk.Duration.minutes(alarmConfig.periodMinutes ?? 5)
    });

    const alarm = new cloudwatch.Alarm(this, id, {
      alarmName: options.alarmName,
      alarmDescription: `${options.metricName} alarm for ${this.spec.name}`,
      metric,
      threshold: alarmConfig.threshold ?? 1,
      evaluationPeriods: alarmConfig.evaluationPeriods ?? 2,
      comparisonOperator: this.resolveComparisonOperator(alarmConfig.comparisonOperator),
      treatMissingData: this.resolveTreatMissingData(alarmConfig.treatMissingData)
    });

    this.applyStandardTags(alarm, {
      'alarm-metric': options.metricName.toLowerCase(),
      ...(alarmConfig.tags ?? {})
    });

    this.registerConstruct(`${id}Construct`, alarm);
  }

  private configureObservabilityTelemetry(): void {
    if (!this.table) {
      return;
    }

    this.observabilityEnv = this.configureObservability(this.table, {
      customAttributes: {
        'aws.dynamodb.table.name': this.table.tableName,
        'aws.dynamodb.billing_mode': this.config!.billingMode,
        'aws.dynamodb.encryption': this.config!.encryption.type,
        'aws.dynamodb.point_in_time_recovery': this.config!.pointInTimeRecovery ? 'true' : 'false'
      }
    });

    const dashboard = new cloudwatch.Dashboard(this, 'DynamoDbObservabilityDashboard', {
      dashboardName: `${this.context.serviceName}-${this.spec.name}-dynamodb`
    });

    this.applyStandardTags(dashboard, {
      'resource-type': 'cloudwatch-dashboard',
      ...this.config!.tags
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Consumed Capacity Units',
        left: [
          this.table.metricConsumedReadCapacityUnits({ label: 'Read Capacity Units' }),
          this.table.metricConsumedWriteCapacityUnits({ label: 'Write Capacity Units' })
        ]
      }),
      new cloudwatch.GraphWidget({
        title: 'Throttled Requests',
        left: [
          this.table.metric('ReadThrottleEvents', { label: 'Read Throttles', statistic: 'Sum' }),
          this.table.metric('WriteThrottleEvents', { label: 'Write Throttles', statistic: 'Sum' })
        ]
      }),
      new cloudwatch.GraphWidget({
        title: 'System Errors',
        left: [
          this.table.metric('SystemErrors', { label: 'System Errors', statistic: 'Sum' })
        ]
      }),
      new cloudwatch.GraphWidget({
        title: 'Item Count',
        left: [
          this.table.metric('ItemCount', { label: 'Item Count', statistic: 'Average' })
        ],
        statistic: 'Average'
      })
    );

    this.logComponentEvent('observability_configured', 'Configured observability dashboard for DynamoDB table', {
      dashboardName: `${this.context.serviceName}-${this.spec.name}-dynamodb`,
      monitoringEnabled: true
    });
  }

  private configureBackupPlan(): void {
    if (!this.table || !(this.config?.backup?.enabled ?? false)) {
      return;
    }

    const retentionDays = this.config!.backup.retentionDays ?? 35;
    const scheduleExpression = this.config!.backup.schedule
      ? events.Schedule.expression(this.config!.backup.schedule!)
      : events.Schedule.cron({ minute: '0', hour: '5' });

    const backupPlan = new backup.BackupPlan(this, 'DynamoDbBackupPlan', {
      backupPlanName: `${this.context.serviceName}-${this.spec.name}-backup-plan`,
      backupPlanRules: [
        new backup.BackupPlanRule({
          ruleName: `${this.spec.name}-daily`,
          scheduleExpression,
          deleteAfter: cdk.Duration.days(retentionDays)
        })
      ]
    });

    const backupSelection = backupPlan.addSelection('DynamoDbTableBackupSelection', {
      selectionName: `${this.spec.name}-table`,
      resources: [backup.BackupResource.fromDynamoDbTable(this.table)],
      allowRestores: true
    });

    this.applyStandardTags(backupPlan, {
      'resource-type': 'aws-backup-plan',
      ...this.config!.tags
    });

    this.applyStandardTags(backupSelection, {
      'resource-type': 'aws-backup-selection',
      ...this.config!.tags
    });

    this.registerConstruct('backupPlan', backupPlan);
    this.registerConstruct('backupSelection', backupSelection);

    this.logComponentEvent('backup_plan_configured', 'Configured AWS Backup plan for DynamoDB table', {
      retentionDays,
      scheduleExpression: scheduleExpression.expressionString
    });
  }

  private resolveComparisonOperator(operator?: string): cloudwatch.ComparisonOperator {
    switch (operator) {
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

  private buildCapability(): Record<string, any> {
    const keySchema = this.buildKeySchema();
    const attributeDefinitions = this.buildAttributeDefinitions();
    const cfnTable = this.table!.node.defaultChild as dynamodb.CfnTable;

    const streamLabel = this.table!.tableStreamArn
      ? this.table!.tableStreamArn.split('/').pop()
      : undefined;

    const sseSpecification = cfnTable.sseSpecification
      ? {
        sseEnabled: cfnTable.sseSpecification.sseEnabled,
        sseType: cfnTable.sseSpecification.sseType,
        kmsMasterKeyId: cfnTable.sseSpecification.kmsMasterKeyId
      }
      : undefined;

    const pointInTimeRecoverySpecification = cfnTable.pointInTimeRecoverySpecification
      ? {
        pointInTimeRecoveryEnabled: cfnTable.pointInTimeRecoverySpecification.pointInTimeRecoveryEnabled
      }
      : undefined;

    return {
      tableName: this.table!.tableName,
      tableArn: this.table!.tableArn,
      streamArn: this.table!.tableStreamArn,
      billingMode: this.config!.billingMode,
      tableClass: this.config!.tableClass,
      pointInTimeRecovery: this.config!.pointInTimeRecovery,
      encryption: this.config!.encryption.type,
      kmsKeyArn: this.kmsKey?.keyArn,
      hardeningProfile: this.config!.hardeningProfile,
      sseSpecification,
      pointInTimeRecoverySpecification,
      streamLabel,
      keySchema,
      attributeDefinitions,
      tags: this.config!.tags,
      observabilityEnv: this.observabilityEnv,
      backup: {
        enabled: this.config!.backup?.enabled ?? false,
        retentionDays: this.config!.backup?.retentionDays ?? 0
      }
    };
  }

  private buildKeySchema(): Array<{ attributeName: string; keyType: string }> {
    const schema: Array<{ attributeName: string; keyType: string }> = [
      {
        attributeName: this.config!.partitionKey.name,
        keyType: 'HASH'
      }
    ];

    if (this.config!.sortKey) {
      schema.push({
        attributeName: this.config!.sortKey.name,
        keyType: 'RANGE'
      });
    }

    return schema;
  }

  private buildAttributeDefinitions(): Array<{ attributeName: string; attributeType: string }> {
    const definitions = new Map<string, string>();

    const registerDefinition = (name: string, type: string) => {
      if (!definitions.has(name)) {
        definitions.set(name, this.resolveAttributeDefinitionType(type));
      }
    };

    registerDefinition(this.config!.partitionKey.name, this.config!.partitionKey.type);
    if (this.config!.sortKey) {
      registerDefinition(this.config!.sortKey.name, this.config!.sortKey.type);
    }

    (this.config!.globalSecondaryIndexes ?? []).forEach(index => {
      registerDefinition(index.partitionKey.name, index.partitionKey.type);
      if (index.sortKey) {
        registerDefinition(index.sortKey.name, index.sortKey.type);
      }
    });

    (this.config!.localSecondaryIndexes ?? []).forEach(index => {
      registerDefinition(index.sortKey.name, index.sortKey.type);
    });

    return Array.from(definitions.entries()).map(([attributeName, attributeType]) => ({
      attributeName,
      attributeType
    }));
  }

  private buildIndexCapabilities(): Array<Record<string, any>> {
    if (!this.table) {
      return [];
    }

    const indexes: Array<Record<string, any>> = [];
    const tableName = this.table.tableName;
    const region = this.context.region ?? 'us-east-1';
    const accountId = this.context.accountId ?? this.context.account ?? '000000000000';

    (this.config?.globalSecondaryIndexes ?? []).forEach(gsi => {
      indexes.push({
        indexName: gsi.indexName,
        indexArn: `arn:aws:dynamodb:${region}:${accountId}:table/${tableName}/index/${gsi.indexName}`,
        indexStatus: 'ACTIVE',
        indexType: 'GLOBAL',
        keySchema: [
          {
            attributeName: gsi.partitionKey.name,
            keyType: 'HASH'
          },
          ...(gsi.sortKey
            ? [{ attributeName: gsi.sortKey.name, keyType: 'RANGE' as const }]
            : [])
        ],
        projection: {
          projectionType: gsi.projectionType ?? 'all',
          nonKeyAttributes: gsi.nonKeyAttributes ?? []
        }
      });
    });

    (this.config?.localSecondaryIndexes ?? []).forEach(lsi => {
      indexes.push({
        indexName: lsi.indexName,
        indexArn: `arn:aws:dynamodb:${region}:${accountId}:table/${tableName}/index/${lsi.indexName}`,
        indexStatus: 'ACTIVE',
        indexType: 'LOCAL',
        keySchema: [
          {
            attributeName: this.config!.partitionKey.name,
            keyType: 'HASH'
          },
          {
            attributeName: lsi.sortKey.name,
            keyType: 'RANGE'
          }
        ],
        projection: {
          projectionType: lsi.projectionType ?? 'all',
          nonKeyAttributes: lsi.nonKeyAttributes ?? []
        }
      });
    });

    return indexes;
  }

  private buildStreamCapability(): Record<string, any> | undefined {
    if (!this.config?.stream?.enabled || !this.table?.tableStreamArn) {
      return undefined;
    }

    const streamArn = this.table.tableStreamArn;
    const streamLabel = streamArn.split('/').pop();

    return {
      streamArn,
      tableArn: this.table.tableArn,
      tableName: this.table.tableName,
      streamViewType: this.config.stream.viewType,
      region: this.context.region ?? 'us-east-1',
      streamLabel
    };
  }

  private resolveAttributeDefinitionType(type: string): string {
    switch (type) {
      case 'string':
        return 'S';
      case 'number':
        return 'N';
      case 'binary':
        return 'B';
      default:
        throw new Error(`Unsupported attribute definition type: ${type}`);
    }
  }
}
