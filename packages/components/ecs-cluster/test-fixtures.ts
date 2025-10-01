/**
 * Test Fixtures for ECS Service Connect Components
 * Provides deterministic, reusable test data following Platform Testing Standard v1.0
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ComponentContext, ComponentSpec } from '../@shinobi/core/component-interfaces.js';

/**
 * Deterministic test clock - frozen at specific time for reproducible tests
 */
export const TEST_TIMESTAMP = '2025-09-08T10:30:00.000Z';
export const TEST_DATE = new Date(TEST_TIMESTAMP);

/**
 * Deterministic random seed for reproducible test outcomes
 */
export const TEST_SEED = 12345;

/**
 * Test service contexts for different compliance frameworks
 */
export const TEST_CONTEXTS = {
  commercial: {
    serviceName: 'test-service',
    serviceVersion: '1.2.3',
    environment: 'test',
    complianceFramework: 'commercial' as const,
    region: 'us-east-1',
    deploymentId: 'deploy-test-001',
    platformVersion: '1.0.0',
    costCenter: 'engineering',
    billingProject: 'test-project',
    resourceOwner: 'platform-team',
    scope: undefined as any // Will be set in beforeEach
  },
  fedrampModerate: {
    serviceName: 'secure-service',
    serviceVersion: '2.1.0',
    environment: 'staging',
    complianceFramework: 'fedramp-moderate' as const,
    region: 'us-gov-west-1',
    deploymentId: 'deploy-secure-002',
    platformVersion: '1.0.0',
    costCenter: 'security',
    billingProject: 'compliance-project',
    resourceOwner: 'security-team',
    scope: undefined as any
  },
  fedrampHigh: {
    serviceName: 'classified-service',
    serviceVersion: '3.0.0',
    environment: 'production',
    complianceFramework: 'fedramp-high' as const,
    region: 'us-gov-east-1',
    deploymentId: 'deploy-classified-003',
    platformVersion: '1.0.0',
    costCenter: 'operations',
    billingProject: 'classified-project',
    resourceOwner: 'ops-team',
    scope: undefined as any
  }
} as const;

/**
 * Base component specifications for different scenarios
 */
export const TEST_SPECS = {
  minimalCluster: {
    name: 'minimal-cluster',
    type: 'ecs-cluster',
    config: {
      serviceConnect: {
        namespace: 'internal'
      }
    }
  },
  ec2Cluster: {
    name: 'ec2-cluster', 
    type: 'ecs-cluster',
    config: {
      serviceConnect: {
        namespace: 'production'
      },
      capacity: {
        instanceType: 'm5.large',
        minSize: 2,
        maxSize: 10,
        desiredSize: 3,
        keyName: 'test-key',
        enableMonitoring: true
      },
      containerInsights: true,
      tags: {
        'test-tag': 'test-value',
        'environment': 'testing'
      }
    }
  },
  fargateService: {
    name: 'fargate-service',
    type: 'ecs-fargate-service',
    config: {
      cluster: 'test-cluster',
      image: 'nginx:latest',
      cpu: 512,
      memory: 1024,
      port: 8080,
      serviceConnect: {
        portMappingName: 'api'
      },
      healthCheck: {
        enabled: true,
        path: '/health',
        interval: 30,
        timeout: 5,
        retries: 3,
        startPeriod: 60
      },
      autoScaling: {
        enabled: true,
        minCapacity: 2,
        maxCapacity: 20,
        targetCpuUtilization: 70,
        targetMemoryUtilization: 80,
        scaleInCooldown: 300,
        scaleOutCooldown: 60
      }
    }
  },
  ec2Service: {
    name: 'ec2-service',
    type: 'ecs-ec2-service', 
    config: {
      cluster: 'test-cluster',
      image: 'httpd:latest',
      taskCpu: 1024,
      taskMemory: 2048,
      port: 80,
      serviceConnect: {
        portMappingName: 'web'
      },
      placementConstraints: [
        {
          type: 'memberOf',
          expression: 'attribute:ecs.instance-type =~ t3.*'
        }
      ],
      placementStrategies: [
        {
          type: 'spread',
          field: 'attribute:ecs.availability-zone'
        },
        {
          type: 'binpack',
          field: 'cpu'
        }
      ]
    }
  }
} as const;

