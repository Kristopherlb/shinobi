/**
 * Route53BinderStrategy (Unified)
 * Handles dns:route53 bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class Route53BinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['dns:route53'];

  getStrategyName(): string {
    return 'Route53BinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'dns:route53',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Route53 hosted zones and DNS records for read-only access, record management, or full administrative access',
        examples: ['lambda-dns-lookup -> dns:route53 (read)', 'lambda-dns-update -> dns:route53 (write)', 'lambda-dns-admin -> dns:route53 (admin)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for dns:route53 binding');
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

    return await this.bindToRoute53(context, targetCapabilityData);
  }

  /**
   * Bind to dns:route53
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (Route53CapabilityData):
   *   - type: 'dns:route53'
   *   - resources (required): { hostedZoneId: string, hostedZoneName?: string }
   *   - nameServers (optional): string[] - Name servers for the hosted zone
   *   - recordType (optional): string - DNS record type (A, AAAA, CNAME, etc.)
   *   - recordName (optional): string - DNS record name
   *   - recordValue (optional): string - DNS record value
   *   - ttl (optional): number - TTL in seconds
   *   - healthCheckId (optional): string - Health check ID
   *   - resolverRuleId (optional): string - Resolver rule ID
   *   - aliasTarget (optional): { dnsName: string, hostedZoneId: string, evaluateTargetHealth?: boolean } - Alias record target
   *   - failover (optional): string - Failover configuration ('PRIMARY' or 'SECONDARY')
   *   - callerReference (optional): string - Caller reference
   *   - isPrivateZone (optional): boolean - Whether the hosted zone is private
   *   - resources.hostedZoneArn (optional): string - Hosted zone ARN
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToRoute53(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.resources?.hostedZoneId) {
      throw new Error('Target component missing required resources.hostedZoneId property for Route53 binding');
    }

    const { directive } = context;
    const { access } = directive;

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};
    const hostedZoneId = targetData.resources.hostedZoneId;
    const hostedZoneArn = `arn:aws:route53:::hostedzone/${hostedZoneId}`;

    // Determine IAM actions based on access level
    let actions: string[] = [];
    
    if (access === 'read' || access === 'readwrite' || access === 'admin') {
      // Read access: Get hosted zone and record information
      actions.push(
        'route53:GetHostedZone',
        'route53:ListHostedZones',
        'route53:ListResourceRecordSets',
        'route53:GetChange',
        'route53:ListTagsForResource',
        'route53:ListTagsForResources',
        'route53:GetHostedZoneCount',
        'route53:ListHostedZonesByName',
        'route53:TestDNSAnswer',
        'route53:GetHealthCheck',
        'route53:ListHealthChecks',
        'route53:GetHealthCheckStatus',
        'route53:ListResourceRecordSets',
        'route53:GetHostedZone',
        'route53:ListResolverRules',
        'route53:GetResolverRule',
        'route53:ListResolverRuleAssociations'
      );
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      // Write access: Manage DNS records
      actions.push(
        'route53:ChangeResourceRecordSets',
        'route53:ChangeTagsForResource',
        'route53:CreateHealthCheck',
        'route53:UpdateHealthCheck',
        'route53:DeleteHealthCheck',
        'route53:ChangeHealthCheckStatus'
      );
    }

    if (access === 'admin') {
      // Admin access: Full control including create/delete hosted zones
      // TODO: Consider gating CreateHostedZone/DeleteHostedZone behind an option for safety
      actions.push(
        'route53:CreateHostedZone',
        'route53:DeleteHostedZone',
        'route53:UpdateHostedZoneComment',
        'route53:AssociateVPCWithHostedZone',
        'route53:DisassociateVPCFromHostedZone',
        'route53:CreateReusableDelegationSet',
        'route53:DeleteReusableDelegationSet',
        'route53:ListReusableDelegationSets',
        'route53:CreateResolverRule',
        'route53:DeleteResolverRule',
        'route53:AssociateResolverRule',
        'route53:DisassociateResolverRule'
      );
    }

    // Create IAM policy
    if (actions.length > 0) {
      // Route53 uses hosted zone ARNs for resource-level permissions
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [...new Set(actions)], // Remove duplicates
          resources: [hostedZoneArn]
        }),
        description: `Route53 hosted zone ${access} access`,
        complianceRequirement: `Least privilege IAM access for Route53 hosted zone ${access} operations`
      });
    }

    // Set environment variables
    environmentVariables['ROUTE53_HOSTED_ZONE_ID'] = hostedZoneId;
    
    if (targetData.resources.hostedZoneName) {
      environmentVariables['ROUTE53_HOSTED_ZONE_NAME'] = targetData.resources.hostedZoneName;
    }
    
    if (targetData.nameServers && Array.isArray(targetData.nameServers)) {
      environmentVariables['ROUTE53_NAME_SERVERS'] = targetData.nameServers.join(',');
      environmentVariables['ROUTE53_NAME_SERVER_COUNT'] = targetData.nameServers.length.toString();
    }
    
    if (targetData.recordType) {
      environmentVariables['ROUTE53_RECORD_TYPE'] = targetData.recordType;
    }
    
    if (targetData.recordName) {
      environmentVariables['ROUTE53_RECORD_NAME'] = targetData.recordName;
    }
    
    if (targetData.recordValue) {
      environmentVariables['ROUTE53_RECORD_VALUE'] = targetData.recordValue;
    }
    
    if (targetData.ttl !== undefined) {
      environmentVariables['ROUTE53_TTL'] = targetData.ttl.toString();
    }
    
    // Health check ID
    if (targetData.healthCheckId) {
      environmentVariables['ROUTE53_HEALTH_CHECK_ID'] = targetData.healthCheckId;
    }
    
    // Resolver rule ID
    if (targetData.resolverRuleId) {
      environmentVariables['ROUTE53_RESOLVER_RULE_ID'] = targetData.resolverRuleId;
    }
    
    // Alias record target
    if (targetData.aliasTarget) {
      if (targetData.aliasTarget.dnsName) {
        environmentVariables['ROUTE53_ALIAS_TARGET_DNS_NAME'] = targetData.aliasTarget.dnsName;
      }
      if (targetData.aliasTarget.hostedZoneId) {
        environmentVariables['ROUTE53_ALIAS_TARGET_HOSTED_ZONE_ID'] = targetData.aliasTarget.hostedZoneId;
      }
      if (targetData.aliasTarget.evaluateTargetHealth !== undefined) {
        environmentVariables['ROUTE53_ALIAS_EVALUATE_TARGET_HEALTH'] = targetData.aliasTarget.evaluateTargetHealth.toString();
      }
    }
    
    // Failover configuration
    if (targetData.failover) {
      environmentVariables['ROUTE53_FAILOVER'] = targetData.failover; // PRIMARY or SECONDARY
    }
    
    // Caller reference
    if (targetData.callerReference) {
      environmentVariables['ROUTE53_CALLER_REFERENCE'] = targetData.callerReference;
    }
    
    // Private zone flag
    if (targetData.isPrivateZone !== undefined) {
      environmentVariables['ROUTE53_IS_PRIVATE_ZONE'] = targetData.isPrivateZone.toString();
    }
    
    // Hosted zone ARN (for reference)
    if (targetData.resources.hostedZoneArn) {
      environmentVariables['ROUTE53_HOSTED_ZONE_ARN'] = targetData.resources.hostedZoneArn;
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [],
    };
  }
}

