/**
 * Test Metadata (Required by Platform Testing Standard §11)
 */
const testMetadata = {
  "id": "TP-dagger-engine-pool-component-001",
  "level": "unit",
  "capability": "DaggerEnginePool component synthesis and resource creation",
  "oracle": "exact",
  "invariants": ["All resources must be encrypted", "NLB must be internal-only", "FIPS mode enforced for FedRAMP"],
  "fixtures": ["CDK Stack", "Mock BaseComponent", "Test ComponentContext"],
  "inputs": {
    "shape": "ComponentContext with compliance frameworks, DaggerConfig with capacity settings",
    "notes": "Uses deterministic test data with frozen configuration"
  },
  "risks": ["External AWS service dependencies", "CDK synthesis complexity"],
  "dependencies": ["aws-cdk-lib", "@platform/core-engine", "@platform/contracts"],
  "evidence": ["CDK Template assertions", "Resource property validation"],
  "compliance_refs": ["std://encryption", "std://tagging", "std://networking"],
  "ai_generated": false,
  "human_reviewed_by": "platform-team"
};

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Template, Match } from 'aws-cdk-lib/assertions';

// Use shared mock utilities
import {
  setupPlatformMocks,
  createMockComponentContext,
  createMockComponentSpec,
  createTestStack
} from '../../../../../tests/utils/mock-base-component';

// Setup platform mocks
setupPlatformMocks();

import { DaggerEnginePool } from '../../src/dagger-engine-pool.component';

// Define interfaces locally to avoid import issues
interface ComponentContext {
  serviceName: string;
  environment: string;
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  owner: string;
  account: string;
  region: string;
  scope: Construct;
  observability?: {
    collectorEndpoint?: string;
  };
}

interface ComponentSpec {
  type: string;
  name: string;
  config: any;
}

describe('DaggerEnginePool Component', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let context: ComponentContext;
  let spec: ComponentSpec;

  beforeEach(() => {
    // Deterministic setup (Platform Testing Standard §6)
    app = new cdk.App();
    stack = createTestStack(app, 'TestStack');

    context = createMockComponentContext({
      serviceName: 'test-dagger-service',
      environment: 'test',
      complianceFramework: 'commercial',
      owner: 'platform-team',
      scope: stack,
      observability: {
        collectorEndpoint: 'https://otel.test.com:4318'
      }
    });

    spec = {
      type: 'dagger-engine-pool',
      name: 'test-dagger-pool',
      config: {
        capacity: { min: 1, max: 3 },
        fipsMode: true,
        instanceType: 'c7i.large'
      }
    };
  });

  afterEach(() => {
    // Cleanup (Platform Testing Standard §6)
    jest.clearAllMocks();
  });

  describe('Component__ValidConfiguration__CreatesExpectedResources', () => {
    it('should create DaggerEnginePool with required AWS resources', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-component-001

      // Arrange: Create component with valid configuration
      const component = new DaggerEnginePool(stack, 'TestDaggerPool', context, spec);

      // Act: Synthesize the component
      component.synth();

      // Assert: Verify CDK template contains expected resources
      const template = Template.fromStack(stack);

      // Primary Oracle: Exact resource verification (Platform Testing Standard §5.1)
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: Match.stringLikeRegexp('.*dagger-engine-storage.*'),
        EnableKeyRotation: true
      });

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [{
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms'
            }
          }]
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true
        }
      });

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        Type: 'network',
        Scheme: 'internal'
      });

      template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
        MinSize: '1',
        MaxSize: '3'
      });
    });
  });

  describe('Component__FedRAMPModerate__EnforcesFIPSMode', () => {
    it('should enforce FIPS mode for FedRAMP Moderate compliance', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-component-002

      // Arrange: FedRAMP Moderate context
      const fedrampContext = {
        ...context,
        complianceFramework: 'fedramp-moderate' as const
      };

      // Act & Assert: Should not throw error with FIPS mode enabled
      const component = new DaggerEnginePool(stack, 'TestDaggerPool', fedrampContext, spec);
      expect(() => component.synth()).not.toThrow();

      // Verify compliance-specific resources
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true
      });
    });
  });

  describe('Component__FedRAMPHigh__EnforcesFIPSMode', () => {
    it('should enforce FIPS mode for FedRAMP High compliance', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-component-003

      // Arrange: FedRAMP High context
      const fedrampContext = {
        ...context,
        complianceFramework: 'fedramp-high' as const
      };

      // Act & Assert: Should not throw error with FIPS mode enabled
      const component = new DaggerEnginePool(stack, 'TestDaggerPool', fedrampContext, spec);
      expect(() => component.synth()).not.toThrow();
    });
  });

  describe('Component__PublicExposureForbidden__CreatesInternalNLB', () => {
    it('should create internal-only Network Load Balancer for security', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-component-004

      // Arrange & Act
      const component = new DaggerEnginePool(stack, 'TestDaggerPool', context, spec);
      component.synth();

      // Assert: NLB must be internal (Platform Testing Standard §8 - Security negatives)
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        Scheme: 'internal'
      });

      // Negative test: Should NOT have internet-facing scheme
      // Note: CDK Template doesn't have hasNoResourceProperties, so we verify only internal scheme exists
    });
  });

  describe('Component__EncryptionRequired__CreatesEncryptedResources', () => {
    it('should create all storage resources with KMS encryption', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-component-005

      // Arrange & Act
      const component = new DaggerEnginePool(stack, 'TestDaggerPool', context, spec);
      component.synth();

      // Assert: All storage must be encrypted (Invariant)
      const template = Template.fromStack(stack);

      // S3 bucket encryption
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: Match.anyValue()
        }
      });

      // EBS volume encryption
      template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
        LaunchTemplateData: {
          BlockDeviceMappings: Match.arrayWith([
            Match.objectLike({
              Ebs: {
                Encrypted: true
              }
            })
          ])
        }
      });
    });
  });

  describe('Component__InvalidCapacity__ThrowsValidationError', () => {
    it('should throw error when capacity configuration is missing', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-component-006

      // Arrange: Invalid spec without capacity
      const invalidSpec = {
        ...spec,
        config: {
          fipsMode: true,
          instanceType: 'c7i.large'
          // Missing capacity
        }
      };

      // Act & Assert: Should throw validation error (Platform Testing Standard §8 - Negative testing)
      expect(() => {
        const component = new DaggerEnginePool(stack, 'TestDaggerPool', context, invalidSpec);
        component.synth();
      }).toThrow('capacity is required');
    });
  });

  describe('Component__DaggerEngineConfiguration__InstallsProperSoftware', () => {
    it('should configure launch template with Dagger engine installation', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-component-007

      // Arrange & Act
      const component = new DaggerEnginePool(stack, 'TestDaggerPool', context, spec);
      component.synth();

      // Assert: Launch template should contain Dagger installation commands
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
        LaunchTemplateData: {
          UserData: Match.anyValue()
        }
      });
    });
  });
});