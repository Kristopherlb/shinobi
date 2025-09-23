/**
 * LambdaApiComponent Component Synthesis Test Suite
 * Simplified version focusing on basic instantiation
 */

import { App, Stack } from 'aws-cdk-lib';
import { LambdaApiComponent } from '../src/lambda-api.component';
import { ComponentContext, ComponentSpec } from '../../../contracts/src/index';

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  return {
    serviceName: 'test-service',
    environment,
    complianceFramework,
    scope: stack,
    region: 'us-east-1',
    accountId: '123456789012'
  };
};

const createMockSpec = (config: any = {}): ComponentSpec => ({
  name: 'test-lambda-api',
  type: 'lambda-api',
  config: {
    handler: 'index.handler',
    ...config
  }
});

const synthesizeComponent = (
  context: ComponentContext,
  spec: ComponentSpec
): { component: LambdaApiComponent; stack: Stack } => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  const component = new LambdaApiComponent(stack, 'TestLambdaApi', context, spec);
  component.synth();

  return { component, stack };
};

describe('LambdaApiComponent Synthesis', () => {

  describe('BasicInstantiation', () => {

    it('should create component with commercial framework', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();

      const { component } = synthesizeComponent(context, spec);

      // Verify component was created
      expect(component).toBeDefined();
    });

    it('should create component with FedRAMP Moderate framework', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();

      const { component } = synthesizeComponent(context, spec);

      // Verify component was created
      expect(component).toBeDefined();
    });

    it('should create component with FedRAMP High framework', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();

      const { component } = synthesizeComponent(context, spec);

      // Verify component was created
      expect(component).toBeDefined();
    });

    it('should create component with custom configuration', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        handler: 'custom.handler',
        memorySize: 1024,
        timeout: 60
      });

      const { component } = synthesizeComponent(context, spec);

      // Verify component was created
      expect(component).toBeDefined();
    });

  });

});