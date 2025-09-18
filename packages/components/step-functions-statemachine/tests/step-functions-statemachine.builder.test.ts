/**
 * Step Functions State Machine ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { StepFunctionsStateMachineConfigBuilder, StepFunctionsStateMachineConfig } from '../step-functions-statemachine.builder';
import { ComponentContext, ComponentSpec } from '../../@shinobi/core/component-interfaces';
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';

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
  config
});

describe('StepFunctionsStateMachineConfigBuilder', () => {
  
  describe('Hardcoded Fallbacks (Layer 1)', () => {
    
    it('should provide ultra-safe baseline configuration', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new StepFunctionsStateMachineConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      // Verify hardcoded fallbacks are applied
      expect(config.stateMachineType).toBe('STANDARD');
      expect(config.loggingConfiguration?.enabled).toBe(false);
      expect(config.loggingConfiguration?.level).toBe('ERROR');
      expect(config.tracingConfiguration?.enabled).toBe(false);
      expect(config.timeout?.seconds).toBe(3600);
      expect(config.tags).toBeDefined();
    });
    
  });
  
  describe('Compliance Framework Defaults (Layer 2)', () => {
    
    it('should apply commercial compliance defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const builder = new StepFunctionsStateMachineConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      // Commercial should have basic settings
      expect(config.loggingConfiguration?.enabled).toBe(false);
      expect(config.tracingConfiguration?.enabled).toBe(false);
    });
    
    it('should apply FedRAMP moderate compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const builder = new StepFunctionsStateMachineConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      // FedRAMP moderate should have enhanced logging
      expect(config.loggingConfiguration?.enabled).toBe(true);
      expect(config.loggingConfiguration?.level).toBe('ALL');
      expect(config.loggingConfiguration?.includeExecutionData).toBe(true);
      expect(config.tracingConfiguration?.enabled).toBe(true);
      expect(config.tags?.['compliance-framework']).toBe('fedramp-moderate');
    });
    
    it('should apply FedRAMP high compliance defaults', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();
      
      const builder = new StepFunctionsStateMachineConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      // FedRAMP high should have maximum security
      expect(config.loggingConfiguration?.enabled).toBe(true);
      expect(config.loggingConfiguration?.level).toBe('ALL');
      expect(config.loggingConfiguration?.includeExecutionData).toBe(true);
      expect(config.tracingConfiguration?.enabled).toBe(true);
      expect(config.timeout?.seconds).toBe(1800); // Shorter timeout for security
      expect(config.tags?.['compliance-framework']).toBe('fedramp-high');
      expect(config.tags?.['security-level']).toBe('high');
    });
    
  });
  
  describe('5-Layer Precedence Chain', () => {
    
    it('should apply component overrides over platform defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        stateMachineType: 'EXPRESS',
        timeout: {
          seconds: 900
        },
        tags: {
          'custom-tag': 'custom-value'
        }
      });
      
      const builder = new StepFunctionsStateMachineConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      // Verify component config overrides platform defaults
      expect(config.stateMachineType).toBe('EXPRESS');
      expect(config.timeout?.seconds).toBe(900);
      expect(config.tags?.['custom-tag']).toBe('custom-value');
    });
    
    it('should merge configuration layers correctly', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec({
        stateMachineName: 'custom-state-machine',
        loggingConfiguration: {
          level: 'FATAL' // Override compliance default
        }
      });
      
      const builder = new StepFunctionsStateMachineConfigBuilder({ context, spec });
      const config = builder.buildSync();
      
      // Should merge compliance defaults with component overrides
      expect(config.stateMachineName).toBe('custom-state-machine'); // Component override
      expect(config.loggingConfiguration?.enabled).toBe(true); // Compliance default
      expect(config.loggingConfiguration?.level).toBe('FATAL'); // Component override
      expect(config.loggingConfiguration?.includeExecutionData).toBe(true); // Compliance default
      expect(config.tracingConfiguration?.enabled).toBe(true); // Compliance default
    });
    
  });
  
});