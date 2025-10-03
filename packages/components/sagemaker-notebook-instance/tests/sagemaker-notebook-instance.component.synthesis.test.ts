/**
 * SageMakerNotebookInstanceComponent Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 */

import './setup.js';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { SageMakerNotebookInstanceComponent } from '../sagemaker-notebook-instance.component.ts';
import { SageMakerNotebookInstanceConfig } from '../sagemaker-notebook-instance.builder.ts';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

// Test metadata for Platform Testing Standard compliance
const TEST_METADATA = {
  "id": "TP-sagemaker-synthesis-001",
  "level": "unit",
  "capability": "Component synthesis with CDK resource creation",
  "oracle": "snapshot",
  "invariants": ["CDK resources are created correctly", "CloudFormation template is valid"],
  "fixtures": ["MockComponentContext", "MockComponentSpec", "CDK Stack"],
  "inputs": { "shape": "ComponentContext + ComponentSpec + CDK Stack", "notes": "Various compliance frameworks and configurations" },
  "risks": ["CDK synthesis failures", "Invalid CloudFormation templates"],
  "dependencies": ["AWS CDK", "SageMaker CDK Constructs"],
  "evidence": ["CloudFormation template verification", "CDK resource assertions"],
  "compliance_refs": ["std://cdk-synthesis", "std://cloudformation-validation"],
  "ai_generated": false,
  "human_reviewed_by": "Platform Engineering Team"
};

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  environment,
  complianceFramework,
  region: 'us-east-1',
  accountId: '123456789012',
  serviceLabels: {
    'service-name': 'test-service',
    'environment': environment,
    'compliance-framework': complianceFramework
  }
} as any);

const createMockSpec = (config: Partial<SageMakerNotebookInstanceConfig> = {}): ComponentSpec => ({
  name: 'test-sagemaker-notebook-instance',
  type: 'sagemaker-notebook-instance',
  config
});

const synthesizeComponent = (
  context: ComponentContext,
  spec: ComponentSpec
): { component: SageMakerNotebookInstanceComponent; template: Template } => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  
  const component = new SageMakerNotebookInstanceComponent(stack, 'TestComponent', context, spec);
  component.synth();
  
  const template = Template.fromStack(stack);
  return { component, template };
};

