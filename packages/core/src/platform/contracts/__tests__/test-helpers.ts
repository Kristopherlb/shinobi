/**
 * Test Helpers for Component Testing
 * 
 * Provides shared utilities for creating mocked services and test environments
 * to ensure tests don't make live API calls or network requests.
 */

import { vi } from 'vitest';
import { App } from 'aws-cdk-lib';
import type { BaseComponentServices } from '../component.js';
import type { ITaggingService } from '../../services/tagging-service/tagging.service.js';
import type { IObservabilityService } from '../../services/observability/index.js';
import type { ILoggingService } from '../../services/logging/index.js';
import type { IGovernanceService } from '../../services/governance/index.js';
import type { IComplianceService } from '../../services/compliance/index.js';
import type { ISecurityService } from '../../services/security/index.js';
import type { ISecurityOperationsService } from '../../services/security-operations/index.js';
import type { ICostManagementService } from '../../services/cost-management/index.js';
import type { IBackupRecoveryService } from '../../services/backup-recovery/index.js';
import type { IPerformanceOptimizationService } from '../../services/performance/index.js';
import type { IFeatureFlagService } from '../../services/feature-flags/index.js';

/**
 * Create fully mocked services for component testing
 * 
 * All services are mocked to prevent any network calls or external API requests
 * during test execution.
 */
export function createMockedServices(): BaseComponentServices {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  return {
    loggingService: {
      getLogger: vi.fn(() => mockLogger)
    } as unknown as ILoggingService,
    
    taggingService: {
      buildStandardTags: vi.fn(() => ({})),
      applyStandardTags: vi.fn()
    } as unknown as ITaggingService,
    
    observabilityService: {
      buildConfig: vi.fn(() => ({
        collectorEndpoint: 'http://localhost:4317',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        environment: 'test',
        region: 'us-east-1',
        complianceFramework: 'commercial',
        tracesSampling: 0.1,
        metricsInterval: 60,
        logsRetention: 30,
        enablePerformanceInsights: false,
        enableXRayTracing: false,
        customAttributes: {}
      })),
      buildEnvironmentVariables: vi.fn(() => ({}))
    } as unknown as IObservabilityService,
    
    governanceService: {
      resolveGovernance: vi.fn(() => ({
        dataClassification: 'internal',
        auditLoggingRequired: false,
        backupRequired: false,
        monitoringLevel: 'basic'
      }))
    } as unknown as IGovernanceService,
    
    complianceService: {
      evaluate: vi.fn(() => ({}))
    } as unknown as IComplianceService,
    
    securityService: {
      getSecurityGroupHandle: vi.fn(() => {
        // Return a mock IConstruct
        return {
          node: { id: 'mock-security-group' }
        } as any;
      }),
      sanitizeProperties: vi.fn((input) => input)
    } as unknown as ISecurityService,
    
    costManagementService: {
      evaluateCost: vi.fn(() => ({}))
    } as unknown as ICostManagementService,
    
    backupRecoveryService: {
      createBackupPlan: vi.fn(() => ({}))
    } as unknown as IBackupRecoveryService,
    
    performanceOptimizationService: {
      analyze: vi.fn(() => ({}))
    } as unknown as IPerformanceOptimizationService,
    
    featureFlagService: {
      configure: vi.fn(() => Promise.resolve()),
      getClient: vi.fn(() => Promise.resolve({} as any)),
      getBooleanValue: vi.fn(() => Promise.resolve({ value: false, reason: 'DEFAULT' } as any)),
      getStringValue: vi.fn(() => Promise.resolve({ value: '', reason: 'DEFAULT' } as any)),
      getNumberValue: vi.fn(() => Promise.resolve({ value: 0, reason: 'DEFAULT' } as any)),
      getObjectValue: vi.fn(() => Promise.resolve({ value: {}, reason: 'DEFAULT' } as any)),
      evaluateFlags: vi.fn(() => Promise.resolve({})),
      shutdown: vi.fn(() => Promise.resolve())
    } as unknown as IFeatureFlagService,
    
    securityOperationsService: {
      runPreDeployScans: vi.fn(() => Promise.resolve({})),
      runPostDeployScans: vi.fn(() => Promise.resolve({})),
      registerIntegration: vi.fn()
    } as unknown as ISecurityOperationsService
  };
}

/**
 * Create a CDK App with mocked context to prevent lookups
 * 
 * Sets up CDK context to prevent any fromLookup() calls from making
 * actual AWS API requests during test synthesis.
 * 
 * @param contextOverrides - Additional context values to merge
 * @returns Configured CDK App instance
 */
export function createTestApp(contextOverrides: Record<string, any> = {}): App {
  return new App({
    context: {
      // Disable stack trace collection for faster tests
      '@aws-cdk/core:stackTraceFromCdkErrors': false,
      // Use deterministic asset hashing
      '@aws-cdk/core:deterministic-asset-hashing': true,
      // Target partitions
      '@aws-cdk/core:target-partitions': ['aws'],
      // Stack relative exports
      '@aws-cdk/core:stack-relative-exports': true,
      
      // Mock hosted zone lookups for Route53 tests
      'hosted-zone:account=123456789012:domainName=example.com:region=us-east-1': {
        Id: '/hostedzone/Z1234567890',
        Name: 'example.com.'
      },
      'hosted-zone:account=123456789012:domainName=test.example.com:region=us-east-1': {
        Id: '/hostedzone/Z1234567890',
        Name: 'test.example.com.'
      },
      
      // Mock VPC lookups
      'vpc-provider:account=123456789012:filter.isDefault=true:region=us-east-1': {
        vpcId: 'vpc-12345678',
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        publicSubnetIds: ['subnet-12345678', 'subnet-87654321'],
        privateSubnetIds: ['subnet-11111111', 'subnet-22222222'],
        isolatedSubnetIds: []
      },
      
      // Merge any additional context overrides
      ...contextOverrides
    }
  });
}

