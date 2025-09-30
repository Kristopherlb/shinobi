import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

import {
  BaseComponent,
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';

import {
  WafWebAclComponentConfigBuilder,
  WafWebAclComponentConfig,
  WafManagedRuleGroupConfig,
  WafCustomRuleConfig,
  WafCustomRuleStatementConfig,
  WafAlarmConfig,
  AlarmComparisonOperator,
  AlarmTreatMissingData
} from './waf-web-acl.builder';

export class WafWebAclComponent extends BaseComponent {
  private config?: WafWebAclComponentConfig;
  private webAcl?: wafv2.CfnWebACL;
  private logGroup?: logs.LogGroup;
  private loggingConfiguration?: wafv2.CfnLoggingConfiguration;
  private logDestinationArn?: string;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public getType(): string {
    return 'waf-web-acl';
  }

  public synth(): void {
    const builder = new WafWebAclComponentConfigBuilder({
      context: this.context,
      spec: this.spec
    });

    this.config = builder.buildSync();

    this.logComponentEvent('config_resolved', 'Resolved WAF Web ACL configuration', {
      scope: this.config.scope,
      defaultAction: this.config.defaultAction,
      managedRuleGroups: this.config.managedRuleGroups.length,
      customRules: this.config.customRules.length
    });

    this.configureLoggingDestination();
    this.createWebAcl();
    this.configureLogging();
    this.configureMonitoring();
    this.registerResources();
    this.registerCapabilities();

    this.logComponentEvent('synthesis_complete', 'WAF Web ACL synthesis complete', {
      webAclArn: this.webAcl?.attrArn,
      loggingConfigured: !!this.loggingConfiguration
    });
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  private configureLoggingDestination(): void {
    if (!this.config?.logging.enabled) {
      return;
    }

    if (this.config.logging.destinationType === 'cloudwatch') {
      this.logGroup = new logs.LogGroup(this, 'WafLogGroup', {
        logGroupName: this.config.logging.logGroupName,
        retention: this.mapLogRetentionDays(this.config.logging.retentionDays),
        removalPolicy: this.config.removalPolicy === 'retain'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY
      });

      this.applyStandardTags(this.logGroup, {
        'log-type': 'waf',
        ...this.config.tags
      });

      this.logDestinationArn = this.logGroup.logGroupArn;
      return;
    }

    this.logDestinationArn = this.config.logging.destinationArn;
  }

  private createWebAcl(): void {
    if (!this.config) {
      throw new Error('WAF configuration not resolved before synthesis');
    }

    const rules: wafv2.CfnWebACL.RuleProperty[] = [
      ...this.config.managedRuleGroups.map((group) => this.buildManagedRule(group)),
      ...this.config.customRules.map((rule) => this.buildCustomRule(rule))
    ];

    this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: this.config.name,
      description: this.config.description ?? `Web ACL for ${this.spec.name}`,
      scope: this.config.scope,
      defaultAction: {
        [this.config.defaultAction]: {}
      },
      rules,
      visibilityConfig: this.buildVisibilityConfig(`${this.spec.name}WebAcl`)
    });

    this.webAcl.applyRemovalPolicy(
      this.config.removalPolicy === 'retain'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY
    );

    this.applyStandardTags(this.webAcl, {
      'waf-scope': this.config.scope,
      'default-action': this.config.defaultAction,
      ...this.config.tags
    });
  }

  private configureLogging(): void {
    if (!this.config?.logging.enabled || !this.webAcl) {
      return;
    }

    if (!this.logDestinationArn) {
      this.logComponentEvent('logging_skipped', 'WAF logging enabled but no destination provided', {
        destinationType: this.config.logging.destinationType
      });
      return;
    }

    this.loggingConfiguration = new wafv2.CfnLoggingConfiguration(this, 'LoggingConfiguration', {
      resourceArn: this.webAcl.attrArn,
      logDestinationConfigs: [this.logDestinationArn],
      redactedFields: this.config.logging.redactedFields.map((field) => this.mapRedactedField(field))
    });

    this.loggingConfiguration.addDependency(this.webAcl);
  }

  private configureMonitoring(): void {
    if (!this.config?.monitoring.enabled || !this.webAcl) {
      return;
    }

    const namespace = 'AWS/WAFV2';
    const dimensions = {
      WebACL: this.webAcl.name ?? this.config.name,
      Region: this.context.region ?? cdk.Stack.of(this).region
    };

    const blockedAlarm = this.config.monitoring.alarms.blockedRequests;
    if (blockedAlarm.enabled) {
      const alarm = this.createAlarm('BlockedRequestsAlarm', blockedAlarm, new cloudwatch.Metric({
        namespace,
        metricName: 'BlockedRequests',
        dimensionsMap: dimensions,
        statistic: blockedAlarm.statistic,
        period: cdk.Duration.minutes(blockedAlarm.periodMinutes)
      }));

      this.applyStandardTags(alarm, {
        'alarm-type': 'waf-blocked-requests',
        ...blockedAlarm.tags,
        ...this.config.tags
      });
    }

    const allowedAlarm = this.config.monitoring.alarms.allowedRequests;
    if (allowedAlarm.enabled) {
      const alarm = this.createAlarm('AllowedRequestsAlarm', allowedAlarm, new cloudwatch.Metric({
        namespace,
        metricName: 'AllowedRequests',
        dimensionsMap: dimensions,
        statistic: allowedAlarm.statistic,
        period: cdk.Duration.minutes(allowedAlarm.periodMinutes)
      }));

      this.applyStandardTags(alarm, {
        'alarm-type': 'waf-allowed-requests',
        ...allowedAlarm.tags,
        ...this.config.tags
      });
    }
  }

  private createAlarm(id: string, config: WafAlarmConfig, metric: cloudwatch.IMetric): cloudwatch.Alarm {
    return new cloudwatch.Alarm(this, id, {
      metric,
      evaluationPeriods: config.evaluationPeriods,
      threshold: config.threshold,
      comparisonOperator: this.mapComparisonOperator(config.comparisonOperator),
      treatMissingData: this.mapTreatMissingData(config.treatMissingData),
      alarmDescription: `WAF alarm for ${this.spec.name}`
    });
  }

  private registerResources(): void {
    if (!this.webAcl) {
      return;
    }

    this.registerConstruct('main', this.webAcl);
    this.registerConstruct('webAcl', this.webAcl);

    if (this.logGroup) {
      this.registerConstruct('logGroup', this.logGroup);
    }

    if (this.loggingConfiguration) {
      this.registerConstruct('loggingConfiguration', this.loggingConfiguration);
    }
  }

  private registerCapabilities(): void {
    if (!this.webAcl || !this.config) {
      return;
    }

    this.registerCapability('security:waf-web-acl', {
      webAclId: this.webAcl.attrId,
      webAclArn: this.webAcl.attrArn,
      scope: this.config.scope,
      defaultAction: this.config.defaultAction
    });

    this.registerCapability('waf:web-acl', {
      id: this.webAcl.attrId,
      arn: this.webAcl.attrArn,
      name: this.config.name,
      scope: this.config.scope,
      managedRuleGroups: this.config.managedRuleGroups.length,
      customRules: this.config.customRules.length
    });

    this.registerCapability('monitoring:waf-web-acl', {
      metricsNamespace: 'AWS/WAFV2',
      webAclName: this.config.name,
      loggingDestinationArn: this.logDestinationArn
    });

    this.registerCapability('protection:web-application', {
      provider: 'waf-web-acl',
      loggingEnabled: this.config.logging.enabled,
      scope: this.config.scope,
      rules: this.config.managedRuleGroups.length + this.config.customRules.length
    });
  }

  private buildManagedRule(group: WafManagedRuleGroupConfig): wafv2.CfnWebACL.RuleProperty {
    return {
      name: group.name,
      priority: group.priority,
      overrideAction: {
        [group.overrideAction]: {}
      },
      statement: {
        managedRuleGroupStatement: {
          name: group.name,
          vendorName: group.vendorName,
          excludedRules: group.excludedRules.map((rule) => ({ name: rule }))
        }
      },
      visibilityConfig: this.buildVisibilityConfig(group.visibility.metricName)
    };
  }

  private buildCustomRule(rule: WafCustomRuleConfig): wafv2.CfnWebACL.RuleProperty {
    return {
      name: rule.name,
      priority: rule.priority,
      action: {
        [rule.action]: {}
      },
      statement: this.buildCustomStatement(rule.statement, rule.name),
      visibilityConfig: this.buildVisibilityConfig(rule.visibility.metricName)
    };
  }

  private buildCustomStatement(statement: WafCustomRuleStatementConfig, ruleName: string): wafv2.CfnWebACL.StatementProperty {
    switch (statement.type) {
      case 'geo-match':
        return {
          geoMatchStatement: {
            countryCodes: statement.countryCodes
          }
        };
      case 'rate-based': {
        const result: wafv2.CfnWebACL.RateBasedStatementProperty = {
          limit: statement.limit,
          aggregateKeyType: statement.aggregateKeyType ?? 'IP'
        };

        if (statement.aggregateKeyType === 'FORWARDED_IP') {
          result.forwardedIPConfig = {
            fallbackBehavior: statement.forwardedIpFallbackBehavior ?? 'MATCH',
            headerName: statement.forwardedIpHeaderName ?? 'X-Forwarded-For'
          };
        }

        return { rateBasedStatement: result };
      }
      case 'ip-set':
        return {
          ipSetReferenceStatement: {
            arn: statement.arn
          }
        };
      default:
        throw new Error(`Unsupported custom rule statement type '${(statement as { type: string }).type}' for rule '${ruleName}'`);
    }
  }

  private buildVisibilityConfig(metricName: string): wafv2.CfnWebACL.VisibilityConfigProperty {
    if (!this.config) {
      throw new Error('Configuration required to build visibility config');
    }

    return {
      sampledRequestsEnabled: this.config.monitoring.sampledRequestsEnabled,
      cloudWatchMetricsEnabled: this.config.monitoring.metricsEnabled,
      metricName
    };
  }

  private mapRedactedField(field: { type: string; name?: string }): wafv2.CfnLoggingConfiguration.FieldToMatchProperty {
    switch (field.type) {
      case 'uri-path':
        return { uriPath: {} };
      case 'query-string':
        return { queryString: {} };
      case 'method':
        return { method: {} };
      case 'body':
        return { body: {} };
      case 'header':
      default:
        return {
          singleHeader: {
            name: (field.name ?? '').toLowerCase()
          }
        };
    }
  }

  private mapComparisonOperator(operator: AlarmComparisonOperator): cloudwatch.ComparisonOperator {
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

  private mapTreatMissingData(value: AlarmTreatMissingData): cloudwatch.TreatMissingData {
    switch (value) {
      case 'breaching':
        return cloudwatch.TreatMissingData.BREACHING;
      case 'ignore':
        return cloudwatch.TreatMissingData.IGNORE;
      case 'missing':
        return cloudwatch.TreatMissingData.MISSING;
      case 'not-breaching':
      default:
        return cloudwatch.TreatMissingData.NOT_BREACHING;
    }
  }
}