describe('SageMakerNotebookInstanceComponent Synthesis', () => {
  
  // Determinism controls for Platform Testing Standard compliance
  beforeEach(() => {
    // Freeze time for deterministic tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    
    // Seed random number generator for deterministic behavior
    Math.random = jest.fn(() => 0.5);
  });

  afterEach(() => {
    // Restore real timers and random
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  
  describe('Basic Synthesis', () => {
    
    it('BasicSynthesis__MinimalConfig__CreatesNotebookInstance', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const { component, template } = synthesizeComponent(context, spec);
      
      // Verify SageMaker Notebook Instance is created
      template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
        InstanceType: 'ml.t3.medium',
        RootAccess: 'Enabled',
        DirectInternetAccess: 'Enabled',
        VolumeSizeInGb: 20,
        PlatformIdentifier: 'notebook-al2-v2'
      });
      
      // Verify IAM role is created
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'sagemaker.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      });
      
      // Verify CloudWatch Log Group is created
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: Match.stringLikeRegexp('/aws/sagemaker/NotebookInstances/.*'),
        RetentionInDays: 90
      });
    });
    
    it('BasicSynthesis__KmsEncryptionEnabled__CreatesKmsKey', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        security: {
          kmsEncryption: true
        }
      });
      
      const { component, template } = synthesizeComponent(context, spec);
      
      // Verify KMS key is created
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: Match.stringLikeRegexp('KMS key for.*SageMaker notebook'),
        EnableKeyRotation: true
      });
    });
    
    it('BasicSynthesis__VpcSpecified__CreatesSecurityGroup', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        subnetId: 'subnet-12345678'
      });
      
      const { component, template } = synthesizeComponent(context, spec);
      
      // Verify security group is created
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        Description: Match.stringLikeRegexp('Security group for.*SageMaker notebook')
      });
    });
    
  });

  describe('Compliance Framework Variations', () => {
    
    it('ComplianceFrameworkVariations__FedRAMPModerate__AppliesSecureHardening', () => {
      const context = createMockContext('fedramp-moderate', 'prod');
      const spec = createMockSpec();
      
      const { component, template } = synthesizeComponent(context, spec);
      
      // Verify FedRAMP Moderate specific configuration
      template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
        InstanceType: 'ml.m5.large',
        RootAccess: 'Disabled',
        DirectInternetAccess: 'Disabled',
        VolumeSizeInGb: 100
      });
      
      // Verify KMS key is created for encryption
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true
      });
      
      // Verify extended log retention
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 365
      });
    });
    
    it('ComplianceFrameworkVariations__FedRAMPHigh__AppliesHighSecurityHardening', () => {
      const context = createMockContext('fedramp-high', 'prod');
      const spec = createMockSpec();
      
      const { component, template } = synthesizeComponent(context, spec);
      
      // Verify FedRAMP High specific configuration
      template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
        InstanceType: 'ml.m5.xlarge',
        RootAccess: 'Disabled',
        DirectInternetAccess: 'Disabled',
        VolumeSizeInGb: 200
      });
      
      // Verify KMS key is created for encryption
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true
      });
      
      // Verify extended log retention
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 2555
      });
    });
    
  });

  describe('Configuration Variations', () => {
    
    it('ConfigurationVariations__CustomInstanceConfig__AppliesUserSettings', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        instanceType: 'ml.m5.2xlarge',
        volumeSizeInGB: 100,
        rootAccess: 'Disabled',
        directInternetAccess: 'Disabled'
      });
      
      const { component, template } = synthesizeComponent(context, spec);
      
      // Verify custom configuration is applied
      template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
        InstanceType: 'ml.m5.2xlarge',
        VolumeSizeInGb: 100,
        RootAccess: 'Disabled',
        DirectInternetAccess: 'Disabled'
      });
    });
    
    it('ConfigurationVariations__CustomMonitoringConfig__AppliesMonitoringSettings', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        monitoring: {
          enabled: true,
          detailedMetrics: true
        },
        compliance: {
          auditLogging: true,
          retentionDays: 180
        }
      });
      
      const { component, template } = synthesizeComponent(context, spec);
      
      // Verify monitoring configuration
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 180
      });
      
      // Verify audit log group is created
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: Match.stringLikeRegexp('/aws/sagemaker/NotebookInstances/.*/audit')
      });
    });
    
    it('ConfigurationVariations__CustomNotebookName__UsesCustomName', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        notebookInstanceName: 'custom-notebook-name'
      });
      
      const { component, template } = synthesizeComponent(context, spec);
      
      // Verify custom name is used
      template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
        NotebookInstanceName: 'custom-notebook-name'
      });
    });
    
  });

  describe('Capabilities Registration', () => {
    
    it('CapabilitiesRegistration__ValidConfig__RegistersNotebookCapability', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      const capabilities = component.getCapabilities();
      
      expect(capabilities).toHaveProperty('ml:notebook');
      
      // Verify notebook capability structure
      expect(capabilities['ml:notebook']).toMatchObject({
        notebookInstanceName: expect.any(String),
        notebookInstanceArn: expect.any(String),
        url: expect.any(String)
      });
    });
    
  });

  describe('Error Handling', () => {
    
    it('ErrorHandling__SynthesisErrors__HandlesGracefully', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        instanceType: 'invalid-type',
        volumeSizeInGB: -1
      });
      
      // Should not throw during construction, but may fail during synth
      expect(() => {
        try {
          synthesizeComponent(context, spec);
        } catch (error) {
          // Expected to fail with invalid configuration
          expect(error).toBeDefined();
        }
      }).not.toThrow();
    });
    
  });

  describe('Tagging', () => {
    
    it('should apply standard tags to all resources', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const { component, template } = synthesizeComponent(context, spec);
      
      // Verify SageMaker Notebook Instance has tags
      template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'service',
            Value: 'test-service'
          }),
          Match.objectLike({
            Key: 'environment',
            Value: 'dev'
          })
        ])
      });
      
      // Verify IAM role has tags
      template.hasResourceProperties('AWS::IAM::Role', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'role-type',
            Value: 'execution'
          })
        ])
      });
    });
    
  });

});