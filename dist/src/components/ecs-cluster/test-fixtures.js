"use strict";
/**
 * Test Fixtures for ECS Service Connect Components
 * Provides deterministic, reusable test data following Platform Testing Standard v1.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceTestHelpers = exports.TestAssertions = exports.TestFixtureFactory = exports.TEST_SPECS = exports.TEST_CONTEXTS = exports.TEST_SEED = exports.TEST_DATE = exports.TEST_TIMESTAMP = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
/**
 * Deterministic test clock - frozen at specific time for reproducible tests
 */
exports.TEST_TIMESTAMP = '2025-09-08T10:30:00.000Z';
exports.TEST_DATE = new Date(exports.TEST_TIMESTAMP);
/**
 * Deterministic random seed for reproducible test outcomes
 */
exports.TEST_SEED = 12345;
/**
 * Test service contexts for different compliance frameworks
 */
exports.TEST_CONTEXTS = {
    commercial: {
        serviceName: 'test-service',
        serviceVersion: '1.2.3',
        environment: 'test',
        complianceFramework: 'commercial',
        region: 'us-east-1',
        deploymentId: 'deploy-test-001',
        platformVersion: '1.0.0',
        costCenter: 'engineering',
        billingProject: 'test-project',
        resourceOwner: 'platform-team',
        scope: undefined // Will be set in beforeEach
    },
    fedrampModerate: {
        serviceName: 'secure-service',
        serviceVersion: '2.1.0',
        environment: 'staging',
        complianceFramework: 'fedramp-moderate',
        region: 'us-gov-west-1',
        deploymentId: 'deploy-secure-002',
        platformVersion: '1.0.0',
        costCenter: 'security',
        billingProject: 'compliance-project',
        resourceOwner: 'security-team',
        scope: undefined
    },
    fedrampHigh: {
        serviceName: 'classified-service',
        serviceVersion: '3.0.0',
        environment: 'production',
        complianceFramework: 'fedramp-high',
        region: 'us-gov-east-1',
        deploymentId: 'deploy-classified-003',
        platformVersion: '1.0.0',
        costCenter: 'operations',
        billingProject: 'classified-project',
        resourceOwner: 'ops-team',
        scope: undefined
    }
};
/**
 * Base component specifications for different scenarios
 */
exports.TEST_SPECS = {
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
};
/**
 * Test fixture factory that creates deterministic test environments
 */
class TestFixtureFactory {
    static apps = [];
    static stacks = [];
    /**
     * Create a clean test environment with deterministic settings
     */
    static createTestEnvironment() {
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
            stackName: `test-stack-${exports.TEST_SEED}`, // Deterministic stack name
            description: 'Test stack for ECS Service Connect components'
        });
        // Update contexts with stack reference
        const contexts = {
            commercial: { ...exports.TEST_CONTEXTS.commercial, scope: stack },
            fedrampModerate: { ...exports.TEST_CONTEXTS.fedrampModerate, scope: stack },
            fedrampHigh: { ...exports.TEST_CONTEXTS.fedrampHigh, scope: stack }
        };
        // Track for cleanup
        TestFixtureFactory.apps.push(app);
        TestFixtureFactory.stacks.push(stack);
        return {
            app,
            stack,
            contexts,
            specs: exports.TEST_SPECS
        };
    }
    /**
     * Create a mock VPC for testing ECS components
     */
    static createMockVpc(stack, id = 'TestVpc') {
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
    static cleanup() {
        TestFixtureFactory.apps = [];
        TestFixtureFactory.stacks = [];
    }
    /**
     * Create deterministic component spec variations for testing
     */
    static createSpecVariations(baseSpec, variations) {
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
    static generateTestMetadata(testId, level, capability, oracle, options = {}) {
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
exports.TestFixtureFactory = TestFixtureFactory;
/**
 * Test assertion helpers for common patterns
 */
class TestAssertions {
    /**
     * Assert that a CloudFormation template contains required ECS cluster resources
     */
    static assertEcsClusterResources(template, expectedClusterName) {
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
    static assertMandatoryTags(template, resourceType) {
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
    static assertComplianceConfiguration(actualConfig, complianceFramework) {
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
    static assertServiceConnectCapability(capability) {
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
exports.TestAssertions = TestAssertions;
/**
 * Performance test helpers for measuring synthesis time and resource counts
 */
class PerformanceTestHelpers {
    /**
     * Measure component synthesis performance
     */
    static async measureSynthesisTime(synthesisFunction, expectedMaxTimeMs = 5000) {
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
    static countResources(template) {
        const templateJson = template.toJSON();
        const resources = templateJson.Resources || {};
        const counts = {};
        Object.values(resources).forEach((resource) => {
            const type = resource.Type;
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    }
}
exports.PerformanceTestHelpers = PerformanceTestHelpers;
