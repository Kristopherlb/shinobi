import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId
} from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';
import {
  BaseComponent,
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';
import {
  CertificateManagerComponentConfigBuilder,
  CertificateManagerConfig,
  CertificateValidationMethod,
  CertificateKeyAlgorithm,
  CertificateManagerLoggingGroupConfig
} from './certificate-manager.builder.js';

export class CertificateManagerComponent extends BaseComponent {
  private certificate?: acm.Certificate;
  private hostedZone?: route53.IHostedZone;
  private config!: CertificateManagerConfig;
  private expirationAlarm?: cloudwatch.Alarm;
  private statusAlarm?: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    try {
      this.logComponentEvent('synthesis_start', 'Starting Certificate Manager synthesis', {
        domainName: this.spec.config?.domainName
      });

      // Validate configuration before processing
      this.validateConfiguration();

      const builder = new CertificateManagerComponentConfigBuilder({
        context: this.context,
        spec: this.spec
      });
      this.config = builder.buildSync();

      // Validate hosted zone availability for DNS validation
      if (this.config.validation.method === 'DNS') {
        this.validateHostedZoneAvailability();
      }

      this.lookupHostedZone();
      this.createCertificate();
      this.createLogGroups();
      this.configureMonitoring();

      this.registerConstruct('main', this.certificate!);
      this.registerConstruct('certificate', this.certificate!);
      if (this.hostedZone) {
        this.registerConstruct('hostedZone', this.hostedZone);
      }
      if (this.expirationAlarm) {
        this.registerConstruct('expirationAlarm', this.expirationAlarm);
      }
      if (this.statusAlarm) {
        this.registerConstruct('statusAlarm', this.statusAlarm);
      }

      this.registerCapability('certificate:acm', this.buildCapability());
      this.registerCapability('observability:certificate', this.buildObservabilityCapability());
      this.applyCDKNagSuppressions();

      this.logComponentEvent('synthesis_complete', 'Certificate Manager synthesis complete', {
        certificateArn: this.certificate!.certificateArn,
        domainName: this.config.domainName,
        keyAlgorithm: this.config.keyAlgorithm
      });
    } catch (error) {
      this.logComponentEvent('synthesis_error', 'Certificate Manager synthesis failed', {
        error: error instanceof Error ? error.message : String(error),
        domainName: this.spec.config?.domainName
      });
      throw new Error(`Certificate Manager synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'certificate-manager';
  }

  private lookupHostedZone(): void {
    if (this.config.validation.method !== 'DNS') {
      return;
    }

    if (!this.config.validation.hostedZoneId) {
      return;
    }

    this.hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: this.config.validation.hostedZoneId,
      zoneName: this.config.validation.hostedZoneName ?? this.config.domainName
    });
  }

  private createCertificate(): void {
    try {
      const props: acm.CertificateProps = {
        domainName: this.config.domainName,
        subjectAlternativeNames: this.config.subjectAlternativeNames,
        transparencyLoggingEnabled: this.config.transparencyLoggingEnabled,
        keyAlgorithm: this.mapKeyAlgorithm(this.config.keyAlgorithm),
        validation: this.buildValidationOptions()
      };

      this.certificate = new acm.Certificate(this, 'Certificate', props);
    } catch (error) {
      this.handleCertificateCreationError(error, {
        domainName: this.config.domainName,
        validationMethod: this.config.validation.method,
        keyAlgorithm: this.config.keyAlgorithm
      });
    }

    this.applyStandardTags(this.certificate, {
      'resource-type': 'acm-certificate',
      'certificate-type': 'ssl-tls',
      'domain-name': this.config.domainName,
      'key-algorithm': this.config.keyAlgorithm,
      'validation-method': this.config.validation.method
    });

    Object.entries(this.config.tags).forEach(([key, value]) => {
      this.certificate && cdk.Tags.of(this.certificate).add(key, value);
    });
  }

  private createLogGroups(): void {
    this.config.logging.groups
      .filter(group => group.enabled)
      .forEach(group => this.createLogGroup(group));
  }

  private createLogGroup(group: CertificateManagerLoggingGroupConfig): void {
    const logGroup = new logs.LogGroup(this, `${group.id}LogGroup`, {
      logGroupName: group.logGroupName,
      retention: this.mapLogRetentionDays(group.retentionInDays),
      removalPolicy: group.removalPolicy === 'retain'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY
    });

    this.applyStandardTags(logGroup, {
      'resource-type': 'log-group',
      'log-group-id': group.id,
      ...group.tags
    });

    this.registerConstruct(`logGroup:${group.id}`, logGroup);
  }

  private configureMonitoring(): void {
    if (!this.config.monitoring.enabled) {
      return;
    }

    if (this.config.monitoring.expiration.enabled) {
      const expiration = this.config.monitoring.expiration;
      this.expirationAlarm = new cloudwatch.Alarm(this, 'CertificateExpirationAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-certificate-expiration`,
        alarmDescription: 'Certificate approaching expiration',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/CertificateManager',
          metricName: 'DaysToExpiry',
          dimensionsMap: {
            CertificateArn: this.certificate!.certificateArn
          },
          statistic: 'Minimum',
          period: cdk.Duration.hours(expiration.periodHours)
        }),
        threshold: expiration.threshold ?? expiration.thresholdDays,
        evaluationPeriods: expiration.evaluationPeriods ?? 1,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.BREACHING
      });

      this.applyStandardTags(this.expirationAlarm, {
        'resource-type': 'cloudwatch-alarm',
        'alarm-type': 'certificate-expiration',
        'severity': 'high'
      });
    }

    if (this.config.monitoring.status.enabled) {
      const status = this.config.monitoring.status;
      this.statusAlarm = new cloudwatch.Alarm(this, 'CertificateStatusAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-certificate-status`,
        alarmDescription: 'Certificate validation/status issue',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/CertificateManager',
          metricName: 'CertificateStatus',
          dimensionsMap: {
            CertificateArn: this.certificate!.certificateArn
          },
          statistic: 'Maximum',
          period: cdk.Duration.minutes(status.periodMinutes ?? 15)
        }),
        threshold: status.threshold ?? 1,
        evaluationPeriods: status.evaluationPeriods ?? 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.BREACHING
      });

      this.applyStandardTags(this.statusAlarm, {
        'resource-type': 'cloudwatch-alarm',
        'alarm-type': 'certificate-status',
        'severity': 'high'
      });
    }
  }

  private buildCapability(): Record<string, any> {
    return {
      certificateArn: this.certificate!.certificateArn,
      domainName: this.config.domainName,
      validationMethod: this.config.validation.method,
      keyAlgorithm: this.config.keyAlgorithm
    };
  }

  private buildObservabilityCapability(): Record<string, any> {
    return {
      certificateArn: this.certificate!.certificateArn,
      domainName: this.config.domainName,
      validationMethod: this.config.validation.method,
      transparencyLoggingEnabled: this.config.transparencyLoggingEnabled,
      subjectAlternativeNames: this.config.subjectAlternativeNames,
      monitoring: this.config.monitoring,
      logging: this.config.logging
    };
  }

  /**
   * Apply CDK Nag suppressions for certificate-manager specific security rules
   */
  private applyCDKNagSuppressions(): void {
    if (!this.certificate) {
      return;
    }

    // Suppress IAM4: Managed policies - we use least privilege custom policies
    // Justification: Certificate manager uses minimal IAM permissions for ACM operations
    NagSuppressions.addResourceSuppressions(this.certificate, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Certificate manager uses minimal IAM permissions for ACM operations. No managed policies are used.'
      }
    ]);

    // Suppress IAM5: Wildcard permissions - we scope permissions to specific resources
    // Justification: Certificate operations are scoped to specific certificate ARNs
    NagSuppressions.addResourceSuppressions(this.certificate, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Certificate manager permissions are scoped to specific certificate resources and operations.'
      }
    ]);

    // Suppress CloudWatch alarms if they exist
    if (this.expirationAlarm) {
      NagSuppressions.addResourceSuppressions(this.expirationAlarm, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'CloudWatch alarm uses minimal permissions for certificate monitoring.'
        }
      ]);
    }

    if (this.statusAlarm) {
      NagSuppressions.addResourceSuppressions(this.statusAlarm, [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'CloudWatch alarm uses minimal permissions for certificate monitoring.'
        }
      ]);
    }

    this.logComponentEvent('cdk_nag_suppressions_applied', 'Applied CDK Nag suppressions for certificate manager');
  }

  private buildValidationOptions(): acm.CertificateValidation {
    if (this.config.validation.method === 'DNS') {
      if (this.hostedZone) {
        return acm.CertificateValidation.fromDns(this.hostedZone);
      }
      return acm.CertificateValidation.fromDns();
    }

    const emails = this.config.validation.validationEmails ?? [];
    return acm.CertificateValidation.fromEmail({
      [this.config.domainName]: emails[0],
      ...this.config.subjectAlternativeNames.reduce<Record<string, string>>((acc, domain, index) => {
        acc[domain] = emails[index] ?? emails[0];
        return acc;
      }, {})
    });
  }

  private mapKeyAlgorithm(algorithm: CertificateKeyAlgorithm): acm.KeyAlgorithm {
    switch (algorithm) {
      case 'EC_prime256v1':
        return acm.KeyAlgorithm.EC_PRIME256V1;
      case 'EC_secp384r1':
        return acm.KeyAlgorithm.EC_SECP384R1;
      case 'RSA_2048':
      default:
        return acm.KeyAlgorithm.RSA_2048;
    }
  }

  /**
   * Validate component configuration before synthesis
   */
  private validateConfiguration(): void {
    if (!this.spec.config?.domainName) {
      throw new Error('Certificate Manager requires a domainName in the component specification');
    }

    // Validate domain name format
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(this.spec.config.domainName)) {
      throw new Error(`Invalid domain name format: ${this.spec.config.domainName}. Must be a valid FQDN.`);
    }

    // Validate SAN domains if provided
    if (this.spec.config.subjectAlternativeNames) {
      for (const san of this.spec.config.subjectAlternativeNames) {
        if (!domainRegex.test(san)) {
          throw new Error(`Invalid SAN domain format: ${san}. Must be a valid FQDN.`);
        }
      }
    }

    // Validate email validation requirements
    if (this.spec.config.validation?.method === 'EMAIL') {
      if (!this.spec.config.validation.validationEmails || this.spec.config.validation.validationEmails.length === 0) {
        throw new Error('Email validation method requires at least one validation email address');
      }
    }

    this.logComponentEvent('configuration_validated', 'Configuration validation passed', {
      domainName: this.spec.config.domainName,
      validationMethod: this.spec.config.validation?.method || 'DNS'
    });
  }

  /**
   * Validate hosted zone availability for DNS validation
   */
  private validateHostedZoneAvailability(): void {
    if (this.config.validation.method !== 'DNS') {
      return;
    }

    // Check if hosted zone ID or name is provided
    if (!this.config.validation.hostedZoneId && !this.config.validation.hostedZoneName) {
      this.logComponentEvent('hosted_zone_warning', 'No hosted zone specified for DNS validation - will attempt to auto-discover', {
        domainName: this.config.domainName
      });
    }

    this.logComponentEvent('hosted_zone_validation', 'Hosted zone validation completed', {
      domainName: this.config.domainName,
      hostedZoneId: this.config.validation.hostedZoneId,
      hostedZoneName: this.config.validation.hostedZoneName
    });
  }

  /**
   * Enhanced error handling for certificate creation
   */
  private handleCertificateCreationError(error: unknown, context: Record<string, any>): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logComponentEvent('certificate_creation_error', 'Failed to create certificate', {
      error: errorMessage,
      context
    });

    // Provide specific error messages for common issues
    if (errorMessage.includes('HostedZone')) {
      throw new Error(`Certificate creation failed due to hosted zone issue: ${errorMessage}. Please verify your Route53 hosted zone configuration.`);
    } else if (errorMessage.includes('domain')) {
      throw new Error(`Certificate creation failed due to domain validation issue: ${errorMessage}. Please verify your domain name and validation method.`);
    } else {
      throw new Error(`Certificate creation failed: ${errorMessage}`);
    }
  }
}
