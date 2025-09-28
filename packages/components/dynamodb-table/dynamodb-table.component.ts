import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as applicationautoscaling from 'aws-cdk-lib/aws-applicationautoscaling';
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
} from './dynamodb-table.builder';

export class DynamoDbTableComponent extends Component {
  private table?: dynamodb.Table;
  private kmsKey?: kms.IKey;
  private managedKmsKey?: kms.Key;
  private config?: DynamoDbTableConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting DynamoDB table synthesis');

    try {
      const builder = new DynamoDbTableComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.logComponentEvent('config_resolved', 'Resolved DynamoDB table configuration', {
        tableName: this.config.tableName,
        billingMode: this.config.billingMode,
        pointInTimeRecovery: this.config.pointInTimeRecovery,
        tableClass: this.config.tableClass,
        encryption: this.config.encryption.type,
        monitoringEnabled: this.config.monitoring.enabled
      });

      this.resolveEncryptionKey();
      this.createTable();
      this.configureMonitoring();

      this.registerConstruct('main', this.table!);
      this.registerConstruct('table', this.table!);
      if (this.managedKmsKey) {
        this.registerConstruct('kmsKey', this.managedKmsKey);
      }

      this.registerCapability('db:dynamodb', this.buildCapability());

      this.logComponentEvent('synthesis_complete', 'DynamoDB table synthesis completed', {
        tableName: this.table!.tableName,
        tableArn: this.table!.tableArn
      });
    } catch (error) {
      this.logError(error as Error, 'dynamodb table synthesis');
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
      pointInTimeRecovery: this.config!.pointInTimeRecovery,
      removalPolicy: cdk.RemovalPolicy.RETAIN
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
        this.configureGsiAutoScaling(this.table!.tableName, gsiConfig);
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

    this.configureReadAutoScaling('table', `table/${this.table.tableName}`, this.config.provisioned);
    this.configureWriteAutoScaling('table', `table/${this.table.tableName}`, this.config.provisioned);
  }

  private configureGsiAutoScaling(tableName: string, gsiConfig: DynamoDbGsiConfig): void {
    if (!gsiConfig.provisioned) {
      return;
    }

    const resourceId = `table/${tableName}/index/${gsiConfig.indexName}`;
    this.configureReadAutoScaling(`gsi-${gsiConfig.indexName}`, resourceId, gsiConfig.provisioned);
    this.configureWriteAutoScaling(`gsi-${gsiConfig.indexName}`, resourceId, gsiConfig.provisioned);
  }

  private configureReadAutoScaling(prefix: string, resourceId: string, provisioned: DynamoDbProvisionedThroughputConfig): void {
    const target = new applicationautoscaling.ScalableTarget(this, `${prefix}-ReadCapacity`, {
      serviceNamespace: applicationautoscaling.ServiceNamespace.DYNAMODB,
      scalableDimension: 'dynamodb:table:ReadCapacityUnits',
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

  private configureWriteAutoScaling(prefix: string, resourceId: string, provisioned: DynamoDbProvisionedThroughputConfig): void {
    const target = new applicationautoscaling.ScalableTarget(this, `${prefix}-WriteCapacity`, {
      serviceNamespace: applicationautoscaling.ServiceNamespace.DYNAMODB,
      scalableDimension: 'dynamodb:table:WriteCapacityUnits',
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
      'WriteThrottleAlarm',
      monitoring.alarms?.writeThrottle,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-write-throttles`,
        metricName: 'WriteThrottledRequests',
        statistic: 'Sum'
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
    return {
      tableName: this.table!.tableName,
      tableArn: this.table!.tableArn,
      streamArn: this.table!.tableStreamArn,
      billingMode: this.config!.billingMode,
      tableClass: this.config!.tableClass,
      pointInTimeRecovery: this.config!.pointInTimeRecovery,
      encryption: this.config!.encryption.type,
      kmsKeyArn: this.kmsKey?.keyArn,
      hardeningProfile: this.config!.hardeningProfile
    };
  }
}
