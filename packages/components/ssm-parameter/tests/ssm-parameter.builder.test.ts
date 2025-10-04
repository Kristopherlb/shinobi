import { Stack } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

import {
  SsmParameterComponentConfig,
  SsmParameterComponentConfigBuilder
} from '../ssm-parameter.builder.ts';

const createContext = (framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial'): ComponentContext => ({
  serviceName: 'orders',
  environment: 'dev',
  complianceFramework: framework,
  scope: new Stack(),
  region: 'us-east-1',
  accountId: '123456789012'
});

const createSpec = (config: Partial<SsmParameterComponentConfig> = {}): ComponentSpec => ({
  name: 'orders-db-password',
  type: 'ssm-parameter',
  config: {
    name: '/orders/dev/db/password',
    ...config
  }
});

describe('SsmParameterComponentConfigBuilder', () => {
  it('applies commercial defaults', () => {
    const builder = new SsmParameterComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.kind).toBe('string');
    expect(config.tier).toBe('standard');
    expect(config.encryption.customerManagedKey.enabled).toBe(false);
    expect(config.tags).toEqual({});
  });

  it('pulls secure defaults for fedramp-high', () => {
    const builder = new SsmParameterComponentConfigBuilder({
      context: createContext('fedramp-high'),
      spec: createSpec()
    });

    const config = builder.buildSync();

    expect(config.kind).toBe('secureString');
    expect(config.tier).toBe('advanced');
    expect(config.encryption.customerManagedKey.enabled).toBe(true);
    expect(config.encryption.customerManagedKey.rotationEnabled).toBe(true);
  });

  it('merges overrides while retaining defaults', () => {
    const builder = new SsmParameterComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        description: 'Custom parameter',
        kind: 'stringList',
        values: ['a', 'b', 'b', 'c'],
        encryption: {
          customerManagedKey: {
            enabled: true,
            kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/abc'
          }
        },
        tags: {
          team: 'platform'
        }
      })
    });

    const config = builder.buildSync();

    expect(config.description).toBe('Custom parameter');
    expect(config.kind).toBe('stringList');
    expect(config.values).toEqual(['a', 'b', 'c']);
    expect(config.encryption.customerManagedKey.enabled).toBe(true);
    expect(config.encryption.customerManagedKey.kmsKeyArn).toBe('arn:aws:kms:us-east-1:123456789012:key/abc');
    expect(config.tags.team).toBe('platform');
  });

  it('derives name and values when provided via legacy parameterName field', () => {
    const spec: ComponentSpec = {
      name: 'legacy-parameter',
      type: 'ssm-parameter',
      config: {
        // @ts-expect-error backwards compat field
        parameterName: '/legacy/name',
        kind: 'stringList',
        value: 'one,two,three'
      }
    };

    const builder = new SsmParameterComponentConfigBuilder({
      context: createContext('commercial'),
      spec
    });

    const config = builder.buildSync();

    expect(config.name).toBe('/legacy/name');
    expect(config.values).toEqual(['one', 'two', 'three']);
  });
});
