import { CognitoUserPoolBinderStrategy } from '../cognito-user-pool-binder-strategy.js';

const createSourceComponent = () => {
  const environments: Record<string, string> = {};
  const policies: any[] = [];

  return {
    environments,
    policies,
    addEnvironment: (key: string, value: string) => {
      environments[key] = value;
    },
    addToRolePolicy: (statement: any) => {
      policies.push(statement);
    }
  };
};

describe('CognitoUserPoolBinderStrategy', () => {
  const strategy = new CognitoUserPoolBinderStrategy();
  const context = {
    region: 'us-east-1',
    accountId: '123456789012',
    complianceFramework: 'commercial'
  } as const;
  const capability = {
    userPoolId: 'us-east-1_abc123',
    userPoolArn: 'arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_abc123',
    userPoolProviderName: 'cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123',
    userPoolProviderUrl: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123',
    domainBaseUrl: 'https://auth.example.com',
    clients: [
      {
        clientId: 'client-123',
        clientName: 'web-app'
      }
    ]
  };

  it('binds auth:user-pool and injects environment + IAM permissions', async () => {
    const source = createSourceComponent();
    await strategy.bind(source, capability, {
      from: 'api',
      to: 'user-pool',
      capability: 'auth:user-pool',
      access: ['authenticate', 'read']
    }, context);

    expect(source.environments.COGNITO_USER_POOL_ID).toBe(capability.userPoolId);
    expect(source.environments.COGNITO_USER_POOL_CLIENT_ID).toBe('client-123');
    expect(source.policies).toHaveLength(2);
    expect(source.policies[0].Action).toContain('cognito-idp:InitiateAuth');
  });

  it('supports identity provider bindings', async () => {
    const source = createSourceComponent();
    await strategy.bind(source, capability, {
      from: 'api',
      to: 'user-pool',
      capability: 'auth:identity-provider',
      access: ['authenticate']
    }, context);

    expect(source.environments.COGNITO_IDP_NAME).toBe(capability.userPoolProviderName);
    expect(source.environments.COGNITO_IDP_URL).toBe(capability.userPoolProviderUrl);
  });

  it('rejects unsupported access operations', async () => {
    const source = createSourceComponent();

    await expect(strategy.bind(source, capability, {
      from: 'api',
      to: 'user-pool',
      capability: 'auth:user-pool',
      access: ['delete']
    }, context)).rejects.toThrow('Invalid access types for Cognito binding');
  });
});
