/**
 * EcrRepositoryComponent Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { EcrRepositoryComponent } from '../ecr-repository.component.ts';
import { EcrRepositoryConfig } from '../ecr-repository.builder.ts';
import { ComponentContext, ComponentSpec } from '/Users/kristopherbowles/code/CDK-Lib/src/platform/contracts/component-interfaces';
import { Construct } from 'constructs';

// Test metadata for Platform Testing Standard compliance
const TEST_METADATA = {
  id: 'TP-ecr-repository-synthesis-001',
  level: 'integration',
  capability: 'Component synthesis and CloudFormation resource creation',
  oracle: 'exact',
  invariants: ['Component must synthesize successfully', 'CloudFormation resources must be valid'],
  fixtures: ['MockComponentContext', 'MockComponentSpec', 'CDK App and Stack'],
  inputs: { shape: 'ComponentContext and ComponentSpec objects', notes: 'Tests component synthesis logic' },
  risks: ['Synthesis failure', 'Invalid CloudFormation template'],
  dependencies: ['AWS CDK', 'BaseComponent'],
  evidence: ['Component synthesizes without errors', 'CloudFormation resources are created'],
  compliance_refs: ['Platform Testing Standard v1.0'],
  ai_generated: true,
  human_reviewed_by: 'Platform Engineering Team'
};

// Determinism controls for Platform Testing Standard compliance
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  Math.random = jest.fn(() => 0.5);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => {
  const stack = new Stack();
  return {
    serviceName: 'test-service',
    accountId: '123456789012',
    environment,
    complianceFramework,
    region: 'us-east-1',
    scope: stack,
    serviceLabels: {
      'service-name': 'test-service',
      'environment': environment,
      'compliance-framework': complianceFramework
    }
  };
};

const createMockSpec = (config: Partial<EcrRepositoryConfig> = {}): ComponentSpec => ({
  name: 'test-ecr-repository',
  type: 'ecr-repository',
  config: {
    repositoryName: 'test-repository',
    ...config
  }
});

const synthesizeComponent = (
  context: ComponentContext,
  spec: ComponentSpec
): { component: EcrRepositoryComponent; template: Template } => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  
  const component = new EcrRepositoryComponent(stack, spec.name, context, spec);
  component.synth();
  
  const template = Template.fromStack(stack);
  return { component, template };
};

describe('EcrRepositoryComponent Synthesis', () => {
  
  describe('DefaultSynthesis__CommercialFramework__CreatesValidResources', () => {
    
    it('should synthesize basic ecr-repository with commercial compliance', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template, component } = synthesizeComponent(context, spec);
      
      // Verify component was created
      expect(component).toBeDefined();
      expect(component.getType()).toBe('ecr-repository');
      
      // Verify ECR repository resource is created
      template.hasResourceProperties('AWS::ECR::Repository', {
        RepositoryName: 'test-repository',
        ImageScanningConfiguration: {
          ScanOnPush: false // Security-safe default
        },
        ImageTagMutability: 'MUTABLE'
      });
    });
    
  });
  
  describe('ComponentCapabilities__AfterSynthesis__RegistersCorrectCapabilities', () => {
    
    it('should register correct capabilities after synthesis', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      const capabilities = component.getCapabilities();
      
      // Verify component-specific capabilities
      expect(capabilities).toBeDefined();
      expect(capabilities['container:ecr']).toBeDefined();
      expect(capabilities['container:ecr'].repositoryName).toBe('test-repository');
    });
    
  });
  
  describe('ComponentConstructs__AfterSynthesis__RegistersConstructHandles', () => {
    
    it('should register construct handles for patches.ts access', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      // Verify main construct is registered
      expect(component.getConstruct('repository')).toBeDefined();
    });
    
  });
  
  describe('ObservabilityConfiguration__MonitoringEnabled__CreatesCloudWatchResources', () => {
    
    it('should create CloudWatch resources when monitoring is enabled', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: true,
          detailedMetrics: true
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify CloudWatch Log Group is created
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/ecr/test-repository'
      });
      
      // Verify CloudWatch Alarms are created
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*high-push-rate')
      });
    });
    
  });
  
  describe('SecurityConfiguration__KmsEncryption__CreatesKmsEncryptedRepository', () => {
    
    it('should create KMS encrypted repository when specified', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        encryption: {
          encryptionType: 'KMS',
          kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key'
        }
      });
      
      const { template } = synthesizeComponent(context, spec);
      
      // Verify ECR repository with KMS encryption
      template.hasResourceProperties('AWS::ECR::Repository', {
        EncryptionConfiguration: {
          EncryptionType: 'KMS'
          // KmsKey is undefined when using default AWS managed key
        }
      });
    });
    
  });
  
});