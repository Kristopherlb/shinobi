import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type WafScope = 'REGIONAL' | 'CLOUDFRONT';
export type WafDefaultAction = 'allow' | 'block';
export type WafOverrideAction = 'none' | 'count';
export type AlarmComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte';
export type AlarmTreatMissingData = 'breaching' | 'not-breaching' | 'ignore' | 'missing';
export type AlarmStatistic = 'Sum' | 'Average' | 'Minimum' | 'Maximum';
export type RemovalPolicyOption = 'retain' | 'destroy';
export type WafLogDestinationType = 'cloudwatch' | 'kinesis-firehose' | 's3';

export interface WafRuleVisibilityConfig {
  sampledRequestsEnabled: boolean;
  cloudWatchMetricsEnabled: boolean;
  metricName: string;
}

export interface WafManagedRuleGroupConfig {
  name: string;
  vendorName: string;
  priority: number;
  overrideAction: WafOverrideAction;
  excludedRules: string[];
  visibility: WafRuleVisibilityConfig;
}

export interface WafCustomGeoMatchStatement {
  type: 'geo-match';
  countryCodes: string[];
}

export interface WafCustomRateBasedStatement {
  type: 'rate-based';
  limit: number;
  aggregateKeyType?: 'IP' | 'FORWARDED_IP';
  forwardedIpFallbackBehavior?: 'MATCH' | 'NO_MATCH';
  forwardedIpHeaderName?: string;
}

export interface WafCustomIpSetStatement {
  type: 'ip-set';
  arn: string;
}

export type WafCustomRuleStatementConfig =
  | WafCustomGeoMatchStatement
  | WafCustomRateBasedStatement
  | WafCustomIpSetStatement;

export interface WafCustomRuleConfig {
  name: string;
  priority: number;
  action: 'allow' | 'block' | 'count';
  visibility: WafRuleVisibilityConfig;
  statement: WafCustomRuleStatementConfig;
}

export interface WafRedactedFieldConfig {
  type: 'uri-path' | 'query-string' | 'header' | 'method' | 'body';
  name?: string;
}

export interface WafLoggingConfig {
  enabled: boolean;
  destinationType: WafLogDestinationType;
  destinationArn?: string;
  logGroupName?: string;
  retentionDays: number;
  redactedFields: WafRedactedFieldConfig[];
}

export interface WafAlarmConfig {
  enabled: boolean;
  threshold: number;
  evaluationPeriods: number;
  periodMinutes: number;
  comparisonOperator: AlarmComparisonOperator;
  treatMissingData: AlarmTreatMissingData;
  statistic: AlarmStatistic;
  tags: Record<string, string>;
}

export interface WafMonitoringConfig {
  enabled: boolean;
  metricsEnabled: boolean;
  detailedMetrics: boolean;
  sampledRequestsEnabled: boolean;
  alarms: {
    blockedRequests: WafAlarmConfig;
    allowedRequests: WafAlarmConfig;
  };
}

export interface WafWebAclComponentConfig {
  name: string;
  description?: string;
  scope: WafScope;
  defaultAction: WafDefaultAction;
  managedRuleGroups: WafManagedRuleGroupConfig[];
  customRules: WafCustomRuleConfig[];
  logging: WafLoggingConfig;
  monitoring: WafMonitoringConfig;
  removalPolicy: RemovalPolicyOption;
  tags: Record<string, string>;
}

const RULE_VISIBILITY_DEFAULT = (metric: string): WafRuleVisibilityConfig => ({
  sampledRequestsEnabled: true,
  cloudWatchMetricsEnabled: true,
  metricName: metric
});

