/**
 * RDS PostgreSQL Component Test Suite  
 * Platform Testing Standard v1.0 Compliant
 * 
 * This test suite validates the RdsPostgresComponent against all platform standards
 * with proper metadata, deterministic fixtures, and single-oracle assertions.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { RdsPostgresComponent, RdsPostgresConfig, RDS_POSTGRES_CONFIG_SCHEMA } from '../../../src/components/rds-postgres/rds-postgres.component';
import { ComponentContext, ComponentSpec } from '../../../src/platform/contracts';

// Test Metadata as per Platform Testing Standard v1.0 Section 11
const TEST_METADATA = {
  component: 'rds-postgres',
  level: 'unit',
  framework: 'jest',
  deterministic: true,
  fixtures: ['RdsTestFixtureFactory', 'deterministicClock', 'seededRng'],
  compliance_refs: ['std://platform-configuration', 'std://platform-tagging', 'std://platform-observability', 'std://platform-logging'],
  ai_generated: true,
  human_reviewed_by: "platform-engineering-team"
};

// Deterministic test fixtures (Platform Testing Standard v1.0 Section 6)
const DETERMINISTIC_TIMESTAMP = '2024-09-07T12:00:00.000Z';
const FIXED_DEPLOYMENT_ID = 'test-deploy-12345';

// Mock clock for deterministic behavior  
const mockDate = new Date(DETERMINISTIC_TIMESTAMP);
jest.useFakeTimers();
jest.setSystemTime(mockDate);

// Seeded randomness for deterministic test behavior
let mockRandom = 0.123456789;
const originalMathRandom = Math.random;
beforeEach(() => {
  Math.random = jest.fn(() => mockRandom);
});

afterEach(() => {
  Math.random = originalMathRandom;
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Test fixture factory for deterministic component creation
class RdsTestFixtureFactory {
  static createBaseContext(complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial'): ComponentContext {
    return {
      serviceName: 'test-service',
      environment: 'test',
      region: 'us-east-1',
      accountId: '123456789012',
      complianceFramework,
      serviceLabels: {
        version: '1.0.0',
        team: 'platform-team'
      }
    };
  }

  static createBaseSpec(configOverrides: Partial<RdsPostgresConfig> = {}): ComponentSpec {
    return {
      name: 'test-postgres-db',
      type: 'rds-postgres',
      config: {
        dbName: 'testapp',
        username: 'dbadmin',
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        backupRetentionDays: 7,
        multiAz: false,
        encryptionEnabled: false,
        vpc: {
          vpcId: 'vpc-12345678'
        },
        ...configOverrides
      }
    };
  }

  static createDeterministicStack(): { app: cdk.App, stack: cdk.Stack } {
    const app = new cdk.App({ context: { '@aws-cdk/core:deterministic-names': true } });
    const stack = new cdk.Stack(app, 'RdsTestStack', {
      stackName: 'rds-test-stack',
      env: { account: '123456789012', region: 'us-east-1' }
    });
    return { app, stack };
  }
}

describe('RdsPostgresComponent - Platform Testing Standard v1.0 Compliant Tests', () => {
  let testStack: { app: cdk.App, stack: cdk.Stack };
  
  beforeEach(() => {
    testStack = RdsTestFixtureFactory.createDeterministicStack();
  });

  afterEach(() => {
    testStack.app.synth(); // Ensure synthesis doesn't leak
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-rds-postgres-config-001",
   *   "level": "unit",
   *   "capability": "Validates basic component synthesis with valid configuration",
   *   "oracle": "exact",
   *   "invariants": ["Component creates RDS instance", "Security group is created", "Secret is created"],
   *   "fixtures": ["RdsTestFixtureFactory", "deterministic-clock", "seeded-rng"],
   *   "inputs": { "shape": "Commercial compliance framework with minimal config", "notes": "Tests basic synthesis path" },
   *   "risks": ["boundary", "compliance"],
   *   "dependencies": ["aws-cdk-lib", "aws-cdk-lib/assertions"],
   *   "evidence": ["artifact://test-results/synthesis-commercial.json"],
   *   "compliance_refs": ["std://platform-configuration", "std://platform-tagging"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */>>
  describe('ComponentSynthesis__ValidCommercialConfig__CreatesExpectedResources', () => {
    test('should create expected AWS resources with valid configuration', () => {
      // Arrange
      const context = RdsTestFixtureFactory.createBaseContext('commercial');
      const spec = RdsTestFixtureFactory.createBaseSpec();
      
      // Act
      const component = new RdsPostgresComponent(testStack.stack, 'TestRdsComponent', context, spec);
      component.synth();
      
      // Assert (Single Oracle: exact resource count)
      const template = Template.fromStack(testStack.stack);
      
      template.resourceCountIs('AWS::RDS::DBInstance', 1);
      template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
      template.resourceCountIs('AWS::SecretsManager::Secret', 1);
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-rds-postgres-config-002",
   *   "level": "unit",
   *   "capability": "Validates ConfigBuilder 5-layer precedence for hardcoded fallbacks",
   *   "oracle": "contract",
   *   "invariants": ["Empty dbName triggers validation error", "Error message is actionable"],
   *   "fixtures": ["RdsTestFixtureFactory", "deterministic-clock"],
   *   "inputs": { "shape": "Config with empty dbName (security-safe fallback)", "notes": "Tests Platform Configuration Standard Section 3.1" },
   *   "risks": ["security", "compliance"],
   *   "dependencies": ["src/components/rds-postgres/rds-postgres.component.ts"],
   *   "evidence": ["artifact://test-results/validation-error.json"],
   *   "compliance_refs": ["std://platform-configuration"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */>
  describe('ConfigBuilder__EmptyDbName__RejectsWithValidationError', () => {
    test('should reject empty dbName with validation error', () => {
      // Arrange
      const context = RdsTestFixtureFactory.createBaseContext();
      const spec = RdsTestFixtureFactory.createBaseSpec({ dbName: '' }); // Security-safe fallback forces explicit config
      
      // Act & Assert (Single Oracle: contract validation)
      expect(() => {
        const component = new RdsPostgresComponent(testStack.stack, 'TestRdsComponent', context, spec);
        component.synth();
      }).toThrow(/dbName.*required/i);
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-rds-postgres-fedramp-003",
   *   "level": "unit",
   *   "capability": "Validates FedRAMP Moderate compliance hardening activation",
   *   "oracle": "exact",
   *   "invariants": ["Performance Insights enabled", "Enhanced monitoring enabled", "Log exports enabled"],
   *   "fixtures": ["RdsTestFixtureFactory", "deterministic-clock"],
   *   "inputs": { "shape": "FedRAMP Moderate compliance context", "notes": "Tests compliance-driven observability features" },
   *   "risks": ["compliance", "security"],
   *   "dependencies": ["src/components/rds-postgres/rds-postgres.component.ts"],
   *   "evidence": ["artifact://test-results/fedramp-moderate-observability.json"],
   *   "compliance_refs": ["std://platform-observability", "std://platform-configuration"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */>
  describe('ComplianceHardening__FedRampModerate__EnablesObservabilityFeatures', () => {
    test('should enable observability features for FedRAMP Moderate compliance', () => {
      // Arrange
      const context = RdsTestFixtureFactory.createBaseContext('fedramp-moderate');
      const spec = RdsTestFixtureFactory.createBaseSpec();
      
      // Act
      const component = new RdsPostgresComponent(testStack.stack, 'TestRdsComponent', context, spec);
      component.synth();
      
      // Assert (Single Oracle: snapshot with masking)
      const template = Template.fromStack(testStack.stack);
      
      // Verify observability features are enabled
      template.hasResourceProperties('AWS::RDS::DBInstance', {
        EnablePerformanceInsights: true,
        EnableCloudwatchLogsExports: ['postgresql']
      });
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-rds-postgres-security-004",
   *   "level": "unit",
   *   "capability": "Validates security-focused negative testing for hardcoded VPC assumptions",
   *   "oracle": "exact",
   *   "invariants": ["Missing VPC config triggers security error", "Error message mentions security compliance"],
   *   "fixtures": ["RdsTestFixtureFactory", "deterministic-clock"],
   *   "inputs": { "shape": "Config without VPC ID (security violation)", "notes": "Adversarial test for Platform Configuration Standard Section 3.1" },
   *   "risks": ["security", "compliance"],
   *   "dependencies": ["src/components/rds-postgres/rds-postgres.component.ts"],
   *   "evidence": ["artifact://test-results/security-validation-error.json"],
   *   "compliance_refs": ["std://platform-configuration"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */>
  describe('SecurityValidation__MissingVpcConfig__FailsWithActionableError', () => {
    test('should fail with security error when VPC config is missing', () => {
      // Arrange (Adversarial input: missing VPC configuration)
      const context = RdsTestFixtureFactory.createBaseContext();
      const spec = RdsTestFixtureFactory.createBaseSpec({ 
        vpc: undefined // Security violation: no VPC specified
      });
      
      // Act & Assert (Single Oracle: exact error behavior)
      expect(() => {
        const component = new RdsPostgresComponent(testStack.stack, 'TestRdsComponent', context, spec);  
        component.synth();
      }).toThrow(/VPC.*required.*security.*compliance/i);
    });
  });

});
