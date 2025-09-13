import * as cdk from 'aws-cdk-lib';

// Mock @platform/core-engine
jest.mock('@platform/core-engine', () => ({
  BaseComponent: class MockBaseComponent {
    protected constructs = new Map();
    protected capabilities = {};

    constructor(public scope: any, public id: string, public context: any, public spec: any) { }

    protected registerConstruct(handle: string, construct: any) {
      this.constructs.set(handle, construct);
    }

    protected registerCapability(key: string, data: any) {
      (this.capabilities as any)[key] = data;
    }

    protected applyStandardTags(construct: any) {
      // Mock implementation
    }

    protected createKmsKeyIfNeeded(purpose: string) {
      return new cdk.aws_kms.Key(this.scope, `MockKmsKey-${purpose}`, {
        description: `Mock KMS key for ${purpose}`
      });
    }

    protected getVpc() {
      return cdk.aws_ec2.Vpc.fromLookup(this.scope, 'MockVpc', { isDefault: true });
    }

    protected createArtifactsBucket(kmsKey: cdk.aws_kms.Key) {
      return new cdk.aws_s3.Bucket(this.scope, 'MockArtifactsBucket', {
        encryption: cdk.aws_s3.BucketEncryption.KMS,
        encryptionKey: kmsKey
      });
    }
  }
}));

// Mock @platform/contracts
jest.mock('@platform/contracts', () => ({
  ComponentContext: {},
  ComponentSpec: {}
}));

// Mock @platform/tagging-service
jest.mock('@platform/tagging-service', () => ({
  applyComplianceTags: jest.fn()
}));