const DEFAULT_FALLBACKS: WafWebAclComponentConfig = {
  name: '',
  description: undefined,
  scope: 'REGIONAL',
  defaultAction: 'allow',
  managedRuleGroups: [
    {
      name: 'AWSManagedRulesCommonRuleSet',
      vendorName: 'AWS',
      priority: 1,
      overrideAction: 'none',
      excludedRules: [],
      visibility: RULE_VISIBILITY_DEFAULT('AWSManagedRulesCommonRuleSet')
    },
    {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      vendorName: 'AWS',
      priority: 2,
      overrideAction: 'none',
      excludedRules: [],
      visibility: RULE_VISIBILITY_DEFAULT('AWSManagedRulesKnownBadInputsRuleSet')
    }
  ],
  customRules: [],
  logging: {
    enabled: true,
    destinationType: 'cloudwatch',
    retentionDays: 365,
    redactedFields: [],
    logGroupName: undefined,
    destinationArn: undefined
  },
  monitoring: {
    enabled: true,
    metricsEnabled: true,
    detailedMetrics: true,
    sampledRequestsEnabled: true,
    alarms: {
      blockedRequests: {
        enabled: true,
        threshold: 1000,
        evaluationPeriods: 2,
        periodMinutes: 5,
        comparisonOperator: 'gt',
        treatMissingData: 'not-breaching',
        statistic: 'Sum',
        tags: {}
      },
      allowedRequests: {
        enabled: false,
        threshold: 10000,
        evaluationPeriods: 2,
        periodMinutes: 5,
        comparisonOperator: 'gt',
        treatMissingData: 'not-breaching',
        statistic: 'Sum',
        tags: {}
      }
    }
  },
  removalPolicy: 'destroy',
  tags: {}
};

const REDACTED_FIELD_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['uri-path', 'query-string', 'header', 'method', 'body'] },
    name: { type: 'string' }
  },
  required: ['type']
};

const MANAGED_RULE_GROUP_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    vendorName: { type: 'string' },
    priority: { type: 'number', minimum: 0 },
    overrideAction: { type: 'string', enum: ['none', 'count'], default: 'none' },
    excludedRules: {
      type: 'array',
      items: { type: 'string' },
      default: []
    },
    visibility: {
      type: 'object',
      additionalProperties: false,
      properties: {
        sampledRequestsEnabled: { type: 'boolean' },
        cloudWatchMetricsEnabled: { type: 'boolean' },
        metricName: { type: 'string' }
      }
    }
  },
  required: ['name', 'vendorName', 'priority']
};

const CUSTOM_RULE_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    priority: { type: 'number', minimum: 0 },
    action: { type: 'string', enum: ['allow', 'block', 'count'] },
    visibility: {
      type: 'object',
      additionalProperties: false,
      properties: {
        sampledRequestsEnabled: { type: 'boolean' },
        cloudWatchMetricsEnabled: { type: 'boolean' },
        metricName: { type: 'string' }
      }
    },
    statement: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['geo-match', 'rate-based', 'ip-set'] },
        countryCodes: {
          type: 'array',
          items: { type: 'string' }
        },
        limit: { type: 'number', minimum: 100 },
        aggregateKeyType: { type: 'string', enum: ['IP', 'FORWARDED_IP'] },
        forwardedIpFallbackBehavior: { type: 'string', enum: ['MATCH', 'NO_MATCH'] },
        forwardedIpHeaderName: { type: 'string' },
        arn: { type: 'string' }
      },
      required: ['type']
    }
  },
  required: ['name', 'priority', 'action', 'statement']
};

const ALARM_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean', default: true },
    threshold: { type: 'number', minimum: 0 },
    evaluationPeriods: { type: 'number', minimum: 1, default: 2 },
    periodMinutes: { type: 'number', minimum: 1, default: 5 },
    comparisonOperator: { type: 'string', enum: ['gt', 'gte', 'lt', 'lte'], default: 'gt' },
    treatMissingData: { type: 'string', enum: ['breaching', 'not-breaching', 'ignore', 'missing'], default: 'not-breaching' },
    statistic: { type: 'string', enum: ['Sum', 'Average', 'Minimum', 'Maximum'], default: 'Sum' },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' },
      default: {}
    }
  }
};

