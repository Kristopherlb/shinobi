import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CognitoUserPoolComponent } from '../cognito-user-pool.component';
import { CognitoUserPoolConfig } from '../cognito-user-pool.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

const createContext = (framework: ComponentContext['complianceFramework'] = 'commercial'): ComponentContext => ({
  serviceName: 'identity-service',
  owner: 'identity-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'identity-service',
    owner: 'identity-team',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<CognitoUserPoolConfig> = {}): ComponentSpec => ({
  name: 'user-pool',
  type: 'cognito-user-pool',
  config
});

const synthesise = (
  context: ComponentContext,
  spec: ComponentSpec
): { component: CognitoUserPoolComponent; template: Template } => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  const component = new CognitoUserPoolComponent(stack, spec.name, context, spec);
  component.synth();

  return { component, template: Template.fromStack(stack) };
};

describe('CognitoUserPoolComponent synthesis', () => {
  it('creates a user pool with domain, app client, and alarms driven by config', () => {
    const context = createContext('fedramp-high');
    const spec = createSpec({
      userPoolName: 'secure-user-pool',
      advancedSecurityMode: 'enforced',
      email: {
        fromEmail: 'no-reply@example.com',
        fromName: 'Example Auth',
        replyToEmail: 'support@example.com',
        sesRegion: 'us-east-1'
      },
      sms: {
        snsCallerArn: 'arn:aws:iam::123456789012:role/CognitoSmsRole',
        externalId: 'external-token'
      },
      domain: {
        domainPrefix: 'secure-app'
      },
      monitoring: {
        enabled: true,
        signInSuccess: {
          enabled: true,
          threshold: 2
        },
        signInThrottle: {
          enabled: true,
          threshold: 3
        },
        signUpSuccess: {
          enabled: true,
          threshold: 1
        },
        signUpThrottle: {
          enabled: true,
          threshold: 2
        },
        riskHigh: {
          enabled: true,
          threshold: 1
        }
      },
      appClients: [
        {
          clientName: 'web-client',
          authFlows: ['user-srp'],
          supportedIdentityProviders: ['cognito'],
          oAuth: {
            flows: ['authorization-code'],
            scopes: ['openid', 'email'],
            callbackUrls: ['https://app.example.com/callback'],
            logoutUrls: ['https://app.example.com/logout']
          },
          refreshTokenValidity: 30
        }
      ]
    });

    const { component, template } = synthesise(context, spec);

    template.hasResourceProperties('AWS::Cognito::UserPool', Match.objectLike({
      UserPoolName: 'secure-user-pool',
      MfaConfiguration: 'ON',
      UserPoolAddOns: {
        AdvancedSecurityMode: 'ENFORCED'
      },
      UserPoolTier: 'PLUS',
      EmailConfiguration: Match.objectLike({
        EmailSendingAccount: 'DEVELOPER',
        From: Match.stringLikeRegexp('no-reply@example.com')
      }),
      SmsConfiguration: Match.objectLike({
        ExternalId: 'external-token',
        SnsCallerArn: 'arn:aws:iam::123456789012:role/CognitoSmsRole'
      })
    }));

    template.hasResourceProperties('AWS::Cognito::UserPoolDomain', Match.objectLike({
      Domain: 'secure-app'
    }));

    template.hasResourceProperties('AWS::Cognito::UserPoolClient', Match.objectLike({
      ClientName: 'web-client',
      RefreshTokenValidity: 43200,
      TokenValidityUnits: Match.objectLike({ RefreshToken: 'minutes' }),
      ExplicitAuthFlows: Match.arrayWith(['ALLOW_USER_SRP_AUTH'])
    }));

    template.resourceCountIs('AWS::CloudWatch::Alarm', 5);

    const capabilities = component.getCapabilities();
    expect(capabilities['auth:user-pool']).toBeDefined();
    expect(capabilities['auth:identity-provider']).toBeDefined();

    expect(component.getConstruct('main')).toBeDefined();
    expect(component.getConstruct('domain')).toBeDefined();
    expect(component.getConstruct('client:0')).toBeDefined();
  });
});
