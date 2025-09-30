/**
 * ElastiCache Redis Component
 *
 * Synthesizes an ElastiCache replication group using the platform configuration
 * precedence chain. Security, logging, and monitoring behaviour is completely
 * configuration-driven via the ElastiCacheRedisComponentConfigBuilder.
 */

import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
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
  ElastiCacheRedisComponentConfigBuilder,
  ElastiCacheRedisConfig,
  RedisAlarmThresholdConfig,
  RedisLogDeliveryConfig
} from './elasticache-redis.builder';

interface CreatedAlarm {
  id: string;
  alarm: cloudwatch.Alarm;
}

export class ElastiCacheRedisComponent extends BaseComponent {
  private replicationGroup?: elasticache.CfnReplicationGroup;
  private subnetGroup?: elasticache.CfnSubnetGroup;
  private securityGroup?: ec2.SecurityGroup;
  private parameterGroup?: elasticache.CfnParameterGroup;
  private authTokenSecret?: secretsmanager.ISecret;
  private authTokenValue?: string;
  private vpc?: ec2.IVpc;
  private config?: ElastiCacheRedisConfig;
  private readonly createdAlarms: CreatedAlarm[] = [];

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting ElastiCache Redis synthesis');

    try {
      const builder = new ElastiCacheRedisComponentConfigBuilder(this.context, this.spec);
      this.config = builder.buildSync();

      this.logComponentEvent('config_resolved', 'ElastiCache Redis configuration resolved', {
        engineVersion: this.config.engineVersion,
        nodeType: this.config.nodeType,
        encryptionAtRest: this.config.encryption.atRest,
        encryptionInTransit: this.config.encryption.inTransit,
        monitoringEnabled: this.config.monitoring.enabled
      });

      this.resolveVpc();
      this.createParameterGroupIfNeeded();
      this.createSubnetGroup();
      this.createSecurityGroupIfNeeded();
      this.configureAuthToken();
      this.createReplicationGroup();
      this.configureMonitoring();

      this.registerConstruct('main', this.replicationGroup!);
      this.registerConstruct('replicationGroup', this.replicationGroup!);

      if (this.subnetGroup) {
        this.registerConstruct('subnetGroup', this.subnetGroup);
      }

      if (this.securityGroup) {
        this.registerConstruct('securityGroup', this.securityGroup);
      }

      if (this.parameterGroup) {
        this.registerConstruct('parameterGroup', this.parameterGroup);
      }

      if (this.authTokenSecret instanceof secretsmanager.Secret) {
        this.registerConstruct('authToken', this.authTokenSecret);
      }

      this.createdAlarms.forEach(({ id, alarm }) => {
        this.registerConstruct(`alarm:${id}`, alarm);
      });

      this.registerCapability('cache:redis', this.buildCapability());

      this.logComponentEvent('synthesis_complete', 'ElastiCache Redis synthesis completed', {
        clusterName: this.getClusterName(),
        authTokenProvided: !!this.authTokenSecret,
        monitoringEnabled: this.config.monitoring.enabled
      });
    } catch (error) {
      this.logError(error as Error, 'elasticache-redis:synth', {
        componentName: this.spec.name
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'elasticache-redis';
  }

  private resolveVpc(): void {
    if (this.config!.vpc.vpcId) {
      this.vpc = ec2.Vpc.fromLookup(this, 'VpcLookup', {
        vpcId: this.config!.vpc.vpcId
      });
      return;
    }

    if (this.context.vpc) {
      this.vpc = this.context.vpc;
      return;
    }

    this.vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
      isDefault: true
    });
  }

  private createParameterGroupIfNeeded(): void {
    const parameters = this.config!.parameterGroup.parameters;
    if (!parameters || Object.keys(parameters).length === 0) {
      return;
    }

    this.parameterGroup = new elasticache.CfnParameterGroup(this, 'ParameterGroup', {
      cacheParameterGroupFamily: this.config!.parameterGroup.family,
      description: `Parameter group for ${this.getClusterName()}`,
      properties: parameters
    });

    this.applyStandardTags(this.parameterGroup, {
      'resource-type': 'parameter-group',
      family: this.config!.parameterGroup.family
    });

    this.logResourceCreation('elasticache-parameter-group', this.parameterGroup.ref);
  }

