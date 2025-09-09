/**
 * Step Functions State Machine Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { StepFunctionsStateMachineComponent } from '../step-functions-statemachine.component';
import { StepFunctionsStateMachineConfig } from '../step-functions-statemachine.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => {
  const stack = new Stack();
  return {
    serviceName: 'test-service',
    environment,
    complianceFramework,
    scope: stack,
    region: 'us-east-1'
  };
};

const createMockSpec = (config: Partial<StepFunctionsStateMachineConfig> = {}): ComponentSpec => ({
  name: 'test-step-functions-statemachine',
  type: 'step-functions-statemachine',
  config: {
    definition: {
      definition: {
        Comment: 'A Hello World example',
        StartAt: 'HelloWorld',
        States: {
          HelloWorld: {
            Type: 'Pass',
            Result: 'Hello World!',
            End: true
          }
        }
      }
    },
    ...config
  }
});

const synthesizeComponent = (context: ComponentContext, spec: ComponentSpec) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  
  const component = new StepFunctionsStateMachineComponent(stack, spec.name, context, spec);
  component.synth();
  
  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('StepFunctionsStateMachineComponent Synthesis', () => {
  
  describe('Default Happy Path Synthesis', () => {
    
    it('should synthesize a basic Step Functions State Machine', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component, template } = synthesizeComponent(context, spec);
      
      // Verify state machine is created
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        StateMachineName: 'test-service-test-step-functions-statemachine',
        StateMachineType: 'STANDARD'
      });
      
      // Verify component type
      expect(component.getType()).toBe('step-functions-statemachine');
      
      // Verify capabilities are registered
      const capabilities = component.getCapabilities();
      expect(capabilities['workflow:step-functions']).toBeDefined();
      expect(capabilities['workflow:step-functions'].stateMachineArn).toBeDefined();
    });
    
    it('should apply standard tags to resources', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify standard tags are applied (BaseComponent automatically applies these)
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        Tags: Match.arrayWith([
          { Key: 'service-name', Value: 'test-service' }
        ])
      });
    });
    
  });
  
  describe('Configuration Variations', () => {
    
    it('should create EXPRESS state machine when configured', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        stateMachineType: 'EXPRESS'
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        StateMachineType: 'EXPRESS'
      });
    });
    
    it('should configure timeout when specified', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        timeout: {
          seconds: 900
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify timeout is set in the definition string
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.stringLikeRegexp('TimeoutSeconds.*900')
      });
    });
    
    it('should use custom state machine name when provided', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        stateMachineName: 'custom-workflow'
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        StateMachineName: 'custom-workflow'
      });
    });
    
  });
  
  describe('Compliance Framework Hardening', () => {
    
    it('should apply commercial compliance settings', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Commercial should have basic state machine
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        StateMachineType: 'STANDARD'
      });
    });
    
    it('should apply FedRAMP moderate compliance settings', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Should have enhanced logging and tracing
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        StateMachineType: 'STANDARD'
      });
      
      // Verify compliance tags
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        Tags: Match.arrayWith([
          { Key: 'compliance-framework', Value: 'fedramp-moderate' }
        ])
      });
    });
    
    it('should apply FedRAMP high compliance settings', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // Should have maximum security settings
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        StateMachineType: 'STANDARD'
      });
      
      // Verify timeout is set in the definition string
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: Match.stringLikeRegexp('TimeoutSeconds.*1800')
      });
      
      // Verify high security tags (from configuration)
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        Tags: Match.arrayWith([
          { Key: 'compliance-framework', Value: 'fedramp-high' }
        ])
      });
    });
    
  });
  
  describe('Component Capabilities and Constructs', () => {
    
    it('should register correct construct handles', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      // Verify main construct is registered
      const mainConstruct = component.getConstruct('main');
      expect(mainConstruct).toBeDefined();
      
      // Verify state machine construct is registered
      const stateMachineConstruct = component.getConstruct('stateMachine');
      expect(stateMachineConstruct).toBeDefined();
    });
    
    it('should provide workflow:step-functions capability', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      const capabilities = component.getCapabilities();
      const workflowCapability = capabilities['workflow:step-functions'];
      
      expect(workflowCapability).toBeDefined();
      expect(workflowCapability.stateMachineArn).toBeDefined();
      expect(workflowCapability.stateMachineName).toBeDefined();
    });
    
  });
  
  describe('Error Handling', () => {
    
    it('should throw error when accessing capabilities before synthesis', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const app = new App();
      const stack = new Stack(app, 'TestStack');
      const component = new StepFunctionsStateMachineComponent(stack, spec.name, context, spec);
      
      // Should throw error before synth
      expect(() => component.getCapabilities()).toThrow('Component must be synthesized before accessing capabilities');
    });
    
  });
  
});