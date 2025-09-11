/**
 * Test Fixtures for ECS Service Connect Components
 * Provides deterministic, reusable test data following Platform Testing Standard v1.0
 */
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ComponentSpec } from '../../../src/platform/contracts/component-interfaces';
/**
 * Deterministic test clock - frozen at specific time for reproducible tests
 */
export declare const TEST_TIMESTAMP = "2025-09-08T10:30:00.000Z";
export declare const TEST_DATE: Date;
/**
 * Deterministic random seed for reproducible test outcomes
 */
export declare const TEST_SEED = 12345;
/**
 * Test service contexts for different compliance frameworks
 */
export declare const TEST_CONTEXTS: {
    readonly commercial: {
        readonly serviceName: "test-service";
        readonly serviceVersion: "1.2.3";
        readonly environment: "test";
        readonly complianceFramework: "commercial";
        readonly region: "us-east-1";
        readonly deploymentId: "deploy-test-001";
        readonly platformVersion: "1.0.0";
        readonly costCenter: "engineering";
        readonly billingProject: "test-project";
        readonly resourceOwner: "platform-team";
        readonly scope: any;
    };
    readonly fedrampModerate: {
        readonly serviceName: "secure-service";
        readonly serviceVersion: "2.1.0";
        readonly environment: "staging";
        readonly complianceFramework: "fedramp-moderate";
        readonly region: "us-gov-west-1";
        readonly deploymentId: "deploy-secure-002";
        readonly platformVersion: "1.0.0";
        readonly costCenter: "security";
        readonly billingProject: "compliance-project";
        readonly resourceOwner: "security-team";
        readonly scope: any;
    };
    readonly fedrampHigh: {
        readonly serviceName: "classified-service";
        readonly serviceVersion: "3.0.0";
        readonly environment: "production";
        readonly complianceFramework: "fedramp-high";
        readonly region: "us-gov-east-1";
        readonly deploymentId: "deploy-classified-003";
        readonly platformVersion: "1.0.0";
        readonly costCenter: "operations";
        readonly billingProject: "classified-project";
        readonly resourceOwner: "ops-team";
        readonly scope: any;
    };
};
/**
 * Base component specifications for different scenarios
 */
export declare const TEST_SPECS: {
    readonly minimalCluster: {
        readonly name: "minimal-cluster";
        readonly type: "ecs-cluster";
        readonly config: {
            readonly serviceConnect: {
                readonly namespace: "internal";
            };
        };
    };
    readonly ec2Cluster: {
        readonly name: "ec2-cluster";
        readonly type: "ecs-cluster";
        readonly config: {
            readonly serviceConnect: {
                readonly namespace: "production";
            };
            readonly capacity: {
                readonly instanceType: "m5.large";
                readonly minSize: 2;
                readonly maxSize: 10;
                readonly desiredSize: 3;
                readonly keyName: "test-key";
                readonly enableMonitoring: true;
            };
            readonly containerInsights: true;
            readonly tags: {
                readonly 'test-tag': "test-value";
                readonly environment: "testing";
            };
        };
    };
    readonly fargateService: {
        readonly name: "fargate-service";
        readonly type: "ecs-fargate-service";
        readonly config: {
            readonly cluster: "test-cluster";
            readonly image: "nginx:latest";
            readonly cpu: 512;
            readonly memory: 1024;
            readonly port: 8080;
            readonly serviceConnect: {
                readonly portMappingName: "api";
            };
            readonly healthCheck: {
                readonly enabled: true;
                readonly path: "/health";
                readonly interval: 30;
                readonly timeout: 5;
                readonly retries: 3;
                readonly startPeriod: 60;
            };
            readonly autoScaling: {
                readonly enabled: true;
                readonly minCapacity: 2;
                readonly maxCapacity: 20;
                readonly targetCpuUtilization: 70;
                readonly targetMemoryUtilization: 80;
                readonly scaleInCooldown: 300;
                readonly scaleOutCooldown: 60;
            };
        };
    };
    readonly ec2Service: {
        readonly name: "ec2-service";
        readonly type: "ecs-ec2-service";
        readonly config: {
            readonly cluster: "test-cluster";
            readonly image: "httpd:latest";
            readonly taskCpu: 1024;
            readonly taskMemory: 2048;
            readonly port: 80;
            readonly serviceConnect: {
                readonly portMappingName: "web";
            };
            readonly placementConstraints: readonly [{
                readonly type: "memberOf";
                readonly expression: "attribute:ecs.instance-type =~ t3.*";
            }];
            readonly placementStrategies: readonly [{
                readonly type: "spread";
                readonly field: "attribute:ecs.availability-zone";
            }, {
                readonly type: "binpack";
                readonly field: "cpu";
            }];
        };
    };
};
/**
 * Test fixture factory that creates deterministic test environments
 */
