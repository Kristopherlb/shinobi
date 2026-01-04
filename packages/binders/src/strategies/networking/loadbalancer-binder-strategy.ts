/**
 * LoadBalancerBinderStrategy (Unified)
 * Handles network:load-balancer bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class LoadBalancerBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['network:load-balancer'];

  getStrategyName(): string {
    return 'LoadBalancerBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'network:load-balancer',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Application Load Balancers (ALB) or Network Load Balancers (NLB) for read-only access, target management, or full administrative access',
        examples: ['lambda-monitoring -> network:load-balancer (read)', 'lambda-automation -> network:load-balancer (write)', 'lambda-admin -> network:load-balancer (admin)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for network:load-balancer binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    return await this.bindToLoadBalancer(context, targetCapabilityData);
  }

  /**
   * Bind to network:load-balancer
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (LoadBalancerCapabilityData):
   *   - type: 'network:load-balancer'
   *   - resources (required): { loadBalancerArn: string, loadBalancerName?: string, dnsName?: string }
   *   - type (optional): string - Load balancer type ('application', 'network', 'classic')
   *   - scheme (optional): string - Scheme ('internet-facing', 'internal')
   *   - vpcId (optional): string - VPC ID
   *   - state (optional): string - Load balancer state
   *   - targetGroupArns (optional): string[] - Target group ARNs
   *   - listenerArns (optional): string[] - Listener ARNs
   *   - listenerRuleArns (optional): string[] - Listener rule ARNs
   *   - certificateArns (optional): string[] - Certificate ARNs
   *   - wafWebAclArn (optional): string - WAF WebACL ARN
   *   - securityGroupIds (optional): string[] - Security group IDs (for VPC-linked LBs)
   *   - subnetIds (optional): string[] - Subnet IDs (for VPC-linked LBs)
   *   - accessLogS3Bucket (optional): string - S3 bucket for access logs
   *   - accessLogS3Prefix (optional): string - S3 prefix for access logs
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToLoadBalancer(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.resources?.loadBalancerArn) {
      throw new Error('Target component missing required resources.loadBalancerArn property for Load Balancer binding');
    }

    const { directive } = context;
    const { access } = directive;

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};
    const loadBalancerArn = targetData.resources.loadBalancerArn;

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getLoadBalancerActionsForAccess(acc),
      'elasticloadbalancing'
    );

    // Create IAM policy
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [loadBalancerArn]
        }),
        description: `Load Balancer ${access} access`,
        complianceRequirement: `Least privilege IAM access for Load Balancer ${access} operations`
      });

      // Add target group permissions if target groups are specified
      if (targetData.targetGroupArns && Array.isArray(targetData.targetGroupArns) && targetData.targetGroupArns.length > 0) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: access === 'read' || access === 'readwrite' || access === 'admin'
              ? ['elasticloadbalancing:DescribeTargetGroups', 'elasticloadbalancing:DescribeTargetHealth']
              : access === 'write' || access === 'readwrite' || access === 'admin'
              ? ['elasticloadbalancing:RegisterTargets', 'elasticloadbalancing:DeregisterTargets', 'elasticloadbalancing:ModifyTargetGroup']
              : [],
            resources: targetData.targetGroupArns
          }),
          description: `Load Balancer target group ${access} access`,
          complianceRequirement: `Least privilege IAM access for Load Balancer target groups`
        });
      }
    }

    // Set environment variables
    environmentVariables['LOAD_BALANCER_ARN'] = loadBalancerArn;
    
    if (targetData.resources.loadBalancerName) {
      environmentVariables['LOAD_BALANCER_NAME'] = targetData.resources.loadBalancerName;
    }
    
    if (targetData.resources.dnsName) {
      environmentVariables['LOAD_BALANCER_DNS_NAME'] = targetData.resources.dnsName;
    }
    
    if (targetData.type) {
      environmentVariables['LOAD_BALANCER_TYPE'] = targetData.type;
    }
    
    if (targetData.scheme) {
      environmentVariables['LOAD_BALANCER_SCHEME'] = targetData.scheme;
    }
    
    if (targetData.vpcId) {
      environmentVariables['LOAD_BALANCER_VPC_ID'] = targetData.vpcId;
    }
    
    if (targetData.state) {
      environmentVariables['LOAD_BALANCER_STATE'] = targetData.state;
    }
    
    if (targetData.targetGroupArns && Array.isArray(targetData.targetGroupArns)) {
      environmentVariables['LOAD_BALANCER_TARGET_GROUP_ARNS'] = targetData.targetGroupArns.join(',');
      environmentVariables['LOAD_BALANCER_TARGET_GROUP_COUNT'] = targetData.targetGroupArns.length.toString();
    }
    
    if (targetData.listenerArns && Array.isArray(targetData.listenerArns)) {
      environmentVariables['LOAD_BALANCER_LISTENER_ARNS'] = targetData.listenerArns.join(',');
      environmentVariables['LOAD_BALANCER_LISTENER_COUNT'] = targetData.listenerArns.length.toString();
    }
    
    // Listener rule ARNs
    if (targetData.listenerRuleArns && Array.isArray(targetData.listenerRuleArns)) {
      environmentVariables['LOAD_BALANCER_LISTENER_RULE_ARNS'] = targetData.listenerRuleArns.join(',');
      environmentVariables['LOAD_BALANCER_LISTENER_RULE_COUNT'] = targetData.listenerRuleArns.length.toString();
    }
    
    // Certificate ARNs
    if (targetData.certificateArns && Array.isArray(targetData.certificateArns)) {
      environmentVariables['LOAD_BALANCER_CERTIFICATE_ARNS'] = targetData.certificateArns.join(',');
    }
    
    // WAF WebACL ARN
    if (targetData.wafWebAclArn) {
      environmentVariables['LOAD_BALANCER_WAF_WEB_ACL_ARN'] = targetData.wafWebAclArn;
    }
    
    // Security groups (for VPC-linked LBs)
    if (targetData.securityGroupIds && Array.isArray(targetData.securityGroupIds)) {
      environmentVariables['LOAD_BALANCER_SECURITY_GROUP_IDS'] = targetData.securityGroupIds.join(',');
    }
    
    // Subnets (for VPC-linked LBs)
    if (targetData.subnetIds && Array.isArray(targetData.subnetIds)) {
      environmentVariables['LOAD_BALANCER_SUBNET_IDS'] = targetData.subnetIds.join(',');
    }
    
    // Access log configuration
    if (targetData.accessLogS3Bucket) {
      environmentVariables['LOAD_BALANCER_ACCESS_LOG_S3_BUCKET'] = targetData.accessLogS3Bucket;
    }
    if (targetData.accessLogS3Prefix) {
      environmentVariables['LOAD_BALANCER_ACCESS_LOG_S3_PREFIX'] = targetData.accessLogS3Prefix;
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [],
    };
  }

  /**
   * Get Load Balancer actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getLoadBalancerActionsForAccess(access: string): string[] {
    const actions: string[] = [];
    
    if (access === 'read' || access === 'readwrite' || access === 'admin') {
      // Read access: Describe load balancers and related resources
      actions.push(
        'elasticloadbalancing:DescribeLoadBalancers',
        'elasticloadbalancing:DescribeLoadBalancerAttributes',
        'elasticloadbalancing:DescribeTargetGroups',
        'elasticloadbalancing:DescribeTargetGroupAttributes',
        'elasticloadbalancing:DescribeTargetHealth',
        'elasticloadbalancing:DescribeListeners',
        'elasticloadbalancing:DescribeListenerCertificates',
        'elasticloadbalancing:DescribeRules',
        'elasticloadbalancing:DescribeTags',
        'elasticloadbalancing:DescribeAccountLimits',
        'elasticloadbalancing:DescribeSSLPolicies',
        'wafv2:GetWebACL',
        'wafv2:GetWebACLForResource'
      );
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      // Write access: Manage targets and attributes
      actions.push(
        'elasticloadbalancing:RegisterTargets',
        'elasticloadbalancing:DeregisterTargets',
        'elasticloadbalancing:ModifyLoadBalancerAttributes',
        'elasticloadbalancing:ModifyTargetGroup',
        'elasticloadbalancing:ModifyTargetGroupAttributes',
        'elasticloadbalancing:ModifyListener',
        'elasticloadbalancing:ModifyRule',
        'elasticloadbalancing:SetRulePriorities',
        'elasticloadbalancing:AddTags',
        'elasticloadbalancing:RemoveTags'
      );
    }

    if (access === 'admin') {
      // Admin access: Full control including create/delete
      // TODO: Consider gating CreateLoadBalancer/DeleteLoadBalancer behind an option for safety
      actions.push(
        'elasticloadbalancing:CreateLoadBalancer',
        'elasticloadbalancing:DeleteLoadBalancer',
        'elasticloadbalancing:CreateTargetGroup',
        'elasticloadbalancing:DeleteTargetGroup',
        'elasticloadbalancing:CreateListener',
        'elasticloadbalancing:DeleteListener',
        'elasticloadbalancing:CreateRule',
        'elasticloadbalancing:DeleteRule',
        'elasticloadbalancing:AddListenerCertificates',
        'elasticloadbalancing:RemoveListenerCertificates',
        'elasticloadbalancing:SetSecurityGroups',
        'elasticloadbalancing:SetSubnets',
        'wafv2:AssociateWebACL',
        'wafv2:DisassociateWebACL',
        'elasticloadbalancing:ModifyLoadBalancerAttributes'
      );
    }

    return [...new Set(actions)]; // Remove duplicates
  }
}