/**
 * Test fixture factory that creates deterministic test environments
 */
export class TestFixtureFactory {
  private static apps: cdk.App[] = [];
  private static stacks: cdk.Stack[] = [];

  /**
   * Create a clean test environment with deterministic settings
   */
  public static createTestEnvironment(): {
    app: cdk.App;
    stack: cdk.Stack;
    contexts: typeof TEST_CONTEXTS;
    specs: typeof TEST_SPECS;
  } {
    // Create new CDK app with deterministic settings
    const app = new cdk.App({
      context: {
        // Disable stack trace collection for faster tests
        '@aws-cdk/core:stackTraceFromCdkErrors': false,
        // Use deterministic asset hashing
        '@aws-cdk/core:deterministic-asset-hashing': true
      }
    });

    const stack = new cdk.Stack(app, `TestStack-${Date.now()}`, {
      env: {
        account: '123456789012', // Deterministic test account
        region: 'us-east-1'
      },
      stackName: `test-stack-${TEST_SEED}`, // Deterministic stack name
      description: 'Test stack for ECS Service Connect components'
    });

    // Update contexts with stack reference
    const contexts = {
      commercial: { ...TEST_CONTEXTS.commercial, scope: stack },
      fedrampModerate: { ...TEST_CONTEXTS.fedrampModerate, scope: stack },
      fedrampHigh: { ...TEST_CONTEXTS.fedrampHigh, scope: stack }
    };

    // Track for cleanup
    TestFixtureFactory.apps.push(app);
    TestFixtureFactory.stacks.push(stack);

    return {
      app,
      stack,
      contexts,
      specs: TEST_SPECS
    };
  }

  /**
   * Create a mock VPC for testing ECS components
   */
  public static createMockVpc(stack: cdk.Stack, id: string = 'TestVpc'): ec2.IVpc {
    return new ec2.Vpc(stack, id, {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        }
      ],
      natGateways: 1,
      enableDnsHostnames: true,
      enableDnsSupport: true
    });
  }

  /**
   * Clean up test resources (call in afterEach/afterAll)
   */
  public static cleanup(): void {
    TestFixtureFactory.apps = [];
    TestFixtureFactory.stacks = [];
  }

  /**
   * Create deterministic component spec variations for testing
   */
  public static createSpecVariations<T>(baseSpec: ComponentSpec, variations: Partial<T>[]): ComponentSpec[] {
    return variations.map((variation, index) => ({
      ...baseSpec,
      name: `${baseSpec.name}-${index}`,
      config: {
        ...baseSpec.config,
        ...variation
      }
    }));
  }

  /**
   * Generate test metadata following Platform Testing Standard v1.0
   */
  public static generateTestMetadata(
    testId: string,
    level: 'unit' | 'integration' | 'e2e',
    capability: string,
    oracle: 'exact' | 'snapshot' | 'property' | 'contract' | 'metamorphic' | 'trace',
    options: {
      invariants?: string[];
      fixtures?: string[];
      risks?: string[];
      dependencies?: string[];
      evidence?: string[];
      complianceRefs?: string[];
      aiGenerated?: boolean;
      humanReviewedBy?: string;
    } = {}
  ) {
    return {
      id: testId,
      level,
      capability,
      oracle,
      invariants: options.invariants || [],
      fixtures: options.fixtures || ['TestFixtureFactory', 'TEST_CONTEXTS', 'TEST_SPECS'],
      inputs: {
        shape: 'ECS Service Connect configuration with compliance framework variations',
        notes: 'Uses deterministic test contexts and component specifications'
      },
      risks: options.risks || [],
      dependencies: options.dependencies || ['aws-cdk-lib', 'aws-cdk-lib/assertions'],
      evidence: options.evidence || [],
      complianceRefs: options.complianceRefs || [],
      aiGenerated: options.aiGenerated || false,
      humanReviewedBy: options.humanReviewedBy || ''
    };
  }
}

