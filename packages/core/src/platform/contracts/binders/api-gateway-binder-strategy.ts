/**
 * API Gateway Binder Strategy
 * Handles binding between compute components and API Gateway components
 */

import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { EnhancedBinderStrategy } from '../enhanced-binder-strategy';
import {
  EnhancedBindingContext,
  EnhancedBindingResult,
  IamPolicy,
  SecurityGroupRule,
  ComplianceAction
} from '../bindings';

/**
 * API Gateway binder strategy for API Gateway integrations
 */
export class ApiGatewayBinderStrategy extends EnhancedBinderStrategy {

  getStrategyName(): string {
    return 'ApiGatewayBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    // Handle any compute component binding to API Gateway capabilities
    const computeTypes = ['lambda-api', 'ecs-service', 'ec2-instance', 'fargate-service'];
    const apiGatewayCapabilities = ['api:gateway', 'gateway:api', 'http:api', 'rest:api'];

    return computeTypes.includes(sourceType) && apiGatewayCapabilities.includes(targetCapability);
  }

  async bind(context: EnhancedBindingContext): Promise<EnhancedBindingResult> {
    this.validateBindingContext(context);

    const capability = context.targetCapabilityData;
    const access = context.directive.access;

    // Generate environment variables
    const environmentVariables = this.generateEnvironmentVariables(context);

    // Create IAM policies for API Gateway access
    const iamPolicies = this.createApiGatewayIamPolicies(context, capability, access);

    // API Gateway doesn't require security group rules (HTTP/HTTPS access)
    const securityGroupRules: SecurityGroupRule[] = [];

    // Compliance restrictions removed; policies/rules unchanged
    const policies = iamPolicies;
    const rules = securityGroupRules;
    const actions: ComplianceAction[] = [];

    return this.createBindingResult(
      environmentVariables,
      policies,
      rules,
      actions,
      {
        networkConfig: this.createApiGatewayNetworkConfig(context, capability)
      }
    );
  }

  /**
   * Create IAM policies for API Gateway access
   */
  private createApiGatewayIamPolicies(
    context: EnhancedBindingContext,
    capability: any,
    access: string
  ): IamPolicy[] {
    const policies: IamPolicy[] = [];
    const apiArn = capability.resources?.arn || capability.resources?.apiArn;

    if (!apiArn) {
      throw new Error(`API Gateway ARN not found in capability data for ${context.target.getName()}`);
    }

    // Base API Gateway access policy
    const apiGatewayActions = this.getApiGatewayActionsForAccess(access);

    const basePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: apiGatewayActions,
      resources: [apiArn],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        }
      }
    });

    policies.push({
      statement: basePolicy,
      description: `API Gateway ${access} access for ${context.source.getName()} -> ${context.target.getName()}`,
      complianceRequirement: 'api_gateway_access'
    });

    // API Gateway execution policy for invoking APIs
    const executionPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'execute-api:Invoke',
        'execute-api:ManageConnections'
      ],
      resources: [`${apiArn}/*`],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        }
      }
    });

    policies.push({
      statement: executionPolicy,
      description: `API Gateway execution access for ${context.source.getName()}`,
      complianceRequirement: 'api_gateway_execution'
    });

    // CloudWatch Logs access for API Gateway execution logs
    const logsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogGroups',
        'logs:DescribeLogStreams'
      ],
      resources: [
        `arn:aws:logs:${process.env.AWS_REGION || 'us-east-1'}:*:log-group:/aws/apigateway/${context.target.getName()}*`
      ]
    });

    policies.push({
      statement: logsPolicy,
      description: `CloudWatch Logs access for API Gateway execution in ${context.target.getName()}`,
      complianceRequirement: 'api_gateway_logs'
    });

    return policies;
  }

  /**
   * Get API Gateway actions based on access level
   */
  private getApiGatewayActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'apigateway:GET'
        ];
      case 'write':
        return [
          'apigateway:POST',
          'apigateway:PUT',
          'apigateway:DELETE'
        ];
      case 'readwrite':
        return [
          'apigateway:GET',
          'apigateway:POST',
          'apigateway:PUT',
          'apigateway:DELETE'
        ];
      case 'admin':
        return [
          'apigateway:GET',
          'apigateway:POST',
          'apigateway:PUT',
          'apigateway:DELETE',
          'apigateway:PATCH',
          'apigateway:HEAD',
          'apigateway:OPTIONS'
        ];
      default:
        throw new Error(`Unsupported API Gateway access level: ${access}`);
    }
  }

  /**
   * Create API Gateway network configuration
   */
  private createApiGatewayNetworkConfig(context: EnhancedBindingContext, capability: any): any {
    return {
      dns: capability.endpoints?.url ? {
        hostname: capability.endpoints.url,
        records: [{
          type: 'CNAME' as const,
          name: `${context.target.getName()}.${context.environment}.local`,
          value: capability.endpoints.url,
          ttl: 300
        }]
      } : undefined,
      loadBalancer: capability.loadBalancer ? {
        targetGroupArn: capability.loadBalancer.targetGroupArn,
        listenerArn: capability.loadBalancer.listenerArn
      } : undefined
    };
  }

  /**
   * Override environment variable generation for API Gateway-specific mappings
   */
  protected generateEnvironmentVariables(
    context: EnhancedBindingContext,
    customMappings?: Record<string, string>
  ): Record<string, string> {
    const envVars: Record<string, string> = {};
    const capability = context.targetCapabilityData;

    // API Gateway-specific default mappings
    const defaultMappings: Record<string, string> = {
      apiUrl: `${context.target.getName().toUpperCase()}_API_URL`,
      apiArn: `${context.target.getName().toUpperCase()}_API_ARN`,
      apiId: `${context.target.getName().toUpperCase()}_API_ID`,
      stageName: `${context.target.getName().toUpperCase()}_STAGE_NAME`,
      region: `${context.target.getName().toUpperCase()}_API_REGION`
    };

    // Apply custom mappings or use defaults
    const mappings = customMappings || context.directive.env || defaultMappings;

    // Map capability data to environment variables
    if ((capability as any).endpoints?.invokeUrl && mappings.apiUrl) {
      envVars[mappings.apiUrl] = (capability as any).endpoints.invokeUrl;
    }
    if (capability.resources?.arn && mappings.apiArn) {
      envVars[mappings.apiArn] = capability.resources.arn;
    }
    if ((capability.resources as any)?.apiId && mappings.apiId) {
      envVars[mappings.apiId] = (capability.resources as any).apiId;
    }
    // Optional mapping if your schema exposes stage/region differently

    // Generate base URL for API calls
    // Optional base URL construction if capability exposes fields
    const endpUrl = (capability as any)?.endpoints?.invokeUrl || (capability as any)?.endpoints?.url;
    const stageName = (capability as any)?.resources?.stage || (capability as any)?.stage?.name;
    if (endpUrl && stageName) {
      const baseUrl = `${endpUrl}/${stageName}`;
      envVars[`${context.target.getName().toUpperCase()}_BASE_URL`] = baseUrl;
    }

    return envVars;
  }
}
