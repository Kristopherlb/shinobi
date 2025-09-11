"use strict";
/**
 * Compute to Security Group Import Binding Strategy
 *
 * Universal binding strategy for connecting any compute component to
 * imported security groups that provide security-group:import capability.
 * Implements the Platform Security Group Import Binding Standard v1.0.
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
exports.ComputeToSecurityGroupImportBinder = void 0;
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
/**
 * ComputeToSecurityGroupImportBinder
 *
 * This strategy handles all compute components binding to imported security groups.
 * It automatically adds the imported security group to the compute component's
 * security groups list.
 *
 * Strategy Key: *:security-group:import (Handles any compute type to security-group:import)
 */
class ComputeToSecurityGroupImportBinder {
    /**
     * Check if this strategy can handle the binding
     */
    canHandle(sourceType, targetCapability) {
        // This strategy handles any compute type binding to security-group:import capability
        return targetCapability === 'security-group:import';
    }
    /**
     * Execute the binding between source compute and target imported security group
     */
    bind(context) {
        const { source, target, directive, environment, complianceFramework } = context;
        try {
            // Get security group import capability information from target
            const sgCapability = target.getCapabilities()['security-group:import'];
            if (!sgCapability) {
                throw new Error(`Target component ${target.node.id} does not provide security-group:import capability`);
            }
            // Get the imported security group construct from target
            const securityGroup = target.getConstruct('securityGroup');
            if (!securityGroup) {
                throw new Error(`Target component ${target.node.id} does not have a 'securityGroup' construct handle`);
            }
            // Route to appropriate binding method based on source type
            switch (source.getType()) {
                case 'ec2-instance':
                    return this.bindEc2ToSecurityGroup(source, securityGroup, context);
                case 'lambda-api':
                case 'lambda-worker':
                case 'lambda-scheduled':
                    return this.bindLambdaToSecurityGroup(source, securityGroup, context);
                case 'ecs-fargate-service':
                case 'ecs-ec2-service':
                    return this.bindEcsToSecurityGroup(source, securityGroup, context);
                default:
                    throw new Error(`Unsupported source type '${source.getType()}' for security group import binding`);
            }
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to bind ${source.getType()} to imported security group: ${error.message}`,
                resources: []
            };
        }
    }
    /**
     * Bind EC2 instance to imported security group
     */
    bindEc2ToSecurityGroup(source, securityGroup, context) {
        const instance = source.getConstruct('instance');
        if (!instance) {
            throw new Error(`Source component ${source.node.id} does not have an 'instance' construct handle`);
        }
        // Add the imported security group to the EC2 instance
        instance.addSecurityGroup(securityGroup);
        return {
            success: true,
            resources: [],
            metadata: {
                bindingType: 'ec2-to-security-group-import',
                securityGroupId: securityGroup.securityGroupId,
                vpcId: securityGroup.vpc?.vpcId
            }
        };
    }
    /**
     * Bind Lambda function to imported security group (VPC configuration)
     */
    bindLambdaToSecurityGroup(source, securityGroup, context) {
        const lambdaFunction = source.getConstruct('function');
        if (!lambdaFunction) {
            throw new Error(`Source component ${source.node.id} does not have a 'function' construct handle`);
        }
        // Lambda functions need to be in a VPC to use security groups
        // Add the security group to the Lambda's VPC configuration
        if (lambdaFunction.isBoundToVpc()) {
            lambdaFunction.connections.addSecurityGroup(securityGroup);
        }
        else {
            // If Lambda is not in a VPC, we need to configure it to be in the same VPC as the security group
            if (securityGroup.vpc) {
                lambdaFunction.addToRolePolicy(new lambda.PolicyStatement({
                    effect: lambda.Effect.ALLOW,
                    actions: [
                        'ec2:CreateNetworkInterface',
                        'ec2:DescribeNetworkInterfaces',
                        'ec2:DeleteNetworkInterface'
                    ],
                    resources: [`arn:aws:ec2:${context.region}:${context.account}:vpc/${securityGroup.vpc.vpcId}`]
                }));
            }
        }
        return {
            success: true,
            resources: [],
            metadata: {
                bindingType: 'lambda-to-security-group-import',
                securityGroupId: securityGroup.securityGroupId,
                vpcId: securityGroup.vpc?.vpcId,
                requiresVpc: !lambdaFunction.isBoundToVpc()
            }
        };
    }
    /**
     * Bind ECS service to imported security group
     */
    bindEcsToSecurityGroup(source, securityGroup, context) {
        const service = source.getConstruct('service');
        if (!service) {
            throw new Error(`Source component ${source.node.id} does not have a 'service' construct handle`);
        }
        // Add the imported security group to the ECS service
        service.connections.addSecurityGroup(securityGroup);
        return {
            success: true,
            resources: [],
            metadata: {
                bindingType: 'ecs-to-security-group-import',
                securityGroupId: securityGroup.securityGroupId,
                vpcId: securityGroup.vpc?.vpcId,
                serviceArn: service.serviceArn
            }
        };
    }
    /**
     * Get compatibility matrix for this binding strategy
     */
    getCompatibilityMatrix() {
        return [
            {
                sourceType: 'ec2-instance',
                targetCapability: 'security-group:import',
                supported: true,
                description: 'Adds imported security group to EC2 instance security groups'
            },
            {
                sourceType: 'lambda-api',
                targetCapability: 'security-group:import',
                supported: true,
                description: 'Configures Lambda VPC access to use imported security group'
            },
            {
                sourceType: 'lambda-worker',
                targetCapability: 'security-group:import',
                supported: true,
                description: 'Configures Lambda VPC access to use imported security group'
            },
            {
                sourceType: 'lambda-scheduled',
                targetCapability: 'security-group:import',
                supported: true,
                description: 'Configures Lambda VPC access to use imported security group'
            },
            {
                sourceType: 'ecs-fargate-service',
                targetCapability: 'security-group:import',
                supported: true,
                description: 'Adds imported security group to ECS Fargate service'
            },
            {
                sourceType: 'ecs-ec2-service',
                targetCapability: 'security-group:import',
                supported: true,
                description: 'Adds imported security group to ECS EC2 service'
            }
        ];
    }
}
exports.ComputeToSecurityGroupImportBinder = ComputeToSecurityGroupImportBinder;
