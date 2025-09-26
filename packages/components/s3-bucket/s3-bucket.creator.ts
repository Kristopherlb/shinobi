import {
  ComponentSpec,
  ComponentContext,
  IComponent,
  IComponentCreator
} from '@shinobi/core';
import { S3BucketComponent } from './s3-bucket.component';
import { S3BucketConfig, S3_BUCKET_CONFIG_SCHEMA } from './s3-bucket.builder';

export class S3BucketComponentCreator implements IComponentCreator {
  public readonly componentType = 's3-bucket';
  public readonly displayName = 'S3 Bucket Component';
  public readonly description = 'Provisioned S3 bucket with configurable compliance hardening';
  public readonly category = 'storage';
  public readonly tags = ['s3', 'storage', 'object-store'];
  public readonly configSchema = S3_BUCKET_CONFIG_SCHEMA;

  createComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    const scope = context.scope;
    if (!scope) {
      throw new Error('S3BucketComponentCreator requires context.scope to instantiate the component');
    }

    return new S3BucketComponent(scope, spec.name, context, spec);
  }

  processComponent(spec: ComponentSpec, context: ComponentContext): IComponent {
    this.validateSpec(spec, context);
    return this.createComponent(spec, context);
  }

  public validateSpec(spec: ComponentSpec, context: ComponentContext): void {
    const errors: string[] = [];
    const config = spec.config as Partial<S3BucketConfig> | undefined;

    if (!spec.name || !/^[a-z][a-z0-9-]*$/i.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters or hyphens.');
    }

    if (config?.public && context.complianceFramework !== 'commercial') {
      errors.push('Public buckets are not permitted under FedRAMP compliance frameworks.');
    }

    if (config?.encryption?.type === 'KMS' && config.encryption.kmsKeyArn) {
      const arnPattern = /^arn:aws:kms:[a-z0-9-]+:\d{12}:key\/[a-f0-9-]{36}$/;
      if (!arnPattern.test(config.encryption.kmsKeyArn)) {
        errors.push(`Invalid KMS key ARN: ${config.encryption.kmsKeyArn}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid s3-bucket specification: ${errors.join(' ')}`);
    }
  }

  public getProvidedCapabilities(): string[] {
    return ['bucket:s3'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return ['main', 'bucket', 'auditBucket', 'kmsKey', 'virusScanLambda'];
  }
}