export declare class TestFixtureFactory {
    private static apps;
    private static stacks;
    /**
     * Create a clean test environment with deterministic settings
     */
    static createTestEnvironment(): {
        app: cdk.App;
        stack: cdk.Stack;
        contexts: typeof TEST_CONTEXTS;
        specs: typeof TEST_SPECS;
    };
    /**
     * Create a mock VPC for testing ECS components
     */
    static createMockVpc(stack: cdk.Stack, id?: string): ec2.IVpc;
    /**
     * Clean up test resources (call in afterEach/afterAll)
     */
    static cleanup(): void;
    /**
     * Create deterministic component spec variations for testing
     */
    static createSpecVariations<T>(baseSpec: ComponentSpec, variations: Partial<T>[]): ComponentSpec[];
    /**
     * Generate test metadata following Platform Testing Standard v1.0
     */
    static generateTestMetadata(testId: string, level: 'unit' | 'integration' | 'e2e', capability: string, oracle: 'exact' | 'snapshot' | 'property' | 'contract' | 'metamorphic' | 'trace', options?: {
        invariants?: string[];
        fixtures?: string[];
        risks?: string[];
        dependencies?: string[];
        evidence?: string[];
        complianceRefs?: string[];
        aiGenerated?: boolean;
        humanReviewedBy?: string;
    }): {
        id: string;
        level: "integration" | "unit" | "e2e";
        capability: string;
        oracle: "trace" | "exact" | "snapshot" | "property" | "contract" | "metamorphic";
        invariants: string[];
        fixtures: string[];
        inputs: {
            shape: string;
            notes: string;
        };
        risks: string[];
        dependencies: string[];
        evidence: string[];
        complianceRefs: string[];
        aiGenerated: boolean;
        humanReviewedBy: string;
    };
}
/**
 * Test assertion helpers for common patterns
 */
export declare class TestAssertions {
    /**
     * Assert that a CloudFormation template contains required ECS cluster resources
     */
    static assertEcsClusterResources(template: cdk.assertions.Template, expectedClusterName?: string): void;
    /**
     * Assert that mandatory platform tags are present
     */
    static assertMandatoryTags(template: cdk.assertions.Template, resourceType: string): void;
    /**
     * Assert compliance-specific configuration based on framework
     */
    static assertComplianceConfiguration(actualConfig: any, complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'): void;
    /**
     * Assert Service Connect capability is properly configured
     */
    static assertServiceConnectCapability(capability: any): void;
}
/**
 * Performance test helpers for measuring synthesis time and resource counts
 */
export declare class PerformanceTestHelpers {
    /**
     * Measure component synthesis performance
     */
    static measureSynthesisTime<T>(synthesisFunction: () => T, expectedMaxTimeMs?: number): Promise<{
        result: T;
        executionTime: number;
    }>;
    /**
     * Count CloudFormation resources in template
     */
    static countResources(template: cdk.assertions.Template): Record<string, number>;
}
