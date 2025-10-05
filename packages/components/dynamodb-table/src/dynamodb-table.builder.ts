import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import * as fs from 'fs';
import * as path from 'path';

type AttributeType = 'string' | 'number' | 'binary';

type BillingMode = 'pay-per-request' | 'provisioned';

type ProjectionType = 'all' | 'keys-only' | 'include';

type StreamViewType = 'keys-only' | 'new-image' | 'old-image' | 'new-and-old-images';

type EncryptionType = 'aws-managed' | 'customer-managed';

type TableClass = 'standard' | 'infrequent-access';

export interface DynamoDbAttributeConfig {
  name: string;
  type: AttributeType;
}

export interface DynamoDbProvisionedThroughputConfig {
  readCapacity: number;
  writeCapacity: number;
  autoScaling?: {
    minReadCapacity?: number;
    maxReadCapacity?: number;
    minWriteCapacity?: number;
    maxWriteCapacity?: number;
    targetUtilizationPercent?: number;
  };
}

export interface DynamoDbGsiConfig {
  indexName: string;
  partitionKey: DynamoDbAttributeConfig;
  sortKey?: DynamoDbAttributeConfig;
  projectionType?: ProjectionType;
  nonKeyAttributes?: string[];
  provisioned?: DynamoDbProvisionedThroughputConfig;
}

export interface DynamoDbLsiConfig {
  indexName: string;
  sortKey: DynamoDbAttributeConfig;
  projectionType?: ProjectionType;
  nonKeyAttributes?: string[];
}

export interface DynamoDbBackupConfig {
  enabled?: boolean;
  retentionDays?: number;
  schedule?: string;
}

export interface DynamoDbMonitoringAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: 'gt' | 'gte' | 'lt' | 'lte';
  treatMissingData?: 'breaching' | 'not-breaching' | 'ignore' | 'missing';
  statistic?: string;
  tags?: Record<string, string>;
}

export interface DynamoDbMonitoringConfig {
  enabled?: boolean;
  alarms?: {
    readThrottle?: DynamoDbMonitoringAlarmConfig;
    consumedReadCapacity?: DynamoDbMonitoringAlarmConfig;
    writeThrottle?: DynamoDbMonitoringAlarmConfig;
    consumedWriteCapacity?: DynamoDbMonitoringAlarmConfig;
    systemErrors?: DynamoDbMonitoringAlarmConfig;
  };
}

export interface DynamoDbEncryptionConfig {
  type?: EncryptionType;
  kmsKeyArn?: string;
  customerManagedKey?: {
    create?: boolean;
    alias?: string;
    enableRotation?: boolean;
  };
}

export type HardeningProfile = 'baseline' | 'hardened' | 'stig';

export interface DynamoDbTableConfig {
  tableName: string;
  partitionKey: DynamoDbAttributeConfig;
  sortKey?: DynamoDbAttributeConfig;
  billingMode: BillingMode;
  provisioned?: DynamoDbProvisionedThroughputConfig;
  tableClass: TableClass;
  pointInTimeRecovery: boolean;
  timeToLive?: {
    enabled: boolean;
    attributeName?: string;
  };
  stream?: {
    enabled: boolean;
    viewType: StreamViewType;
  };
  globalSecondaryIndexes?: DynamoDbGsiConfig[];
  localSecondaryIndexes?: DynamoDbLsiConfig[];
  encryption: DynamoDbEncryptionConfig;
  backup: DynamoDbBackupConfig;
  monitoring: DynamoDbMonitoringConfig;
  hardeningProfile: HardeningProfile;
  tags: Record<string, string>;
}

const ATTRIBUTE_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'type'],
  properties: {
    name: { type: 'string', pattern: '^[a-zA-Z0-9_.-]+$' },
    type: {
      type: 'string',
      enum: ['string', 'number', 'binary']
    }
  }
};

