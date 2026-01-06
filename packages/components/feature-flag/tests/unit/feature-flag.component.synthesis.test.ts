/**
 * FeatureFlag Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 */

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ComponentCapabilities, ComponentContext, ComponentSpec } from '@shinobi/core';
import { FeatureFlagComponent } from '../../src/feature-flag.component.js';
import { FeatureFlagConfig } from '../../src/feature-flag.builder.js';

const createSpec = (config: Partial<FeatureFlagConfig> = {}): ComponentSpec => ({
  name: 'checkout-feature',
  type: 'feature-flag',
  config: {
    flagKey: 'checkout_experience',
    flagType: 'boolean',
    defaultValue: false,
    description: 'Toggle for the new checkout experience.',
    ...config
  }
});

const createContext = (stack: Stack, overrides: Partial<ComponentContext> = {}): ComponentContext => ({
  serviceName: 'shopping-service',
  environment: 'dev',
  complianceFramework: 'commercial',
  scope: stack,
  tags: {},
  ...overrides
});

const synthesize = (
  spec: ComponentSpec,
  overrides: Partial<ComponentContext> = {}
): { component: FeatureFlagComponent; template: Template; capabilities: ComponentCapabilities } => {
  const app = new App();
  const stack = new Stack(app, 'FeatureFlagTestStack');
  const context = createContext(stack, overrides);

  const component = new FeatureFlagComponent(stack, spec.name, context, spec);
  component.synth();

  return {
    component,
    template: Template.fromStack(stack),
    capabilities: component.getCapabilities()
  };
};

describe('FeatureFlagComponent', () => {
  it('HostedConfiguration__DefaultConfig__CreatesHostedVersion', () => {
    const metadata = {
      id: 'TP-platform-feature-flag-007',
      level: 'unit',
      capability: 'Component synthesizes AppConfig hosted configuration version',
      oracle: 'contract',
      invariants: [],
      fixtures: ['cdk:App', 'cdk:Stack'],
      inputs: {
        shape: 'default feature flag configuration',
        notes: ''
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['std://configuration'],
      ai_generated: false,
      human_reviewed_by: ''
    } as const;
    void metadata;

    const spec = createSpec();
    const { template } = synthesize(spec);

    template.hasResourceProperties('AWS::AppConfig::HostedConfigurationVersion', Match.objectLike({
      Description: 'Feature flag definition for checkout_experience',
      ContentType: 'application/json'
    }));
  });

  it('Capability__NumericFlag__ExposesExpectedShape', () => {
    const metadata = {
      id: 'TP-platform-feature-flag-008',
      level: 'unit',
      capability: 'Component registers feature flag capability',
      oracle: 'exact',
      invariants: [],
      fixtures: ['cdk:App', 'cdk:Stack'],
      inputs: {
        shape: 'numeric flag with percentage rollout',
        notes: ''
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['std://capability'],
      ai_generated: false,
      human_reviewed_by: ''
    } as const;
    void metadata;

    const spec = createSpec({
      flagType: 'number',
      defaultValue: 1,
      targetingRules: {
        percentage: 50
      }
    });

    const { capabilities } = synthesize(spec);

    expect(capabilities).toEqual({
      'feature-flags:flag': {
        flagKey: 'checkout_experience',
        flagType: 'number',
        defaultValue: 1,
        description: 'Toggle for the new checkout experience.',
        targetingRules: {
          percentage: 50
        }
      }
    });
  });

  it('ConstructHandles__AfterSynth__RegistersMainAndFlagDefinition', () => {
    const metadata = {
      id: 'TP-platform-feature-flag-009',
      level: 'unit',
      capability: 'Component registers construct handles',
      oracle: 'trace',
      invariants: [],
      fixtures: ['cdk:App', 'cdk:Stack'],
      inputs: {
        shape: 'default feature flag configuration',
        notes: ''
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: ['std://capability'],
      ai_generated: false,
      human_reviewed_by: ''
    } as const;
    void metadata;

    const spec = createSpec();
    const { component } = synthesize(spec);

    expect(component.getConstruct('main')).toBeDefined();
    expect(component.getConstruct('flagDefinition')).toBeDefined();
  });

  it('Tagging__CustomTags__PropagatesToHostedConfigurationVersion', () => {
    const metadata = {
      id: 'TP-platform-feature-flag-010',
      level: 'unit',
      capability: 'Component applies standard and custom tags',
      oracle: 'contract',
      invariants: [],
      fixtures: ['cdk:App', 'cdk:Stack'],
      inputs: {
        shape: 'feature flag with custom tags',
        notes: ''
      },
      risks: ['Missing platform tags on resources'],
      dependencies: [],
      evidence: [],
      compliance_refs: ['std://tagging'],
      ai_generated: false,
      human_reviewed_by: ''
    } as const;
    void metadata;

    const spec = createSpec({
      tags: {
        'data-classification': 'internal'
      }
    });

    const { template } = synthesize(spec);

    template.hasResourceProperties('AWS::AppConfig::HostedConfigurationVersion', Match.objectLike({
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'feature-flag-key', Value: 'checkout_experience' }),
        Match.objectLike({ Key: 'feature-flag-type', Value: 'boolean' }),
        Match.objectLike({ Key: 'data-classification', Value: 'internal' })
      ])
    }));
  });
});