/**
 * Test assertion helpers for common patterns
 */
export class TestAssertions {
  
  /**
   * Assert that a CloudFormation template contains required ECS cluster resources
   */
  public static assertEcsClusterResources(template: cdk.assertions.Template, expectedClusterName?: string): void {
    // ECS Cluster
    template.hasResourceProperties('AWS::ECS::Cluster', expectedClusterName ? {
      ClusterName: expectedClusterName
    } : {});

    // Service Discovery Namespace
    template.hasResourceProperties('AWS::ServiceDiscovery::PrivateDnsNamespace', {
      Name: cdk.assertions.Match.anyValue()
    });
  }

  /**
   * Assert that mandatory platform tags are present
   */
  public static assertMandatoryTags(template: cdk.assertions.Template, resourceType: string): void {
    template.hasResourceProperties(resourceType, {
      Tags: cdk.assertions.Match.arrayWith([
        cdk.assertions.Match.objectLike({ Key: 'service-name', Value: cdk.assertions.Match.anyValue() }),
        cdk.assertions.Match.objectLike({ Key: 'component-name', Value: cdk.assertions.Match.anyValue() }),
        cdk.assertions.Match.objectLike({ Key: 'component-type', Value: cdk.assertions.Match.anyValue() }),
        cdk.assertions.Match.objectLike({ Key: 'environment', Value: cdk.assertions.Match.anyValue() }),
        cdk.assertions.Match.objectLike({ Key: 'compliance-framework', Value: cdk.assertions.Match.anyValue() })
      ])
    });
  }

  /**
   * Assert compliance-specific configuration based on framework
   */
  public static assertComplianceConfiguration(
    actualConfig: any,
    complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'
  ): void {
    switch (complianceFramework) {
      case 'fedramp-high':
        expect(actualConfig.containerInsights).toBe(true);
        if (actualConfig.capacity) {
          expect(actualConfig.capacity.enableMonitoring).toBe(true);
          expect(actualConfig.capacity.instanceType).toMatch(/^(m5|c5|r5)\.(large|xlarge)/);
          expect(actualConfig.capacity.minSize).toBeGreaterThanOrEqual(2);
        }
        break;
      case 'fedramp-moderate':
        expect(actualConfig.containerInsights).toBe(true);
        if (actualConfig.capacity) {
          expect(actualConfig.capacity.enableMonitoring).toBe(true);
        }
        break;
      case 'commercial':
        // More lenient requirements for commercial
        break;
    }
  }

  /**
   * Assert Service Connect capability is properly configured
   */
  public static assertServiceConnectCapability(capability: any): void {
    expect(capability).toHaveProperty('serviceName');
    expect(capability).toHaveProperty('dnsName');
    expect(capability).toHaveProperty('internalEndpoint');
    expect(capability).toHaveProperty('port');
    expect(typeof capability.serviceName).toBe('string');
    expect(typeof capability.dnsName).toBe('string');
    expect(typeof capability.internalEndpoint).toBe('string');
    expect(typeof capability.port).toBe('number');
  }
}

/**
 * Performance test helpers for measuring synthesis time and resource counts
 */
export class PerformanceTestHelpers {
  
  /**
   * Measure component synthesis performance
   */
  public static async measureSynthesisTime<T>(
    synthesisFunction: () => T,
    expectedMaxTimeMs: number = 5000
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = performance.now();
    const result = synthesisFunction();
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(executionTime).toBeLessThan(expectedMaxTimeMs);
    
    return { result, executionTime };
  }

  /**
   * Count CloudFormation resources in template
   */
  public static countResources(template: cdk.assertions.Template): Record<string, number> {
    const templateJson = template.toJSON();
    const resources = templateJson.Resources || {};
    
    const counts: Record<string, number> = {};
    Object.values(resources).forEach((resource: any) => {
      const type = resource.Type;
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }
}
