/**
 * Cross-Stack Security Group Rule Manager
 *
 * Manages security group rules that need to be applied across different CDK stacks.
 * Enables Service A to add rules to Service B's security group without requiring
 * Service B to be redeployed.
 *
 * Architecture:
 * - Stores rule specifications in SSM Parameter Store (or S3)
 * - Separate "network-rules" stack reads all rule specs and applies them
 * - Handles rule conflicts and deduplication
 * - Supports rule removal when bindings are deleted
 *
 * This manager works in conjunction with SecurityGroupRulePostProcessor (SG-006).
 */
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import { CfnSecurityGroupIngress, CfnSecurityGroupEgress } from 'aws-cdk-lib/aws-ec2';
/**
 * Rule storage key format in SSM Parameter Store
 * Format: /shinobi/network-rules/{service}/{bindingId}
 *
 * Both serviceName and bindingId are sanitized to ensure valid SSM parameter names.
 * SSM parameter names can only contain: .-_/ and alphanumeric characters.
 * SSM parameter names have a 2048 character limit.
 */
function getRuleStorageKey(serviceName, bindingId) {
    // Sanitize both serviceName and bindingId - SSM only allows .-_/ and alphanumeric
    const sanitizedServiceName = serviceName.replace(/[^a-zA-Z0-9.\-_/]/g, '-');
    const sanitizedBindingId = bindingId.replace(/[^a-zA-Z0-9.\-_/]/g, '-');
    const parameterKey = `/shinobi/network-rules/${sanitizedServiceName}/${sanitizedBindingId}`;
    // Validate length (SSM parameter names have 2048 char limit)
    // Warn at 2000 to leave room for path and provide early warning
    if (parameterKey.length > 2000) {
        console.warn(`[CrossStackRuleManager] SSM parameter name exceeds 2000 chars (${parameterKey.length}): ${parameterKey.substring(0, 100)}... ` +
            `Consider shortening service name or binding ID. SSM limit is 2048 characters.`);
    }
    return parameterKey;
}
/**
 * Cross-Stack Rule Manager
 *
 * Manages storage and retrieval of cross-stack security group rules.
 */