export const WAF_WEB_ACL_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    scope: { type: 'string', enum: ['REGIONAL', 'CLOUDFRONT'] },
    defaultAction: { type: 'string', enum: ['allow', 'block'] },
    managedRuleGroups: {
      type: 'array',
      items: MANAGED_RULE_GROUP_SCHEMA
    },
    customRules: {
      type: 'array',
      items: CUSTOM_RULE_SCHEMA
    },
    logging: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        destinationType: { type: 'string', enum: ['cloudwatch', 'kinesis-firehose', 's3'] },
        destinationArn: { type: 'string' },
        logGroupName: { type: 'string' },
        retentionDays: { type: 'number', minimum: 1 },
        redactedFields: {
          type: 'array',
          items: REDACTED_FIELD_SCHEMA,
          default: []
        }
      }
    },
    monitoring: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        metricsEnabled: { type: 'boolean' },
        detailedMetrics: { type: 'boolean' },
        sampledRequestsEnabled: { type: 'boolean' },
        alarms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            blockedRequests: ALARM_SCHEMA,
            allowedRequests: ALARM_SCHEMA
          }
        }
      }
    },
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'] },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
};

export class WafWebAclComponentConfigBuilder extends ConfigBuilder<WafWebAclComponentConfig> {
  constructor(builderContext: ConfigBuilderContext) {
    super(builderContext, WAF_WEB_ACL_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<WafWebAclComponentConfig> {
    return DEFAULT_FALLBACKS;
  }

  public buildSync(): WafWebAclComponentConfig {
    const resolved = super.buildSync() as Partial<WafWebAclComponentConfig>;
    return this.normalise(resolved);
  }

  public getSchema(): ComponentConfigSchema {
    return WAF_WEB_ACL_CONFIG_SCHEMA;
  }

  private normalise(config: Partial<WafWebAclComponentConfig>): WafWebAclComponentConfig {
    const merged: WafWebAclComponentConfig = {
      ...DEFAULT_FALLBACKS,
      ...config,
      name: config.name?.trim() || this.builderContext.spec.name,
      scope: (config.scope ?? DEFAULT_FALLBACKS.scope) as WafScope,
      defaultAction: (config.defaultAction ?? DEFAULT_FALLBACKS.defaultAction) as WafDefaultAction,
      managedRuleGroups: this.normaliseManagedRuleGroups(config.managedRuleGroups ?? DEFAULT_FALLBACKS.managedRuleGroups),
      customRules: this.normaliseCustomRules(config.customRules ?? DEFAULT_FALLBACKS.customRules),
      logging: {
        ...DEFAULT_FALLBACKS.logging,
        ...(config.logging ?? {}),
        redactedFields: this.normaliseRedactedFields(config.logging?.redactedFields ?? DEFAULT_FALLBACKS.logging.redactedFields),
        logGroupName: this.normaliseLogGroupName(config.logging?.logGroupName)
      },
      monitoring: this.normaliseMonitoring(config.monitoring),
      removalPolicy: (config.removalPolicy ?? DEFAULT_FALLBACKS.removalPolicy) as RemovalPolicyOption,
      tags: {
        ...DEFAULT_FALLBACKS.tags,
        ...(config.tags ?? {})
      }
    };

    return merged;
  }

  private normaliseManagedRuleGroups(groups: WafManagedRuleGroupConfig[]): WafManagedRuleGroupConfig[] {
    const byPriority = new Map<number, WafManagedRuleGroupConfig>();
    groups
      .sort((a, b) => a.priority - b.priority)
      .forEach((group) => {
        const visibility = group.visibility ?? RULE_VISIBILITY_DEFAULT(`${group.name}Metric`);
        byPriority.set(group.priority, {
          ...group,
          overrideAction: (group.overrideAction ?? 'none') as WafOverrideAction,
          excludedRules: Array.from(new Set(group.excludedRules ?? [])).sort(),
          visibility: this.normaliseVisibility(group.name, visibility)
        });
      });
    return Array.from(byPriority.values());
  }

  private normaliseCustomRules(rules: WafCustomRuleConfig[]): WafCustomRuleConfig[] {
    return rules
      .sort((a, b) => a.priority - b.priority)
      .map((rule, index) => {
        const metricName = rule.visibility?.metricName ?? `${rule.name}Metric`;
        return {
          ...rule,
          priority: rule.priority ?? index + 100,
          action: rule.action,
          visibility: this.normaliseVisibility(rule.name, rule.visibility ?? RULE_VISIBILITY_DEFAULT(metricName)),
          statement: this.normaliseCustomStatement(rule.statement, rule.name)
        };
      });
  }

  private normaliseCustomStatement(statement: WafCustomRuleStatementConfig, ruleName: string): WafCustomRuleStatementConfig {
    switch (statement.type) {
      case 'geo-match': {
        const codes = Array.from(new Set(statement.countryCodes ?? [])).sort();
        if (codes.length === 0) {
          throw new Error(`Custom rule '${ruleName}' of type geo-match requires at least one country code`);
        }
        return { type: 'geo-match', countryCodes: codes };
      }
      case 'rate-based': {
        const limit = statement.limit ?? 2000;
        return {
          type: 'rate-based',
          limit,
          aggregateKeyType: statement.aggregateKeyType ?? 'IP',
          forwardedIpFallbackBehavior: statement.forwardedIpFallbackBehavior,
          forwardedIpHeaderName: statement.forwardedIpHeaderName
        };
      }
      case 'ip-set': {
        if (!statement.arn) {
          throw new Error(`Custom rule '${ruleName}' of type ip-set requires an ARN`);
        }
        return { type: 'ip-set', arn: statement.arn };
      }
      default:
        return statement;
    }
  }

  private normaliseVisibility(ruleName: string, visibility: WafRuleVisibilityConfig): WafRuleVisibilityConfig {
    return {
      sampledRequestsEnabled: visibility.sampledRequestsEnabled ?? true,
      cloudWatchMetricsEnabled: visibility.cloudWatchMetricsEnabled ?? true,
      metricName: visibility.metricName?.trim() || `${ruleName}Metric`
    };
  }

  private normaliseRedactedFields(fields: WafRedactedFieldConfig[]): WafRedactedFieldConfig[] {
    return fields.map((field) => ({
      type: field.type,
      name: field.name?.trim()
    }));
  }

  private normaliseMonitoring(monitoring?: Partial<WafMonitoringConfig>): WafMonitoringConfig {
    const merged = {
      ...DEFAULT_FALLBACKS.monitoring,
      ...(monitoring ?? {})
    } as WafMonitoringConfig;

    merged.alarms = {
      blockedRequests: this.mergeAlarm(DEFAULT_FALLBACKS.monitoring.alarms.blockedRequests, monitoring?.alarms?.blockedRequests),
      allowedRequests: this.mergeAlarm(DEFAULT_FALLBACKS.monitoring.alarms.allowedRequests, monitoring?.alarms?.allowedRequests)
    };

    return merged;
  }

  private mergeAlarm(base: WafAlarmConfig, override?: Partial<WafAlarmConfig>): WafAlarmConfig {
    return {
      ...base,
      ...(override ?? {}),
      tags: {
        ...base.tags,
        ...(override?.tags ?? {})
      }
    };
  }

  private normaliseLogGroupName(customName?: string): string | undefined {
    if (customName && customName.trim().length > 0) {
      return customName.trim();
    }

    const service = this.builderContext.context.serviceName ?? 'service';
    const component = this.builderContext.spec.name;
    return `/aws/wafv2/${service}-${component}`;
  }
}
