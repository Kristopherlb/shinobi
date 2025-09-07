import { describe, test, expect, beforeEach } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import { ResolverEngine } from '../../../packages/core-engine/src/resolver-engine';
import { Logger } from '../../../packages/core-engine/src/logger';
import { createTestStack, createMockContext, validateCfnTemplate } from '../../shared/test-helpers';

describe('ResolverEngine - Core Synthesis', () => {
  let resolverEngine: ResolverEngine;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger();
    resolverEngine = new ResolverEngine({ logger: mockLogger });
  });

  describe('Basic Service Synthesis', () => {
    test('should synthesize minimal service manifest', async () => {
      const manifest = {
        service: 'minimal-test',
        owner: 'platform-team',
        complianceFramework: 'commercial',
        components: []
      };

      const result = await resolverEngine.synthesize(manifest);
      
      expect(result).toBeDefined();
      expect(result.app).toBeDefined();
      
      const cfnTemplate = result.app.synth().getStackByName('minimal-test-stack').template;
      validateCfnTemplate(cfnTemplate);
    });

    test('should synthesize service with single component', async () => {
      const manifest = {
        service: 'single-component-test',
        owner: 'platform-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'test-bucket',
            type: 's3-bucket',
            config: {
              bucketName: 'test-bucket-single'
            }
          }
        ]
      };

      const result = await resolverEngine.synthesize(manifest);
      
      expect(result).toBeDefined();
      expect(result.components).toHaveLength(1);
      
      const cfnTemplate = result.app.synth().getStackByName('single-component-test-stack').template;
      
      // Verify S3 bucket was created
      const template = Template.fromJSON(cfnTemplate);
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'test-bucket-single'
      });
    });

    test('should synthesize service with two connected components', async () => {
      const manifest = {
        service: 'connected-test',
        owner: 'platform-team', 
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              functionName: 'TestAPI',
              code: {
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                zipFile: './dist/api.zip'
              }
            },
            binds: [
              {
                to: 'storage',
                capability: 'storage:s3',
                access: 'read-write'
              }
            ]
          },
          {
            name: 'storage',
            type: 's3-bucket',
            config: {
              bucketName: 'connected-test-storage'
            }
          }
        ]
      };

      const result = await resolverEngine.synthesize(manifest);
      
      expect(result).toBeDefined();
      expect(result.components).toHaveLength(2);
      expect(result.bindings).toHaveLength(1);
      
      const cfnTemplate = result.app.synth().getStackByName('connected-test-stack').template;
      const template = Template.fromJSON(cfnTemplate);

      // Verify both components exist
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'TestAPI'
      });
      
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'connected-test-storage'
      });

      // Verify IAM policy for binding exists
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: expect.arrayContaining(['s3:GetObject', 's3:PutObject'])
            })
          ])
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('should fail gracefully with invalid component type', async () => {
      const manifest = {
        service: 'invalid-component-test',
        owner: 'platform-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'invalid',
            type: 'nonexistent-component',
            config: {}
          }
        ]
      };

      await expect(resolverEngine.synthesize(manifest)).rejects.toThrow();
    });

    test('should fail gracefully with invalid binding target', async () => {
      const manifest = {
        service: 'invalid-binding-test',
        owner: 'platform-team',
        complianceFramework: 'commercial', 
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              functionName: 'TestAPI',
              code: {
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                zipFile: './dist/api.zip'
              }
            },
            binds: [
              {
                to: 'nonexistent-component',
                capability: 'storage:s3',
                access: 'read'
              }
            ]
          }
        ]
      };

      await expect(resolverEngine.synthesize(manifest)).rejects.toThrow();
    });
  });

  describe('Compliance Framework Application', () => {
    test('should apply commercial framework defaults', async () => {
      const manifest = {
        service: 'commercial-test',
        owner: 'platform-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              functionName: 'CommercialAPI',
              code: {
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                zipFile: './dist/api.zip'
              }
            }
          }
        ]
      };

      const result = await resolverEngine.synthesize(manifest);
      const cfnTemplate = result.app.synth().getStackByName('commercial-test-stack').template;
      const template = Template.fromJSON(cfnTemplate);

      // Verify commercial defaults (basic configuration)
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'CommercialAPI',
        MemorySize: expect.any(Number),
        Timeout: expect.any(Number)
      });
    });

    test('should apply FedRAMP Moderate hardening', async () => {
      const manifest = {
        service: 'fedramp-moderate-test', 
        owner: 'security-team',
        complianceFramework: 'fedramp-moderate',
        components: [
          {
            name: 'secure-api',
            type: 'lambda-api',
            config: {
              functionName: 'SecureAPI',
              code: {
                handler: 'index.handler',
                runtime: 'nodejs18.x',
                zipFile: './dist/api.zip'
              }
            }
          }
        ]
      };

      const result = await resolverEngine.synthesize(manifest);
      const cfnTemplate = result.app.synth().getStackByName('fedramp-moderate-test-stack').template;
      const template = Template.fromJSON(cfnTemplate);

      // Verify FedRAMP Moderate enhancements
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'SecureAPI',
        TracingConfig: { Mode: 'Active' }, // X-Ray tracing required
        ReservedConcurrencyExecutions: expect.any(Number) // Performance predictability
      });

      // Verify enhanced log retention
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 365 // 1 year retention
      });
    });
  });

  describe('Performance Validation', () => {
    test('should synthesize service with multiple components efficiently', async () => {
      const components = [];
      
      // Create moderate-sized service for performance testing
      for (let i = 0; i < 5; i++) {
        components.push({
          name: `bucket-${i}`,
          type: 's3-bucket',
          config: {
            bucketName: `test-bucket-${i}`
          }
        });
      }

      const manifest = {
        service: 'performance-test',
        owner: 'platform-team',
        complianceFramework: 'commercial',
        components
      };

      const startTime = Date.now();
      const result = await resolverEngine.synthesize(manifest);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 10 seconds for 5 components)
      expect(duration).toBeLessThan(10000);
      expect(result.components).toHaveLength(5);

      const cfnTemplate = result.app.synth().getStackByName('performance-test-stack').template;
      const s3Buckets = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::S3::Bucket');
      
      expect(s3Buckets).toHaveLength(5);
    }, 15000); // Extended timeout for performance test
  });
});