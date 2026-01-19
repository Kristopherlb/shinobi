import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import schemaJson from '../Config.schema.json' with { type: 'json' };

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

export const CERTIFICATE_MANAGER_CONFIG_SCHEMA = schemaJson as ComponentConfigSchema;

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
            retentionInDays: 365,
            removalPolicy: 'retain'
          }
        ]
      },
      monitoring: {
        enabled: true,
        expiration: { ...DEFAULT_EXPIRATION_ALARM },
        status: { ...DEFAULT_STATUS_ALARM }
      },
      tags: {}
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
  protected getComplianceFrameworkDefaults(): Partial<CertificateManagerConfig> {
    // Check if highRiskEnvironment flag is set in component config or platform config
    const componentConfig = this.builderContext.spec.config as Partial<CertificateManagerConfig> | undefined;
    let isHighRisk = (componentConfig as any)?.highRiskEnvironment ?? false;
    
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
        logging: {
          groups: [
            {
              id: 'lifecycle',
              enabled: true,
              retentionInDays: 1095, // 3 years for high-risk environments
              removalPolicy: 'retain'
            }
          ]
        },
        monitoring: {
          enabled: true,
          expiration: {
            ...DEFAULT_EXPIRATION_ALARM,
            thresholdDays: 45, // Longer lead time for high-risk environments
            threshold: 45
          },
          status: {
            ...DEFAULT_STATUS_ALARM,
            evaluationPeriods: 5 // More evaluation periods for high-risk
          }
        }
      };
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  public buildSync(): CertificateManagerConfig {
    const resolved = super.buildSync() as CertificateManagerConfig;
    if (!resolved.domainName) {
      throw new Error('certificate-manager configuration requires a domainName');
    }

    // Validate domain name format
    this.validateDomainName(resolved.domainName);

    // Validate SAN domains if provided
    if (resolved.subjectAlternativeNames) {
      for (const san of resolved.subjectAlternativeNames) {
        this.validateDomainName(san, 'SAN');
      }
    }

    return this.normaliseConfig(resolved);
  }

  private validateDomainName(domain: string, label: 'Domain' | 'SAN' = 'Domain'): void {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      const prefix = label === 'SAN' ? 'SAN domain' : 'domain name';
      throw new Error(`Invalid ${prefix} format: ${domain}. Must be a valid FQDN.`);
    }
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

    if (validation.method === 'EMAIL' && (!validation.validationEmails || validation.validationEmails.length === 0)) {
      throw new Error('Email validation requires at least one validation email address.');
    }

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
        enabled: config.monitoring?.enabled ?? true,
        expiration: expirationAlarm,
        status: statusAlarm
      },
      tags: config.tags ?? {}
    };
  }
}
