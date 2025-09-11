/**
 * Certificate Manager Component
 * 
 * AWS Certificate Manager for SSL/TLS certificate provisioning and management.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
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

/**
 * Configuration interface for Certificate Manager component
 */
export interface CertificateManagerConfig {
  /** Domain name for the certificate (required) */
  domainName: string;
  
  /** Subject alternative names */
  subjectAlternativeNames?: string[];
  
  /** Validation method */
  validation?: {
    method: 'DNS' | 'EMAIL';
    /** Route53 hosted zone for DNS validation (required for DNS validation) */
    hostedZone?: string;
    /** Email addresses for email validation */
    validationEmails?: string[];
  };
  
  /** Certificate transparency logging */
  transparencyLoggingEnabled?: boolean;
  
  /** Key algorithm */
  keyAlgorithm?: 'RSA_2048' | 'EC_prime256v1' | 'EC_secp384r1';
  
  /** Tags for the certificate */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for Certificate Manager component
 */
export const CERTIFICATE_MANAGER_CONFIG_SCHEMA = {
  type: 'object',
  title: 'Certificate Manager Configuration',
  description: 'Configuration for creating an SSL/TLS certificate',
  required: ['domainName'],
  properties: {
    domainName: {
      type: 'string',
      description: 'Primary domain name for the certificate',
      pattern: '^[a-zA-Z0-9*.-]+$',
      minLength: 1,
      maxLength: 253
    },
    subjectAlternativeNames: {
      type: 'array',
      description: 'Subject alternative names (additional domains)',
      items: {
        type: 'string',
        pattern: '^[a-zA-Z0-9*.-]+$'
      },
      default: []
    },
    validation: {
      type: 'object',
      description: 'Certificate validation configuration',
      properties: {
        method: {
          type: 'string',
          description: 'Validation method',
          enum: ['DNS', 'EMAIL'],
          default: 'DNS'
        },
        hostedZone: {
          type: 'string',
          description: 'Route53 hosted zone ID for DNS validation'
        },
        validationEmails: {
          type: 'array',
          description: 'Email addresses for email validation',
          items: {
            type: 'string',
            format: 'email'
          }
        }
      },
      additionalProperties: false,
      default: { method: 'DNS' }
    },
    transparencyLoggingEnabled: {
      type: 'boolean',
      description: 'Enable certificate transparency logging',
      default: true
    },
    keyAlgorithm: {
      type: 'string',
      description: 'Key algorithm for the certificate',
      enum: ['RSA_2048', 'EC_prime256v1', 'EC_secp384r1'],
      default: 'RSA_2048'
    },
    tags: {
      type: 'object',
      description: 'Tags for the certificate',
      additionalProperties: {
        type: 'string'
      },
      default: {}
    }
  },
  additionalProperties: false,
  defaults: {
    subjectAlternativeNames: [],
    validation: { method: 'DNS' },
    transparencyLoggingEnabled: true,
    keyAlgorithm: 'RSA_2048',
    tags: {}
  }
};

/**
 * Configuration builder for Certificate Manager component
 */
export class CertificateManagerConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<CertificateManagerConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): CertificateManagerConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as CertificateManagerConfig;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Get platform-wide defaults for Certificate Manager
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      validation: {
        method: 'DNS' // Prefer DNS validation for automation
      },
      transparencyLoggingEnabled: true,
      keyAlgorithm: this.getDefaultKeyAlgorithm(),
      tags: {
        'service': this.context.serviceName,
        'environment': this.context.environment
      }
    };
  }

  /**
   * Get compliance framework specific defaults
   */
  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          keyAlgorithm: 'RSA_2048', // Required minimum strength
          transparencyLoggingEnabled: true, // Required for compliance
          tags: {
            'compliance-framework': 'fedramp-moderate',
            'certificate-use': 'secure-communication',
            'security-classification': 'controlled'
          }
        };
        
      case 'fedramp-high':
        return {
          keyAlgorithm: 'EC_secp384r1', // Higher strength for FedRAMP High
          transparencyLoggingEnabled: true, // Mandatory
          tags: {
            'compliance-framework': 'fedramp-high',
            'certificate-use': 'secure-communication',
            'security-classification': 'confidential',
            'key-strength': 'high'
          }
        };
        
      default: // commercial
        return {
          keyAlgorithm: 'RSA_2048'
        };
    }
  }

  /**
   * Get default key algorithm based on compliance framework
   */
  private getDefaultKeyAlgorithm(): string {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 'EC_secp384r1'; // Elliptic curve for high security
      case 'fedramp-moderate':
        return 'RSA_2048'; // RSA 2048 for moderate
      default:
        return 'RSA_2048'; // Standard RSA
    }
  }
}

