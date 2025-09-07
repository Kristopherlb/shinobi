import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { S3BucketComponent } from '../src/s3-bucket.component';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/src/component-interfaces';

describe('S3BucketComponent - CloudFormation Synthesis', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let component: S3BucketComponent;
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');

    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012'
    };

    mockSpec = {
      name: 'test-bucket',
      type: 's3-bucket',
      config: {
        bucketName: 'test-service-data-bucket'
      }
    };
  });

  describe('CloudFormation Resource Generation', () => {
    test('should generate S3 bucket with correct properties', () => {
      component = new S3BucketComponent(stack, 'TestS3Bucket', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      
      // Verify S3 bucket is created
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'test-service-data-bucket'
      });

      // Verify bucket has encryption enabled by default
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256'
              }
            }
          ]
        }
      });

      // Verify public access block is configured
      template.hasResourceProperties('AWS::S3::BucketPublicAccessBlock', {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      });
    });

    test('should enable versioning and lifecycle policies for production', () => {
      mockContext.environment = 'prod';
      mockSpec.config = {
        bucketName: 'prod-data-bucket',
        versioning: { status: 'Enabled' },
        lifecycleConfiguration: {
          rules: [
            {
              id: 'TransitionToIA',
              status: 'Enabled',
              transitions: [
                {
                  days: 30,
                  storageClass: 'STANDARD_IA'
                }
              ]
            }
          ]
        }
      };

      component = new S3BucketComponent(stack, 'TestS3Bucket', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify versioning is enabled
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled'
        }
      });

      // Verify lifecycle configuration exists
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: [
            {
              Id: 'TransitionToIA',
              Status: 'Enabled',
              Transitions: [
                {
                  StorageClass: 'STANDARD_IA',
                  TransitionInDays: 30
                }
              ]
            }
          ]
        }
      });
    });
  });

  describe('Compliance Framework Testing', () => {
    test('should apply FedRAMP Moderate hardening', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      component = new S3BucketComponent(stack, 'TestS3Bucket', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify KMS encryption is enforced
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms'
              },
              BucketKeyEnabled: true
            }
          ]
        }
      });

      // Verify access logging is enabled
      template.hasResourceProperties('AWS::S3::Bucket', {
        LoggingConfiguration: {}
      });
    });

    test('should apply FedRAMP High security controls', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      component = new S3BucketComponent(stack, 'TestS3Bucket', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify customer-managed KMS key is used
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: expect.stringContaining('S3 bucket encryption key'),
        KeyPolicy: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Principal: { AWS: expect.stringContaining('root') }
            })
          ])
        }
      });

      // Verify bucket policy restricts access
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Deny',
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false'
                }
              }
            })
          ])
        }
      });
    });
  });

  describe('Capabilities and Outputs', () => {
    test('should register storage:s3 capability', () => {
      component = new S3BucketComponent(stack, 'TestS3Bucket', mockContext, mockSpec);
      component.synth();

      const capabilities = component.getCapabilities();
      
      expect(capabilities['storage:s3']).toBeDefined();
      expect(capabilities['storage:s3'].bucketName).toBe('test-service-data-bucket');
      expect(capabilities['storage:s3'].bucketArn).toContain('arn:aws:s3:::test-service-data-bucket');
      expect(capabilities['storage:s3'].region).toBe('us-east-1');
    });

    test('should provide correct CloudFormation outputs', () => {
      component = new S3BucketComponent(stack, 'TestS3Bucket', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);

      // Verify exports are created for cross-stack references
      template.hasOutput('TestS3BucketBucketName', {
        Value: { Ref: expect.any(String) },
        Export: { Name: expect.stringContaining('test-service-data-bucket-name') }
      });

      template.hasOutput('TestS3BucketBucketArn', {
        Value: { 'Fn::GetAtt': [expect.any(String), 'Arn'] },
        Export: { Name: expect.stringContaining('test-service-data-bucket-arn') }
      });
    });
  });

  describe('Error Conditions', () => {
    test('should fail synthesis with invalid bucket name', () => {
      mockSpec.config = {
        bucketName: 'Invalid_Bucket_Name!'  // Invalid characters
      };

      component = new S3BucketComponent(stack, 'TestS3Bucket', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow();
    });

    test('should fail synthesis with missing required configuration', () => {
      mockSpec.config = {};  // Missing bucketName

      component = new S3BucketComponent(stack, 'TestS3Bucket', mockContext, mockSpec);
      
      expect(() => component.synth()).toThrow('bucketName is required');
    });
  });

  describe('CloudFormation Template Validation', () => {
    test('should generate syntactically valid CloudFormation', () => {
      component = new S3BucketComponent(stack, 'TestS3Bucket', mockContext, mockSpec);
      component.synth();

      const cfnTemplate = app.synth().getStackByName('TestStack').template;
      
      // Basic CloudFormation structure validation
      expect(cfnTemplate).toHaveProperty('AWSTemplateFormatVersion', '2010-09-09');
      expect(cfnTemplate).toHaveProperty('Resources');
      expect(Object.keys(cfnTemplate.Resources).length).toBeGreaterThan(0);

      // Ensure all resources have required properties
      Object.entries(cfnTemplate.Resources).forEach(([logicalId, resource]: [string, any]) => {
        expect(resource).toHaveProperty('Type');
        expect(resource).toHaveProperty('Properties');
        expect(typeof resource.Type).toBe('string');
        expect(typeof resource.Properties).toBe('object');
      });
    });

    test('should have consistent resource naming', () => {
      component = new S3BucketComponent(stack, 'TestS3Bucket', mockContext, mockSpec);
      component.synth();

      const template = Template.fromStack(stack);
      const cfnTemplate = app.synth().getStackByName('TestStack').template;

      // Verify consistent naming convention
      const resourceNames = Object.keys(cfnTemplate.Resources);
      resourceNames.forEach(name => {
        expect(name).toMatch(/^TestS3Bucket[A-Z][a-zA-Z0-9]*$/);
      });
    });
  });
});