const PROVISIONED_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  required: ['readCapacity', 'writeCapacity'],
  properties: {
    readCapacity: { type: 'number', minimum: 1 },
    writeCapacity: { type: 'number', minimum: 1 },
    autoScaling: {
      type: 'object',
      additionalProperties: false,
      properties: {
        minReadCapacity: { type: 'number', minimum: 1 },
        maxReadCapacity: { type: 'number', minimum: 1 },
        minWriteCapacity: { type: 'number', minimum: 1 },
        maxWriteCapacity: { type: 'number', minimum: 1 },
        targetUtilizationPercent: { type: 'number', minimum: 20, maximum: 90 }
      }
    }
  }
};

const ALARM_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: false },
    threshold: { type: 'number' },
    evaluationPeriods: { type: 'number', minimum: 1, default: 2 },
    periodMinutes: { type: 'number', minimum: 1, default: 5 },
    comparisonOperator: {
      type: 'string',
      enum: ['gt', 'gte', 'lt', 'lte'],
      default: 'gte'
    },
    treatMissingData: {
      type: 'string',
      enum: ['breaching', 'not-breaching', 'ignore', 'missing'],
      default: 'not-breaching'
    },
    statistic: { type: 'string', default: 'Sum' },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

// Load schema from standalone Config.schema.json file
const schemaPath = path.join(__dirname, '..', 'Config.schema.json');
export const DYNAMODB_TABLE_CONFIG_SCHEMA: ComponentConfigSchema = JSON.parse(
  fs.readFileSync(schemaPath, 'utf8')
);

