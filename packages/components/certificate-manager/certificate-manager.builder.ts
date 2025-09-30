import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type CertificateKeyAlgorithm = 'RSA_2048' | 'EC_prime256v1' | 'EC_secp384r1';
export type CertificateValidationMethod = 'DNS' | 'EMAIL';
export type LogRemovalPolicy = 'retain' | 'destroy';

export interface CertificateManagerValidationConfig {
  method: CertificateValidationMethod;
  hostedZoneId?: string;
  hostedZoneName?: string;
  validationEmails?: string[];
}

export interface CertificateManagerLoggingGroupConfig {
  id: string;
  enabled: boolean;
  logGroupName?: string;
  retentionInDays: number;
  removalPolicy: LogRemovalPolicy;
  tags?: Record<string, string>;
}

export interface CertificateManagerLoggingConfig {
  groups: CertificateManagerLoggingGroupConfig[];
}

export interface CertificateManagerMonitoringAlarmConfig {
  enabled: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
}

export interface CertificateManagerMonitoringConfig {
  enabled: boolean;
  expiration: CertificateManagerMonitoringAlarmConfig & { thresholdDays: number; periodHours: number };
  status: CertificateManagerMonitoringAlarmConfig;
}

export interface CertificateManagerConfig {
  domainName: string;
  subjectAlternativeNames: string[];
  validation: CertificateManagerValidationConfig;
  transparencyLoggingEnabled: boolean;
  keyAlgorithm: CertificateKeyAlgorithm;
  logging: CertificateManagerLoggingConfig;
  monitoring: CertificateManagerMonitoringConfig;
  tags: Record<string, string>;
}

const CERTIFICATE_MANAGER_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['domainName'],
  properties: {
    domainName: { type: 'string' },
    subjectAlternativeNames: {
      type: 'array',
      items: { type: 'string' },
      default: []
    },
    validation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        method: { type: 'string', enum: ['DNS', 'EMAIL'], default: 'DNS' },
        hostedZoneId: { type: 'string' },
        hostedZoneName: { type: 'string' },
        validationEmails: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      default: { method: 'DNS' }
    },
    transparencyLoggingEnabled: { type: 'boolean', default: true },
    keyAlgorithm: {
      type: 'string',
      enum: ['RSA_2048', 'EC_prime256v1', 'EC_secp384r1'],
      default: 'RSA_2048'
    },
    logging: {
      type: 'object',
      additionalProperties: false,
      properties: {
        groups: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              enabled: { type: 'boolean', default: true },
              logGroupName: { type: 'string' },
              retentionInDays: { type: 'number' },
              removalPolicy: { type: 'string', enum: ['retain', 'destroy'], default: 'retain' },
              tags: {
                type: 'object',
                additionalProperties: { type: 'string' }
              }
            },
            required: ['id', 'enabled', 'retentionInDays']
          },
          default: []
        }
      },
      default: { groups: [] }
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: false },
        expiration: { type: 'object' },
        status: { type: 'object' }
      }
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    }
  }
};

const DEFAULT_EXPIRATION_ALARM: CertificateManagerMonitoringConfig['expiration'] = {
  enabled: true,
  thresholdDays: 30,
  threshold: 30,
  evaluationPeriods: 1,
  periodHours: 6
};

const DEFAULT_STATUS_ALARM: CertificateManagerMonitoringConfig['status'] = {
  enabled: true,
  threshold: 1,
  evaluationPeriods: 3,
  periodMinutes: 15
};

export class CertificateManagerComponentConfigBuilder extends ConfigBuilder<CertificateManagerConfig> {
  constructor(builderContext: ConfigBuilderContext) {
    super(builderContext, CERTIFICATE_MANAGER_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<CertificateManagerConfig> {
    return {
      subjectAlternativeNames: [],
      validation: { method: 'DNS' },
      transparencyLoggingEnabled: true,
      keyAlgorithm: 'RSA_2048',
      logging: {
        groups: [
          {
            id: 'lifecycle',
            enabled: true,
            retentionInDays: 180,
            removalPolicy: 'destroy'
          }
        ]
      },
      monitoring: {
        enabled: false,
        expiration: { ...DEFAULT_EXPIRATION_ALARM, enabled: false },
        status: { ...DEFAULT_STATUS_ALARM, enabled: false }
      },
      tags: {}
    };
  }

  public buildSync(): CertificateManagerConfig {
    const resolved = super.buildSync() as CertificateManagerConfig;
    if (!resolved.domainName) {
      throw new Error('certificate-manager configuration requires a domainName');
    }
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: CertificateManagerConfig): CertificateManagerConfig {
    const loggingGroups = (config.logging?.groups ?? []).map(group => ({
      ...group,
      retentionInDays: group.retentionInDays ?? 365,
      removalPolicy: group.removalPolicy ?? 'retain'
    }));

    const validation: CertificateManagerValidationConfig = {
      method: config.validation?.method ?? 'DNS',
      hostedZoneId: config.validation?.hostedZoneId,
      hostedZoneName: config.validation?.hostedZoneName,
      validationEmails: config.validation?.validationEmails ?? []
    };

    const expirationAlarm = {
      ...DEFAULT_EXPIRATION_ALARM,
      ...config.monitoring?.expiration
    };
    if (expirationAlarm.periodHours === undefined) {
      expirationAlarm.periodHours = DEFAULT_EXPIRATION_ALARM.periodHours;
    }
    if (expirationAlarm.threshold === undefined) {
      expirationAlarm.threshold = DEFAULT_EXPIRATION_ALARM.threshold;
    }

    const statusAlarm = {
      ...DEFAULT_STATUS_ALARM,
      ...config.monitoring?.status
    };
    if (statusAlarm.periodMinutes === undefined) {
      statusAlarm.periodMinutes = DEFAULT_STATUS_ALARM.periodMinutes;
    }
    if (statusAlarm.threshold === undefined) {
      statusAlarm.threshold = DEFAULT_STATUS_ALARM.threshold;
    }

    return {
      domainName: config.domainName,
      subjectAlternativeNames: config.subjectAlternativeNames ?? [],
      validation,
      transparencyLoggingEnabled: config.transparencyLoggingEnabled ?? true,
      keyAlgorithm: (config.keyAlgorithm ?? 'RSA_2048') as CertificateKeyAlgorithm,
      logging: {
        groups: loggingGroups
      },
      monitoring: {
        enabled: config.monitoring?.enabled ?? false,
        expiration: expirationAlarm,
        status: statusAlarm
      },
      tags: config.tags ?? {}
    };
  }
}

export { CERTIFICATE_MANAGER_CONFIG_SCHEMA };
