import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

import { LambdaApiComponent } from '../src/lambda-api.component.ts';
import { LambdaApiConfig } from '../src/lambda-api.builder.ts';

const createContext = (
  framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'
): ComponentContext => {
  const app = new App();
  const stack = new Stack(app, `Test-${framework}`);

  return {
    serviceName: 'billing',
    environment: 'dev',
    complianceFramework: framework,
    scope: stack,
    region: 'us-east-1',
    accountId: '123456789012'
  };
};

const createSpec = (config: Partial<LambdaApiConfig>): ComponentSpec => ({
  name: 'billing-api',
  type: 'lambda-api',
  config: {
    handler: 'src/api.handler',
    ...config
  }
});

describe('LambdaApiComponent synthesis', () => {
  it('synthesizes Lambda + REST API with commercial defaults', () => {
    const context = createContext('commercial');
    const spec = createSpec({});

    const component = new LambdaApiComponent(context.scope, spec.name, context, spec);
    component.synth();

    const template = Template.fromStack(context.scope as Stack);

    template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
      Handler: 'src/api.handler',
      Runtime: 'nodejs20.x',
      MemorySize: 512,
      TracingConfig: { Mode: 'Active' },
      Environment: {
        Variables: Match.objectLike({
          SYSTEM_LOG_LEVEL: 'INFO',
          APPLICATION_LOG_LEVEL: 'INFO',
          AWS_LAMBDA_LOG_FORMAT: 'JSON'
        })
      }
    }));

    template.hasResourceProperties('AWS::ApiGateway::RestApi', Match.objectLike({
      Name: Match.stringLikeRegexp('billing-api')
    }));

    template.hasResourceProperties('AWS::ApiGateway::Stage', Match.objectLike({
      TracingEnabled: true,
      MethodSettings: Match.arrayWith([
        Match.objectLike({
          LoggingLevel: 'INFO'
        })
      ])
    }));

    template.resourceCountIs('AWS::ApiGateway::UsagePlan', 0);
  });

  it('enforces FedRAMP High configuration with VPC, usage plan, and API key', () => {
    const context = createContext('fedramp-high');
    const spec = createSpec({
      vpc: {
        enabled: false
      },
      api: {
        usagePlan: {
          enabled: true
        },
        cors: {
          enabled: true,
          allowOrigins: ['https://example.gov'],
          allowHeaders: ['Content-Type'],
          allowMethods: ['GET'],
          allowCredentials: true
        }
      }
    });

    const component = new LambdaApiComponent(context.scope, spec.name, context, spec);
    component.synth();

    const template = Template.fromStack(context.scope as Stack);

    template.hasResourceProperties('AWS::ApiGateway::Method', Match.objectLike({
      ApiKeyRequired: true
    }));

    template.resourceCountIs('AWS::ApiGateway::UsagePlan', 1);
    template.hasResourceProperties('AWS::ApiGateway::UsagePlan', Match.objectLike({
      Throttle: Match.anyValue()
    }));

    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: 3653
    }));
  });
});
