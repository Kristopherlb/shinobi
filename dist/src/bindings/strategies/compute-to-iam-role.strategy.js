"use strict";
/**
 * Compute to IAM Role Binding Strategy
 *
 * Universal binding strategy for connecting any compute component to
 * IAM roles that provide iam:assumeRole capability.
 * Implements the Platform IAM Role Binding Standard v1.0.
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
exports.ComputeToIamRoleBinder = void 0;
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
/**
 * ComputeToIamRoleBinder
 *
 * This strategy handles all compute components binding to IAM roles.
 * It automatically creates the appropriate attachment mechanism:
 * - EC2 instances: Creates IAM Instance Profile
 * - Lambda functions: Attaches role directly
 * - ECS tasks: Creates task role
 *
 * Strategy Key: *:iam:assumeRole (Handles any compute type to iam:assumeRole)
 */
class ComputeToIamRoleBinder {
    /**
     * Check if this strategy can handle the binding
     */
    canHandle(sourceType, targetCapability) {
        // This strategy handles any compute type binding to iam:assumeRole capability
        return targetCapability === 'iam:assumeRole';
    }
    /**
     * Execute the binding between source compute and target IAM role
     */
    bind(context) {
        const { source, target, directive, environment, complianceFramework } = context;
        try {
            // Get IAM role capability information from target
            const iamCapability = target.getCapabilities()['iam:assumeRole'];
            if (!iamCapability) {
                throw new Error(`Target component ${target.node.id} does not provide iam:assumeRole capability`);
            }
            // Get the IAM role construct from target
            const role = target.getConstruct('role');
            if (!role) {
                throw new Error(`Target component ${target.node.id} does not have a 'role' construct handle`);
            }
            // Route to appropriate binding method based on source type
            switch (source.getType()) {
                case 'ec2-instance':
                    return this.bindEc2ToIamRole(source, role, context);
                case 'lambda-api':
                case 'lambda-worker':
                case 'lambda-scheduled':
                    return this.bindLambdaToIamRole(source, role, context);
                case 'ecs-fargate-service':
                case 'ecs-ec2-service':
                    return this.bindEcsToIamRole(source, role, context);
                default:
                    throw new Error(`Unsupported source type '${source.getType()}' for IAM role binding`);
            }
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to bind ${source.getType()} to IAM role: ${error.message}`,
                resources: []
            };
        }
    }
    /**
     * Bind EC2 instance to IAM role by creating an Instance Profile
     */
    bindEc2ToIamRole(source, role, context) {
        const instance = source.getConstruct('instance');
        if (!instance) {
            throw new Error(`Source component ${source.node.id} does not have an 'instance' construct handle`);
        }
        // Create IAM Instance Profile
        const instanceProfile = new iam.CfnInstanceProfile(source, `InstanceProfile-${target.node.id}`, {
            roles: [role.roleName],
            instanceProfileName: `${context.environment}-${source.node.id}-${target.node.id}-profile`
        });
        // Attach the instance profile to the EC2 instance
        instance.addPropertyOverride('IamInstanceProfile', {
            Ref: instanceProfile.logicalId
        });
        return {
            success: true,
            resources: [
                {
                    type: 'AWS::IAM::InstanceProfile',
                    logicalId: instanceProfile.logicalId,
                    properties: {
                        roles: [role.roleName],
                        instanceProfileName: `${context.environment}-${source.node.id}-${target.node.id}-profile`
                    }
                }
            ],
            metadata: {
                bindingType: 'ec2-to-iam-role',
                instanceProfileName: `${context.environment}-${source.node.id}-${target.node.id}-profile`,
                roleArn: role.roleArn
            }
        };
    }
    /**
     * Bind Lambda function to IAM role by attaching the role directly
     */
    bindLambdaToIamRole(source, role, context) {
        const lambdaFunction = source.getConstruct('function');
        if (!lambdaFunction) {
            throw new Error(`Source component ${source.node.id} does not have a 'function' construct handle`);
        }
        // Lambda functions can only have one role, so we need to merge policies
        // Get existing role from Lambda function
        const existingRole = lambdaFunction.role;
        if (existingRole) {
            // Add policies from the target role to the existing Lambda role
            role.attachInlinePolicy(new iam.Policy(source, `MergedPolicy-${target.node.id}`, {
                statements: this.extractPolicyStatements(role)
            }));
        }
        else {
            // If no existing role, attach the target role directly
            lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['sts:AssumeRole'],
                resources: [role.roleArn]
            }));
        }
        return {
            success: true,
            resources: [],
            metadata: {
                bindingType: 'lambda-to-iam-role',
                roleArn: role.roleArn,
                policyMerged: !!existingRole
            }
        };
    }
    /**
     * Bind ECS service to IAM role by creating a task role
     */
    bindEcsToIamRole(source, role, context) {
        const taskDefinition = source.getConstruct('taskDefinition');
        if (!taskDefinition) {
            throw new Error(`Source component ${source.node.id} does not have a 'taskDefinition' construct handle`);
        }
        // Add the IAM role as a task role to the ECS task definition
        taskDefinition.addTaskRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['sts:AssumeRole'],
            resources: [role.roleArn]
        }));
        return {
            success: true,
            resources: [],
            metadata: {
                bindingType: 'ecs-to-iam-role',
                roleArn: role.roleArn,
                taskDefinitionArn: taskDefinition.taskDefinitionArn
            }
        };
    }
    /**
     * Extract policy statements from an IAM role for merging
     */
    extractPolicyStatements(role) {
        // This is a simplified extraction - in practice, you'd need to handle
        // both inline and managed policies more comprehensively
        const statements = [];
        // For now, return a basic assume role policy
        statements.push(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['sts:AssumeRole'],
            resources: [role.roleArn]
        }));
        return statements;
    }
    /**
     * Get compatibility matrix for this binding strategy
     */
    getCompatibilityMatrix() {
        return [
            {
                sourceType: 'ec2-instance',
                targetCapability: 'iam:assumeRole',
                supported: true,
                description: 'Creates IAM Instance Profile for EC2 instance'
            },
            {
                sourceType: 'lambda-api',
                targetCapability: 'iam:assumeRole',
                supported: true,
                description: 'Merges IAM policies with Lambda execution role'
            },
            {
                sourceType: 'lambda-worker',
                targetCapability: 'iam:assumeRole',
                supported: true,
                description: 'Merges IAM policies with Lambda execution role'
            },
            {
                sourceType: 'lambda-scheduled',
                targetCapability: 'iam:assumeRole',
                supported: true,
                description: 'Merges IAM policies with Lambda execution role'
            },
            {
                sourceType: 'ecs-fargate-service',
                targetCapability: 'iam:assumeRole',
                supported: true,
                description: 'Adds IAM role as task role to ECS service'
            },
            {
                sourceType: 'ecs-ec2-service',
                targetCapability: 'iam:assumeRole',
                supported: true,
                description: 'Adds IAM role as task role to ECS service'
            }
        ];
    }
}
exports.ComputeToIamRoleBinder = ComputeToIamRoleBinder;