export class DynamoDbTableComponentConfigBuilder extends ConfigBuilder<DynamoDbTableConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, DYNAMODB_TABLE_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<DynamoDbTableConfig> {
    return {
      billingMode: 'pay-per-request',
      tableClass: 'standard',
      pointInTimeRecovery: true,
      timeToLive: { enabled: false },
      stream: { enabled: false, viewType: 'new-and-old-images' },
      globalSecondaryIndexes: [],
      localSecondaryIndexes: [],
      encryption: {
        type: 'aws-managed'
      },
      backup: {
        enabled: true,
        retentionDays: 7
      },
      monitoring: {
        enabled: true,
        alarms: {}
      },
      hardeningProfile: 'baseline',
      tags: {}
    };
  }

  public buildSync(): DynamoDbTableConfig {
    const resolved = super.buildSync() as DynamoDbTableConfig;
    return this.normaliseConfig(resolved);
  }

  private normaliseAlarm(
    alarm: DynamoDbMonitoringAlarmConfig | undefined,
    defaults: Required<Omit<DynamoDbMonitoringAlarmConfig, 'tags'>>
  ): DynamoDbMonitoringAlarmConfig {
    return {
      enabled: alarm?.enabled ?? defaults.enabled,
      threshold: alarm?.threshold ?? defaults.threshold,
      evaluationPeriods: alarm?.evaluationPeriods ?? defaults.evaluationPeriods,
      periodMinutes: alarm?.periodMinutes ?? defaults.periodMinutes,
      comparisonOperator: alarm?.comparisonOperator ?? defaults.comparisonOperator,
      treatMissingData: alarm?.treatMissingData ?? defaults.treatMissingData,
      statistic: alarm?.statistic ?? defaults.statistic,
      tags: alarm?.tags ?? {}
    };
  }

  private normaliseProvisionedConfig(
    provisioned?: DynamoDbProvisionedThroughputConfig
  ): DynamoDbProvisionedThroughputConfig {
    const readCapacity = provisioned?.readCapacity ?? 5;
    const writeCapacity = provisioned?.writeCapacity ?? 5;
    const autoScaling = provisioned?.autoScaling ?? {};

    return {
      readCapacity,
      writeCapacity,
      autoScaling: {
        minReadCapacity: autoScaling.minReadCapacity ?? readCapacity,
        maxReadCapacity: autoScaling.maxReadCapacity ?? readCapacity * 10,
        minWriteCapacity: autoScaling.minWriteCapacity ?? writeCapacity,
        maxWriteCapacity: autoScaling.maxWriteCapacity ?? writeCapacity * 10,
        targetUtilizationPercent: autoScaling.targetUtilizationPercent ?? 70
      }
    };
  }

  private normaliseConfig(config: DynamoDbTableConfig): DynamoDbTableConfig {
    const specName = this.builderContext.spec.name;
    const tableName = config.tableName ?? `${this.builderContext.context.serviceName}-${specName}`;
    const tableProvisioned = config.billingMode === 'provisioned'
      ? this.normaliseProvisionedConfig(config.provisioned)
      : undefined;

    return {
      tableName,
      partitionKey: config.partitionKey,
      sortKey: config.sortKey,
      billingMode: config.billingMode ?? 'pay-per-request',
      provisioned: tableProvisioned,
      tableClass: config.tableClass ?? 'standard',
      pointInTimeRecovery: config.pointInTimeRecovery ?? true,
      timeToLive: {
        enabled: config.timeToLive?.enabled ?? false,
        attributeName: config.timeToLive?.enabled ? config.timeToLive?.attributeName : undefined
      },
      stream: {
        enabled: config.stream?.enabled ?? false,
        viewType: config.stream?.viewType ?? 'new-and-old-images'
      },
      globalSecondaryIndexes: (config.globalSecondaryIndexes ?? []).map(index => ({
        indexName: index.indexName,
        partitionKey: index.partitionKey,
        sortKey: index.sortKey,
        projectionType: index.projectionType ?? 'all',
        nonKeyAttributes: index.nonKeyAttributes && index.nonKeyAttributes.length > 0
          ? index.nonKeyAttributes
          : undefined,
        provisioned: index.provisioned || tableProvisioned
          ? this.normaliseProvisionedConfig(index.provisioned ?? tableProvisioned)
          : undefined
      })),
      localSecondaryIndexes: (config.localSecondaryIndexes ?? []).map(index => ({
        indexName: index.indexName,
        sortKey: index.sortKey,
        projectionType: index.projectionType ?? 'all',
        nonKeyAttributes: index.nonKeyAttributes && index.nonKeyAttributes.length > 0
          ? index.nonKeyAttributes
          : undefined
      })),
      encryption: {
        type: config.encryption.type ?? 'aws-managed',
        kmsKeyArn: config.encryption.kmsKeyArn,
        customerManagedKey: {
          create: config.encryption.customerManagedKey?.create ?? false,
          alias: config.encryption.customerManagedKey?.alias,
          enableRotation: config.encryption.customerManagedKey?.enableRotation ?? true
        }
      },
      backup: {
        enabled: config.backup.enabled ?? false,
        retentionDays: config.backup.retentionDays ?? 7,
        schedule: config.backup.schedule
      },
      monitoring: {
        enabled: config.monitoring.enabled ?? true,
        alarms: {
          readThrottle: this.normaliseAlarm(config.monitoring.alarms?.readThrottle, {
            enabled: config.monitoring.enabled ?? true,
            threshold: 1,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Sum'
          }),
          consumedReadCapacity: this.normaliseAlarm(config.monitoring.alarms?.consumedReadCapacity, {
            enabled: config.monitoring.enabled ?? true,
            threshold: 80,
            evaluationPeriods: 3,
            periodMinutes: 5,
            comparisonOperator: 'gt',
            treatMissingData: 'not-breaching',
            statistic: 'Average'
          }),
          writeThrottle: this.normaliseAlarm(config.monitoring.alarms?.writeThrottle, {
            enabled: config.monitoring.enabled ?? true,
            threshold: 1,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Sum'
          }),
          consumedWriteCapacity: this.normaliseAlarm(config.monitoring.alarms?.consumedWriteCapacity, {
            enabled: config.monitoring.enabled ?? true,
            threshold: 80,
            evaluationPeriods: 3,
            periodMinutes: 5,
            comparisonOperator: 'gt',
            treatMissingData: 'not-breaching',
            statistic: 'Average'
          }),
          systemErrors: this.normaliseAlarm(config.monitoring.alarms?.systemErrors, {
            enabled: config.monitoring.enabled ?? true,
            threshold: 1,
            evaluationPeriods: 1,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Sum'
          })
        }
      },
      hardeningProfile: config.hardeningProfile ?? 'baseline',
      tags: config.tags ?? {}
    };
  }
}
