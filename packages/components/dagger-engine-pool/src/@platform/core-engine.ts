import { Key } from 'aws-cdk-lib/aws-kms';

// Mock implementation of @platform/core-engine for testing
export abstract class BaseComponent {
  protected constructs = new Map();
  protected capabilities = {};

  constructor(public scope: any, public id: string, public context: any, public spec: any) { }

  protected registerConstruct(handle: string, construct: any) {
    this.constructs.set(handle, construct);
  }

  protected _registerConstruct(handle: string, construct: any) {
    this.constructs.set(handle, construct);
  }

  protected registerCapability(key: string, data: any) {
    (this.capabilities as any)[key] = data;
  }

  protected _registerCapability(key: string, data: any) {
    (this.capabilities as any)[key] = data;
  }

  protected applyStandardTags(construct: any) {
    // Mock implementation
  }

  protected createKmsKeyIfNeeded(purpose: string) {
    return new Key(this.scope, 'MockKmsKey', {
      description: `Mock KMS key for ${purpose}`
    });
  }

  public getCapabilities() {
    return this.capabilities;
  }
}
