/**
 * S3 Bucket Component synthesis tests
 * Ensures generated CloudFormation matches compliance expectations.
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import {
  ComponentContext,
  ComponentSpec
} from '@platform/contracts';
import { S3BucketComponent } from '../s3-bucket.component';
import { S3BucketConfig } from '../s3-bucket.builder';

const createContext = (
  complianceFramework: ComponentContext['complianceFramework']
): ComponentContext => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  return {
    serviceName: 'test-service',
    environment: 'dev',
    complianceFramework,
    scope: stack,
    region: 'us-east-1',
    accountId: '123456789012'
  } as ComponentContext;
};

const createSpec = (config: Partial<S3BucketConfig> = {}): ComponentSpec => ({
  name: 'test-bucket',
  type: 's3-bucket',
  config
});

const synthesize = (context: ComponentContext, spec: ComponentSpec) => {
  const stack = context.scope as Stack;
  const component = new S3BucketComponent(stack, spec.name, context, spec);
  component.synth();
  return Template.fromStack(stack);
};

describe('S3BucketComponent', () => {
  it('creates a commercial bucket with platform defaults', () => {
    const context = createContext('commercial');
    const template = synthesize(context, createSpec());

    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: Match.absent(),
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: Match.objectLike({
              SSEAlgorithm: 'AES256'
            })
          })
        ])
      }
    });

    template.resourceCountIs('AWS::KMS::Key', 0);
  });

  it('enables FedRAMP Moderate hardening from platform config', () => {
    const context = createContext('fedramp-moderate');
    const template = synthesize(context, createSpec());

    template.hasResourceProperties('AWS::KMS::Key', {
      KeySpec: 'SYMMETRIC_DEFAULT'
    });

    template.hasResourceProperties('AWS::S3::Bucket', Match.objectLike({
      VersioningConfiguration: { Status: 'Enabled' },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: Match.objectLike({
              SSEAlgorithm: 'aws:kms'
            })
          })
        ])
      },
      LoggingConfiguration: Match.objectLike({
        DestinationBucketName: Match.anyValue()
      })
    }));

    template.hasResourceProperties('AWS::S3::BucketPolicy', Match.objectLike({
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'DenyInsecureTransport' }),
          Match.objectLike({ Sid: 'RequireMFAForDelete' })
        ])
      }
    }));
  });

  it('enables object lock for FedRAMP High', () => {
    const context = createContext('fedramp-high');
    const template = synthesize(context, createSpec());

    template.hasResourceProperties('AWS::S3::Bucket', Match.objectLike({
      ObjectLockEnabled: true,
      ObjectLockConfiguration: Match.objectLike({
        Rule: Match.objectLike({
          DefaultRetention: Match.objectLike({
            Mode: 'COMPLIANCE',
            Days: 2555
          })
        })
      })
    }));

    template.hasResourceProperties('AWS::S3::BucketPolicy', Match.objectLike({
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'DenyDeleteActions' })
        ])
      }
    }));
  });

  it('allows manifest overrides to disable audit logging', () => {
    const context = createContext('fedramp-moderate');
    const template = synthesize(
      context,
      createSpec({
        compliance: { auditLogging: false },
        encryption: { type: 'AES256' }
      })
    );

    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.resourceCountIs('AWS::KMS::Key', 0);

    const buckets = template.findResources('AWS::S3::Bucket');
    Object.values(buckets).forEach(resource => {
      expect(resource.Properties?.LoggingConfiguration).toBeUndefined();
    });
  });
});
