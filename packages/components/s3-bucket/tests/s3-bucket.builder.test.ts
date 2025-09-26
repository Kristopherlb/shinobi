/**
 * S3 Bucket ConfigBuilder Tests
 * Validates configuration precedence against the Platform Configuration Standard.
 */

import { App, Stack } from 'aws-cdk-lib';
import {
  ComponentContext,
  ComponentSpec
} from '@platform/contracts';
import {
  S3BucketComponentConfigBuilder,
  S3BucketConfig
} from '../s3-bucket.builder';

const createContext = (framework: ComponentContext['complianceFramework']): ComponentContext => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  return {
    serviceName: 'test-service',
    environment: 'dev',
    complianceFramework: framework,
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

describe('S3BucketComponentConfigBuilder', () => {
  it('loads commercial defaults from platform configuration', () => {
    const builder = new S3BucketComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.versioning).toBe(false);
    expect(config.encryption?.type).toBe('AES256');
    expect(config.security?.tools?.clamavScan).toBe(false);
    expect(config.monitoring?.enabled).toBe(false);
  });

  it('applies FedRAMP Moderate defaults', () => {
    const builder = new S3BucketComponentConfigBuilder({
      context: createContext('fedramp-moderate'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.versioning).toBe(true);
    expect(config.encryption?.type).toBe('KMS');
    expect(config.security?.requireMfaDelete).toBe(true);
    expect(config.monitoring?.enabled).toBe(true);
    expect(config.security?.tools?.clamavScan).toBe(true);
  });

  it('honours manifest overrides with highest precedence', () => {
    const builder = new S3BucketComponentConfigBuilder({
      context: createContext('fedramp-moderate'),
      spec: createSpec({
        encryption: { type: 'AES256' },
        security: { requireMfaDelete: false }
      })
    });

    const config = builder.buildSync();

    expect(config.encryption?.type).toBe('AES256');
    expect(config.security?.requireMfaDelete).toBe(false);
  });
});
