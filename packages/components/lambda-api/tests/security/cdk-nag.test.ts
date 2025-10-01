import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { LambdaApiComponent } from '../../src/lambda-api.component.js';

describe('LambdaApiComponent CDK Nag Integration', () => {
  const createContext = (
    framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'
  ): ComponentContext => {
    const app = new App();
    const stack = new Stack(app, `Test-${framework}`);

    return {
      serviceName: 'test-service',
      environment: 'dev',
      complianceFramework: framework,
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012'
    };
  };

  const createSpec = (): ComponentSpec => ({
    name: 'test-lambda-api',
    type: 'lambda-api',
    config: {
      handler: 'index.handler',
      runtime: 'nodejs20.x',
      memorySize: 512,
      timeoutSeconds: 30,
      api: {
        stageName: 'dev',
        metricsEnabled: true,
        tracingEnabled: true,
        apiKeyRequired: false,
        throttling: {
          burstLimit: 5000,
          rateLimit: 2000
        },
        usagePlan: {
          enabled: false
        },
        logging: {
          enabled: true,
          retentionDays: 14,
          logFormat: 'json',
          prefix: 'api-logs'
        },
        cors: {
          enabled: false,
          allowOrigins: [],
          allowHeaders: [],
          allowMethods: [],
          allowCredentials: false
        }
      },
      vpc: {
        enabled: false,
        subnetIds: [],
        securityGroupIds: []
      },
      encryption: {
        enabled: false
      },
      monitoring: {
        enabled: true,
        alarms: {
          lambdaErrors: {
            enabled: true,
            threshold: 1,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Sum',
            tags: {}
          },
          lambdaThrottles: {
            enabled: true,
            threshold: 1,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Sum',
            tags: {}
          },
          lambdaDuration: {
            enabled: true,
            threshold: 5000,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Average',
            tags: {}
          },
          api4xxErrors: {
            enabled: true,
            threshold: 10,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Sum',
            tags: {}
          },
          api5xxErrors: {
            enabled: true,
            threshold: 5,
            evaluationPeriods: 1,
            periodMinutes: 1,
            comparisonOperator: 'gt',
            treatMissingData: 'breaching',
            statistic: 'Sum',
            tags: {}
          }
        }
      }
    }
  });

  describe('Commercial Framework CDK Nag Suppressions', () => {
    it('should apply Lambda-specific suppressions for commercial framework', () => {
      const context = createContext('commercial');
      const spec = createSpec();

      const component = new LambdaApiComponent(context.scope, spec.name, context, spec);
      component.synth();

      const template = Template.fromStack(context.scope as Stack);

      // Verify Lambda function is created with proper configuration
      template.hasResourceProperties('AWS::Lambda::Function', Match.objectLike({
        Handler: 'index.handler',
        Runtime: 'nodejs20.x',
        MemorySize: 512,
        Timeout: 30,
        TracingConfig: { Mode: 'Active' }
      }));

      // Verify API Gateway is created
      template.hasResourceProperties('AWS::ApiGateway::RestApi', Match.objectLike({
        Name: Match.anyValue()
      }));

      // Verify CloudWatch Log Groups are created
      template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
        RetentionInDays: 14
      }));
    });

    it('should apply CDK Nag suppressions for Lambda function', () => {
      const context = createContext('commercial');
      const spec = createSpec();

      const component = new LambdaApiComponent(context.scope, spec.name, context, spec);
      component.synth();

      const template = Template.fromStack(context.scope as Stack);

      // Verify Lambda function has proper metadata for CDK Nag suppressions
      template.hasResource('AWS::Lambda::Function', Match.objectLike({
        Metadata: Match.objectLike({
          'cdk-nag': Match.objectLike({
            rulesToSuppress: Match.arrayWith([
              Match.objectLike({
                id: 'AwsSolutions-L1',
                reason: Match.stringLikeRegexp('.*runtime version.*')
              }),
              Match.objectLike({
                id: 'AwsSolutions-L2',
                reason: Match.stringLikeRegexp('.*log retention.*')
              }),
              Match.objectLike({
                id: 'AwsSolutions-L3',
                reason: Match.stringLikeRegexp('.*environment variables.*')
              }),
              Match.objectLike({
                id: 'AwsSolutions-L4',
                reason: Match.stringLikeRegexp('.*memory allocation.*')
              }),
              Match.objectLike({
                id: 'AwsSolutions-L5',
                reason: Match.stringLikeRegexp('.*timeout settings.*')
              }),
              Match.objectLike({
                id: 'AwsSolutions-IAM4',
                reason: Match.stringLikeRegexp('.*AWS managed policies.*')
              }),
              Match.objectLike({
                id: 'AwsSolutions-IAM5',
                reason: Match.stringLikeRegexp('.*wildcard permissions.*')
              })
            ])
          })
        })
      }));
    });

    it('should apply CDK Nag suppressions for API Gateway', () => {
      const context = createContext('commercial');
      const spec = createSpec();

      const component = new LambdaApiComponent(context.scope, spec.name, context, spec);
      component.synth();

      const template = Template.fromStack(context.scope as Stack);

      // Verify API Gateway has proper metadata for CDK Nag suppressions
      template.hasResource('AWS::ApiGateway::RestApi', Match.objectLike({
        Metadata: Match.objectLike({
          'cdk-nag': Match.objectLike({
            rulesToSuppress: Match.arrayWith([
              Match.objectLike({
                id: 'AwsSolutions-APIG1',
                reason: Match.stringLikeRegexp('.*access logging.*')
              }),
              Match.objectLike({
                id: 'AwsSolutions-APIG2',
                reason: Match.stringLikeRegexp('.*request validation.*')
              }),
              Match.objectLike({
                id: 'AwsSolutions-APIG3',
                reason: Match.stringLikeRegexp('.*execution logging.*')
              }),
              Match.objectLike({
                id: 'AwsSolutions-APIG4',
                reason: Match.stringLikeRegexp('.*throttling.*')
              })
            ])
          })
        })
      }));
    });

    it('should apply CDK Nag suppressions for CloudWatch Logs', () => {
      const context = createContext('commercial');
      const spec = createSpec();

      const component = new LambdaApiComponent(context.scope, spec.name, context, spec);
      component.synth();

      const template = Template.fromStack(context.scope as Stack);

      // Verify CloudWatch Log Groups have proper metadata for CDK Nag suppressions
      template.hasResource('AWS::Logs::LogGroup', Match.objectLike({
        Metadata: Match.objectLike({
          'cdk-nag': Match.objectLike({
            rulesToSuppress: Match.arrayWith([
              Match.objectLike({
                id: 'AwsSolutions-LOG1',
                reason: Match.stringLikeRegexp('.*log retention.*')
              })
            ])
          })
        })
      }));
    });
  });

  describe('FedRAMP Moderate Framework CDK Nag Suppressions', () => {
    it('should apply FedRAMP-specific suppressions', () => {
      const context = createContext('fedramp-moderate');
      const spec = createSpec();

      const component = new LambdaApiComponent(context.scope, spec.name, context, spec);
      component.synth();

      const template = Template.fromStack(context.scope as Stack);

      // Verify Lambda function has FedRAMP-specific suppressions
      template.hasResource('AWS::Lambda::Function', Match.objectLike({
        Metadata: Match.objectLike({
          'cdk-nag': Match.objectLike({
            rulesToSuppress: Match.arrayWith([
              Match.objectLike({
                id: 'AwsSolutions-L7',
                reason: Match.stringLikeRegexp('.*VPC configuration.*FedRAMP.*')
              }),
              Match.objectLike({
                id: 'AwsSolutions-L8',
                reason: Match.stringLikeRegexp('.*encryption.*FedRAMP.*')
              })
            ])
          })
        })
      }));

      // Verify API Gateway has FedRAMP-specific suppressions
      template.hasResource('AWS::ApiGateway::RestApi', Match.objectLike({
        Metadata: Match.objectLike({
          'cdk-nag': Match.objectLike({
            rulesToSuppress: Match.arrayWith([
              Match.objectLike({
                id: 'AwsSolutions-APIG5',
                reason: Match.stringLikeRegexp('.*encryption.*FedRAMP.*')
              })
            ])
          })
        })
      }));
    });
  });

  describe('FedRAMP High Framework CDK Nag Suppressions', () => {
    it('should apply FedRAMP High-specific suppressions', () => {
      const context = createContext('fedramp-high');
      const spec = createSpec();

      const component = new LambdaApiComponent(context.scope, spec.name, context, spec);
      component.synth();

      const template = Template.fromStack(context.scope as Stack);

      // Verify Lambda function has FedRAMP High-specific suppressions
      template.hasResource('AWS::Lambda::Function', Match.objectLike({
        Metadata: Match.objectLike({
          'cdk-nag': Match.objectLike({
            rulesToSuppress: Match.arrayWith([
              Match.objectLike({
                id: 'AwsSolutions-L7',
                reason: Match.stringLikeRegexp('.*VPC configuration.*FedRAMP.*')
              }),
              Match.objectLike({
                id: 'AwsSolutions-L8',
                reason: Match.stringLikeRegexp('.*encryption.*FedRAMP.*')
              })
            ])
          })
        })
      }));

      // Verify API Gateway has FedRAMP High-specific suppressions
      template.hasResource('AWS::ApiGateway::RestApi', Match.objectLike({
        Metadata: Match.objectLike({
          'cdk-nag': Match.objectLike({
            rulesToSuppress: Match.arrayWith([
              Match.objectLike({
                id: 'AwsSolutions-APIG5',
                reason: Match.stringLikeRegexp('.*encryption.*FedRAMP.*')
              })
            ])
          })
        })
      }));
    });
  });

  describe('CDK Nag Suppression Validation', () => {
    it('should have comprehensive suppression coverage', () => {
      const context = createContext('commercial');
      const spec = createSpec();

      const component = new LambdaApiComponent(context.scope, spec.name, context, spec);
      component.synth();

      const template = Template.fromStack(context.scope as Stack);

      // Count total suppressions applied
      const lambdaFunction = template.findResources('AWS::Lambda::Function');
      const apiGateway = template.findResources('AWS::ApiGateway::RestApi');
      const logGroups = template.findResources('AWS::Logs::LogGroup');

      let totalSuppressions = 0;

      // Count Lambda function suppressions
      Object.values(lambdaFunction).forEach(resource => {
        if (resource.Metadata?.['cdk-nag']?.rulesToSuppress) {
          totalSuppressions += resource.Metadata['cdk-nag'].rulesToSuppress.length;
        }
      });

      // Count API Gateway suppressions
      Object.values(apiGateway).forEach(resource => {
        if (resource.Metadata?.['cdk-nag']?.rulesToSuppress) {
          totalSuppressions += resource.Metadata['cdk-nag'].rulesToSuppress.length;
        }
      });

      // Count Log Group suppressions
      Object.values(logGroups).forEach(resource => {
        if (resource.Metadata?.['cdk-nag']?.rulesToSuppress) {
          totalSuppressions += resource.Metadata['cdk-nag'].rulesToSuppress.length;
        }
      });

      // Should have at least 12 suppressions (7 Lambda + 4 API Gateway + 1 Log Group)
      expect(totalSuppressions).toBeGreaterThanOrEqual(12);
    });

    it('should have proper suppression reasons', () => {
      const context = createContext('commercial');
      const spec = createSpec();

      const component = new LambdaApiComponent(context.scope, spec.name, context, spec);
      component.synth();

      const template = Template.fromStack(context.scope as Stack);

      // Verify suppression reasons are meaningful and not generic
      const lambdaFunction = template.findResources('AWS::Lambda::Function');
      Object.values(lambdaFunction).forEach(resource => {
        if (resource.Metadata?.['cdk-nag']?.rulesToSuppress) {
          resource.Metadata['cdk-nag'].rulesToSuppress.forEach((suppression: any) => {
            expect(suppression.reason).toBeDefined();
            expect(suppression.reason.length).toBeGreaterThan(20); // Meaningful reason
            expect(suppression.reason).not.toBe('Suppressed by CDK Nag');
          });
        }
      });
    });

    it('should handle missing resources gracefully', () => {
      const context = createContext('commercial');
      const spec = createSpec();

      // Create component without API Gateway
      spec.config.api = {
        ...spec.config.api,
        stageName: '' // This will cause API Gateway creation to be skipped
      };

      expect(() => {
        const component = new LambdaApiComponent(context.scope, spec.name, context, spec);
        component.synth();
      }).not.toThrow();
    });
  });

  describe('Compliance Framework Integration', () => {
    it('should apply different suppressions based on compliance framework', () => {
      const commercialContext = createContext('commercial');
      const fedrampContext = createContext('fedramp-moderate');

      const spec = createSpec();

      // Create components for different frameworks
      const commercialComponent = new LambdaApiComponent(
        commercialContext.scope,
        'commercial-api',
        commercialContext,
        spec
      );
      commercialComponent.synth();

      const fedrampComponent = new LambdaApiComponent(
        fedrampContext.scope,
        'fedramp-api',
        fedrampContext,
        spec
      );
      fedrampComponent.synth();

      const commercialTemplate = Template.fromStack(commercialContext.scope as Stack);
      const fedrampTemplate = Template.fromStack(fedrampContext.scope as Stack);

      // FedRAMP should have additional suppressions
      const fedrampLambda = fedrampTemplate.findResources('AWS::Lambda::Function');
      const commercialLambda = commercialTemplate.findResources('AWS::Lambda::Function');

      let fedrampSuppressions = 0;
      let commercialSuppressions = 0;

      Object.values(fedrampLambda).forEach(resource => {
        if (resource.Metadata?.['cdk-nag']?.rulesToSuppress) {
          fedrampSuppressions += resource.Metadata['cdk-nag'].rulesToSuppress.length;
        }
      });

      Object.values(commercialLambda).forEach(resource => {
        if (resource.Metadata?.['cdk-nag']?.rulesToSuppress) {
          commercialSuppressions += resource.Metadata['cdk-nag'].rulesToSuppress.length;
        }
      });

      // FedRAMP should have more suppressions due to additional compliance requirements
      expect(fedrampSuppressions).toBeGreaterThanOrEqual(commercialSuppressions);
    });
  });
});