/**
 * Certificate Manager Component implementing Component API Contract v1.0
 */
export class CertificateManagerComponent extends Component {
  private certificate?: acm.Certificate;
  private hostedZone?: route53.IHostedZone;
  private config?: CertificateManagerConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create SSL/TLS certificate with compliance hardening
   */
  public synth(): void {
    // Log component synthesis start
    this.logComponentEvent('synthesis_start', 'Starting Certificate Manager component synthesis', {
      domainName: this.spec.config?.domainName,
      validationMethod: this.spec.config?.validation?.method
    });
    
    const startTime = Date.now();
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new CertificateManagerConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Log configuration built
      this.logComponentEvent('config_built', 'Certificate Manager configuration built successfully', {
        domainName: this.config.domainName,
        keyAlgorithm: this.config.keyAlgorithm,
        validationMethod: this.config.validation?.method
      });
      
      // Lookup hosted zone if DNS validation
      this.lookupHostedZoneIfNeeded();
    
      // Create SSL/TLS certificate
      this.createCertificate();
    
      // Apply compliance hardening
      this.applyComplianceHardening();
    
      // Configure observability
      this.configureObservabilityForCertificate();
    
      // Register constructs
      this.registerConstruct('certificate', this.certificate!);
      if (this.hostedZone) {
        this.registerConstruct('hostedZone', this.hostedZone);
      }
    
      // Register capabilities
      this.registerCapability('certificate:acm', this.buildCertificateCapability());
    
      // Log successful synthesis completion
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'Certificate Manager component synthesis completed successfully', {
        certificateCreated: 1,
        domainName: this.config.domainName,
        keyAlgorithm: this.config.keyAlgorithm
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'certificate-manager',
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
    return 'certificate-manager';
  }

  /**
   * Lookup hosted zone for DNS validation if required
   */
  private lookupHostedZoneIfNeeded(): void {
    if (this.config!.validation?.method === 'DNS' && this.config!.validation?.hostedZone) {
      this.hostedZone = route53.HostedZone.fromHostedZoneId(
        this, 'HostedZone', 
        this.config!.validation.hostedZone
      );
    }
  }

  /**
   * Create the SSL/TLS certificate
   */
  private createCertificate(): void {
    let certificateProps: acm.CertificateProps;

    // Configure validation based on method
    if (this.config!.validation?.method === 'DNS' && this.hostedZone) {
      // DNS validation with Route53
      certificateProps = {
        domainName: this.config!.domainName,
        subjectAlternativeNames: this.config!.subjectAlternativeNames,
        validation: acm.CertificateValidation.fromDns(this.hostedZone),
        keyAlgorithm: this.mapKeyAlgorithm(this.config!.keyAlgorithm!),
        transparencyLoggingEnabled: this.config!.transparencyLoggingEnabled
      };
    } else if (this.config!.validation?.method === 'DNS') {
      // DNS validation without hosted zone (manual)
      certificateProps = {
        domainName: this.config!.domainName,
        subjectAlternativeNames: this.config!.subjectAlternativeNames,
        validation: acm.CertificateValidation.fromDns(),
        keyAlgorithm: this.mapKeyAlgorithm(this.config!.keyAlgorithm!),
        transparencyLoggingEnabled: this.config!.transparencyLoggingEnabled
      };
    } else {
      // Email validation
      certificateProps = {
        domainName: this.config!.domainName,
        subjectAlternativeNames: this.config!.subjectAlternativeNames,
        validation: acm.CertificateValidation.fromEmail(
          this.config!.validation?.validationEmails 
            ? Object.fromEntries(
                [this.config!.domainName, ...(this.config!.subjectAlternativeNames || [])]
                  .map((domain, index) => [
                    domain, 
                    this.config!.validation!.validationEmails![index] || 
                    this.config!.validation!.validationEmails![0]
                  ])
              )
            : undefined
        ),
        keyAlgorithm: this.mapKeyAlgorithm(this.config!.keyAlgorithm!),
        transparencyLoggingEnabled: this.config!.transparencyLoggingEnabled
      };
    }

    this.certificate = new acm.Certificate(this, 'Certificate', certificateProps);

    // Apply standard tags
    this.applyStandardTags(this.certificate, {
      'certificate-type': 'ssl-tls',
      'domain-name': this.config!.domainName,
      'key-algorithm': this.config!.keyAlgorithm!,
      'validation-method': this.config!.validation?.method || 'DNS',
      'transparency-logging': this.config!.transparencyLoggingEnabled!.toString()
    });

    // Apply additional user tags
    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.certificate!).add(key, value);
      });
    }
    
    // Log certificate creation
    this.logResourceCreation('acm-certificate', this.config!.domainName, {
      domainName: this.config!.domainName,
      keyAlgorithm: this.config!.keyAlgorithm,
      sanCount: this.config!.subjectAlternativeNames?.length || 0,
      validationMethod: this.config!.validation?.method
    });
  }

  /**
   * Map key algorithm string to ACM KeyAlgorithm enum
   */
  private mapKeyAlgorithm(algorithm: string): acm.KeyAlgorithm {
    switch (algorithm) {
      case 'RSA_2048':
        return acm.KeyAlgorithm.RSA_2048;
      case 'EC_prime256v1':
        return acm.KeyAlgorithm.EC_PRIME_256_V1;
      case 'EC_secp384r1':
        return acm.KeyAlgorithm.EC_SECP_384_R1;
      default:
        return acm.KeyAlgorithm.RSA_2048;
    }
  }

  /**
   * Apply compliance-specific hardening
   */
  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }

  private applyCommercialHardening(): void {
    // Basic certificate logging for commercial
    if (this.certificate) {
      const logGroup = new logs.LogGroup(this, 'CertificateLogGroup', {
        logGroupName: `/aws/acm/${this.config!.domainName.replace(/[.*]/g, '-')}`,
        retention: logs.RetentionDays.SIX_MONTHS,
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });

      // Apply standard tags
      this.applyStandardTags(logGroup, {
        'log-type': 'certificate-lifecycle',
        'retention': '6-months',
        'domain': this.config!.domainName
      });
    }
  }

  private applyFedrampModerateHardening(): void {
    // Apply commercial hardening
    this.applyCommercialHardening();

    if (this.certificate) {
      // Enhanced logging for compliance
      const complianceLogGroup = new logs.LogGroup(this, 'ComplianceCertificateLogGroup', {
        logGroupName: `/aws/acm/${this.config!.domainName.replace(/[.*]/g, '-')}/compliance`,
        retention: logs.RetentionDays.ONE_YEAR,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      // Apply standard tags
      this.applyStandardTags(complianceLogGroup, {
        'log-type': 'compliance-certificate',
        'retention': '1-year',
        'compliance': 'fedramp-moderate'
      });
    }
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    if (this.certificate) {
      // Extended audit logging for high compliance
      const auditLogGroup = new logs.LogGroup(this, 'AuditCertificateLogGroup', {
        logGroupName: `/aws/acm/${this.config!.domainName.replace(/[.*]/g, '-')}/audit`,
        retention: logs.RetentionDays.TEN_YEARS,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      // Apply standard tags
      this.applyStandardTags(auditLogGroup, {
        'log-type': 'audit-certificate',
        'retention': '10-years',
        'compliance': 'fedramp-high'
      });
    }
  }

  /**
   * Build certificate capability data shape
   */
  private buildCertificateCapability(): any {
    return {
      certificateArn: this.certificate!.certificateArn,
      domainName: this.config!.domainName
    };
  }

  /**
   * Configure CloudWatch observability for Certificate Manager
   */
  private configureObservabilityForCertificate(): void {
    // Enable monitoring for compliance frameworks only
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const domainName = this.config!.domainName;

    // 1. Certificate Expiration Alarm
    const expirationAlarm = new cloudwatch.Alarm(this, 'CertificateExpirationAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-certificate-expiration`,
      alarmDescription: 'Certificate nearing expiration alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CertificateManager',
        metricName: 'DaysToExpiry',
        dimensionsMap: {
          CertificateArn: this.certificate!.certificateArn
        },
        statistic: 'Minimum',
        period: cdk.Duration.hours(6)
      }),
      threshold: 30, // Alert 30 days before expiration
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING
    });

    // Apply standard tags
    this.applyStandardTags(expirationAlarm, {
      'alarm-type': 'certificate-expiration',
      'metric-type': 'lifecycle',
      'threshold': '30'
    });

    // 2. Certificate Status Alarm
    const statusAlarm = new cloudwatch.Alarm(this, 'CertificateStatusAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-certificate-status`,
      alarmDescription: 'Certificate validation or status issue alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CertificateManager',
        metricName: 'CertificateStatus',
        dimensionsMap: {
          CertificateArn: this.certificate!.certificateArn
        },
        statistic: 'Maximum',
        period: cdk.Duration.minutes(15)
      }),
      threshold: 1, // Alert on any status other than issued (0)
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING
    });

    // Apply standard tags
    this.applyStandardTags(statusAlarm, {
      'alarm-type': 'certificate-status',
      'metric-type': 'health',
      'threshold': '1'
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to Certificate Manager', {
      alarmsCreated: 2,
      domainName: domainName,
      monitoringEnabled: true
    });
  }
}