export class CrossStackRuleManager {
    /**
     * Store cross-stack rule specification
     *
     * @param stack - CDK stack to add SSM parameter to
     * @param serviceName - Source service name
     * @param ruleSpec - Rule specification to store
     */
    static storeRuleSpec(stack, serviceName, ruleSpec) {
        // getRuleStorageKey() handles sanitization of both serviceName and bindingId
        // SSM only allows .-_/ and alphanumeric characters in parameter names
        const parameterKey = getRuleStorageKey(serviceName, ruleSpec.bindingId);
        // Store rule spec as JSON in SSM Parameter Store
        new ssm.StringParameter(stack, `CrossStackRule-${ruleSpec.ruleId}`, {
            parameterName: parameterKey,
            stringValue: JSON.stringify(ruleSpec),
            description: `Cross-stack security group rule: ${ruleSpec.sourceComponent} -> ${ruleSpec.targetComponent}`,
            tier: ssm.ParameterTier.STANDARD
        });
    }
    /**
     * Deduplicate rules based on content (peer, port, protocol, type)
     *
     * @param specs - Array of rule specifications
     * @returns Deduplicated array of rule specifications
     */
    static deduplicateRules(specs) {
        const seen = new Map();
        for (const spec of specs) {
            const key = this.getRuleKey(spec.rule);
            if (!seen.has(key)) {
                seen.set(key, spec);
            }
            else {
                // Rule already exists - keep the first one, log conflict with full metadata
                const existingSpec = seen.get(key);
                console.warn(`[CrossStackRuleManager] Duplicate rule detected for SG ${spec.targetSecurityGroupId}. ` +
                    `Keeping first occurrence: bindingId=${existingSpec.bindingId}, ` +
                    `source=${existingSpec.sourceComponent}->${existingSpec.targetComponent}. ` +
                    `Conflicting rule ignored: bindingId=${spec.bindingId}, ` +
                    `source=${spec.sourceComponent}->${spec.targetComponent}. ` +
                    `Rule: ${spec.rule.type} ${spec.rule.peer.kind} ${spec.rule.port.protocol}:${spec.rule.port.from}-${spec.rule.port.to}`);
            }
        }
        return Array.from(seen.values());
    }
    /**
     * Generate a unique key for a rule based on its content
     *
     * @param rule - Security group rule
     * @returns Unique key string
     */
    static getRuleKey(rule) {
        const peerKey = rule.peer.kind === 'sg'
            ? `sg:${rule.peer.id}`
            : `cidr:${rule.peer.cidr}`;
        return `${rule.type}-${peerKey}-${rule.port.protocol}-${rule.port.from}-${rule.port.to}`;
    }
    /**
     * Apply a rule to a security group via CDK construct
     *
     * @param spec - Rule specification
     * @param targetSecurityGroupId - Target security group ID
     * @param stack - CDK stack
     */
    static applyRuleToSecurityGroup(spec, targetSecurityGroupId, stack) {
        // Create unique construct ID
        const constructId = `CrossStackSGRule-${spec.ruleId}`;
        // Prepare peer configuration
        let peerConfig;
        if (spec.rule.peer.kind === 'sg') {
            peerConfig = {
                sourceSecurityGroupId: spec.rule.peer.id
            };
        }
        else if (spec.rule.peer.kind === 'cidr') {
            peerConfig = {
                cidrIp: spec.rule.peer.cidr
            };
        }
        else {
            throw new Error(`Unknown peer kind: ${spec.rule.peer.kind}`);
        }
        // Create CDK construct based on rule type
        if (spec.rule.type === 'ingress') {
            new CfnSecurityGroupIngress(stack, constructId, {
                groupId: targetSecurityGroupId,
                ipProtocol: spec.rule.port.protocol,
                fromPort: spec.rule.port.from,
                toPort: spec.rule.port.to,
                description: `${spec.rule.description} (from ${spec.sourceComponent})`,
                ...peerConfig
            });
        }
        else if (spec.rule.type === 'egress') {
            new CfnSecurityGroupEgress(stack, constructId, {
                groupId: targetSecurityGroupId,
                ipProtocol: spec.rule.port.protocol,
                fromPort: spec.rule.port.from,
                toPort: spec.rule.port.to,
                description: `${spec.rule.description} (from ${spec.sourceComponent})`,
                ...peerConfig
            });
        }
        else {
            throw new Error(`Unknown rule type: ${spec.rule.type}`);
        }
    }
    /**
     * Get SSM parameter path prefix for all network rules
     *
     * @returns SSM parameter path prefix
     */
    static getRulePathPrefix() {
        return '/shinobi/network-rules';
    }
    /**
     * Get all rule storage keys for a service
     *
     * @param serviceName - Service name
     * @returns Array of SSM parameter keys for this service's rules
     */
    static getRuleKeysForService(serviceName) {
        // This would need to query SSM at runtime to get all parameters
        // For CDK synthesis, we can't query SSM directly
        // This is a helper for documentation/runtime scripts
        return [];
    }
    /**
     * Mark rule for deletion (when binding is removed)
     *
     * Creates a Custom Resource that deletes the SSM parameter, which will cause
     * the rule to be removed in the next network-rules stack deployment.
     *
     * **Trade-off: Delayed Revocation**
     * Rules remain active until the network-rules stack is redeployed after this
     * SSM parameter is deleted. This provides eventual consistency and is acceptable
     * for most use cases. For immediate revocation, see SG-011 (EventBridge-triggered cleanup).
     *
     * @param stack - CDK stack
     * @param serviceName - Source service name (will be sanitized)
     * @param bindingId - Binding ID to remove (will be sanitized)
     */
    static markRuleForDeletion(stack, serviceName, bindingId) {
        const parameterKey = getRuleStorageKey(serviceName, bindingId);
        const sanitizedBindingId = bindingId.replace(/[^a-zA-Z0-9.\-_/]/g, '-');
        const constructId = `DeleteCrossStackRule-${sanitizedBindingId}`;
        // Create Lambda function for deleting SSM parameter
        const deleteFunction = new lambda.Function(stack, `${constructId}-Function`, {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`
import boto3
import cfnresponse

def handler(event, context):
    ssm = boto3.client('ssm')
    parameter_name = event['ResourceProperties']['ParameterName']
    request_type = event['RequestType']
    
    try:
        if request_type == 'Create' or request_type == 'Update':
            # Delete the SSM parameter when Custom Resource is created/updated
            # This marks the binding rule for deletion
            try:
                ssm.delete_parameter(Name=parameter_name)
                print(f'Deleted SSM parameter: {parameter_name}')
            except ssm.exceptions.ParameterNotFound:
                # Parameter already deleted or doesn't exist - that's fine
                print(f'Parameter {parameter_name} not found, already deleted or never existed')
            
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
        elif request_type == 'Delete':
            # Custom Resource is being deleted - nothing to do
            # The SSM parameter was already deleted on Create/Update
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
        else:
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
    except Exception as e:
        print(f'Error: {str(e)}')
        cfnresponse.send(event, context, cfnresponse.FAILED, {})
      `),
            timeout: cdk.Duration.seconds(30),
            description: `Deletes SSM parameter for cross-stack security group rule: ${bindingId}`
        });
        // Grant permission to delete SSM parameter
        deleteFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ssm:DeleteParameter',
                'ssm:GetParameter'
            ],
            resources: [
                `arn:aws:ssm:${stack.region}:${stack.account}:parameter${parameterKey}`
            ]
        }));
        // Create Provider and Custom Resource to trigger deletion
        const provider = new cr.Provider(stack, `${constructId}-Provider`, {
            onEventHandler: deleteFunction
        });
        new cdk.CustomResource(stack, constructId, {
            serviceToken: provider.serviceToken,
            properties: {
                ParameterName: parameterKey
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        // Log for debugging
        console.info(`[CrossStackRuleManager] Rule marked for deletion: ${parameterKey}. ` +
            `Custom Resource will delete SSM parameter on stack deployment.`);
    }
    /**
     * Create network-rules stack from rule specs
     *
     * **DEPRECATED**: This method is deprecated. Use the `network-rules-stack` component instead.
     * Declare it in your service manifest:
     * ```yaml
     * components:
     *   - name: network-rules-stack
     *     type: network-rules-stack
     *     config:
     *       ssmPathPrefix: "/shinobi/network-rules"
     * ```
     *
     * This method is kept for backward compatibility and testing purposes only.
     *
     * @deprecated Use the `network-rules-stack` component instead. See `@shinobi/components-network-rules-stack`.
     * @param app - CDK app
     * @param ruleSpecs - Array of rule specifications to apply (read from SSM at runtime)
     * @param stackName - Name for the network rules stack
     * @returns CDK stack with rule constructs
     */
    static createNetworkRulesStack(app, ruleSpecs, stackName = 'NetworkRulesStack') {
        const stack = new cdk.Stack(app, stackName, {
            description: 'Cross-stack security group rules - applies rules from all services',
            tags: {
                ManagedBy: 'shinobi',
                Purpose: 'cross-stack-security-group-rules'
            }
        });
        // Group rules by target security group
        const rulesByTarget = new Map();
        for (const spec of ruleSpecs) {
            const targetId = spec.targetSecurityGroupId;
            if (!rulesByTarget.has(targetId)) {
                rulesByTarget.set(targetId, []);
            }
            rulesByTarget.get(targetId).push(spec);
        }
        // Apply rules to each target security group
        for (const [targetSecurityGroupId, specs] of rulesByTarget.entries()) {
            // Deduplicate rules (same peer, port, protocol, type)
            const uniqueRules = this.deduplicateRules(specs);
            for (const spec of uniqueRules) {
                this.applyRuleToSecurityGroup(spec, targetSecurityGroupId, stack);
            }
        }
        return stack;
    }
}
//# sourceMappingURL=cross-stack-rule-manager.js.map