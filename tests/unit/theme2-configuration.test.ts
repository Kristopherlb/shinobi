/**
 * Theme 2: Configuration & Customization Test Cases
 * Tests configuration overrides and environment-specific behavior
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { ResolverEngine } from '../../packages/core-engine/src/resolver-engine';
import { Logger } from '../../packages/core-engine/src/logger';
import * as cdk from 'aws-cdk-lib';

describe('Theme 2: Configuration & Customization', () => {
  let resolverEngine: ResolverEngine;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger();
    resolverEngine = new ResolverEngine({ logger: mockLogger });
  });

  describe('TC-OVERRIDE-01: Lambda memory size override in CloudFormation snapshot', () => {
    test('should reflect custom memorySize in synthesized CloudFormation template', async () => {
      // Arrange: Create manifest with memory override
      const manifestWithOverride = {
        service: 'override-test',
        owner: 'test-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            },
            overrides: {
              lambda: {
                memorySize: 1024 // Override from default 512
              }
            }
          }
        ]
      };

      // Act: Synthesize the manifest
      const result = await resolverEngine.synthesize(manifestWithOverride);

      // Assert: Extract CloudFormation template
      const cfnTemplate = result.app.synth().getStackByName(`${manifestWithOverride.service}-stack`).template;
      
      // Find the Lambda function resource
      const lambdaResources = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::Lambda::Function');
      
      expect(lambdaResources).toHaveLength(1);
      
      const [_, lambdaResource] = lambdaResources[0] as [string, any];
      expect(lambdaResource.Properties.MemorySize).toBe(1024);
    });

    test('should use default memory size when no override is provided', async () => {
      // Arrange: Create manifest without memory override
      const manifestDefault = {
        service: 'default-test',
        owner: 'test-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            }
            // No overrides block
          }
        ]
      };

      // Act: Synthesize the manifest
      const result = await resolverEngine.synthesize(manifestDefault);

      // Assert: Should use default memory size (512)
      const cfnTemplate = result.app.synth().getStackByName(`${manifestDefault.service}-stack`).template;
      const lambdaResources = Object.entries(cfnTemplate.Resources)
        .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::Lambda::Function');
      
      const [_, lambdaResource] = lambdaResources[0] as [string, any];
      expect(lambdaResource.Properties.MemorySize).toBe(512);
    });
  });

  describe('TC-ENV-01: Development environment RDS instance class', () => {
    test('should use t3.micro instance class for development environment', async () => {
      // Arrange: Set development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'dev';

      const devManifest = {
        service: 'dev-env-test',
        owner: 'test-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'database',
            type: 'rds-postgres',
            config: {
              dbName: 'test_db'
              // No explicit instanceClass - should use environment default
            }
          }
        ]
      };

      try {
        // Act: Synthesize in dev environment
        const result = await resolverEngine.synthesize(devManifest);

        // Assert: Extract RDS instance from CloudFormation
        const cfnTemplate = result.app.synth().getStackByName(`${devManifest.service}-stack`).template;
        const rdsResources = Object.entries(cfnTemplate.Resources)
          .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');
        
        expect(rdsResources).toHaveLength(1);
        
        const [_, rdsResource] = rdsResources[0] as [string, any];
        expect(rdsResource.Properties.DBInstanceClass).toBe('db.t3.micro');
        
      } finally {
        // Cleanup: Restore original environment
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('TC-ENV-02: Production environment RDS instance class', () => {
    test('should use r5.large instance class for production environment', async () => {
      // Arrange: Set production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'prod';

      const prodManifest = {
        service: 'prod-env-test',
        owner: 'test-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'database',
            type: 'rds-postgres',
            config: {
              dbName: 'prod_db'
            }
          }
        ]
      };

      try {
        // Act: Synthesize in production environment
        const result = await resolverEngine.synthesize(prodManifest);

        // Assert: Extract RDS instance from CloudFormation
        const cfnTemplate = result.app.synth().getStackByName(`${prodManifest.service}-stack`).template;
        const rdsResources = Object.entries(cfnTemplate.Resources)
          .filter(([_, resource]: [string, any]) => resource.Type === 'AWS::RDS::DBInstance');
        
        const [_, rdsResource] = rdsResources[0] as [string, any];
        expect(rdsResource.Properties.DBInstanceClass).toBe('db.r5.large');
        
        // Also verify production-specific settings
        expect(rdsResource.Properties.MultiAZ).toBe(true);
        expect(rdsResource.Properties.DeletionProtection).toBe(true);
        
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('should apply different configurations based on environment for same component', async () => {
      const baseManifest = {
        service: 'env-comparison-test',
        owner: 'test-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src'
            }
          }
        ]
      };

      const originalEnv = process.env.NODE_ENV;

      try {
        // Test Development Environment
        process.env.NODE_ENV = 'dev';
        const devResult = await resolverEngine.synthesize(baseManifest);
        const devTemplate = devResult.app.synth().getStackByName(`${baseManifest.service}-stack`).template;
        
        // Test Production Environment
        process.env.NODE_ENV = 'prod';
        const prodResult = await resolverEngine.synthesize(baseManifest);
        const prodTemplate = prodResult.app.synth().getStackByName(`${baseManifest.service}-stack`).template;

        // Assert: Different log retention periods based on environment
        const devLambda = Object.values(devTemplate.Resources)
          .find((r: any) => r.Type === 'AWS::Lambda::Function') as any;
        const prodLambda = Object.values(prodTemplate.Resources)
          .find((r: any) => r.Type === 'AWS::Lambda::Function') as any;

        // Production should have longer log retention
        const devLogGroup = Object.values(devTemplate.Resources)
          .find((r: any) => r.Type === 'AWS::Logs::LogGroup') as any;
        const prodLogGroup = Object.values(prodTemplate.Resources)
          .find((r: any) => r.Type === 'AWS::Logs::LogGroup') as any;

        expect(prodLogGroup.Properties.RetentionInDays).toBeGreaterThan(
          devLogGroup.Properties.RetentionInDays || 1
        );

      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Environment Variable Inheritance and Override', () => {
    test('should properly merge environment variables from different sources', async () => {
      const manifest = {
        service: 'env-vars-test',
        owner: 'test-team',
        complianceFramework: 'commercial',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs18.x',
              handler: 'index.handler',
              codePath: './src',
              environment: {
                CUSTOM_VAR: 'custom-value',
                NODE_ENV: 'override-attempt' // This should be overridden by platform
              }
            },
            overrides: {
              lambda: {
                environment: {
                  OVERRIDE_VAR: 'override-value'
                }
              }
            }
          }
        ]
      };

      // Act
      const result = await resolverEngine.synthesize(manifest);
      
      // Assert: Verify environment variable precedence
      const cfnTemplate = result.app.synth().getStackByName(`${manifest.service}-stack`).template;
      const lambdaResource = Object.values(cfnTemplate.Resources)
        .find((r: any) => r.Type === 'AWS::Lambda::Function') as any;

      const envVars = lambdaResource.Properties.Environment.Variables;
      
      // Platform-controlled variables should not be overrideable
      expect(envVars.SERVICE_NAME).toBe('env-vars-test');
      expect(envVars.COMPONENT_NAME).toBe('api');
      
      // Custom variables should be present
      expect(envVars.CUSTOM_VAR).toBe('custom-value');
      expect(envVars.OVERRIDE_VAR).toBe('override-value');
      
      // NODE_ENV should be controlled by platform, not user config
      expect(envVars.NODE_ENV).not.toBe('override-attempt');
    });
  });
});