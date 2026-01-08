/**
 * Configuration builder for the RDS PostgreSQL component.
 *
 * The builder implements the platform's configuration precedence chain
 * and exposes a normalized configuration object that the component can
 * consume without awareness of compliance frameworks. All framework
 * specific defaults should be captured in the segregated /config YAML and
 * merged here so the component logic stays policy-agnostic.
 */

import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema,
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';

export type RdsRemovalPolicy = 'retain' | 'destroy';

export interface RdsPostgresLogConfig {
  enabled?: boolean;
  logGroupName?: string;
  retentionInDays?: number;
  removalPolicy?: RdsRemovalPolicy;
  tags?: Record<string, string>;
}

export interface RdsPostgresEncryptionConfig {
  enabled?: boolean;
  kmsKeyArn?: string;
  customerManagedKey?: {
    create?: boolean;
    alias?: string;
    enableRotation?: boolean;
  };
}

export interface RdsPostgresBackupConfig {
  retentionDays?: number;
  copyTagsToSnapshots?: boolean;
  preferredWindow?: string;
}

export interface RdsPostgresEnhancedMonitoringConfig {
  enabled?: boolean;
  intervalSeconds?: number;
}

export interface RdsPostgresPerformanceInsightsConfig {
  enabled?: boolean;
  retentionDays?: number;
  useCustomerManagedKey?: boolean;
}

export interface RdsPostgresAlarmConfig {
  enabled?: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
  comparisonOperator?: 'gt' | 'gte' | 'lt' | 'lte';
  treatMissingData?: 'breaching' | 'not-breaching' | 'ignore' | 'missing';
  statistic?: string;
  tags?: Record<string, string>;
}

export interface RdsPostgresMonitoringAlarmsConfig {
  cpuUtilization?: RdsPostgresAlarmConfig;
  freeStorageSpaceBytes?: RdsPostgresAlarmConfig;
  databaseConnections?: RdsPostgresAlarmConfig;
}

export interface RdsPostgresMonitoringConfig {
  enhancedMonitoring?: RdsPostgresEnhancedMonitoringConfig;
  performanceInsights?: RdsPostgresPerformanceInsightsConfig;
  alarms?: RdsPostgresMonitoringAlarmsConfig;
}

export interface RdsPostgresRotationConfig {
  enabled?: boolean;
  mode?: 'single-user' | 'multi-user';
  scheduleInDays?: number;
}

export interface RdsPostgresParameterGroupConfig {
  enabled?: boolean;
  description?: string;
  parameters?: Record<string, string>;
}

export interface RdsPostgresSecurityConfig {
  iamAuthentication?: boolean;
  enforceSsl?: boolean;
}

export interface RdsPostgresNetworkingConfig {
  vpcId?: string;
  useDefaultVpc?: boolean;
  availabilityZones?: string[];
  vpcCidrBlock?: string;
  subnetIds?: string[];
  ingressCidrs?: string[];
  port?: number;
}

export interface RdsPostgresInstanceConfig {
  engineVersion?: string;
  instanceType?: string;
  allocatedStorage?: number;
  maxAllocatedStorage?: number;
  publiclyAccessible?: boolean;
  multiAz?: boolean;
  deletionProtection?: boolean;
  removalPolicy?: RdsRemovalPolicy;
}

export interface RdsPostgresObservabilityConfig {
  logExports?: string[];
}

export interface RdsPostgresConfig {
  dbName: string;
  description?: string;
  username: string;
  /** PostgreSQL engine version (convenience property that maps to instance.engineVersion) */
  version?: string;
  instance?: RdsPostgresInstanceConfig;
  encryption?: RdsPostgresEncryptionConfig;
  backup?: RdsPostgresBackupConfig;
  monitoring?: RdsPostgresMonitoringConfig;
  logging?: {
    database?: RdsPostgresLogConfig;
    audit?: RdsPostgresLogConfig;
  };
  rotation?: RdsPostgresRotationConfig;
  parameterGroup?: RdsPostgresParameterGroupConfig;
  security?: RdsPostgresSecurityConfig;
  networking?: RdsPostgresNetworkingConfig;
  observability?: RdsPostgresObservabilityConfig;
  tags?: Record<string, string>;
  hardeningProfile?: string;
  
  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
}

const LOG_CONFIG_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: false },
    logGroupName: { type: 'string' },
    retentionInDays: { type: 'number', minimum: 1 },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'], default: 'retain' },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  },
  default: {
    enabled: false,
    retentionInDays: 90,
    removalPolicy: 'retain'
  }
};

