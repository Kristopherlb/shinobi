import { App, Stack, Aspects } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { EcrRepositoryComponent } from '../../ecr-repository.component.js';
import { EcrRepositoryComponentConfigBuilder } from '../../ecr-repository.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core/component-interfaces';

describe('AwsSolutionsChecks__EcrRepository', () => {
  let platformConfigSpy: jest.SpyInstance;

  beforeEach(() => {
    platformConfigSpy = jest
      .spyOn(EcrRepositoryComponentConfigBuilder.prototype, '_loadPlatformConfiguration')
      .mockImplementation(() => ({
        monitoring: { enabled: true, detailedMetrics: false },
        imageScanningConfiguration: { scanOnPush: true }
      }));
  });

  afterEach(() => {
    platformConfigSpy.mockRestore();
  });

  /*
   * Test Metadata: TP-ecr-repository-security-001
   * {
   *   "id": "TP-ecr-repository-security-001",
   *   "level": "integration",
   *   "capability": "ECR repository passes AwsSolutions cdk-nag checks",
   *   "oracle": "contract",
   *   "invariants": ["No AwsSolutions findings"],
   *   "fixtures": ["cdk.App", "cdk.Stack", "AwsSolutionsChecks"],
   *   "inputs": { "shape": "Commercial defaults", "notes": "Repository instantiated with baseline config" },
   *   "risks": ["Regression introduces forbidden configuration"],
   *   "dependencies": ["cdk-nag"],
   *   "evidence": ["Annotations.fromStack"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-security-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('AwsSolutionsChecks__CommercialDefaults__NoFindings', () => {
    const app = new App();
    const stack = new Stack(app, 'EcrNagStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    const context: ComponentContext = {
      serviceName: 'test-service',
      environment: 'dev',
      complianceFramework: 'commercial',
      region: 'us-east-1',
      accountId: '123456789012',
      scope: stack,
      tags: {
        'service-name': 'test-service',
        environment: 'dev',
        'compliance-framework': 'commercial'
      }
    };

    const spec: ComponentSpec = {
      name: 'test-ecr-repository',
      type: 'ecr-repository',
      config: {
        repositoryName: 'test-repository'
      }
    };

    const component = new EcrRepositoryComponent(stack, spec.name, context, spec);

    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
    component.synth();
    app.synth();

    const findings = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-'));
    expect(findings).toEqual([]);
  });
});
