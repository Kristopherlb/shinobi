import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { S3BucketComponent } from './s3-bucket.component';
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

      // Verify public access block is configured
      template.hasResourceProperties('AWS::S3::BucketPublicAccessBlock', {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      });
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
      expect(Object.keys(cfnTemplate.Resources).length).toBeGreaterThanOrEqual(1);
    });
  });
});