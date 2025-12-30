import { Stack } from 'aws-cdk-lib';
import { IamRoleComponentConfigBuilder, IamRoleConfig } from '../../src/iam-role.builder.ts';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

const createContext = (
  complianceFramework: ComponentContext['complianceFramework'] = 'commercial'
): ComponentContext => {
  const stack = new Stack();
  return {
    serviceName: 'unit-test-service',
    environment: 'test',
    complianceFramework,
    scope: stack,
    region: 'us-east-1',
    accountId: '000000000000',
    serviceLabels: {
      'service-name': 'unit-test-service',
      environment: 'test',
      'compliance-framework': complianceFramework
    }
  };
};

const createSpec = (config: Partial<IamRoleConfig> = {}): ComponentSpec => ({
  name: 'test-role',
  type: 'iam-role',
  config
});

describe('IamRoleComponentConfigBuilder', () => {
  it('provides safe hardcoded defaults', () => {
    const builder = new IamRoleComponentConfigBuilder(createContext(), createSpec());
    const config = builder.buildSync();

    expect(config.assumedBy).toEqual([]);
    expect(config.maxSessionDuration).toBe(3600);
    expect(config.path).toBe('/');
    expect(config.controls?.trustPolicies?.enforceMfa).toBe(false);
    expect(config.logging?.access?.enabled).toBe(false);
  });

  it('applies component overrides over platform defaults', () => {
    const builder = new IamRoleComponentConfigBuilder(
      createContext(),
      createSpec({
        roleName: 'custom-role',
        assumedBy: [{ service: 'lambda.amazonaws.com' }],
        maxSessionDuration: 7200,
        logging: {
          access: {
            enabled: true,
            retentionInDays: 30
          }
        }
      })
    );

    const config = builder.buildSync();
    expect(config.roleName).toBe('custom-role');
    expect(config.assumedBy?.[0]?.service).toBe('lambda.amazonaws.com');
    expect(config.maxSessionDuration).toBe(7200);
    expect(config.logging?.access?.enabled).toBe(true);
    expect(config.logging?.access?.retentionInDays).toBe(30);
  });

  it('enforces FedRAMP boundaries by default', () => {
    const builder = new IamRoleComponentConfigBuilder(createContext('fedramp-high'), createSpec());
    const config = builder.buildSync();

    expect(config.controls?.enforceBoundary).toBe(true);
    expect(config.controls?.trustPolicies?.enforceMfa).toBe(true);
    expect(config.logging?.audit?.enabled).toBe(true);
  });

  it('resolves environment variable interpolations', () => {
    process.env.TEST_ASSUME_SERVICE = 'ecs.amazonaws.com';
    process.env.TEST_PATH = '/secure/';

    const builder = new IamRoleComponentConfigBuilder(
      createContext(),
      createSpec({
        assumedBy: [{ service: '${env:TEST_ASSUME_SERVICE}' }],
        path: '${env:TEST_PATH}'
      })
    );

    const config = builder.buildSync();

    expect(config.assumedBy?.[0]?.service).toBe('ecs.amazonaws.com');
    expect(config.path).toBe('/secure/');

    delete process.env.TEST_ASSUME_SERVICE;
    delete process.env.TEST_PATH;
  });
});
