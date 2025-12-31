import { Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { IamRoleComponent } from '../../src/iam-role.component.ts';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

const createContext = (
  complianceFramework: ComponentContext['complianceFramework'] = 'commercial'
): { stack: Stack; context: ComponentContext } => {
  const stack = new Stack();
  return {
    stack,
    context: {
      serviceName: 'unit-test-service',
      environment: 'dev',
      complianceFramework,
      scope: stack,
      region: 'us-east-1',
      accountId: '000000000000',
      serviceLabels: {
        'service-name': 'unit-test-service',
        environment: 'dev',
        'compliance-framework': complianceFramework
      }
    }
  };
};

const createSpec = (config: ComponentSpec['config'] = {}): ComponentSpec => ({
  name: 'test-role',
  type: 'iam-role',
  config
});

const synthComponent = (spec: ComponentSpec, context: ComponentContext, stack: Stack): IamRoleComponent => {
  const component = new IamRoleComponent(stack, spec.name, context, spec);
  component.synth();
  return component;
};

describe('IamRoleComponent', () => {
  it('creates an IAM role with default configuration', () => {
    const { stack, context } = createContext();
    const component = synthComponent(createSpec(), context, stack);
    const template = Template.fromStack(stack);

    expect(component.getCapabilities()['iam:assumeRole']).toBeDefined();
    template.hasResourceProperties('AWS::IAM::Role', {
      MaxSessionDuration: 3600,
      Path: '/',
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: Match.objectLike({ Service: 'lambda.amazonaws.com' })
          })
        ])
      })
    });
  });

  it('attaches inline and managed policies when provided', () => {
    const { stack, context } = createContext();
    const spec = createSpec({
      assumedBy: [{ service: 'ecs.amazonaws.com' }],
      inlinePolicies: [
        {
          name: 'allowS3',
          document: {
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Action: 's3:GetObject', Resource: '*' }]
          }
        }
      ],
      managedPolicies: ['arn:aws:iam::aws:policy/CloudWatchLogsFullAccess']
    });

    synthComponent(spec, context, stack);
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Role', {
      ManagedPolicyArns: Match.arrayWith(['arn:aws:iam::aws:policy/CloudWatchLogsFullAccess'])
    });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'allowS3',
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject'
          })
        ])
      })
    });
  });

  it('creates audit log group and tags when logging enabled', () => {
    const { stack, context } = createContext();
    const spec = createSpec({
      logging: {
        audit: {
          enabled: true,
          retentionInDays: 365,
          removalPolicy: 'retain',
          tags: { 'log-owner': 'security' }
        }
      }
    });

    const component = synthComponent(spec, context, stack);
    const template = Template.fromStack(stack);

    expect(component.getConstruct('auditLogGroup')).toBeDefined();
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 365,
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'log-owner', Value: 'security' })
      ])
    });
  });

  it('enforces FedRAMP monitoring and MFA controls', () => {
    const { stack, context } = createContext('fedramp-high');
    const component = synthComponent(createSpec(), context, stack);
    const template = Template.fromStack(stack);

    const capability = component.getCapabilities()['iam:assumeRole'];
    expect(capability.permissionsBoundary).toBeDefined();
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Condition: Match.objectLike({
              BoolIfExists: { 'aws:MultiFactorAuthPresent': 'false' }
            })
          })
        ])
      })
    });
    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
  });
});
