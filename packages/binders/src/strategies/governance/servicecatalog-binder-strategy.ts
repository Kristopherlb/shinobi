/**
 * ServiceCatalogBinderStrategy (Unified)
 * Handles catalog:portfolio bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class ServiceCatalogBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['catalog:portfolio'];

  getStrategyName(): string {
    return 'ServiceCatalogBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'catalog:portfolio',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to Service Catalog portfolios for standardized product provisioning',
        examples: ['lambda-governance -> catalog:portfolio (read)', 'lambda-catalog -> catalog:portfolio (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for catalog:portfolio binding');
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

    return await this.bindToPortfolio(context, targetCapabilityData);
  }

  /**
   * Bind to catalog:portfolio
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - portfolioArn (required): string - Portfolio ARN
   *   - portfolioId (optional): string - Portfolio ID
   *   - portfolioName (optional): string - Portfolio name
   *   - productId (optional): string - Product ID
   *   - provisioningArtifactId (optional): string - Provisioning artifact ID
   *   - orgId (optional): string - Organization ID (for OU-level portfolios)
   *   - constraintId (optional): string - Constraint ID (launch, notification, template, stackset)
   *   - tagOptionId (optional): string - Tag option ID
   *   - launchRoleArn (optional): string - Launch role ARN
   *   - principalArn (optional): string - Principal ARN (for principal association)
   *   - acceptedPortfolioStatus (optional): string - Accepted portfolio status
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToPortfolio(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.portfolioArn) {
      throw new Error('Target component missing required portfolioArn property for catalog:portfolio binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_SERVICE_CATALOG_PORTFOLIO_ARN: targetData.portfolioArn
    };

    if (targetData.portfolioId) {
      environmentVariables.AWS_SERVICE_CATALOG_PORTFOLIO_ID = targetData.portfolioId;
    }

    if (targetData.portfolioName) {
      environmentVariables.AWS_SERVICE_CATALOG_PORTFOLIO_NAME = targetData.portfolioName;
    }

    if (targetData.productId) {
      environmentVariables.AWS_SERVICE_CATALOG_PRODUCT_ID = targetData.productId;
    }

    if (targetData.provisioningArtifactId) {
      environmentVariables.AWS_SERVICE_CATALOG_PROVISIONING_ARTIFACT_ID = targetData.provisioningArtifactId;
    }

    if (targetData.orgId) {
      environmentVariables.AWS_ORGANIZATIONS_ID = targetData.orgId;
    }

    if (targetData.constraintId) {
      environmentVariables.AWS_SERVICE_CATALOG_CONSTRAINT_ID = targetData.constraintId;
    }

    if (targetData.tagOptionId) {
      environmentVariables.AWS_SERVICE_CATALOG_TAG_OPTION_ID = targetData.tagOptionId;
    }

    if (targetData.launchRoleArn) {
      environmentVariables.AWS_SERVICE_CATALOG_LAUNCH_ROLE_ARN = targetData.launchRoleArn;
    }

    if (targetData.principalArn) {
      environmentVariables.AWS_SERVICE_CATALOG_PRINCIPAL_ARN = targetData.principalArn;
    }

    if (targetData.acceptedPortfolioStatus) {
      environmentVariables.AWS_SERVICE_CATALOG_ACCEPTED_PORTFOLIO_STATUS = targetData.acceptedPortfolioStatus;
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getServiceCatalogActionsForAccess(acc),
        'servicecatalog'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.portfolioArn]
      });
      iamPolicies.push({
        statement,
        description: 'Service Catalog portfolio access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'servicecatalog:DescribePortfolio',
              'servicecatalog:ListPortfolios',
              'servicecatalog:ListPortfolioAccess',
              'servicecatalog:DescribeProduct',
              'servicecatalog:ListProducts',
              'servicecatalog:DescribeProvisioningArtifact',
              'servicecatalog:ListProvisioningArtifacts'
            ],
            resources: [targetData.portfolioArn]
          }),
          description: 'Service Catalog portfolio read access',
          complianceRequirement: 'Least privilege IAM access for Service Catalog read operations'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'servicecatalog:CreatePortfolio',
              'servicecatalog:UpdatePortfolio',
              'servicecatalog:DeletePortfolio',
              'servicecatalog:AssociatePrincipalWithPortfolio',
              'servicecatalog:DisassociatePrincipalFromPortfolio',
              'servicecatalog:AssociateProductWithPortfolio',
              'servicecatalog:DisassociateProductFromPortfolio',
              'servicecatalog:CreateProduct',
              'servicecatalog:UpdateProduct',
              'servicecatalog:DeleteProduct',
              'servicecatalog:CreateProvisioningArtifact',
              'servicecatalog:UpdateProvisioningArtifact',
              'servicecatalog:DeleteProvisioningArtifact'
            ],
            resources: [targetData.portfolioArn]
          }),
          description: 'Service Catalog portfolio write access',
          complianceRequirement: 'Least privilege IAM access for Service Catalog write operations'
        });
      }

      // Constraint and tag option support
      if (targetData.constraintId || options?.requireSecureAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'servicecatalog:CreateConstraint',
              'servicecatalog:UpdateConstraint',
              'servicecatalog:DeleteConstraint',
              'servicecatalog:DescribeConstraint',
              'servicecatalog:ListConstraintsForPortfolio'
            ],
            resources: [targetData.portfolioArn]
          }),
          description: 'Service Catalog constraint management',
          complianceRequirement: 'Least privilege IAM access for constraint operations'
        });
      }

      if (targetData.tagOptionId || options?.requireSecureAccess) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'servicecatalog:CreateTagOption',
              'servicecatalog:UpdateTagOption',
              'servicecatalog:DeleteTagOption',
              'servicecatalog:AssociateTagOptionWithResource',
              'servicecatalog:DisassociateTagOptionFromResource',
              'servicecatalog:ListTagOptions'
            ],
            resources: ['*']
          }),
          description: 'Service Catalog tag option management',
          complianceRequirement: 'Least privilege IAM access for tag option operations'
        });
      }

      // Launch role and principal association
      if (targetData.launchRoleArn || targetData.principalArn) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'servicecatalog:AssociatePrincipalWithPortfolio',
              'servicecatalog:DisassociatePrincipalFromPortfolio',
              'servicecatalog:ListPrincipalsForPortfolio',
              'iam:PassRole'
            ],
            resources: [targetData.launchRoleArn || targetData.principalArn || '*']
          }),
          description: 'Service Catalog launch role and principal association',
          complianceRequirement: 'Least privilege IAM access for principal operations'
        });
      }
    }

    // Accepted portfolio status
    if (targetData.acceptedPortfolioStatus && (access === 'read' || access === 'readwrite')) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'servicecatalog:ListAcceptedPortfolioShares',
            'servicecatalog:AcceptPortfolioShare',
            'servicecatalog:RejectPortfolioShare'
          ],
          resources: [targetData.portfolioArn]
        }),
        description: 'Service Catalog accepted portfolio status access',
        complianceRequirement: 'Least privilege IAM access for portfolio share operations'
      });
    }

    // Admin access (full Service Catalog permissions)
    if (access === 'admin' && options?.requireFullAdminAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['servicecatalog:*'],
          resources: ['*']
        }),
        description: 'Service Catalog admin access',
        complianceRequirement: 'Full admin access to Service Catalog (requires explicit requireFullAdminAccess option)'
      });
    }

    // Organizations integration for OU-level portfolios
    if (options?.requireSecureAccess && targetData.orgId) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'organizations:DescribeOrganization',
            'organizations:ListAccounts',
            'organizations:ListOrganizationalUnitsForParent'
          ],
          resources: ['*']
        }),
        description: 'Organizations access for OU-level portfolios',
        complianceRequirement: 'Least privilege IAM access for Organizations integration'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Get Service Catalog actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getServiceCatalogActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'servicecatalog:DescribePortfolio',
          'servicecatalog:ListPortfolios',
          'servicecatalog:ListPortfolioAccess',
          'servicecatalog:DescribeProduct',
          'servicecatalog:ListProducts',
          'servicecatalog:DescribeProvisioningArtifact',
          'servicecatalog:ListProvisioningArtifacts'
        ];
      case 'write':
        return [
          'servicecatalog:CreatePortfolio',
          'servicecatalog:UpdatePortfolio',
          'servicecatalog:DeletePortfolio',
          'servicecatalog:AssociatePrincipalWithPortfolio',
          'servicecatalog:DisassociatePrincipalFromPortfolio',
          'servicecatalog:AssociateProductWithPortfolio',
          'servicecatalog:DisassociateProductFromPortfolio',
          'servicecatalog:CreateProduct',
          'servicecatalog:UpdateProduct',
          'servicecatalog:DeleteProduct',
          'servicecatalog:CreateProvisioningArtifact',
          'servicecatalog:UpdateProvisioningArtifact',
          'servicecatalog:DeleteProvisioningArtifact'
        ];
      case 'readwrite':
        return [
          'servicecatalog:DescribePortfolio',
          'servicecatalog:ListPortfolios',
          'servicecatalog:ListPortfolioAccess',
          'servicecatalog:DescribeProduct',
          'servicecatalog:ListProducts',
          'servicecatalog:DescribeProvisioningArtifact',
          'servicecatalog:ListProvisioningArtifacts',
          'servicecatalog:CreatePortfolio',
          'servicecatalog:UpdatePortfolio',
          'servicecatalog:DeletePortfolio',
          'servicecatalog:AssociatePrincipalWithPortfolio',
          'servicecatalog:DisassociatePrincipalFromPortfolio',
          'servicecatalog:AssociateProductWithPortfolio',
          'servicecatalog:DisassociateProductFromPortfolio',
          'servicecatalog:CreateProduct',
          'servicecatalog:UpdateProduct',
          'servicecatalog:DeleteProduct',
          'servicecatalog:CreateProvisioningArtifact',
          'servicecatalog:UpdateProvisioningArtifact',
          'servicecatalog:DeleteProvisioningArtifact'
        ];
      case 'admin':
        return [
          'servicecatalog:*'
        ];
      default:
        throw new Error(`Unsupported Service Catalog access level: ${access}`);
    }
  }
}

