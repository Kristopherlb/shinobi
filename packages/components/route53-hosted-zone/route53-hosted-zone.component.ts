import * as route53 from 'aws-cdk-lib/aws-route53';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';
import {
  Route53HostedZoneComponentConfigBuilder,
  Route53HostedZoneConfig,
  HostedZoneAlarmConfig,
  VpcAssociationConfig
} from './route53-hosted-zone.builder.ts';

export class Route53HostedZoneComponent extends Component {
  private hostedZone?: route53.HostedZone | route53.PrivateHostedZone;
  private queryLogGroup?: logs.ILogGroup;
  private config?: Route53HostedZoneConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    const builder = new Route53HostedZoneComponentConfigBuilder(this.context, this.spec);
    this.config = builder.buildSync();

    this.logComponentEvent('config_resolved', 'Resolved hosted zone configuration', {
      zoneName: this.config.zoneName,
      zoneType: this.config.zoneType,
      queryLogging: this.config.queryLogging.enabled,
      vpcCount: this.config.vpcAssociations.length,
      hardeningProfile: this.config.hardeningProfile
    });

    this.queryLogGroup = this.configureQueryLogging();
    this.hostedZone = this.createHostedZone();
    this.enableDnssecIfRequested();
    this.configureMonitoring();

    this.hostedZone.applyRemovalPolicy(this.config.removalPolicy === 'destroy'
      ? cdk.RemovalPolicy.DESTROY
      : cdk.RemovalPolicy.RETAIN);

    this.applyStandardTags(this.hostedZone, {
      'zone-type': this.config.zoneType,
      'zone-name': this.config.zoneName,
      'query-logging': this.config.queryLogging.enabled.toString(),
      'hardening-profile': this.config.hardeningProfile,
      ...this.config.tags
    });

    this.registerConstruct('main', this.hostedZone);
    this.registerConstruct('hostedZone', this.hostedZone);
    if (this.queryLogGroup && this.queryLogGroup instanceof Construct) {
      this.registerConstruct('queryLogGroup', this.queryLogGroup as Construct);
    }

    this.registerCapability('dns:hosted-zone', this.buildCapability());