export const RDS_POSTGRES_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    dbName: {
      type: 'string',
      description: 'Logical database name',
      pattern: '^[a-zA-Z_][a-zA-Z0-9_\-]*$'
    },
    description: {
      type: 'string',
      maxLength: 1024
    },
    username: {
      type: 'string',
      description: 'Master username for the database',
      pattern: '^[a-zA-Z][a-zA-Z0-9_\-]*$'
    },
    version: {
      type: 'string',
      description: 'PostgreSQL engine version (e.g., 18.1). Maps to instance.engineVersion for convenience.',
      default: '18.1'
    },
    instance: {
      type: 'object',
      additionalProperties: false,
      properties: {
        engineVersion: { type: 'string', default: '18.1' },
        instanceType: { type: 'string', default: 't3.micro' },
        allocatedStorage: { type: 'number', minimum: 20, default: 20 },
        maxAllocatedStorage: { type: 'number', minimum: 20 },
        publiclyAccessible: { type: 'boolean', default: false },
        multiAz: { type: 'boolean', default: false },
        deletionProtection: { type: 'boolean', default: false },
        removalPolicy: { type: 'string', enum: ['retain', 'destroy'], default: 'destroy' }
      },
      default: {}
    },
    encryption: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        kmsKeyArn: { type: 'string' },
        customerManagedKey: {
          type: 'object',
          additionalProperties: false,
          properties: {
            create: { type: 'boolean', default: false },
            alias: { type: 'string' },
            enableRotation: { type: 'boolean', default: false }
          },
          default: {
            create: false,
            enableRotation: false
          }
        }
      },
      default: {}
    },
    backup: {
      type: 'object',
      additionalProperties: false,
      properties: {
        retentionDays: { type: 'number', minimum: 0, default: 7 },
        copyTagsToSnapshots: { type: 'boolean', default: true },
        preferredWindow: { type: 'string' }
      },
      default: {}
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enhancedMonitoring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean', default: false },
            intervalSeconds: { type: 'number', minimum: 1, default: 60 }
          },
          default: {}
        },
        performanceInsights: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean', default: false },
            retentionDays: { type: 'number', minimum: 7, default: 7 },
            useCustomerManagedKey: { type: 'boolean', default: false }
          },
          default: {}
        },
        alarms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            cpuUtilization: { $ref: '#/definitions/alarmConfig' },
            freeStorageSpaceBytes: { $ref: '#/definitions/alarmConfig' },
            databaseConnections: { $ref: '#/definitions/alarmConfig' }
          },
          default: {}
        }
      },
      default: {}
    },
    logging: {
      type: 'object',
      additionalProperties: false,
      properties: {
        database: LOG_CONFIG_DEFINITION,
        audit: LOG_CONFIG_DEFINITION
      },
      default: {}
    },
    rotation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        mode: { type: 'string', enum: ['single-user', 'multi-user'], default: 'single-user' },
        scheduleInDays: { type: 'number', minimum: 1, maximum: 365, default: 30 }
      },
      default: {}
    },
    parameterGroup: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        description: { type: 'string' },
        parameters: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      },
      default: {}
    },
    security: {
      type: 'object',
      additionalProperties: false,
      properties: {
        iamAuthentication: { type: 'boolean', default: false },
        enforceSsl: { type: 'boolean', default: true }
      },
      default: {}
    },
    networking: {
      type: 'object',
      additionalProperties: false,
      properties: {
        vpcId: { type: 'string' },
        useDefaultVpc: { type: 'boolean', default: true },
        availabilityZones: {
          type: 'array',
          items: { type: 'string' },
          description: 'Availability zones for the VPC. Required when using vpcId to avoid VPC lookup.',
          default: []
        },
        vpcCidrBlock: {
          type: 'string',
          description: 'VPC CIDR block. Used for security group rules when VPC is imported via attributes.',
          pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$'
        },
        subnetIds: {
          type: 'array',
          items: { type: 'string' },
          default: []
        },
        ingressCidrs: {
          type: 'array',
          items: { type: 'string' },
          default: []
        },
        port: { type: 'number', default: 5432 }
      },
      default: {}
    },
    observability: {
      type: 'object',
      additionalProperties: false,
      properties: {
        logExports: {
          type: 'array',
          items: { type: 'string' },
          default: ['postgresql']
        }
      },
      default: {}
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    },
    hardeningProfile: {
      type: 'string',
      description: 'Abstract hardening profile identifier used by binders and downstream services'
    }
  },
  definitions: {
    alarmConfig: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        threshold: { type: 'number' },
        evaluationPeriods: { type: 'number', minimum: 1, default: 1 },
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
        statistic: { type: 'string', default: 'Average' },
        tags: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      },
      default: {
        enabled: false,
        evaluationPeriods: 1,
        periodMinutes: 5,
        comparisonOperator: 'gte',
        treatMissingData: 'not-breaching',
        statistic: 'Average'
      }
    }
  }
};

