/**
 * Lambda Binder Strategy (Unified)
 * Handles Lambda function invocation bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class LambdaBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['lambda:function'];

  getStrategyName(): string {
    return 'Lambda Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'lambda-api',
        capability: 'lambda:function',
        supportedAccess: ['invoke'],
        description: 'Invoke Lambda function synchronously',
        examples: ['lambda-api -> lambda:function (invoke)', 'ecs-task -> lambda:function (invoke)']
      },
      {
        sourceType: '*',
        targetType: 'lambda-worker',
        capability: 'lambda:function',
        supportedAccess: ['invoke'],
        description: 'Invoke Lambda function (supports sync and async via options)',
        examples: ['lambda-api -> lambda:function (invoke) with options.asyncInvoke=true']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Lambda binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Validate access level for Lambda
    if (directive.access !== 'invoke' as any) {
      throw new Error(`Invalid access level for Lambda: ${directive.access}. Only 'invoke' is supported`);
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    return await this.bindToLambda(context, targetCapabilityData);
  }

  /**
   * Bind to Lambda function
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (LambdaCapabilityData):
   *   - type: 'lambda:function'
   *   - resources (required): { arn: string, functionName: string, version?: string }
   *   - environment (optional): Record<string, string> - Environment variables from target Lambda
   *   - vpc (optional): { securityGroups: string[], subnets: string[] } - VPC configuration
   *   - runtime (optional): string - Lambda runtime (e.g., 'nodejs20.x', 'python3.11')
   *   - layers (optional): string[] - Array of Lambda layer ARNs
   *   - deadLetterQueue (optional): { targetArn: string } - Dead letter queue configuration
   *   - reservedConcurrentExecutions (optional): number - Reserved concurrency limit
   * @returns Enhanced binding result without compliance block
   */
  private async bindToLambda(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.resources?.arn) {
      throw new Error('Target component missing required resources.arn property for Lambda binding');
    }
    if (!targetData?.resources?.functionName) {
      throw new Error('Target component missing required resources.functionName property for Lambda binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const options = context.directive.options || {};

    // Determine invocation type (sync or async)
    const isAsyncInvoke = options.asyncInvoke === true || options.invocationType === 'async';
    const isEventInvoke = options.eventInvoke === true || options.invocationType === 'event';

    // Grant Lambda invoke permissions
    const actions: string[] = ['lambda:InvokeFunction'];
    
    // Add async invoke permissions if needed
    if (isAsyncInvoke || isEventInvoke) {
      // Async invoke uses the same InvokeFunction action but with different invocation type
      // No additional actions needed, but we document it in the policy description
    }

    const statement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions,
      resources: [
        targetData.resources.arn,
        // Include version-specific ARN if version is provided
        ...(targetData.resources.version ? [`${targetData.resources.arn}:${targetData.resources.version}`] : []),
        // Include $LATEST alias
        `${targetData.resources.arn}:$LATEST`
      ]
    });

    iamPolicies.push({
      statement,
      description: isAsyncInvoke || isEventInvoke
        ? 'Lambda function async invoke permissions'
        : 'Lambda function invoke permissions',
      complianceRequirement: 'Least privilege IAM access'
    });

    // Set Lambda environment variables
    environmentVariables['LAMBDA_FUNCTION_ARN'] = targetData.resources.arn;
    environmentVariables['LAMBDA_FUNCTION_NAME'] = targetData.resources.functionName;
    
    if (targetData.resources.version) {
      environmentVariables['LAMBDA_FUNCTION_VERSION'] = targetData.resources.version;
    }

    // Add invocation type indicator
    if (isAsyncInvoke || isEventInvoke) {
      environmentVariables['LAMBDA_INVOCATION_TYPE'] = isEventInvoke ? 'Event' : 'RequestResponse';
      environmentVariables['LAMBDA_ASYNC_INVOKE'] = 'true';
    } else {
      environmentVariables['LAMBDA_INVOCATION_TYPE'] = 'RequestResponse';
    }

    // Add custom environment variable mappings if provided
    if (context.directive.env) {
      Object.entries(context.directive.env).forEach(([key, value]) => {
        if (value === 'functionArn' || value === 'FUNCTION_ARN') {
          environmentVariables[key] = targetData.resources.arn;
        } else if (value === 'functionName' || value === 'FUNCTION_NAME') {
          environmentVariables[key] = targetData.resources.functionName;
        } else if (value === 'functionVersion' || value === 'FUNCTION_VERSION') {
          environmentVariables[key] = targetData.resources.version || '$LATEST';
        }
      });
    }

    // Handle VPC configuration if present
    if (targetData.vpc?.securityGroups && targetData.vpc.securityGroups.length > 0) {
      environmentVariables['LAMBDA_VPC_SECURITY_GROUPS'] = targetData.vpc.securityGroups.join(',');
    }
    if (targetData.vpc?.subnets && targetData.vpc.subnets.length > 0) {
      environmentVariables['LAMBDA_VPC_SUBNETS'] = targetData.vpc.subnets.join(',');
    }

    // Merge target Lambda environment variables if provided (read-only reference)
    if (targetData.environment && typeof targetData.environment === 'object') {
      Object.entries(targetData.environment).forEach(([key, value]) => {
        // Prefix with LAMBDA_TARGET_ to avoid conflicts
        environmentVariables[`LAMBDA_TARGET_${key}`] = String(value);
      });
    }

    // Handle default payload from options
    if (options.payload !== undefined) {
      // Payload can be a string (JSON) or object (will be stringified)
      const payloadString = typeof options.payload === 'string' 
        ? options.payload 
        : JSON.stringify(options.payload);
      environmentVariables['LAMBDA_DEFAULT_PAYLOAD'] = payloadString;
    }

    // Expose Lambda runtime information if available
    if (targetData.runtime) {
      environmentVariables['LAMBDA_RUNTIME'] = targetData.runtime;
    }

    // Expose Lambda layers if available
    if (targetData.layers && Array.isArray(targetData.layers) && targetData.layers.length > 0) {
      environmentVariables['LAMBDA_LAYERS'] = targetData.layers.join(',');
      environmentVariables['LAMBDA_LAYER_COUNT'] = targetData.layers.length.toString();
      
      // Add individual layer ARNs as numbered environment variables
      targetData.layers.forEach((layerArn: string, index: number) => {
        environmentVariables[`LAMBDA_LAYER_${index + 1}_ARN`] = layerArn;
      });
    }

    // Handle dead letter queue configuration
    if (targetData.deadLetterQueue?.targetArn) {
      environmentVariables['LAMBDA_DLQ_ARN'] = targetData.deadLetterQueue.targetArn;
      
      // Grant permissions to send failed invocations to DLQ
      // Note: Lambda service automatically sends to DLQ, but we expose the ARN for reference
      // If the DLQ is an SQS queue, we might need additional permissions, but Lambda handles this
      // If the DLQ is an SNS topic, Lambda also handles this automatically
    }

    // Expose reserved concurrency if configured
    if (targetData.reservedConcurrentExecutions !== undefined) {
      environmentVariables['LAMBDA_RESERVED_CONCURRENT_EXECUTIONS'] = 
        targetData.reservedConcurrentExecutions.toString();
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }
}

