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
    writeThrottle?: DynamoDbMonitoringAlarmConfig;
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
  hardeningProfile: string;
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
      pointInTimeRecovery: false,
      retentionHours: 24,
      timeToLive: { enabled: false },
      stream: { enabled: false, viewType: 'new-and-old-images' },
      globalSecondaryIndexes: [],
      localSecondaryIndexes: [],
      encryption: {
        type: 'aws-managed'
      },
      backup: {
        enabled: false,
        retentionDays: 7
      },
      monitoring: {
        enabled: false,
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

  private normaliseConfig(config: DynamoDbTableConfig): DynamoDbTableConfig {
    const specName = this.builderContext.spec.name;
    const tableName = config.tableName ?? `${this.builderContext.context.serviceName}-${specName}`;

    return {
      tableName,
      partitionKey: config.partitionKey,
      sortKey: config.sortKey,
      billingMode: config.billingMode ?? 'pay-per-request',
      provisioned: config.billingMode === 'provisioned'
        ? {
          readCapacity: config.provisioned?.readCapacity ?? 5,
          writeCapacity: config.provisioned?.writeCapacity ?? 5,
          autoScaling: {
            minReadCapacity: config.provisioned?.autoScaling?.minReadCapacity ?? config.provisioned?.readCapacity ?? 5,
            maxReadCapacity: config.provisioned?.autoScaling?.maxReadCapacity ?? (config.provisioned?.readCapacity ?? 5) * 10,
            minWriteCapacity: config.provisioned?.autoScaling?.minWriteCapacity ?? config.provisioned?.writeCapacity ?? 5,
            maxWriteCapacity: config.provisioned?.autoScaling?.maxWriteCapacity ?? (config.provisioned?.writeCapacity ?? 5) * 10,
            targetUtilizationPercent: config.provisioned?.autoScaling?.targetUtilizationPercent ?? 70
          }
        }
        : undefined,
      tableClass: config.tableClass ?? 'standard',
      pointInTimeRecovery: config.pointInTimeRecovery ?? false,
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
        nonKeyAttributes: index.nonKeyAttributes ?? [],
        provisioned: index.provisioned
          ? {
            readCapacity: index.provisioned.readCapacity,
            writeCapacity: index.provisioned.writeCapacity,
            autoScaling: {
              minReadCapacity: index.provisioned.autoScaling?.minReadCapacity ?? index.provisioned.readCapacity,
              maxReadCapacity: index.provisioned.autoScaling?.maxReadCapacity ?? index.provisioned.readCapacity * 10,
              minWriteCapacity: index.provisioned.autoScaling?.minWriteCapacity ?? index.provisioned.writeCapacity,
              maxWriteCapacity: index.provisioned.autoScaling?.maxWriteCapacity ?? index.provisioned.writeCapacity * 10,
              targetUtilizationPercent: index.provisioned.autoScaling?.targetUtilizationPercent ?? 70
            }
          }
          : undefined
      })),
      localSecondaryIndexes: (config.localSecondaryIndexes ?? []).map(index => ({
        indexName: index.indexName,
        sortKey: index.sortKey,
        projectionType: index.projectionType ?? 'all',
        nonKeyAttributes: index.nonKeyAttributes ?? []
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
        enabled: config.monitoring.enabled ?? false,
        alarms: {
          readThrottle: this.normaliseAlarm(config.monitoring.alarms?.readThrottle, {
            enabled: config.monitoring.enabled ?? false,
            threshold: 1,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Sum'
          }),
          writeThrottle: this.normaliseAlarm(config.monitoring.alarms?.writeThrottle, {
            enabled: config.monitoring.enabled ?? false,
            threshold: 1,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Sum'
          }),
          systemErrors: this.normaliseAlarm(config.monitoring.alarms?.systemErrors, {
            enabled: config.monitoring.enabled ?? false,
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
