/**
 * Unit tests for IamRoleComponent
 * 
 * Tests component synthesis, construct creation, and capability exposure.
 */

import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { IamRoleComponent } from '../../src/iam-role.component.js';
import { ComponentContext, ComponentSpec } from '../../../@shinobi/core/component-interfaces.js';

describe('IamRoleComponent', () => {
  let stack: Stack;
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;

  const createAndSynthComponent = (spec: ComponentSpec = mockSpec): IamRoleComponent => {
    const component = new IamRoleComponent(stack, 'TestRole', mockContext, spec);
    component.synth();
    return component;
  };

  beforeEach(() => {
    stack = new Stack();
    mockContext = {
      serviceName: 'test-service',
      environment: 'test',
      complianceFramework: 'commercial',
      scope: stack,
      region: 'us-east-1',
      accountId: '123456789012',
      serviceLabels: {
        'service-name': 'test-service',
        'environment': 'test',
        'compliance-framework': 'commercial'
      }
    };

    mockSpec = {
      name: 'test-role',
      type: 'iam-role',
      config: {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          }
        }
      }
    };
  });

  describe('Component Synthesis', () => {
    it('should create IAM role with basic configuration', () => {
      const component = createAndSynthComponent();
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'ec2.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        },
        MaxSessionDuration: 3600,
        Path: '/'
      });
    });

    it('should create IAM role with inline policies', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'lambda.amazonaws.com'
          },
          inlinePolicies: {
            s3Access: {
              statements: [
                {
                  effect: 'Allow',
                  actions: ['s3:GetObject', 's3:PutObject'],
                  resources: ['arn:aws:s3:::my-bucket/*']
                }
              ]
            }
          }
        }
      };

      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        Policies: [
          {
            PolicyName: 's3Access',
            PolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Actions: ['s3:GetObject', 's3:PutObject'],
                  Resources: ['arn:aws:s3:::my-bucket/*']
                }
              ]
            }
          }
        ]
      });
    });

    it('should create IAM role with managed policies', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          },
          managedPolicies: [
            'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
            'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess'
          ]
        }
      };

      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
          'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess'
        ]
      });
    });

    it('should create IAM role with custom session duration and path', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          },
          maxSessionDuration: 7200,
          path: '/custom/'
        }
      };

      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        MaxSessionDuration: 7200,
        Path: '/custom/'
      });
    });
  });

  describe('Principal Types', () => {
    it('should create role with service principal', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'lambda.amazonaws.com'
          }
        }
      };

      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      });
    });

    it('should create role with account principal', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            account: '987654321098'
          }
        }
      };

      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:aws:iam::987654321098:root'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      });
    });

    it('should create role with external ID for cross-account access', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            account: '987654321098',
            externalId: 'unique-external-id'
          }
        }
      };

      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:aws:iam::987654321098:root'
              },
              Action: 'sts:AssumeRole',
              Condition: {
                StringEquals: {
                  'sts:ExternalId': 'unique-external-id'
                }
              }
            }
          ]
        }
      });
    });

    it('should create role with custom ARN principal', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            arn: 'arn:aws:iam::123456789012:user/custom-user'
          }
        }
      };

      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:aws:iam::123456789012:user/custom-user'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      });
    });
  });

  describe('Compliance Features', () => {
    it('should apply permissions boundary for FedRAMP High', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        PermissionsBoundary: {
          'Fn::Sub': 'arn:aws:iam::${AWS::AccountId}:policy/FedRAMP-PermissionsBoundary'
        }
      });
    });

    it('should apply custom permissions boundary', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          }
        },
        compliance: {
          permissionsBoundary: true,
          permissionsBoundaryArn: 'arn:aws:iam::123456789012:policy/CustomBoundary'
        }
      };

      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        PermissionsBoundary: 'arn:aws:iam::123456789012:policy/CustomBoundary'
      });
    });

    it('should apply MFA requirement', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          }
        },
        compliance: {
          requireMfa: true
        }
      };

      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'ec2.amazonaws.com'
              },
              Action: 'sts:AssumeRole',
              Condition: {
                Bool: {
                  'aws:MultiFactorAuthPresent': 'true'
                }
              }
            }
          ]
        }
      });
    });
  });

  describe('Component Interface', () => {
    it('should expose role construct via getConstruct', () => {
      const component = createAndSynthComponent(mockSpec);
      const role = component.getConstruct('role');

      expect(role).toBeDefined();
      expect(role.roleName).toContain('test-role');
    });

    it('should throw error for unknown construct handle', () => {
      const component = createAndSynthComponent(mockSpec);
      
      expect(() => component.getConstruct('unknown')).toThrow('Unknown construct handle: unknown');
    });

    it('should expose iam:assumeRole capability', () => {
      const component = createAndSynthComponent(mockSpec);
      const capabilities = component.getCapabilities();

      expect(capabilities['iam:assumeRole']).toBeDefined();
      expect(capabilities['iam:assumeRole'].roleArn).toBeDefined();
      expect(capabilities['iam:assumeRole'].roleName).toBeDefined();
      expect(capabilities['iam:assumeRole'].principal).toBe('ec2.amazonaws.com');
    });

    it('should expose component outputs', () => {
      const component = createAndSynthComponent(mockSpec);
      const outputs = component.getOutputs();

      expect(outputs.roleArn).toBeDefined();
      expect(outputs.roleName).toBeDefined();
      expect(outputs.roleId).toBeDefined();
    });
  });

  describe('Tagging', () => {
    it('should apply standard tags to the role', () => {
      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        Tags: [
          {
            Key: 'Component',
            Value: 'iam-role'
          },
          {
            Key: 'ManagedBy',
            Value: 'platform'
          }
        ]
      });
    });

    it('should apply custom tags from configuration', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          }
        },
        tags: {
          'Environment': 'production',
          'Team': 'platform-engineering'
        }
      };

      const component = createAndSynthComponent(mockSpec);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        Tags: expect.arrayContaining([
          {
            Key: 'Environment',
            Value: 'production'
          },
          {
            Key: 'Team',
            Value: 'platform-engineering'
          }
        ])
      });
    });
  });
});
