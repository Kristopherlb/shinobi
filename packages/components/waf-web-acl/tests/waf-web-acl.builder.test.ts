import { Stack } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

import {
  WafWebAclComponentConfigBuilder,
  WafWebAclComponentConfig
} from '../waf-web-acl.builder.js';

const createContext = (
  framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial'
): ComponentContext => {
  const stack = new Stack();
  return {
    serviceName: 'edge',
    environment: 'dev',
    complianceFramework: framework,
    scope: stack,
    region: 'us-east-1',
    accountId: '123456789012'
  };
};

const createSpec = (config: Partial<WafWebAclComponentConfig> = {}): ComponentSpec => ({
  name: 'edge-waf',
  type: 'waf-web-acl',
  config
});

describe('WafWebAclComponentConfigBuilder', () => {
  it('applies commercial platform defaults', () => {
    const builder = new WafWebAclComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.scope).toBe('REGIONAL');
    expect(config.defaultAction).toBe('allow');
    expect(config.logging.destinationType).toBe('cloudwatch');
    expect(config.logging.retentionDays).toBeGreaterThanOrEqual(365);
    expect(config.managedRuleGroups.length).toBeGreaterThanOrEqual(2);
    expect(config.removalPolicy).toBeDefined();
  });

  it('pulls hardened defaults for FedRAMP High', () => {
    const builder = new WafWebAclComponentConfigBuilder({
      context: createContext('fedramp-high'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.defaultAction).toBe('block');
    expect(config.removalPolicy).toBe('retain');
    expect(config.logging.retentionDays).toBeGreaterThanOrEqual(180);
    expect(config.managedRuleGroups.map((group) => group.name)).toEqual(
      expect.arrayContaining(['AWSManagedRulesLinuxRuleSet'])
    );
  });

  it('honours manifest overrides and deduplicates rule priorities', () => {
    const builder = new WafWebAclComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        name: 'custom-waf',
        defaultAction: 'block',
        managedRuleGroups: [
          {
            name: 'AWSManagedRulesCommonRuleSet',
            vendorName: 'AWS',
            priority: 5,
            overrideAction: 'count',
            excludedRules: ['SizeRestrictions_QUERYSTRING'],
            visibility: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: 'CustomCommonRules'
            }
          },
          {
            name: 'AWSManagedRulesKnownBadInputsRuleSet',
            vendorName: 'AWS',
            priority: 5,
            overrideAction: 'none',
            excludedRules: [],
            visibility: {
              sampledRequestsEnabled: true,
              cloudWatchMetricsEnabled: true,
              metricName: 'DuplicatePriority'
            }
          }
        ],
        logging: {
          destinationType: 'cloudwatch',
          retentionDays: 30,
          logGroupName: '/aws/wafv2/custom'
        },
        monitoring: {
          alarms: {
            blockedRequests: {
              enabled: true,
              threshold: 250,
              evaluationPeriods: 3,
              periodMinutes: 1,
              comparisonOperator: 'gt',
              treatMissingData: 'not-breaching',
              statistic: 'Sum',
              tags: { severity: 'high' }
            }
          }
        }
      })
    });

    const config = builder.buildSync();

    expect(config.name).toBe('custom-waf');
    expect(config.defaultAction).toBe('block');
    expect(config.logging.logGroupName).toBe('/aws/wafv2/custom');
    expect(config.managedRuleGroups.map((group) => group.priority)).toEqual([5]);
    expect(config.monitoring.alarms.blockedRequests.threshold).toBe(250);
    expect(config.monitoring.alarms.blockedRequests.tags).toMatchObject({ severity: 'high' });
  });
});
