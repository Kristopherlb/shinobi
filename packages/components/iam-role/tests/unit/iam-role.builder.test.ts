/**
 * Unit tests for IamRoleConfigBuilder
 * 
 * Tests the 5-layer configuration precedence chain and validation.
 */

import { IamRoleConfigBuilder, IamRoleConfig } from '../../src/iam-role.builder';
import { ComponentContext, ComponentSpec } from '../../../../../src/platform/contracts/component-interfaces';
import { Stack } from 'aws-cdk-lib';

describe('IamRoleConfigBuilder', () => {
  let mockContext: ComponentContext;
  let mockSpec: ComponentSpec;

  beforeEach(() => {
    const stack = new Stack();
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
      config: {}
    };
  });

  describe('5-Layer Configuration Precedence', () => {
    it('should use hardcoded fallbacks when no other configuration is provided', () => {
      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.role.assumedBy.service).toBe('ec2.amazonaws.com');
      expect(config.role.maxSessionDuration).toBe(3600);
      expect(config.role.path).toBe('/');
      expect(config.compliance?.permissionsBoundary).toBe(false);
      expect(config.compliance?.leastPrivilege).toBe(true);
      expect(config.compliance?.requireMfa).toBe(false);
      expect(config.tags?.Component).toBe('iam-role');
    });

    it('should override hardcoded fallbacks with component spec configuration', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'lambda.amazonaws.com'
          },
          maxSessionDuration: 7200,
          path: '/custom/',
          inlinePolicies: {
            s3Access: {
              statements: [
                {
                  effect: 'Allow',
                  actions: ['s3:GetObject'],
                  resources: ['arn:aws:s3:::my-bucket/*']
                }
              ]
            }
          }
        },
        compliance: {
          permissionsBoundary: true,
          requireMfa: true
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.role.assumedBy.service).toBe('lambda.amazonaws.com');
      expect(config.role.maxSessionDuration).toBe(7200);
      expect(config.role.path).toBe('/custom/');
      expect(config.role.inlinePolicies?.s3Access).toBeDefined();
      expect(config.compliance?.permissionsBoundary).toBe(true);
      expect(config.compliance?.requireMfa).toBe(true);
    });

    it('should apply FedRAMP compliance overrides for fedramp-high framework', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      // FedRAMP High should automatically enable permissions boundary
      expect(config.compliance?.permissionsBoundary).toBe(true);
    });

    it('should resolve environment variable interpolations in configuration', () => {
      process.env.IAM_ROLE_MAX_SESSION_DURATION = '10800';
      process.env.IAM_ROLE_PATH = '/env/';

      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          },
          maxSessionDuration: '${env:IAM_ROLE_MAX_SESSION_DURATION}',
          path: '${env:IAM_ROLE_PATH}'
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.role.maxSessionDuration).toBe('10800');
      expect(config.role.path).toBe('/env/');

      // Cleanup
      delete process.env.IAM_ROLE_MAX_SESSION_DURATION;
      delete process.env.IAM_ROLE_PATH;
    });
  });

  describe('Configuration Validation', () => {
    it('should use fallback service when role.assumedBy.service is missing', () => {
      mockSpec.config = {
        role: {
          assumedBy: {} // Missing service
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();
      
      // Should use hardcoded fallback
      expect(config.role.assumedBy.service).toBe('ec2.amazonaws.com');
    });

    it('should accept custom service principal format', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'custom-service' // Custom format
          }
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();
      
      // Should accept the custom service
      expect(config.role.assumedBy.service).toBe('custom-service');
    });

    it('should accept custom maxSessionDuration values', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          },
          maxSessionDuration: 500 // Custom value
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();
      
      // Should accept the custom value
      expect(config.role.maxSessionDuration).toBe(500);
    });

    it('should accept inline policy statements with empty actions', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          },
          inlinePolicies: {
            customPolicy: {
              statements: [
                {
                  effect: 'Allow',
                  actions: [], // Empty actions array
                  resources: ['*']
                }
              ]
            }
          }
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();
      
      // Should accept the policy configuration
      expect(config.role.inlinePolicies?.customPolicy).toBeDefined();
      expect(config.role.inlinePolicies?.customPolicy.statements).toHaveLength(1);
    });

    it('should accept custom managed policy ARN formats', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          },
          managedPolicies: ['custom-arn'] // Custom ARN format
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();
      
      // Should accept the custom ARN
      expect(config.role.managedPolicies).toContain('custom-arn');
    });
  });

  describe('Complex Configuration Scenarios', () => {
    it('should handle cross-account role assumption', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            account: '987654321098',
            externalId: 'unique-external-id'
          }
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.role.assumedBy.account).toBe('987654321098');
      expect(config.role.assumedBy.externalId).toBe('unique-external-id');
    });

    it('should handle custom ARN principal', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            arn: 'arn:aws:iam::123456789012:user/custom-user'
          }
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.role.assumedBy.arn).toBe('arn:aws:iam::123456789012:user/custom-user');
    });

    it('should handle multiple inline policies', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          },
          inlinePolicies: {
            s3Access: {
              statements: [
                {
                  effect: 'Allow',
                  actions: ['s3:GetObject'],
                  resources: ['arn:aws:s3:::bucket1/*']
                }
              ]
            },
            dynamoAccess: {
              statements: [
                {
                  effect: 'Allow',
                  actions: ['dynamodb:GetItem'],
                  resources: ['arn:aws:dynamodb:*:*:table/MyTable']
                }
              ]
            }
          }
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.role.inlinePolicies?.s3Access).toBeDefined();
      expect(config.role.inlinePolicies?.dynamoAccess).toBeDefined();
      expect(config.role.inlinePolicies?.s3Access.statements).toHaveLength(1);
      expect(config.role.inlinePolicies?.dynamoAccess.statements).toHaveLength(1);
    });

    it('should handle policy statements with conditions', () => {
      mockSpec.config = {
        role: {
          assumedBy: {
            service: 'ec2.amazonaws.com'
          },
          inlinePolicies: {
            conditionalAccess: {
              statements: [
                {
                  effect: 'Allow',
                  actions: ['s3:GetObject'],
                  resources: ['*'],
                  conditions: {
                    StringEquals: {
                      's3:x-amz-server-side-encryption': 'AES256'
                    }
                  }
                }
              ]
            }
          }
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.role.inlinePolicies?.conditionalAccess.statements[0].conditions).toBeDefined();
      expect(config.role.inlinePolicies?.conditionalAccess.statements[0].conditions?.StringEquals).toBeDefined();
    });
  });

  describe('Compliance Framework Integration', () => {
    it('should apply FedRAMP Moderate settings', () => {
      mockContext.complianceFramework = 'fedramp-moderate';
      
      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.compliance?.permissionsBoundary).toBe(true);
      expect(config.compliance?.leastPrivilege).toBe(true);
    });

    it('should apply FedRAMP High settings', () => {
      mockContext.complianceFramework = 'fedramp-high';
      
      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.compliance?.permissionsBoundary).toBe(true);
      expect(config.compliance?.leastPrivilege).toBe(true);
    });

    it('should allow custom permissions boundary ARN', () => {
      mockSpec.config = {
        compliance: {
          permissionsBoundaryArn: 'arn:aws:iam::123456789012:policy/CustomBoundary'
        }
      };

      const builder = new IamRoleConfigBuilder({ context: mockContext, spec: mockSpec });
      const config = builder.buildSync();

      expect(config.compliance?.permissionsBoundaryArn).toBe('arn:aws:iam::123456789012:policy/CustomBoundary');
    });
  });
});
