/**
 * FeatureFlag ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { App, Stack } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import {
  FeatureFlagConfig,
  FeatureFlagConfigBuilder
} from '../../src/feature-flag.builder';

const createScope = () => {
  const app = new App();
  return new Stack(app, 'FeatureFlagScope');
};

const createMockContext = (
  complianceFramework: ComponentContext['complianceFramework'] = 'commercial',
  environment = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  environment,
  complianceFramework,
  scope: createScope(),
  tags: {}
});

const createMockSpec = (config: Partial<FeatureFlagConfig> = {}): ComponentSpec => ({
  name: 'test-feature-flag',
  type: 'feature-flag',
  config: {
    flagKey: 'sample-flag',
    flagType: 'boolean',
    defaultValue: true,
    ...config
  }
});

describe('FeatureFlagConfigBuilder', () => {
  it('HardcodedFallbacks__MinimalConfig__ReturnsSafeDefaults', () => {
    const metadata = {
      id: 'TP-platform-feature-flag-001',
      level: 'unit',
      capability: 'Builder merges hardcoded fallbacks',
      oracle: 'exact',
      invariants: [],
      fixtures: ['cdk:App', 'cdk:Stack'],
      inputs: {
        shape: 'minimal feature flag spec (flagKey, flagType, defaultValue)',
        notes: ''
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['std://configuration'],
      ai_generated: false,
      human_reviewed_by: ''
    };
    void metadata;

    const context = createMockContext();
    const spec = createMockSpec();

    const builder = new FeatureFlagConfigBuilder(context, spec);
    const config = builder.buildSync();

    expect(config).toMatchObject({
      flagKey: 'sample-flag',
      flagType: 'boolean',
      defaultValue: true,
      enabled: true,
      monitoring: {
        enabled: true,
        detailedMetrics: false
      },
      tags: {}
    });
  });

  it('ComplianceDefaults__FedrampFramework__ForcesDetailedMetrics', () => {
    const metadata = {
      id: 'TP-platform-feature-flag-002',
      level: 'unit',
      capability: 'Builder enforces compliance defaults',
      oracle: 'exact',
      invariants: [],
      fixtures: ['cdk:App', 'cdk:Stack'],
      inputs: {
        shape: 'flag config enabling monitoring with detailedMetrics false',
        notes: 'fedramp-high compliance should override detailedMetrics'
      },
      risks: ['Monitoring disabled for FedRAMP flags'],
      dependencies: [],
      evidence: [],
      compliance_refs: ['std://configuration'],
      ai_generated: false,
      human_reviewed_by: ''
    };
    void metadata;

    const context = createMockContext('fedramp-high');
    const spec = createMockSpec({
      monitoring: {
        enabled: true,
        detailedMetrics: false
      }
    });

    const builder = new FeatureFlagConfigBuilder(context, spec);
    const config = builder.buildSync();

    expect(config.monitoring).toMatchObject({
      enabled: true,
      detailedMetrics: true
    });
  });

  it('ComponentOverrides__MonitoringDisabled__RespectsOverride', () => {
    const metadata = {
      id: 'TP-platform-feature-flag-003',
      level: 'unit',
      capability: 'Builder applies component overrides',
      oracle: 'exact',
      invariants: [],
      fixtures: ['cdk:App', 'cdk:Stack'],
      inputs: {
        shape: 'commercial config with monitoring disabled',
        notes: ''
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['std://configuration'],
      ai_generated: false,
      human_reviewed_by: ''
    };
    void metadata;

    const context = createMockContext('commercial');
    const spec = createMockSpec({
      monitoring: {
        enabled: false,
        detailedMetrics: false
      }
    });

    const builder = new FeatureFlagConfigBuilder(context, spec);
    const config = builder.buildSync();

    expect(config.monitoring).toEqual({
      enabled: false,
      detailedMetrics: false
    });
  });

  it('Tags__CustomTagsProvided__MergesWithBaseline', () => {
    const metadata = {
      id: 'TP-platform-feature-flag-004',
      level: 'unit',
      capability: 'Builder merges custom tags',
      oracle: 'exact',
      invariants: [],
      fixtures: ['cdk:App', 'cdk:Stack'],
      inputs: {
        shape: 'config with additional tags',
        notes: ''
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['std://tagging'],
      ai_generated: false,
      human_reviewed_by: ''
    };
    void metadata;

    const context = createMockContext();
    const spec = createMockSpec({
      tags: {
        'data-classification': 'internal'
      }
    });

    const builder = new FeatureFlagConfigBuilder(context, spec);
    const config = builder.buildSync();

    expect(config.tags).toEqual({
      'data-classification': 'internal'
    });
  });

  it('TargetingRules__InvalidPercentage__ThrowsError', () => {
    const metadata = {
      id: 'TP-platform-feature-flag-005',
      level: 'unit',
      capability: 'Builder rejects invalid targeting percentage',
      oracle: 'exact',
      invariants: [],
      fixtures: ['cdk:App', 'cdk:Stack'],
      inputs: {
        shape: 'targeting percentage > 100',
        notes: ''
      },
      risks: ['Deployment of invalid rollout percentages'],
      dependencies: [],
      evidence: [],
      compliance_refs: ['std://configuration'],
      ai_generated: false,
      human_reviewed_by: ''
    };
    void metadata;

    const context = createMockContext();
    const spec = createMockSpec({
      targetingRules: {
        percentage: 150
      }
    });

    const builder = new FeatureFlagConfigBuilder(context, spec);

    expect(() => builder.buildSync()).toThrow(/percentage must be between 0 and 100/i);
  });

  it('Variants__WeightsExceed100__ThrowsError', () => {
    const metadata = {
      id: 'TP-platform-feature-flag-006',
      level: 'unit',
      capability: 'Builder validates variant weights',
      oracle: 'exact',
      invariants: [],
      fixtures: ['cdk:App', 'cdk:Stack'],
      inputs: {
        shape: 'variants array with weights summing to >100',
        notes: ''
      },
      risks: ['Non-deterministic rollout weight totals'],
      dependencies: [],
      evidence: [],
      compliance_refs: ['std://configuration'],
      ai_generated: false,
      human_reviewed_by: ''
    };
    void metadata;

    const context = createMockContext();
    const spec = createMockSpec({
      flagType: 'string',
      defaultValue: 'standard',
      targetingRules: {
        variants: [
          { name: 'aggressive', value: 'aggressive', weight: 60 },
          { name: 'defensive', value: 'defensive', weight: 60 }
        ]
      }
    });

    const builder = new FeatureFlagConfigBuilder(context, spec);

    expect(() => builder.buildSync()).toThrow(/variant weights must total 100/i);
  });
});
