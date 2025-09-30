import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
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
} from './certificate-manager.builder';

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
    this.logComponentEvent('synthesis_start', 'Starting Certificate Manager synthesis', {
      domainName: this.spec.config?.domainName
    });

    const builder = new CertificateManagerComponentConfigBuilder({
      context: this.context,
      spec: this.spec
    });
    this.config = builder.buildSync();

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

    this.registerCapability('security:certificate-manager', this.buildCapability());

    this.logComponentEvent('synthesis_complete', 'Certificate Manager synthesis complete', {
      certificateArn: this.certificate!.certificateArn,
      domainName: this.config.domainName,
      keyAlgorithm: this.config.keyAlgorithm
    });
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
    const props: acm.CertificateProps = {
      domainName: this.config.domainName,
      subjectAlternativeNames: this.config.subjectAlternativeNames,
      transparencyLoggingEnabled: this.config.transparencyLoggingEnabled,
      keyAlgorithm: this.mapKeyAlgorithm(this.config.keyAlgorithm),
      validation: this.buildValidationOptions()
    };

    this.certificate = new acm.Certificate(this, 'Certificate', props);

    this.applyStandardTags(this.certificate, {
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
        'alarm-type': 'certificate-expiration'
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
        'alarm-type': 'certificate-status'
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
      ...this.config.subjectAlternativeNames.reduce<Record<string, string | undefined>>((acc, domain, index) => {
        acc[domain] = emails[index] ?? emails[0];
        return acc;
      }, {})
    });
  }

  private mapKeyAlgorithm(algorithm: CertificateKeyAlgorithm): acm.KeyAlgorithm {
    switch (algorithm) {
      case 'EC_prime256v1':
        return acm.KeyAlgorithm.EC_PRIME_256_V1;
      case 'EC_secp384r1':
        return acm.KeyAlgorithm.EC_SECP_384_R1;
      case 'RSA_2048':
      default:
        return acm.KeyAlgorithm.RSA_2048;
    }
  }
}
