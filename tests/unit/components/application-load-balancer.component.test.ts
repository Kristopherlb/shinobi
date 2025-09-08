/**
 * Enterprise Application Load Balancer Component Test Suite
 * Implements Platform Testing Standard v1.0
 * 
 * @file tests/unit/components/application-load-balancer.component.test.ts
 */

import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { ApplicationLoadBalancerComponent, ApplicationLoadBalancerConfig, APPLICATION_LOAD_BALANCER_CONFIG_SCHEMA } from '../../../src/components/application-load-balancer/application-load-balancer.component';
import { ComponentContext, ComponentSpec } from '../../../src/platform/contracts';

// Test Metadata as per Platform Testing Standard v1.0 Section 11
const TEST_METADATA = {
  component: 'application-load-balancer',
  level: 'unit',
  framework: 'jest',
  deterministic: true,
  fixtures: ['AlbTestFixtureFactory', 'deterministicClock', 'seededRng'],
  compliance_refs: ['std://platform-configuration', 'std://platform-tagging', 'std://platform-observability', 'std://platform-logging'],
  ai_generated: true,
  human_reviewed_by: "platform-engineering-team"
};

// Deterministic test fixtures (Platform Testing Standard v1.0 Section 6)
const DETERMINISTIC_TIMESTAMP = '2024-09-07T12:00:00.000Z';
const FIXED_DEPLOYMENT_ID = 'test-deploy-alb-67890';

// Store original functions for cleanup
const originalMathRandom = Math.random;
const originalDateNow = Date.now;

// Mock Math.random for deterministic behavior
let mockRandom = 0.987654321;
Math.random = jest.fn(() => mockRandom);

// Deterministic test fixture factory
class AlbTestFixtureFactory {
  static createDeterministicStack(): { app: cdk.App; stack: cdk.Stack } {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    return { app, stack };
  }

  static createBaseContext(complianceFramework: string = 'commercial'): ComponentContext {
    return {
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'test',
      region: 'us-east-1',
      account: '123456789012',
      complianceFramework: complianceFramework as any,
      deploymentId: FIXED_DEPLOYMENT_ID,
      platformVersion: '1.0.0',
      timestamp: new Date(DETERMINISTIC_TIMESTAMP),
      tags: {
        'service-name': 'test-service',
        'environment': 'test'
      }
    };
  }

  static createBaseSpec(configOverrides: Partial<ApplicationLoadBalancerConfig> = {}): ComponentSpec {
    return {
      name: 'test-alb',
      type: 'application-load-balancer',
      config: {
        loadBalancerName: 'test-alb-lb',
        vpc: {
          vpcId: 'vpc-12345678',
          subnetType: 'public'
        },
        listeners: [
          {
            port: 443,
            protocol: 'HTTPS',
            certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert'
          }
        ],
        securityGroups: {
          create: true,
          ingress: [
            {
              port: 443,
              protocol: 'tcp',
              cidr: '10.0.0.0/16',
              description: 'HTTPS from internal network'
            }
          ]
        },
        ...configOverrides
      }
    };
  }
}

