/**
 * AccessAnalyzerBinderStrategy (Unified)
 * Handles security:access-analyzer bindings with mandatory compliance enforcement
 * 
 * Supports external access detection, unused permissions analysis, IAM access analyzer,
 * findings export, and zone of trust configuration with org-wide support.
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class AccessAnalyzerBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['security:access-analyzer'];

  getStrategyName(): string {
    return 'AccessAnalyzerBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'security:access-analyzer',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Access Analyzer for external access detection, unused permissions analysis, and findings export',
        examples: ['lambda-security -> security:access-analyzer (read)', 'lambda-governance -> security:access-analyzer (admin)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for security:access-analyzer binding');
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

    return await this.bindToAccessAnalyzer(context, targetCapabilityData);
  }

  /**
   * Bind to security:access-analyzer
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - analyzerArn (required): string - Access Analyzer ARN
   *   - findingsSummary (optional): object - Findings summary (JSON)
   *   - zoneOfTrust (optional): string - Zone of trust ARN
   *   - zoneOfTrustDetail (optional): object - Zone of trust detail configuration
   *   - analyzerType (optional): string - Analyzer type (ACCOUNT_UNUSED_ACCESS, ORGANIZATION, etc.)
   *   - unusedPermissionsAnalysis (optional): object - Unused permissions analysis results
   *   - findingCount (optional): number - Total number of findings
   *   - externalAccessCount (optional): number - Number of external access findings
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToAccessAnalyzer(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.analyzerArn) {
      throw new Error('Target component missing required analyzerArn property for security:access-analyzer binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_ACCESS_ANALYZER_ARN: targetData.analyzerArn
    };

    if (targetData.findingsSummary) {
      environmentVariables.AWS_ACCESS_ANALYZER_FINDINGS_SUMMARY = JSON.stringify(targetData.findingsSummary);
    }

    if (targetData.zoneOfTrust) {
      environmentVariables.AWS_ACCESS_ANALYZER_ZONE_OF_TRUST = targetData.zoneOfTrust;
    }

    if (targetData.zoneOfTrustDetail) {
      environmentVariables.AWS_ACCESS_ANALYZER_ZONE_OF_TRUST_DETAIL = JSON.stringify(targetData.zoneOfTrustDetail);
    }

    if (targetData.analyzerType) {
      environmentVariables.AWS_ACCESS_ANALYZER_TYPE = targetData.analyzerType;
    }

    if (targetData.unusedPermissionsAnalysis) {
      environmentVariables.AWS_ACCESS_ANALYZER_UNUSED_PERMISSIONS_ANALYSIS = JSON.stringify(targetData.unusedPermissionsAnalysis);
    }

    if (targetData.findingCount !== undefined) {
      environmentVariables.AWS_ACCESS_ANALYZER_FINDING_COUNT = String(targetData.findingCount);
    }

    if (targetData.externalAccessCount !== undefined) {
      environmentVariables.AWS_ACCESS_ANALYZER_EXTERNAL_ACCESS_COUNT = String(targetData.externalAccessCount);
    }

    // IAM policies for Access Analyzer operations
    if (access === 'read' || access === 'readwrite') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'access-analyzer:GetAnalyzer',
            'access-analyzer:ListAnalyzers',
            'access-analyzer:ListFindings',
            'access-analyzer:GetFinding',
            'access-analyzer:ListFindingsV2',
            'access-analyzer:GetFindingV2'
          ],
          resources: ['*']
        }),
        description: 'Access Analyzer read access',
        complianceRequirement: 'Least privilege IAM access for Access Analyzer read operations'
      });
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'access-analyzer:CreateAnalyzer',
            'access-analyzer:UpdateAnalyzer',
            'access-analyzer:DeleteAnalyzer',
            'access-analyzer:ArchiveFindings',
            'access-analyzer:UnarchiveFindings',
            'access-analyzer:UpdateFindings',
            'access-analyzer:StartResourceScan',
            'access-analyzer:ApplyArchiveRule'
          ],
          resources: ['*']
        }),
        description: 'Access Analyzer write access',
        complianceRequirement: 'Least privilege IAM access for Access Analyzer write operations'
      });
    }

    // Admin access (full Access Analyzer permissions)
    if (access === 'admin') {
      if (options?.requireFullAdminAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['access-analyzer:*'],
            resources: ['*']
          }),
          description: 'Full Access Analyzer admin access',
          complianceRequirement: 'Admin access: Full Access Analyzer permissions (requires requireFullAdminAccess option)'
        });
      }
    }

    // Secure hooks: Auto-remediation for external access findings
    if (options?.requireSecureAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'lambda:InvokeFunction',
            'events:PutEvents',
            'events:PutRule',
            'events:PutTargets'
          ],
          resources: ['*']
        }),
        description: 'Auto-remediation integration for Access Analyzer findings',
        complianceRequirement: 'Secure access: Auto-remediation for Access Analyzer findings'
      });
    }

    // Secure hooks: Security Hub integration
    if (options?.requireSecureAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'securityhub:BatchImportFindings',
            'securityhub:BatchUpdateFindings'
          ],
          resources: ['*']
        }),
        description: 'Security Hub integration for Access Analyzer findings',
        complianceRequirement: 'Secure access: Security Hub integration for Access Analyzer findings'
      });
    }

    // Secure hooks: Findings archive automation
    if (options?.requireSecureAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'access-analyzer:ArchiveFindings',
            'access-analyzer:ApplyArchiveRule'
          ],
          resources: ['*']
        }),
        description: 'Findings archive automation for Access Analyzer',
        complianceRequirement: 'Secure access: Findings archive automation for Access Analyzer'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }
}

