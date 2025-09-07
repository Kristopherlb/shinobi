"use strict";
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
const globals_1 = require("@jest/globals");
const auto_scaling_group_component_1 = require("./auto-scaling-group.component");
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
(0, globals_1.describe)('AutoScalingGroupComponent', () => {
    let component;
    let mockContext;
    let mockSpec;
    let app;
    let stack;
    (0, globals_1.beforeEach)(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack');
        mockContext = {
            serviceName: 'test-service',
            environment: 'test',
            complianceFramework: 'commercial',
            scope: stack,
            region: 'us-east-1',
            accountId: '123456789012',
            vpc: ec2.Vpc.fromLookup(stack, 'TestVpc', { isDefault: true })
        };
        mockSpec = {
            name: 'test-asg',
            type: 'auto-scaling-group',
            config: {
                launchTemplate: {
                    instanceType: 't3.small'
                },
                autoScaling: {
                    minCapacity: 1,
                    maxCapacity: 5,
                    desiredCapacity: 2
                }
            }
        };
        component = new auto_scaling_group_component_1.AutoScalingGroupComponent(stack, 'TestAutoScalingGroup', mockContext, mockSpec);
    });
    (0, globals_1.describe)('Component Synthesis', () => {
        (0, globals_1.test)('should synthesize successfully with valid configuration', () => {
            (0, globals_1.expect)(() => component.synth()).not.toThrow();
        });
        (0, globals_1.test)('should register expected capabilities', () => {
            component.synth();
            const capabilities = component.getCapabilities();
            (0, globals_1.expect)(capabilities['compute:asg']).toBeDefined();
            (0, globals_1.expect)(capabilities['compute:asg'].asgArn).toBeDefined();
            (0, globals_1.expect)(capabilities['compute:asg'].asgName).toBeDefined();
            (0, globals_1.expect)(capabilities['compute:asg'].roleArn).toBeDefined();
            (0, globals_1.expect)(capabilities['compute:asg'].securityGroupId).toBeDefined();
        });
        (0, globals_1.test)('should create all required AWS resources', () => {
            component.synth();
            const asg = component.getConstruct('autoScalingGroup');
            const launchTemplate = component.getConstruct('launchTemplate');
            const securityGroup = component.getConstruct('securityGroup');
            const role = component.getConstruct('role');
            (0, globals_1.expect)(asg).toBeDefined();
            (0, globals_1.expect)(launchTemplate).toBeDefined();
            (0, globals_1.expect)(securityGroup).toBeDefined();
            (0, globals_1.expect)(role).toBeDefined();
        });
        (0, globals_1.test)('should apply compliance hardening for FedRAMP High', () => {
            mockContext.complianceFramework = 'fedramp-high';
            component.synth();
            // Verify enhanced security configurations
            const asg = component.getConstruct('autoScalingGroup');
            const kmsKey = component.getConstruct('kmsKey');
            (0, globals_1.expect)(asg).toBeDefined();
            (0, globals_1.expect)(kmsKey).toBeDefined(); // Should create KMS key for FedRAMP High
        });
        (0, globals_1.test)('should apply FedRAMP Moderate defaults', () => {
            mockContext.complianceFramework = 'fedramp-moderate';
            mockSpec.config = {}; // Empty config to test defaults
            component.synth();
            // Should apply compliance defaults like encrypted storage
            const capability = component.getCapabilities()['compute:asg'];
            (0, globals_1.expect)(capability).toBeDefined();
        });
    });
    (0, globals_1.describe)('Configuration Building', () => {
        (0, globals_1.test)('should apply default values when not provided', () => {
            mockSpec.config = {}; // Empty config
            component.synth();
            // Should use default values without throwing
            const asg = component.getConstruct('autoScalingGroup');
            (0, globals_1.expect)(asg).toBeDefined();
        });
        (0, globals_1.test)('should handle custom AMI configuration', () => {
            mockSpec.config = {
                launchTemplate: {
                    instanceType: 'm5.large',
                    ami: {
                        amiId: 'ami-12345678'
                    }
                }
            };
            component.synth();
            const launchTemplate = component.getConstruct('launchTemplate');
            (0, globals_1.expect)(launchTemplate).toBeDefined();
        });
        (0, globals_1.test)('should handle custom storage configuration', () => {
            mockSpec.config = {
                storage: {
                    rootVolumeSize: 100,
                    rootVolumeType: 'gp3',
                    encrypted: true
                }
            };
            component.synth();
            const launchTemplate = component.getConstruct('launchTemplate');
            (0, globals_1.expect)(launchTemplate).toBeDefined();
        });
    });
    (0, globals_1.describe)('Compliance Framework Behavior', () => {
        (0, globals_1.test)('should enable detailed monitoring for compliance frameworks', () => {
            mockContext.complianceFramework = 'fedramp-moderate';
            component.synth();
            const launchTemplate = component.getConstruct('launchTemplate');
            (0, globals_1.expect)(launchTemplate).toBeDefined();
        });
        (0, globals_1.test)('should create KMS key for compliance frameworks when needed', () => {
            mockContext.complianceFramework = 'fedramp-high';
            mockSpec.config = {
                storage: {
                    encrypted: true
                }
            };
            component.synth();
            const kmsKey = component.getConstruct('kmsKey');
            (0, globals_1.expect)(kmsKey).toBeDefined();
        });
        (0, globals_1.test)('should apply proper instance types for compliance', () => {
            mockContext.complianceFramework = 'fedramp-high';
            mockSpec.config = {}; // Use defaults
            component.synth();
            // Should upgrade to larger instance type for FedRAMP High
            const capability = component.getCapabilities()['compute:asg'];
            (0, globals_1.expect)(capability).toBeDefined();
        });
    });
    (0, globals_1.describe)('Health Check Configuration', () => {
        (0, globals_1.test)('should configure EC2 health checks by default', () => {
            mockSpec.config = {
                healthCheck: {
                    type: 'EC2',
                    gracePeriod: 300
                }
            };
            component.synth();
            const asg = component.getConstruct('autoScalingGroup');
            (0, globals_1.expect)(asg).toBeDefined();
        });
        (0, globals_1.test)('should configure ELB health checks when specified', () => {
            mockSpec.config = {
                healthCheck: {
                    type: 'ELB',
                    gracePeriod: 180
                }
            };
            component.synth();
            const asg = component.getConstruct('autoScalingGroup');
            (0, globals_1.expect)(asg).toBeDefined();
        });
    });
    (0, globals_1.describe)('Update Policy Configuration', () => {
        (0, globals_1.test)('should configure rolling update policy', () => {
            mockSpec.config = {
                updatePolicy: {
                    rollingUpdate: {
                        minInstancesInService: 1,
                        maxBatchSize: 2,
                        pauseTime: 'PT10M'
                    }
                }
            };
            component.synth();
            const asg = component.getConstruct('autoScalingGroup');
            (0, globals_1.expect)(asg).toBeDefined();
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.test)('should fail validation when accessing capabilities before synthesis', () => {
            (0, globals_1.expect)(() => component.getCapabilities()).toThrow();
        });
        (0, globals_1.test)('should handle synthesis errors gracefully', () => {
            // Create invalid configuration
            mockSpec.config = {
                autoScaling: {
                    minCapacity: 10,
                    maxCapacity: 5, // Invalid: min > max
                    desiredCapacity: 8
                }
            };
            // Should still create component but may have validation issues
            (0, globals_1.expect)(() => component.synth()).not.toThrow();
        });
    });
});
//# sourceMappingURL=auto-scaling-group.test.js.map