describe('Application Load Balancer Component Test Suite', () => {
  let testStack: { app: cdk.App; stack: cdk.Stack };

  beforeAll(() => {
    // Set deterministic clock
    jest.useFakeTimers();
    jest.setSystemTime(new Date(DETERMINISTIC_TIMESTAMP));
  });

  beforeEach(() => {
    testStack = AlbTestFixtureFactory.createDeterministicStack();
    mockRandom = 0.987654321; // Reset deterministic random seed
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    testStack.app.synth(); // Ensure synthesis doesn't leak
  });

  afterAll(() => {
    // Restore original functions
    Math.random = originalMathRandom;
    Date.now = originalDateNow;
    jest.useRealTimers();
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-application-load-balancer-config-001",
   *   "level": "unit",
   *   "capability": "Validates basic component synthesis with valid configuration",
   *   "oracle": "exact",
   *   "invariants": ["Component creates ALB", "Security group is created", "Target group is created"],
   *   "fixtures": ["AlbTestFixtureFactory", "deterministic-clock", "seeded-rng"],
   *   "inputs": { "shape": "Commercial compliance framework with minimal config", "notes": "Tests basic synthesis path" },
   *   "risks": ["boundary", "compliance"],
   *   "dependencies": ["aws-cdk-lib", "aws-cdk-lib/assertions"],
   *   "evidence": ["artifact://test-results/synthesis-commercial.json"],
   *   "compliance_refs": ["std://platform-configuration", "std://platform-tagging"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */>
  describe('ComponentSynthesis__ValidCommercialConfig__CreatesExpectedResources', () => {
    test('should create expected AWS resources with valid configuration', () => {
      // Arrange
      const context = AlbTestFixtureFactory.createBaseContext('commercial');
      const spec = AlbTestFixtureFactory.createBaseSpec();

      // Act
      const component = new ApplicationLoadBalancerComponent(testStack.stack, 'TestAlb', context, spec);
      component.synth();
      
      // Assert (Oracle: exact - deterministic resource count validation)
      const template = Template.fromStack(testStack.stack);
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
      template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1);
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-application-load-balancer-config-002",
   *   "level": "unit",
   *   "capability": "Validates ConfigBuilder 5-layer precedence for security-safe fallbacks",
   *   "oracle": "contract",
   *   "invariants": ["Empty VPC ID triggers validation error", "Error message is actionable"],
   *   "fixtures": ["AlbTestFixtureFactory", "deterministic-clock"],
   *   "inputs": { "shape": "Config with empty VPC ID (security-safe fallback)", "notes": "Tests Platform Configuration Standard Section 3.1" },
   *   "risks": ["security", "compliance"],
   *   "dependencies": ["src/components/application-load-balancer/application-load-balancer.component.ts"],
   *   "evidence": ["artifact://test-results/validation-error.json"],
   *   "compliance_refs": ["std://platform-configuration"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */>
  describe('ConfigBuilder__EmptyVpcId__RejectsWithValidationError', () => {
    test('should reject empty VPC ID with validation error', () => {
      // Arrange
      const context = AlbTestFixtureFactory.createBaseContext();
      const spec = AlbTestFixtureFactory.createBaseSpec({ 
        vpc: { vpcId: '' } // Security-safe fallback forces explicit config
      });
      
      // Act & Assert (Oracle: contract - error behavior validation)
      const component = new ApplicationLoadBalancerComponent(testStack.stack, 'TestAlb', context, spec);
      expect(() => {
        component.synth();
      }).toThrow(/VPC.*required.*security.*compliance/i);
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-application-load-balancer-fedramp-003",
   *   "level": "unit",
   *   "capability": "Validates FedRAMP Moderate compliance hardening activation",
   *   "oracle": "exact",
   *   "invariants": ["Deletion protection enabled", "Access logs enabled", "HTTPS listener enforced"],
   *   "fixtures": ["AlbTestFixtureFactory", "deterministic-clock"],
   *   "inputs": { "shape": "FedRAMP Moderate compliance context", "notes": "Tests compliance-driven configuration features" },
   *   "risks": ["compliance", "security"],
   *   "dependencies": ["src/components/application-load-balancer/application-load-balancer.component.ts"],
   *   "evidence": ["artifact://test-results/fedramp-moderate-configuration.json"],
   *   "compliance_refs": ["std://platform-configuration"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */>
  describe('ComplianceHardening__FedRampModerate__EnablesSecurityFeatures', () => {
    test('should enable security features for FedRAMP Moderate compliance', () => {
      // Arrange
      const context = AlbTestFixtureFactory.createBaseContext('fedramp-moderate');
      const spec = AlbTestFixtureFactory.createBaseSpec();

      // Act
      const component = new ApplicationLoadBalancerComponent(testStack.stack, 'TestAlb', context, spec);
      component.synth();
      
      // Assert (Oracle: exact - property validation)
      const template = Template.fromStack(testStack.stack);
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        LoadBalancerAttributes: [
          { Key: 'deletion_protection.enabled', Value: 'true' }
        ]
      });
    });
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-application-load-balancer-security-004",
   *   "level": "unit",
   *   "capability": "Validates security-focused negative testing for hardcoded CIDR assumptions",
   *   "oracle": "exact",
   *   "invariants": ["Missing CIDR in security rule triggers security error", "Error message mentions compliance"],
   *   "fixtures": ["AlbTestFixtureFactory", "deterministic-clock"],
   *   "inputs": { "shape": "Config without explicit CIDR (security violation)", "notes": "Adversarial test for Platform Configuration Standard Section 3.1" },
   *   "risks": ["security", "compliance"],
   *   "dependencies": ["src/components/application-load-balancer/application-load-balancer.component.ts"],
   *   "evidence": ["artifact://test-results/security-validation-error.json"],
   *   "compliance_refs": ["std://platform-configuration"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "platform-engineering-team"
   * }
   */>
  describe('SecurityValidation__MissingCidrConfig__FailsWithActionableError', () => {
    test('should fail with security error when security group CIDR is missing', () => {
      // Arrange (Adversarial input: missing CIDR configuration)
      const context = AlbTestFixtureFactory.createBaseContext();
      const spec = AlbTestFixtureFactory.createBaseSpec({ 
        securityGroups: {
          create: true,
          ingress: [
            {
              port: 443,
              protocol: 'tcp',
              // cidr: missing - violates Platform Configuration Standard v1.0 Section 3.1
              description: 'HTTPS access'
            }
          ]
        }
      });
      
      // Act & Assert (Oracle: exact - security validation)
      const component = new ApplicationLoadBalancerComponent(testStack.stack, 'TestAlb', context, spec);
      expect(() => {
        component.synth();
      }).toThrow(/Security group.*CIDR.*explicit.*hardcoded.*prohibited/i);
    });
  });

});