    this.logComponentEvent('synthesis_complete', 'Route53 hosted zone synthesis complete', {
      zoneName: this.config.zoneName,
      zoneType: this.config.zoneType
    });
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'route53-hosted-zone';
  }

  private configureQueryLogging(): logs.ILogGroup | undefined {
    if (!this.config!.queryLogging.enabled) {
      return undefined;
    }

    if (this.config!.queryLogging.logGroupArn) {
      return logs.LogGroup.fromLogGroupArn(this, 'ImportedQueryLogGroup', this.config!.queryLogging.logGroupArn);
    }

    const logGroupName = this.config!.queryLogging.logGroupName
      ?? `/aws/route53/${this.config!.zoneName.replace(/\./g, '-')}`;

    const logGroup = new logs.LogGroup(this, 'QueryLogGroup', {
      logGroupName,
      retention: this.mapLogRetention(this.config!.queryLogging.retentionDays),
      removalPolicy: this.config!.queryLogging.removalPolicy === 'retain'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY
    });

    this.applyStandardTags(logGroup, {
      'log-type': 'dns-query',
      'zone-name': this.config!.zoneName
    });

    return logGroup;
  }

  private createHostedZone(): route53.HostedZone | route53.PrivateHostedZone {
    const baseProps = {
      zoneName: this.config!.zoneName,
      comment: this.config!.comment
    };

    if (this.config!.zoneType === 'private') {
      if (this.config!.vpcAssociations.length === 0) {
        throw new Error('Private hosted zones require at least one VPC association.');
      }

      const [primaryVpc, ...additionalVpcs] = this.lookupVpcs(this.config!.vpcAssociations);

      const privateZone = new route53.PrivateHostedZone(this, 'PrivateHostedZone', {
        ...baseProps,
        vpc: primaryVpc
      });

      additionalVpcs.forEach((vpc, index) => {
        privateZone.addVpc(vpc, { vpcRegion: this.config!.vpcAssociations[index + 1].region });
      });

      if (this.queryLogGroup) {
        privateZone.logQueryLogs(this.queryLogGroup);
      }

      return privateZone;
    }

    const publicZone = new route53.PublicHostedZone(this, 'PublicHostedZone', {
      ...baseProps
    });

    if (this.queryLogGroup) {
      publicZone.logQueryLogs(this.queryLogGroup);
    }

    return publicZone;
  }

  private lookupVpcs(associations: VpcAssociationConfig[]): ec2.IVpc[] {
    return associations.map((association, index) =>
      ec2.Vpc.fromLookup(this, `HostedZoneVpc${index}`, {
        vpcId: association.vpcId,
        region: association.region
      })
    );
  }

  private enableDnssecIfRequested(): void {
    if (!this.config!.dnssec.enabled) {
      return;
    }

    new route53.CfnDNSSEC(this, 'HostedZoneDnssec', {
      hostedZoneId: this.hostedZone!.hostedZoneId
    });
  }

  private configureMonitoring(): void {
    if (!this.config!.monitoring.enabled) {
      return;
    }

    const alarms: Array<{ id: string; metric: cloudwatch.Metric; config: HostedZoneAlarmConfig; defaultThreshold: number }> = [
      {
        id: 'QueryVolumeAlarm',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Route53',
          metricName: 'QueryCount',
          statistic: this.config!.monitoring.alarms.queryVolume.statistic ?? 'Sum',
          period: cdk.Duration.minutes(this.config!.monitoring.alarms.queryVolume.periodMinutes ?? 5),
          dimensionsMap: {
            HostedZoneId: this.hostedZone!.hostedZoneId
          }
        }),
        config: this.config!.monitoring.alarms.queryVolume,
        defaultThreshold: 10000
      },
      {
        id: 'HealthCheckFailuresAlarm',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Route53',
          metricName: 'HealthCheckStatus',
          statistic: this.config!.monitoring.alarms.healthCheckFailures.statistic ?? 'Average',
          period: cdk.Duration.minutes(this.config!.monitoring.alarms.healthCheckFailures.periodMinutes ?? 5),
          dimensionsMap: {
            HostedZoneId: this.hostedZone!.hostedZoneId
          }
        }),
        config: this.config!.monitoring.alarms.healthCheckFailures,
        defaultThreshold: 1
      }
    ];

    alarms.forEach(alarm => {
      if (!alarm.config.enabled) {
        return;
      }

      const hostedZoneAlarm = new cloudwatch.Alarm(this, alarm.id, {
        alarmName: `${this.context.serviceName}-${this.spec.name}-${this.toKebabCase(alarm.id)}`,
        alarmDescription: `Hosted zone alarm for ${alarm.id}`,
        metric: alarm.metric,
        threshold: alarm.config.threshold ?? alarm.defaultThreshold,
        evaluationPeriods: alarm.config.evaluationPeriods ?? 1,
        comparisonOperator: this.mapComparisonOperator(alarm.config.comparisonOperator ?? 'gt'),
        treatMissingData: this.mapTreatMissingData(alarm.config.treatMissingData ?? 'not-breaching')
      });

      this.applyStandardTags(hostedZoneAlarm, {
        'resource-type': 'cloudwatch-alarm',
        'alarm-id': alarm.id,
        ...alarm.config.tags
      });
    });
  }

  private buildCapability(): Record<string, any> {
    const nameServers = 'hostedZoneNameServers' in this.hostedZone!
      ? (this.hostedZone as route53.HostedZone).hostedZoneNameServers
      : undefined;

    return {
      hostedZoneId: this.hostedZone!.hostedZoneId,
      zoneName: this.config!.zoneName,
      zoneType: this.config!.zoneType,
      dnssecEnabled: this.config!.dnssec.enabled,
      nameServers
    };
  }

  private mapLogRetention(days: number): logs.RetentionDays {
    const retentionMap: Record<number, logs.RetentionDays> = {
      1: logs.RetentionDays.ONE_DAY,
      3: logs.RetentionDays.THREE_DAYS,
      7: logs.RetentionDays.ONE_WEEK,
      14: logs.RetentionDays.TWO_WEEKS,
      30: logs.RetentionDays.ONE_MONTH,
      60: logs.RetentionDays.TWO_MONTHS,
      90: logs.RetentionDays.THREE_MONTHS,
      120: logs.RetentionDays.FOUR_MONTHS,
      150: logs.RetentionDays.FIVE_MONTHS,
      180: logs.RetentionDays.SIX_MONTHS,
      365: logs.RetentionDays.ONE_YEAR,
      400: logs.RetentionDays.THIRTEEN_MONTHS,
      545: logs.RetentionDays.EIGHTEEN_MONTHS,
      731: logs.RetentionDays.TWO_YEARS,
      1827: logs.RetentionDays.FIVE_YEARS,
      3650: logs.RetentionDays.TEN_YEARS
    };

    return retentionMap[days] ?? logs.RetentionDays.THREE_MONTHS;
  }

  private mapComparisonOperator(operator: string): cloudwatch.ComparisonOperator {
    switch (operator) {
      case 'lt':
        return cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;
      case 'lte':
        return cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'gte':
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'gt':
      default:
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
    }
  }

  private mapTreatMissingData(mode: string): cloudwatch.TreatMissingData {
    switch (mode) {
      case 'breaching':
        return cloudwatch.TreatMissingData.BREACHING;
      case 'ignore':
        return cloudwatch.TreatMissingData.IGNORE;
      case 'missing':
        return cloudwatch.TreatMissingData.MISSING;
      default:
        return cloudwatch.TreatMissingData.NOT_BREACHING;
    }
  }

  private toKebabCase(value: string): string {
    return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
