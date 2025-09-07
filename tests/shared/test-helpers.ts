/**
 * Shared test utilities and helpers
 */

import * as cdk from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '../../packages/platform/contracts/src/component-interfaces';

/**
 * Create a mock CDK stack for testing
 */
export function createTestStack(stackName = 'TestStack'): { app: cdk.App; stack: cdk.Stack } {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, stackName);
  return { app, stack };
}

/**
 * Create mock component context for testing
 */
export function createMockContext(
  stack: cdk.Stack,
  overrides: Partial<ComponentContext> = {}
): ComponentContext {
  return {
    serviceName: 'test-service',
    environment: 'test', 
    complianceFramework: 'commercial',
    scope: stack,
    region: 'us-east-1',
    accountId: '123456789012',
    ...overrides
  };
}

/**
 * Create mock component spec for testing
 */
export function createMockSpec(
  name: string,
  type: string,
  config: Record<string, any> = {},
  overrides: Partial<ComponentSpec> = {}
): ComponentSpec {
  return {
    name,
    type,
    config,
    ...overrides
  };
}

/**
 * Validate CloudFormation template basic structure
 */
export function validateCfnTemplate(template: any): void {
  expect(template).toHaveProperty('AWSTemplateFormatVersion', '2010-09-09');
  expect(template).toHaveProperty('Resources');
  expect(typeof template.Resources).toBe('object');
  
  // Validate all resources have required properties
  Object.entries(template.Resources).forEach(([logicalId, resource]: [string, any]) => {
    expect(resource).toHaveProperty('Type');
    expect(resource).toHaveProperty('Properties');
    expect(typeof resource.Type).toBe('string');
    expect(typeof resource.Properties).toBe('object');
    expect(resource.Type).toMatch(/^AWS::[A-Za-z0-9]+::[A-Za-z0-9]+$/);
  });
}

/**
 * Get resources of a specific type from CloudFormation template
 */
export function getResourcesByType(template: any, resourceType: string): Array<[string, any]> {
  return Object.entries(template.Resources)
    .filter(([_, resource]: [string, any]) => resource.Type === resourceType);
}

/**
 * Compliance framework test data
 */
export const ComplianceTestCases = {
  commercial: {
    context: { complianceFramework: 'commercial' as const },
    expectations: {
      logRetentionDays: 14,
      encryptionRequired: false,
      enhancedMonitoring: false
    }
  },
  fedrampModerate: {
    context: { complianceFramework: 'fedramp-moderate' as const },
    expectations: {
      logRetentionDays: 365,
      encryptionRequired: true,
      enhancedMonitoring: true,
      multiAzRequired: true
    }
  },
  fedrampHigh: {
    context: { complianceFramework: 'fedramp-high' as const },
    expectations: {
      logRetentionDays: 3653,
      encryptionRequired: true,
      enhancedMonitoring: true,
      multiAzRequired: true,
      customerManagedKms: true,
      vpcRequired: true
    }
  }
};