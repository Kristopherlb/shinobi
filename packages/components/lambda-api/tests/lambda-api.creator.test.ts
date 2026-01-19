import { Stack } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

import { LambdaApiComponentCreator } from '../src/lambda-api.creator';
import { LambdaApiConfig } from '../src/lambda-api.builder';

const createContext = (): ComponentContext => ({
  serviceName: 'checkout',
  environment: 'dev',
  complianceFramework: 'commercial',
  scope: new Stack(),
  region: 'us-east-1',
  accountId: '123456789012'
});

const createSpec = (config: Partial<LambdaApiConfig> = {}): ComponentSpec => ({
  name: 'checkout-api',
  type: 'lambda-api',
  config: {
    handler: 'src/api.handler',
    ...config
  }
});

describe('LambdaApiComponentCreator validation', () => {
  const creator = new LambdaApiComponentCreator();

  it('accepts a minimal valid specification', () => {
    const result = creator.validateSpec(createSpec());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing handler', () => {
    const result = creator.validateSpec(createSpec({ handler: undefined as unknown as string }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((err) => err.includes('handler'))).toBe(true);
  });

  it('requires usage plan when API key enforcement is enabled', () => {
    const result = creator.validateSpec(createSpec({
      api: {
        apiKeyRequired: true,
        usagePlan: {
          enabled: false
        },
        stageName: 'prod',
        metricsEnabled: true,
        tracingEnabled: true,
        throttling: {
          burstLimit: 10,
          rateLimit: 5
        },
        logging: {
          enabled: true,
          retentionDays: 30,
          logFormat: 'json',
          prefix: 'access/'
        },
        cors: {
          enabled: true,
          allowOrigins: ['*'],
          allowHeaders: ['Content-Type'],
          allowMethods: ['GET'],
          allowCredentials: false
        }
      }
    }));

    expect(result.valid).toBe(false);
    expect(result.errors.some((err) => err.includes('usage plan'))).toBe(true);
  });

  it('requires VPC identifiers when VPC deployment is requested', () => {
    const result = creator.validateSpec(createSpec({
      vpc: {
        enabled: true,
        vpcId: undefined,
        subnetIds: [],
        securityGroupIds: []
      }
    }));

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('vpcId'),
      expect.stringContaining('subnet ID'),
      expect.stringContaining('security group')
    ]));
  });
});
