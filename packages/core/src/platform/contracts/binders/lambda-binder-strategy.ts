/**
 * Lambda Binder Strategy
 * Handles binding between compute components and Lambda function components
 */

import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { EnhancedBinderStrategy } from '../enhanced-binder-strategy';
import {
  EnhancedBindingContext,
  EnhancedBindingResult,
  IamPolicy,
  SecurityGroupRule,
  ComplianceAction
} from '../bindings';
import { validateOptions } from './binding-options';

/**
 * Lambda binder strategy for Lambda function invocations
 */
export class LambdaBinderStrategy extends EnhancedBinderStrategy {

  getStrategyName(): string {
    return 'LambdaBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    // Handle any compute component binding to Lambda capabilities
    const computeTypes = ['lambda-api', 'ecs-service', 'ec2-instance', 'fargate-service', 'step-function'];
    const lambdaCapabilities = ['lambda:function', 'function:lambda', 'compute:lambda'];

    return computeTypes.includes(sourceType) && lambdaCapabilities.includes(targetCapability);
  }

  async bind(context: EnhancedBindingContext): Promise<EnhancedBindingResult> {
    this.validateBindingContext(context);

    const validation = validateOptions('lambda:function', context.options);
    if (!validation.valid) {
      throw new Error(`Invalid binding options: ${validation.errors.join(', ')}`);
    }

    const capability = context.targetCapabilityData;
    const access = context.directive.access;

    // Generate environment variables
    const environmentVariables = this.generateEnvironmentVariables(context);

    // Create IAM policies for Lambda invocation
    const iamPolicies = this.createLambdaIamPolicies(context, capability, access);

    // Lambda doesn't require security group rules (HTTP/HTTPS access)
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
        networkConfig: this.createLambdaNetworkConfig(context, capability)
      }
    );
  }

  /**
   * Create IAM policies for Lambda invocation
   */
  private createLambdaIamPolicies(
    context: EnhancedBindingContext,
    capability: any,
    access: string
  ): IamPolicy[] {
    const policies: IamPolicy[] = [];
    const functionArn = capability.resources?.arn || capability.resources?.functionArn;

    if (!functionArn) {
      throw new Error(`Lambda function ARN not found in capability data for ${context.target.getName()}`);
    }

    // Base Lambda invocation policy
    const lambdaActions = this.getLambdaActionsForAccess(access);

    const basePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: lambdaActions,
      resources: [functionArn],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        }
      }
    });

    policies.push({
      statement: basePolicy,
      description: `Lambda ${access} access for ${context.source.getName()} -> ${context.target.getName()}`,
      complianceRequirement: 'lambda_access'
    });

    // Lambda function configuration access
    const configPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'lambda:GetFunction',
        'lambda:GetFunctionConfiguration'
      ],
      resources: [functionArn],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        }
      }
    });

    policies.push({
      statement: configPolicy,
      description: `Lambda configuration access for ${context.source.getName()}`,
      complianceRequirement: 'lambda_configuration'
    });

    // CloudWatch Logs access for Lambda execution logs
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
        `arn:aws:logs:${process.env.AWS_REGION || 'us-east-1'}:*:log-group:/aws/lambda/${context.target.getName()}*`
      ]
    });

    policies.push({
      statement: logsPolicy,
      description: `CloudWatch Logs access for Lambda execution in ${context.target.getName()}`,
      complianceRequirement: 'lambda_logs'
    });

    return policies;
  }

  /**
   * Get Lambda actions based on access level
   */
  private getLambdaActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'lambda:InvokeFunction'
        ];
      case 'write':
        return [
          'lambda:InvokeFunction',
          'lambda:InvokeAsync'
        ];
      case 'readwrite':
        return [
          'lambda:InvokeFunction',
          'lambda:InvokeAsync'
        ];
      case 'admin':
        return [
          'lambda:InvokeFunction',
          'lambda:InvokeAsync',
          'lambda:UpdateFunctionConfiguration',
          'lambda:UpdateFunctionCode',
          'lambda:UpdateAlias',
          'lambda:UpdateEventSourceMapping'
        ];
      default:
        throw new Error(`Unsupported Lambda access level: ${access}`);
    }
  }

  /**
   * Create Lambda network configuration
   */
  private createLambdaNetworkConfig(context: EnhancedBindingContext, capability: any): any {
    return {
      vpc: capability.vpc ? {
        id: capability.vpc.id,
        subnets: capability.vpc.subnets || []
      } : undefined,
      dns: capability.endpoints?.host ? {
        hostname: capability.endpoints.host,
        records: [{
          type: 'CNAME' as const,
          name: `${context.target.getName()}.${context.environment}.local`,
          value: capability.endpoints.host,
          ttl: 300
        }]
      } : undefined
    };
  }

  /**
   * Override environment variable generation for Lambda-specific mappings
   */
  protected generateEnvironmentVariables(
    context: EnhancedBindingContext,
    customMappings?: Record<string, string>
  ): Record<string, string> {
    const envVars: Record<string, string> = {};
    const capability = context.targetCapabilityData;

    // Lambda-specific default mappings
    const defaultMappings: Record<string, string> = {
      functionName: `${context.target.getName().toUpperCase()}_FUNCTION_NAME`,
      functionArn: `${context.target.getName().toUpperCase()}_FUNCTION_ARN`,
      functionUrl: `${context.target.getName().toUpperCase()}_FUNCTION_URL`,
      region: `${context.target.getName().toUpperCase()}_FUNCTION_REGION`,
      timeout: `${context.target.getName().toUpperCase()}_FUNCTION_TIMEOUT`,
      memorySize: `${context.target.getName().toUpperCase()}_FUNCTION_MEMORY_SIZE`
    };

    // Apply custom mappings or use defaults
    const mappings = customMappings || context.directive.env || defaultMappings;

    // Map capability data to environment variables
    if ((capability.resources as any)?.name && mappings.functionName) {
      envVars[mappings.functionName] = (capability.resources as any).name;
    }
    if (capability.resources?.arn && mappings.functionArn) {
      envVars[mappings.functionArn] = capability.resources.arn;
    }
    if ((capability.resources as any)?.url && mappings.functionUrl) {
      envVars[mappings.functionUrl] = (capability.resources as any).url;
    }
    if ((capability as any).region && mappings.region) {
      envVars[mappings.region] = (capability as any).region;
    }
    if ((capability as any).config?.timeout && mappings.timeout) {
      envVars[mappings.timeout] = (capability as any).config.timeout.toString();
    }
    if ((capability as any).config?.memorySize && mappings.memorySize) {
      envVars[mappings.memorySize] = (capability as any).config.memorySize.toString();
    }

    return envVars;
  }
}