  private createSubnetGroup(): void {
    const providedSubnetIds = this.config!.vpc.subnetIds.length
      ? this.config!.vpc.subnetIds
      : this.vpc!.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds;

    this.subnetGroup = new elasticache.CfnSubnetGroup(this, 'SubnetGroup', {
      cacheSubnetGroupName: this.config!.vpc.subnetGroupName ?? `${this.getClusterName()}-subnet-group`,
      description: `Subnet group for ${this.getClusterName()}`,
      subnetIds: providedSubnetIds
    });

    this.applyStandardTags(this.subnetGroup, {
      'resource-type': 'subnet-group',
      'subnet-count': providedSubnetIds.length.toString()
    });

    this.logResourceCreation('elasticache-subnet-group', this.subnetGroup.cacheSubnetGroupName!);
  }

  private createSecurityGroupIfNeeded(): void {
    const security = this.config!.security;
    if (!security.create) {
      return;
    }

    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: this.vpc!,
      description: `Security group for ${this.getClusterName()}`,
      allowAllOutbound: false
    });

    const port = this.config!.port;
    security.allowedCidrs.forEach(cidr => {
      this.securityGroup!.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.tcp(port), `Redis access from ${cidr}`);
    });

    this.applyStandardTags(this.securityGroup, {
      'resource-type': 'security-group',
      'purpose': 'redis-access'
    });

    this.logResourceCreation('security-group', this.securityGroup.securityGroupId);
  }

  private configureAuthToken(): void {
    const authToken = this.config!.encryption.authToken;
    if (!authToken.enabled) {
      return;
    }

    if (authToken.secretArn) {
      this.authTokenSecret = secretsmanager.Secret.fromSecretCompleteArn(this, 'ImportedAuthToken', authToken.secretArn);
      this.authTokenValue = cdk.SecretValue.secretsManager(authToken.secretArn).unsafeUnwrap();
      return;
    }

    const secret = new secretsmanager.Secret(this, 'AuthToken', {
      description: authToken.description ?? `Redis AUTH token for ${this.getClusterName()}`,
      generateSecretString: {
        excludeCharacters: '"@/\\',
        passwordLength: 32,
        excludePunctuation: true
      },
      removalPolicy: authToken.removalPolicy === 'retain' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    this.applyStandardTags(secret, {
      'resource-type': 'secret',
      'purpose': 'redis-auth'
    });

    this.authTokenSecret = secret;
    this.authTokenValue = secret.secretValue.unsafeUnwrap();

    this.logResourceCreation('secret', secret.secretName);
  }

  private createReplicationGroup(): void {
    const logDeliveryConfigs = this.buildLogDeliveryConfigurations();

    this.replicationGroup = new elasticache.CfnReplicationGroup(this, 'ReplicationGroup', {
      replicationGroupId: this.getClusterName(),
      replicationGroupDescription: this.config!.description ?? `Redis cluster for ${this.context.serviceName}`,
      engine: 'redis',
      engineVersion: this.config!.engineVersion,
      cacheNodeType: this.config!.nodeType,
      numCacheClusters: this.config!.numCacheNodes,
      port: this.config!.port,
      cacheSubnetGroupName: this.subnetGroup!.cacheSubnetGroupName,
      securityGroupIds: this.composeSecurityGroupIds(),
      cacheParameterGroupName: this.parameterGroup?.ref,
      atRestEncryptionEnabled: this.config!.encryption.atRest,
      transitEncryptionEnabled: this.config!.encryption.inTransit,
      authToken: this.authTokenValue,
      snapshotRetentionLimit: this.config!.backup.enabled ? this.config!.backup.retentionDays : 0,
      snapshotWindow: this.config!.backup.enabled ? this.config!.backup.window : undefined,
      preferredMaintenanceWindow: this.config!.maintenance.window,
      notificationTopicArn: this.config!.maintenance.notificationTopicArn,
      multiAzEnabled: this.config!.multiAz.enabled,
      automaticFailoverEnabled: this.config!.multiAz.automaticFailover,
      logDeliveryConfigurations: logDeliveryConfigs.length ? logDeliveryConfigs : undefined
    });

    this.applyStandardTags(this.replicationGroup, {
      'resource-type': 'redis-cluster',
      'engine-version': this.config!.engineVersion,
      'node-type': this.config!.nodeType,
      ...this.config!.tags
    });

    this.logResourceCreation('elasticache-replication-group', this.getClusterName());
  }

  private configureMonitoring(): void {
    if (!this.config!.monitoring.enabled) {
      return;
    }

    const alarms = this.config!.monitoring.alarms;
    this.maybeCreateAlarm('cpuUtilization', alarms.cpuUtilization, {
      metricName: 'CPUUtilization',
      namespace: 'AWS/ElastiCache',
      statistic: 'Average'
    });
    this.maybeCreateAlarm('cacheMisses', alarms.cacheMisses, {
      metricName: 'CacheMisses',
      namespace: 'AWS/ElastiCache',
      statistic: 'Sum'
    });
    this.maybeCreateAlarm('evictions', alarms.evictions, {
      metricName: 'Evictions',
      namespace: 'AWS/ElastiCache',
      statistic: 'Sum'
    });
    this.maybeCreateAlarm('connections', alarms.connections, {
      metricName: 'CurrConnections',
      namespace: 'AWS/ElastiCache',
      statistic: 'Average'
    });

    this.logComponentEvent('observability_configured', 'Monitoring configured for ElastiCache Redis', {
      clusterName: this.getClusterName(),
      alarmsCreated: this.createdAlarms.length
    });
  }

  private maybeCreateAlarm(id: string, config: RedisAlarmThresholdConfig, metricProps: { metricName: string; namespace: string; statistic: string; }): void {
    if (!config.enabled) {
      return;
    }

    const alarm = new cloudwatch.Alarm(this, `${this.toPascal(id)}Alarm`, {
      alarmName: `${this.context.serviceName}-${this.spec.name}-${id}`,
      alarmDescription: `Alarm for Redis ${id}`,
      metric: new cloudwatch.Metric({
        namespace: metricProps.namespace,
        metricName: metricProps.metricName,
        statistic: metricProps.statistic,
        period: cdk.Duration.minutes(config.periodMinutes),
        dimensionsMap: {
          CacheClusterId: this.getClusterName()
        }
      }),
      threshold: config.threshold,
      evaluationPeriods: config.evaluationPeriods,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(alarm, {
      'alarm-type': id,
      threshold: config.threshold.toString()
    });

    this.createdAlarms.push({ id, alarm });
  }

  private buildLogDeliveryConfigurations(): elasticache.CfnReplicationGroup.LogDeliveryConfigurationProperty[] {
    const enabledConfigs = this.config!.monitoring.logDelivery.filter(entry => entry.enabled);
    return enabledConfigs.map((entry: RedisLogDeliveryConfig) => {
      const details: elasticache.CfnReplicationGroup.DestinationDetailsProperty = {};
      if (entry.destinationType === 'cloudwatch-logs') {
        details.cloudWatchLogsDetails = {
          logGroup: entry.destinationName
        };
      } else {
        details.kinesisFirehoseDetails = {
          deliveryStream: entry.destinationName
        };
      }

      return {
        logType: entry.logType,
        destinationType: entry.destinationType,
        destinationDetails: details,
        logFormat: entry.logFormat
      };
    });
  }

  private composeSecurityGroupIds(): string[] {
    const ids = [...this.config!.security.securityGroupIds];
    if (this.securityGroup) {
      ids.push(this.securityGroup.securityGroupId);
    }
    return ids;
  }

  private buildCapability(): Record<string, any> {
    return {
      clusterId: this.replicationGroup!.replicationGroupId,
      clusterName: this.getClusterName(),
      engineVersion: this.config!.engineVersion,
      nodeType: this.config!.nodeType,
      primaryEndpoint: this.replicationGroup!.attrPrimaryEndPointAddress,
      readerEndpoint: this.replicationGroup!.attrReaderEndPointAddress,
      port: this.config!.port,
      authTokenSecretArn: this.authTokenSecret?.secretArn,
      multiAz: this.config!.multiAz.enabled
    };
  }

  private getClusterName(): string {
    return this.config!.clusterName ?? `${this.context.serviceName}-${this.spec.name}`;
  }

  private toPascal(value: string): string {
    return value
      .split(/[^a-zA-Z0-9]/)
      .filter(Boolean)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join('');
  }
}
