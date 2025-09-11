"use strict";
/**
 * Compute to Service Connect Binding Strategy
 *
 * Universal binding strategy for connecting any compute component to
 * ECS services that provide Service Connect capability.
 * Implements the Platform ECS Service Connect Standard v1.0.
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
exports.ComputeToServiceConnectBinder = void 0;
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
/**
 * ComputeToServiceConnectBinder
 *
 * This strategy handles all inbound connections to services that provide
 * the service:connect capability. It automatically configures security group
 * rules to enable service-to-service communication.
 *
 * Strategy Key: *:service:connect (Handles any source type to service:connect)
 */
class ComputeToServiceConnectBinder {
    /**
     * Check if this strategy can handle the binding
     */
    canHandle(sourceType, targetCapability) {
        // This strategy handles any compute type binding to service:connect capability
        return targetCapability === 'service:connect';
    }
    /**
     * Execute the binding between source compute and target Service Connect service
     */
    bind(context) {
        const { source, target, directive, environment, complianceFramework } = context;
        try {
            // Get Service Connect capability information from target
            const serviceConnectCapability = target.getCapabilities()['service:connect'];
            if (!serviceConnectCapability) {
                throw new Error(`Target component ${target.node.id} does not provide service:connect capability`);
            }
            // Get security groups from both components using standardized helper
            const targetSecurityGroup = target._getSecurityGroupHandle('target');
            const sourceSecurityGroup = source._getSecurityGroupHandle('source');
            // Configure security group rules for communication
            const securityRules = this.configureSecurityGroupRules(sourceSecurityGroup, targetSecurityGroup, serviceConnectCapability, complianceFramework);
            // Build environment variables for source component
            const environmentVariables = this.buildServiceDiscoveryEnvironmentVariables(serviceConnectCapability, directive, source.node.id);
            // Configure IAM permissions directly on the source component
            this.configureIamPermissions(source, target, serviceConnectCapability, complianceFramework);
            // Return binding result (simplified - direct composition pattern)
            return {
                environmentVariables,
                metadata: {
                    targetServiceName: serviceConnectCapability.serviceName,
                    targetDnsName: serviceConnectCapability.dnsName,
                    targetEndpoint: serviceConnectCapability.internalEndpoint,
                    securityRulesCreated: securityRules.length,
                    bindingType: 'service-connect',
                    sourceSecurityGroupId: sourceSecurityGroup.securityGroupId,
                    targetSecurityGroupId: targetSecurityGroup.securityGroupId
                }
            };
        }
        catch (error) {
            throw new Error(`Failed to bind ${source.node.id} to Service Connect service ${target.node.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get compatibility matrix for this binding strategy
     */
    getCompatibilityMatrix() {
        return [
            {
                sourceType: 'lambda-api',
                targetType: 'ecs-fargate-service',
                capability: 'service:connect',
                supportedAccess: ['read', 'write'],
                description: 'Lambda function connecting to Fargate service via Service Connect'
            },
            {
                sourceType: 'lambda-worker',
                targetType: 'ecs-fargate-service',
                capability: 'service:connect',
                supportedAccess: ['read', 'write'],
                description: 'Lambda worker connecting to Fargate service via Service Connect'
            },
            {
                sourceType: 'lambda-api',
                targetType: 'ecs-ec2-service',
                capability: 'service:connect',
                supportedAccess: ['read', 'write'],
                description: 'Lambda function connecting to EC2-based ECS service via Service Connect'
            },
            {
                sourceType: 'lambda-worker',
                targetType: 'ecs-ec2-service',
                capability: 'service:connect',
                supportedAccess: ['read', 'write'],
                description: 'Lambda worker connecting to EC2-based ECS service via Service Connect'
            },
            {
                sourceType: 'ecs-fargate-service',
                targetType: 'ecs-fargate-service',
                capability: 'service:connect',
                supportedAccess: ['read', 'write'],
                description: 'Fargate service to Fargate service communication via Service Connect'
            },
            {
                sourceType: 'ecs-ec2-service',
                targetType: 'ecs-fargate-service',
                capability: 'service:connect',
                supportedAccess: ['read', 'write'],
                description: 'EC2 service to Fargate service communication via Service Connect'
            },
            {
                sourceType: 'ecs-fargate-service',
                targetType: 'ecs-ec2-service',
                capability: 'service:connect',
                supportedAccess: ['read', 'write'],
                description: 'Fargate service to EC2 service communication via Service Connect'
            },
            {
                sourceType: 'ecs-ec2-service',
                targetType: 'ecs-ec2-service',
                capability: 'service:connect',
                supportedAccess: ['read', 'write'],
                description: 'EC2 service to EC2 service communication via Service Connect'
            },
            {
                sourceType: 'ec2-instance',
                targetType: 'ecs-fargate-service',
                capability: 'service:connect',
                supportedAccess: ['read', 'write'],
                description: 'EC2 instance connecting to Fargate service via Service Connect'
            },
            {
                sourceType: 'ec2-instance',
                targetType: 'ecs-ec2-service',
                capability: 'service:connect',
                supportedAccess: ['read', 'write'],
                description: 'EC2 instance connecting to EC2-based ECS service via Service Connect'
            }
        ];
    }
    /**
     * Configure security group rules for service communication
     */
    configureSecurityGroupRules(sourceSecurityGroup, targetSecurityGroup, serviceConnectCapability, complianceFramework) {
        const rulesCreated = [];
        const port = serviceConnectCapability.port;
        // Allow traffic from source to target on the service port
        if ('addIngressRule' in targetSecurityGroup) {
            targetSecurityGroup.addIngressRule(sourceSecurityGroup, ec2.Port.tcp(port), `Allow inbound from ${sourceSecurityGroup.node?.addr || 'source'} on port ${port}`);
            rulesCreated.push(`Ingress: ${sourceSecurityGroup.securityGroupId} -> ${targetSecurityGroup.securityGroupId}:${port}`);
        }
        // For compliance frameworks, add additional restrictions
        if (complianceFramework === 'fedramp-high' || complianceFramework === 'fedramp-moderate') {
            // Could add additional security rules for compliance here
            // For example, deny rules for non-essential ports, or logging rules
        }
        return rulesCreated;
    }
    /**
     * Build environment variables for service discovery
     */
    buildServiceDiscoveryEnvironmentVariables(serviceConnectCapability, directive, sourceComponentName) {
        const envVars = {};
        // Standard Service Connect environment variables
        const serviceNameUpper = serviceConnectCapability.serviceName.toUpperCase().replace(/-/g, '_');
        const targetName = directive.to ? directive.to.toUpperCase().replace(/-/g, '_') : serviceNameUpper;
        // Service discovery endpoint
        envVars[`${targetName}_SERVICE_ENDPOINT`] = serviceConnectCapability.internalEndpoint;
        envVars[`${targetName}_SERVICE_HOST`] = serviceConnectCapability.dnsName;
        envVars[`${targetName}_SERVICE_PORT`] = serviceConnectCapability.port.toString();
        // DNS name for direct service discovery
        envVars[`${targetName}_DNS_NAME`] = serviceConnectCapability.dnsName;
        // Legacy compatibility variables
        envVars[`${serviceNameUpper}_URL`] = serviceConnectCapability.internalEndpoint;
        envVars[`${serviceNameUpper}_HOST`] = serviceConnectCapability.dnsName.split('.')[0]; // Just the service name part
        envVars[`${serviceNameUpper}_PORT`] = serviceConnectCapability.port.toString();
        // Service Connect specific variables
        envVars['SERVICE_CONNECT_ENABLED'] = 'true';
        envVars['SERVICE_DISCOVERY_NAMESPACE'] = serviceConnectCapability.dnsName.split('.').slice(1).join('.'); // namespace part
        return envVars;
    }
    /**
     * Configure IAM permissions directly on the source component for service communication
     * Uses direct composition pattern - modifies CDK constructs directly instead of returning JSON
     */
    configureIamPermissions(source, target, serviceConnectCapability, complianceFramework) {
        const sourceType = source.getType();
        try {
            // Get the IAM role from the source component
            const role = this.getIamRoleFromComponent(source, sourceType);
            if (!role) {
                // Some components might not have IAM roles (e.g., pure networking components)
                return;
            }
            // Configure Lambda-specific permissions
            if (sourceType === 'lambda-api' || sourceType === 'lambda-worker') {
                this.configureLambdaServiceConnectPermissions(role, complianceFramework);
            }
            // Configure ECS-specific permissions
            if (sourceType === 'ecs-fargate-service' || sourceType === 'ecs-ec2-service') {
                this.configureEcsServiceConnectPermissions(role, serviceConnectCapability, complianceFramework);
            }
            // Add compliance-specific permissions
            if (complianceFramework === 'fedramp-high' || complianceFramework === 'fedramp-moderate') {
                this.addComplianceServiceConnectPermissions(role, complianceFramework);
            }
        }
        catch (error) {
            // Log the error but don't fail the binding - IAM permissions might be managed externally
            console.warn(`Warning: Could not configure IAM permissions for ${source.node.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Build network access configuration for the binding
     */
    buildNetworkConfiguration(serviceConnectCapability, complianceFramework) {
        const config = {
            allowedPorts: [serviceConnectCapability.port],
            protocol: 'TCP',
            direction: 'outbound'
        };
        // For compliance frameworks, add additional network restrictions
        if (complianceFramework === 'fedramp-high' || complianceFramework === 'fedramp-moderate') {
            // Add compliance-specific network configurations
            config['requireEncryption'] = true;
            config['auditTraffic'] = true;
        }
        return config;
    }
    /**
     * Validate binding access level
     */
    validateAccess(access, serviceConnectCapability) {
        const supportedAccess = ['read', 'write'];
        if (!supportedAccess.includes(access)) {
            throw new Error(`Unsupported access level '${access}' for service:connect capability. ` +
                `Supported access levels: ${supportedAccess.join(', ')}`);
        }
        // For Service Connect, read and write typically mean the same thing (HTTP access)
        // But we could add additional validation here if needed
    }
    /**
     * Generate binding summary for logging and debugging
     */
    generateBindingSummary(source, target, serviceConnectCapability, result) {
        const sourceType = source.getType();
        const targetType = target.getType();
        const serviceName = serviceConnectCapability.serviceName;
        const endpoint = serviceConnectCapability.internalEndpoint;
        return `Service Connect binding: ${sourceType}:${source.node.id} -> ${targetType}:${target.node.id} ` +
            `(service: ${serviceName}, endpoint: ${endpoint}, env vars: ${Object.keys(result.environmentVariables || {}).length})`;
    }
    /**
     * Get IAM role from a component based on component type
     */
    getIamRoleFromComponent(component, componentType) {
        try {
            switch (componentType) {
                case 'lambda-api':
                case 'lambda-worker':
                    // Lambda functions have an execution role
                    const lambdaFunction = component.getConstruct('function');
                    return lambdaFunction?.role || null;
                case 'ecs-fargate-service':
                case 'ecs-ec2-service':
                    // ECS services have a task role
                    const taskDefinition = component.getConstruct('taskDefinition');
                    return taskDefinition?.taskRole || null;
                default:
                    // Other component types might not have IAM roles
                    return null;
            }
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Configure Lambda-specific Service Connect permissions
     */
    configureLambdaServiceConnectPermissions(role, complianceFramework) {
        // Lambda functions in VPC need ENI permissions for Service Connect
        const iam = require('aws-cdk-lib/aws-iam');
        const vpcPermissions = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
                'ec2:AttachNetworkInterface',
                'ec2:DetachNetworkInterface'
            ],
            resources: ['*'], // ENI permissions require wildcard resources
            conditions: complianceFramework === 'fedramp-high' ? {
                'StringEquals': {
                    'aws:RequestedRegion': ['us-gov-west-1', 'us-gov-east-1'] // FedRAMP regions only
                }
            } : undefined
        });
        role.addToPolicy(vpcPermissions);
        // Service Connect discovery permissions
        const serviceConnectPermissions = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'servicediscovery:DiscoverInstances',
                'servicediscovery:ListServices',
                'servicediscovery:ListInstances'
            ],
            resources: ['*'] // Service Connect requires wildcard for discovery
        });
        role.addToPolicy(serviceConnectPermissions);
    }
    /**
     * Configure ECS-specific Service Connect permissions
     */
    configureEcsServiceConnectPermissions(role, serviceConnectCapability, complianceFramework) {
        const iam = require('aws-cdk-lib/aws-iam');
        // ECS Service Connect permissions
        const serviceConnectPermissions = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'servicediscovery:DiscoverInstances',
                'servicediscovery:GetService',
                'servicediscovery:ListInstances'
            ],
            resources: [
                `arn:aws:servicediscovery:*:*:service/*`,
                `arn:aws:servicediscovery:*:*:namespace/*`
            ]
        });
        role.addToPolicy(serviceConnectPermissions);
        // CloudWatch logs permissions for service connect proxy
        const logsPermissions = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                `arn:aws:logs:*:*:log-group:/aws/ecs/service-connect/*`
            ]
        });
        role.addToPolicy(logsPermissions);
    }
    /**
     * Add compliance-specific Service Connect permissions
     */
    addComplianceServiceConnectPermissions(role, complianceFramework) {
        const iam = require('aws-cdk-lib/aws-iam');
        if (complianceFramework === 'fedramp-high') {
            // FedRAMP High requires additional audit and monitoring permissions
            const auditPermissions = new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'cloudtrail:LookupEvents',
                    'cloudwatch:PutMetricData',
                    'xray:PutTraceSegments',
                    'xray:PutTelemetryRecords'
                ],
                resources: ['*'],
                conditions: {
                    'StringEquals': {
                        'aws:RequestedRegion': ['us-gov-west-1', 'us-gov-east-1']
                    }
                }
            });
            role.addToPolicy(auditPermissions);
        }
        else if (complianceFramework === 'fedramp-moderate') {
            // FedRAMP Moderate requires monitoring permissions
            const monitoringPermissions = new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'cloudwatch:PutMetricData',
                    'xray:PutTraceSegments'
                ],
                resources: ['*']
            });
            role.addToPolicy(monitoringPermissions);
        }
    }
}
exports.ComputeToServiceConnectBinder = ComputeToServiceConnectBinder;