export class RdsPostgresComponentConfigBuilder extends ConfigBuilder<RdsPostgresConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, RDS_POSTGRES_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<RdsPostgresConfig> {
    return {
      username: 'postgres',
      version: '18.1',
      instance: {
        engineVersion: '18.1',
        instanceType: 't3.micro',
        allocatedStorage: 20,
        multiAz: false,
        publiclyAccessible: false,
        deletionProtection: false,
        removalPolicy: 'destroy'
      },
      encryption: {
        enabled: false,
        customerManagedKey: {
          create: false,
          enableRotation: false
        }
      },
      backup: {
        retentionDays: 7,
        copyTagsToSnapshots: true
      },
      monitoring: {
        enhancedMonitoring: {
          enabled: false,
          intervalSeconds: 60
        },
        performanceInsights: {
          enabled: false,
          retentionDays: 7,
          useCustomerManagedKey: false
        },
        alarms: {}
      },
      logging: {
        database: {
          enabled: false,
          retentionInDays: 90,
          removalPolicy: 'destroy'
        },
        audit: {
          enabled: false,
          retentionInDays: 365,
          removalPolicy: 'retain'
        }
      },
      rotation: {
        enabled: false,
        mode: 'single-user',
        scheduleInDays: 30
      },
      security: {
        iamAuthentication: false,
        enforceSsl: true
      },
      networking: {
        useDefaultVpc: true,
        ingressCidrs: ['10.0.0.0/16'],
        port: 5432
      },
      observability: {
        logExports: ['postgresql']
      },
      tags: {},
      hardeningProfile: 'baseline'
    };
  }

  /**
   * Layer 2: Compliance Framework Defaults
   * 
   * Provides sensible defaults based on risk assessment flags rather than framework checks.
   * High-risk environment defaults can be set via:
   * - Platform config files (`/config/{framework}.yml`) setting `highRiskEnvironment: true`
   * - Service-level configuration in `service.yml`
   * - Environment defaults
   * 
   * This ensures configuration is data-driven and risk-based, not framework-dependent.
   */
  protected getComplianceFrameworkDefaults(): Partial<RdsPostgresConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<RdsPostgresConfig> | undefined;
    let isHighRisk = componentConfig?.highRiskEnvironment ?? false;
    
    // Also check platform config if available (loaded by base class)
    try {
      const platformConfig = (this as any)._loadPlatformConfiguration();
      if (platformConfig?.highRiskEnvironment) {
        isHighRisk = true;
      }
    } catch {
      // Platform config might not be available in tests, ignore
    }
    
    if (isHighRisk) {
      // Apply enhanced security defaults for high-risk environments
      // These defaults align with FedRAMP Moderate/High requirements when highRiskEnvironment is set
      return {
        encryption: {
          enabled: true,
          customerManagedKey: {
            create: true,
            enableRotation: true
          }
        },
        backup: {
          retentionDays: 30, // Can be overridden to 90 for higher risk
          copyTagsToSnapshots: true
        },
        instance: {
          multiAz: true,
          deletionProtection: true
        },
        monitoring: {
          enhancedMonitoring: {
            enabled: true,
            intervalSeconds: 60
          },
          performanceInsights: {
            enabled: true,
            retentionDays: 7,
            useCustomerManagedKey: true
          }
        },
        logging: {
          database: {
            enabled: true,
            retentionInDays: 1095, // 3 years (can be overridden to 2555 for higher risk)
            removalPolicy: 'retain'
          },
          audit: {
            enabled: true,
            retentionInDays: 1095, // 3 years (can be overridden to 2555 for higher risk)
            removalPolicy: 'retain'
          }
        },
        security: {
          iamAuthentication: true,
          enforceSsl: true
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  public buildSync(): RdsPostgresConfig {
    const resolved = super.buildSync() as RdsPostgresConfig;
    return this.normaliseConfig(resolved);
  }

  private normaliseAlarmConfig(
    defaults: Required<Omit<RdsPostgresAlarmConfig, 'tags'>>,
    alarm?: RdsPostgresAlarmConfig
  ): RdsPostgresAlarmConfig {
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

  /**
   * Check if a database name is a PostgreSQL reserved word and transform it if needed.
   * PostgreSQL reserved words cannot be used as database names in RDS.
   */
  private sanitizeDbName(dbName: string): string {
    // Common PostgreSQL reserved keywords that cannot be used as database names
    // Reference: https://www.postgresql.org/docs/current/sql-keywords-appendix.html
    const reservedWords = new Set([
      'database', 'user', 'table', 'select', 'insert', 'update', 'delete',
      'create', 'drop', 'alter', 'index', 'view', 'schema', 'role', 'grant',
      'revoke', 'commit', 'rollback', 'transaction', 'begin', 'end', 'savepoint',
      'constraint', 'primary', 'foreign', 'key', 'references', 'check', 'unique',
      'default', 'not', 'null', 'true', 'false', 'and', 'or', 'in', 'like',
      'between', 'is', 'as', 'from', 'where', 'group', 'by', 'having', 'order',
      'limit', 'offset', 'union', 'intersect', 'except', 'distinct', 'all',
      'case', 'when', 'then', 'else', 'end', 'cast', 'type', 'function', 'procedure',
      'trigger', 'sequence', 'temporary', 'temp', 'public', 'information', 'pg_'
    ]);
    
    const normalizedName = dbName.toLowerCase();
    const isReserved = reservedWords.has(normalizedName) || normalizedName.startsWith('pg_');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.builder.ts:590',message:'Sanitizing dbName',data:{originalDbName:dbName,normalizedName,isReserved},timestamp:Date.now(),sessionId:'debug-session',runId:'run17',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (isReserved) {
      // Append '_db' suffix to reserved words to make them safe
      const sanitized = `${dbName}_db`;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.builder.ts:600',message:'Reserved word detected, transforming dbName',data:{originalDbName:dbName,sanitizedDbName:sanitized},timestamp:Date.now(),sessionId:'debug-session',runId:'run17',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      return sanitized;
    }
    
    return dbName;
  }

  private normaliseConfig(config: RdsPostgresConfig): RdsPostgresConfig {
    const specName = this.builderContext.spec.name;

    const normaliseLog = (logConfig?: RdsPostgresLogConfig, defaults?: RdsPostgresLogConfig): RdsPostgresLogConfig => ({
      enabled: logConfig?.enabled ?? defaults?.enabled ?? false,
      logGroupName: logConfig?.logGroupName ?? defaults?.logGroupName,
      retentionInDays: logConfig?.retentionInDays ?? defaults?.retentionInDays ?? 90,
      removalPolicy: logConfig?.removalPolicy ?? defaults?.removalPolicy ?? 'retain',
      tags: logConfig?.tags ?? defaults?.tags ?? {}
    });

    // Support top-level 'version' property that maps to instance.engineVersion for convenience
    // Priority: top-level version (user override) > instance.engineVersion (platform/default) > hardcoded fallback
    const topLevelVersion = (config as any).version;
    const instanceEngineVersion = config.instance?.engineVersion;
    // Top-level version takes precedence over instance.engineVersion to allow user overrides
    const engineVersion = topLevelVersion ?? instanceEngineVersion ?? '18.1';
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.builder.ts:631',message:'Resolving engine version',data:{topLevelVersion,instanceEngineVersion,resolvedVersion:engineVersion,hasInstance:!!config.instance,instanceKeys:config.instance?Object.keys(config.instance):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run17',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    
    // Generate dbName from component name if not explicitly provided
    const rawDbName = config.dbName ?? specName.replace(/[^a-zA-Z0-9_]/g, '_');
    // Sanitize dbName to avoid PostgreSQL reserved words
    const generatedDbName = this.sanitizeDbName(rawDbName);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.builder.ts:638',message:'Generating dbName',data:{specName,configDbName:config.dbName,rawDbName,generatedDbName,hasExplicitDbName:!!config.dbName},timestamp:Date.now(),sessionId:'debug-session',runId:'run17',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    return {
      dbName: generatedDbName,
      description: config.description,
      username: config.username ?? 'postgres',
      instance: {
        engineVersion: engineVersion,
        instanceType: config.instance?.instanceType ?? 't3.micro',
        allocatedStorage: config.instance?.allocatedStorage ?? 20,
        maxAllocatedStorage: config.instance?.maxAllocatedStorage,
        publiclyAccessible: config.instance?.publiclyAccessible ?? false,
        multiAz: config.instance?.multiAz ?? false,
        deletionProtection: config.instance?.deletionProtection ?? false,
        removalPolicy: config.instance?.removalPolicy ?? 'destroy'
      },
      encryption: {
        enabled: config.encryption?.enabled ?? false,
        kmsKeyArn: config.encryption?.kmsKeyArn,
        customerManagedKey: {
          create: config.encryption?.customerManagedKey?.create ?? false,
          alias: config.encryption?.customerManagedKey?.alias,
          enableRotation: config.encryption?.customerManagedKey?.enableRotation ?? false
        }
      },
      backup: {
        retentionDays: config.backup?.retentionDays ?? 7,
        copyTagsToSnapshots: config.backup?.copyTagsToSnapshots ?? true,
        preferredWindow: config.backup?.preferredWindow
      },
      monitoring: {
        enhancedMonitoring: {
          enabled: config.monitoring?.enhancedMonitoring?.enabled ?? false,
          intervalSeconds: config.monitoring?.enhancedMonitoring?.intervalSeconds ?? 60
        },
        performanceInsights: {
          enabled: config.monitoring?.performanceInsights?.enabled ?? false,
          retentionDays: config.monitoring?.performanceInsights?.retentionDays ?? 7,
          useCustomerManagedKey: config.monitoring?.performanceInsights?.useCustomerManagedKey ?? false
        },
        alarms: {
          cpuUtilization: this.normaliseAlarmConfig({
            enabled: false,
            threshold: 80,
            evaluationPeriods: 3,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Average'
          }, config.monitoring?.alarms?.cpuUtilization),
          freeStorageSpaceBytes: this.normaliseAlarmConfig({
            enabled: false,
            threshold: 2 * 1024 * 1024 * 1024,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'lte',
            treatMissingData: 'not-breaching',
            statistic: 'Average'
          }, config.monitoring?.alarms?.freeStorageSpaceBytes),
          databaseConnections: this.normaliseAlarmConfig({
            enabled: false,
            threshold: 80,
            evaluationPeriods: 2,
            periodMinutes: 5,
            comparisonOperator: 'gte',
            treatMissingData: 'not-breaching',
            statistic: 'Average'
          }, config.monitoring?.alarms?.databaseConnections)
        }
      },
      logging: {
        database: normaliseLog(config.logging?.database, {
          enabled: false,
          retentionInDays: 90,
          removalPolicy: 'destroy'
        }),
        audit: normaliseLog(config.logging?.audit, {
          enabled: false,
          retentionInDays: 365,
          removalPolicy: 'retain'
        })
      },
      rotation: {
        enabled: config.rotation?.enabled ?? false,
        mode: config.rotation?.mode ?? 'single-user',
        scheduleInDays: config.rotation?.scheduleInDays ?? 30
      },
      parameterGroup: config.parameterGroup?.enabled
        ? {
            enabled: true,
            description: config.parameterGroup.description ?? 'Custom PostgreSQL parameter group',
            parameters: config.parameterGroup.parameters ?? {}
          }
        : {
            enabled: false,
            description: config.parameterGroup?.description,
            parameters: config.parameterGroup?.parameters ?? {}
          },
      security: {
        iamAuthentication: config.security?.iamAuthentication ?? false,
        enforceSsl: config.security?.enforceSsl ?? true
      },
      networking: {
        vpcId: config.networking?.vpcId,
        useDefaultVpc: config.networking?.useDefaultVpc ?? !config.networking?.vpcId,
        availabilityZones: config.networking?.availabilityZones ?? [],
        vpcCidrBlock: config.networking?.vpcCidrBlock,
        subnetIds: config.networking?.subnetIds ?? [],
        ingressCidrs: (config.networking?.ingressCidrs ?? []).length > 0
          ? config.networking!.ingressCidrs!
          : ['10.0.0.0/16'],
        port: config.networking?.port ?? 5432
      },
      observability: {
        logExports: (config.observability?.logExports ?? ['postgresql']).length > 0
          ? config.observability!.logExports!
          : ['postgresql']
      },
      tags: config.tags ?? {},
      hardeningProfile: config.hardeningProfile ?? 'baseline'
    };
  }
}

