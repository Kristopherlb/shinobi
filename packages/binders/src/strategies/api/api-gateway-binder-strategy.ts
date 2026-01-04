/**
 * API Gateway Binder Strategy (Unified)
 * Handles API Gateway REST and HTTP API bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class ApiGatewayBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['api:rest', 'api:http'];

  getStrategyName(): string {
    return 'API Gateway Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'api-gateway-rest',
        capability: 'api:rest',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to API Gateway REST API for invoking and managing REST endpoints',
        examples: ['lambda-api -> api:rest (write)', 'ecs-task -> api:rest (readwrite)']
      },
      {
        sourceType: '*',
        targetType: 'api-gateway-http',
        capability: 'api:http',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to API Gateway HTTP API (v2) for invoking and managing HTTP endpoints',
        examples: ['lambda-api -> api:http (write)', 'ecs-task -> api:http (readwrite)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for API Gateway binding');
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

    // Route to appropriate binding method
    if (capability === 'api:rest') {
      return await this.bindToRestApi(context, targetCapabilityData);
    } else if (capability === 'api:http') {
      return await this.bindToHttpApi(context, targetCapabilityData);
    } else {
      throw new Error(`Unsupported API Gateway capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to API Gateway REST API
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (ApiGatewayCapabilityData):
   *   - type: 'api:rest'
   *   - resources (required): { arn: string, apiId: string, stage: string }
   *   - endpoints (required): { invokeUrl: string, executeApiArn: string }
   *   - cors (optional): { enabled: boolean, origins: string[] }
   *   - customDomain (optional): { domainName: string, hostedZoneId?: string, regionalDomainName?: string }
   *   - security (optional): { apiKeyEnabled?: boolean, wafEnabled?: boolean }
   * @returns Enhanced binding result without compliance block
   */
  private async bindToRestApi(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    return await this.bindToApi(context, targetData, 'REST');
  }

  /**
   * Bind to API Gateway HTTP API (v2)
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (ApiGatewayCapabilityData):
   *   - type: 'api:http'
   *   - resources (required): { arn: string, apiId: string, stage: string }
   *   - endpoints (required): { invokeUrl: string, executeApiArn: string }
   *   - cors (optional): { enabled: boolean, origins: string[] }
   *   - customDomain (optional): { domainName: string, hostedZoneId?: string, regionalDomainName?: string }
   *   - security (optional): { apiKeyEnabled?: boolean, wafEnabled?: boolean }
   * @returns Enhanced binding result without compliance block
   */
  private async bindToHttpApi(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    return await this.bindToApi(context, targetData, 'HTTP');
  }

  /**
   * Common binding logic for both REST and HTTP APIs
   */
  private async bindToApi(
    context: BindingContext,
    targetData: any,
    apiType: 'REST' | 'HTTP'
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.resources?.arn) {
      throw new Error(`Target component missing required resources.arn property for API Gateway ${apiType} binding`);
    }
    if (!targetData?.resources?.apiId) {
      throw new Error(`Target component missing required resources.apiId property for API Gateway ${apiType} binding`);
    }
    if (!targetData?.resources?.stage) {
      throw new Error(`Target component missing required resources.stage property for API Gateway ${apiType} binding`);
    }
    if (!targetData?.endpoints?.invokeUrl) {
      throw new Error(`Target component missing required endpoints.invokeUrl property for API Gateway ${apiType} binding`);
    }
    if (!targetData?.endpoints?.executeApiArn) {
      throw new Error(`Target component missing required endpoints.executeApiArn property for API Gateway ${apiType} binding`);
    }

    const { access } = context.directive;
    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Validate access level for API Gateway
    const validAccess = ['read', 'write', 'readwrite'];
    if (!validAccess.includes(access)) {
      throw new Error(`Invalid access level for API Gateway: ${access}. Valid levels: ${validAccess.join(', ')}`);
    }

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getApiGatewayActionsForAccess(acc),
        'apigateway'
      );

      // Get resources from target data
      const resources = [
        targetData.endpoints.executeApiArn,
        `${targetData.resources.arn}/*`
      ];

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources
        }),
        description: `API Gateway ${apiType} API access (granular actions)`,
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use existing multi-statement approach (backward compatible)
      // Grant API Gateway read permissions
      if (access === 'read' || access === 'readwrite') {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'apigateway:GET',
            'apigateway:HEAD',
            'apigateway:OPTIONS'
          ],
          resources: [
            targetData.endpoints.executeApiArn,
            `${targetData.resources.arn}/*`
          ]
        });
        iamPolicies.push({
          statement,
          description: `API Gateway ${apiType} API read access permissions`,
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      // Grant API Gateway write permissions (invoke)
      if (access === 'write' || access === 'readwrite') {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'execute-api:Invoke',
            'apigateway:POST',
            'apigateway:PUT',
            'apigateway:PATCH',
            'apigateway:DELETE'
          ],
          resources: [
            targetData.endpoints.executeApiArn,
            `${targetData.resources.arn}/*`
          ]
        });
        iamPolicies.push({
          statement,
          description: `API Gateway ${apiType} API invoke/write access permissions`,
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Set API Gateway environment variables
    const apiPrefix = apiType === 'REST' ? 'API_GATEWAY_REST' : 'API_GATEWAY_HTTP';
    environmentVariables[`${apiPrefix}_API_ID`] = targetData.resources.apiId;
    environmentVariables[`${apiPrefix}_API_ARN`] = targetData.resources.arn;
    environmentVariables[`${apiPrefix}_STAGE`] = targetData.resources.stage;
    environmentVariables[`${apiPrefix}_INVOKE_URL`] = targetData.endpoints.invokeUrl;
    environmentVariables[`${apiPrefix}_EXECUTE_API_ARN`] = targetData.endpoints.executeApiArn;

    // Add generic API Gateway variables (for backward compatibility)
    environmentVariables['API_GATEWAY_API_ID'] = targetData.resources.apiId;
    environmentVariables['API_GATEWAY_API_ARN'] = targetData.resources.arn;
    environmentVariables['API_GATEWAY_STAGE'] = targetData.resources.stage;
    environmentVariables['API_GATEWAY_INVOKE_URL'] = targetData.endpoints.invokeUrl;
    environmentVariables['API_GATEWAY_EXECUTE_API_ARN'] = targetData.endpoints.executeApiArn;

    // Add custom environment variable mappings if provided
    if (context.directive.env) {
      Object.entries(context.directive.env).forEach(([key, value]) => {
        if (value === 'apiId' || value === 'API_ID') {
          environmentVariables[key] = targetData.resources.apiId;
        } else if (value === 'apiArn' || value === 'API_ARN') {
          environmentVariables[key] = targetData.resources.arn;
        } else if (value === 'stage' || value === 'STAGE') {
          environmentVariables[key] = targetData.resources.stage;
        } else if (value === 'invokeUrl' || value === 'INVOKE_URL') {
          environmentVariables[key] = targetData.endpoints.invokeUrl;
        } else if (value === 'executeApiArn' || value === 'EXECUTE_API_ARN') {
          environmentVariables[key] = targetData.endpoints.executeApiArn;
        }
      });
    }

    // Handle CORS configuration
    if (targetData.cors) {
      environmentVariables[`${apiPrefix}_CORS_ENABLED`] = targetData.cors.enabled ? 'true' : 'false';
      if (targetData.cors.origins && Array.isArray(targetData.cors.origins) && targetData.cors.origins.length > 0) {
        environmentVariables[`${apiPrefix}_CORS_ORIGINS`] = targetData.cors.origins.join(',');
      }
    }

    // Handle custom domain configuration
    if (targetData.customDomain) {
      environmentVariables[`${apiPrefix}_CUSTOM_DOMAIN`] = targetData.customDomain.domainName;
      if (targetData.customDomain.regionalDomainName) {
        environmentVariables[`${apiPrefix}_REGIONAL_DOMAIN`] = targetData.customDomain.regionalDomainName;
      }
      if (targetData.customDomain.hostedZoneId) {
        environmentVariables[`${apiPrefix}_HOSTED_ZONE_ID`] = targetData.customDomain.hostedZoneId;
      }
    }

    // Handle security configuration
    if (targetData.security) {
      if (targetData.security.apiKeyEnabled !== undefined) {
        environmentVariables[`${apiPrefix}_API_KEY_ENABLED`] = targetData.security.apiKeyEnabled ? 'true' : 'false';
      }
      if (targetData.security.wafEnabled !== undefined) {
        environmentVariables[`${apiPrefix}_WAF_ENABLED`] = targetData.security.wafEnabled ? 'true' : 'false';
      }
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Get API Gateway actions for access level
   */
  private getApiGatewayActionsForAccess(access: string): string[] {
    const actions: string[] = [];

    if (access === 'read' || access === 'readwrite') {
      actions.push(
        'apigateway:GET',
        'apigateway:HEAD',
        'apigateway:OPTIONS'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'execute-api:Invoke',
        'apigateway:POST',
        'apigateway:PUT',
        'apigateway:PATCH',
        'apigateway:DELETE'
      );
    }

    return actions;
  }
}

