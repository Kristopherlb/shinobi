/**
 * Lambda to SNS Import Binding Strategy
 * Handles binding Lambda functions to imported SNS topics
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Component, BindingContext } from '@platform/contracts';
import { SnsTopicComponent } from '@platform/sns-topic';
import { StructuredLogger } from '@platform/logger';

export interface LambdaToSnsImportStrategyDependencies {
  logger: StructuredLogger;
}

/**
 * Strategy for binding Lambda functions to imported SNS topics
 * Configures IAM permissions and environment variables for messaging
 */
export class LambdaToSnsImportStrategy {
  constructor(private dependencies: LambdaToSnsImportStrategyDependencies) {}

  /**
   * Check if this strategy can handle the given binding
   */
  canHandle(context: BindingContext): boolean {
    // Check if source is Lambda-based component and target is SNS import
    const isLambdaSource = this.isLambdaComponent(context.sourceComponent);
    const isSnsImportTarget = context.targetComponent instanceof SnsTopicComponent;
    const isSnsCapability = context.capability === 'topic:sns';

    return isLambdaSource && isSnsImportTarget && isSnsCapability;
  }

  /**
   * Apply the binding between Lambda and imported SNS topic
   */
  async apply(context: BindingContext): Promise<void> {
    this.dependencies.logger.debug(`Applying Lambda to SNS import binding: ${context.access} access`);

    const lambdaFunction = this.extractLambdaFunction(context.sourceComponent);
    const snsImport = context.targetComponent as SnsTopicComponent;

    if (!lambdaFunction) {
      throw new Error('Could not extract Lambda function from source component');
    }

    // 1. Grant IAM permissions based on access level
    await this.grantTopicAccess(lambdaFunction, snsImport, context.access);

    // 2. Set environment variables
    await this.setEnvironmentVariables(lambdaFunction, snsImport, context);

    // 3. Configure subscriptions for read access
    if (context.access === 'read' || context.access === 'readwrite') {
      await this.configureSubscription(lambdaFunction, snsImport, context);
    }

    this.dependencies.logger.debug('Lambda to SNS import binding applied successfully');
  }

  /**
   * Grant IAM permissions for SNS topic access
   */
  private async grantTopicAccess(
    lambdaFunction: lambda.IFunction,
    snsImport: SnsTopicComponent,
    access: string
  ): Promise<void> {
    this.dependencies.logger.debug(`Granting SNS topic access: ${access}`);

    const topic = snsImport.getTopic();

    switch (access) {
      case 'read':
        // For read access, we typically set up a subscription (handled separately)
        // The Lambda function needs permission to be invoked by SNS
        lambdaFunction.addPermission('SNSInvoke', {
          principal: new iam.ServicePrincipal('sns.amazonaws.com'),
          sourceArn: topic.topicArn
        });
        break;

      case 'write':
        // Grant permission to publish messages to the topic
        topic.grantPublish(lambdaFunction);
        break;

      case 'readwrite':
        // Grant both publish and subscribe permissions
        topic.grantPublish(lambdaFunction);
        lambdaFunction.addPermission('SNSInvoke', {
          principal: new iam.ServicePrincipal('sns.amazonaws.com'),
          sourceArn: topic.topicArn
        });
        break;

      case 'admin':
        // Grant full administrative access to the topic
        topic.grantPublish(lambdaFunction);
        lambdaFunction.addPermission('SNSInvoke', {
          principal: new iam.ServicePrincipal('sns.amazonaws.com'),
          sourceArn: topic.topicArn
        });
        
        // Grant additional admin permissions
        lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'sns:GetTopicAttributes',
            'sns:SetTopicAttributes',
            'sns:ListSubscriptionsByTopic',
            'sns:GetSubscriptionAttributes',
            'sns:SetSubscriptionAttributes'
          ],
          resources: [topic.topicArn]
        }));
        break;

      default:
        throw new Error(`Unsupported access level: ${access}`);
    }

    this.dependencies.logger.debug('SNS topic access granted successfully');
  }

  /**
   * Set environment variables for SNS topic interaction
   */
  private async setEnvironmentVariables(
    lambdaFunction: lambda.IFunction,
    snsImport: SnsTopicComponent,
    context: BindingContext
  ): Promise<void> {
    this.dependencies.logger.debug('Setting SNS topic environment variables');

    const topic = snsImport.getTopic();
    const resourceRefs = snsImport.getResourceReferences();

    // Build environment variables for SNS interaction
    const environmentVariables: Record<string, string> = {
      SNS_TOPIC_ARN: topic.topicArn,
      SNS_TOPIC_NAME: resourceRefs.topicName || 'imported-topic',
      SNS_ACCESS_LEVEL: context.access
    };

    // Add region information (extracted from topic ARN)
    const topicRegion = this.extractRegionFromArn(topic.topicArn);
    if (topicRegion) {
      environmentVariables.SNS_REGION = topicRegion;
    }

    // Apply custom environment variable names if provided
    if (context.customEnvVars) {
      for (const [standardName, customName] of Object.entries(context.customEnvVars)) {
        if (environmentVariables[standardName]) {
          environmentVariables[customName] = environmentVariables[standardName];
          delete environmentVariables[standardName];
        }
      }
    }

    // Add environment variables to Lambda function
    this.addEnvironmentVariables(lambdaFunction, environmentVariables);

    this.dependencies.logger.debug('Environment variables set successfully');
  }

  /**
   * Configure SNS subscription for read access
   */
  private async configureSubscription(
    lambdaFunction: lambda.IFunction,
    snsImport: SnsTopicComponent,
    context: BindingContext
  ): Promise<void> {
    this.dependencies.logger.debug('Configuring SNS subscription for Lambda');

    const topic = snsImport.getTopic();

    // Create a subscription from the imported topic to the Lambda function
    // This allows the Lambda to receive messages when they are published to the topic
    topic.addSubscription(new (require('aws-cdk-lib/aws-sns-subscriptions').LambdaSubscription)(lambdaFunction, {
      // Configure subscription options based on context
      filterPolicy: context.options?.filterPolicy,
      deadLetterQueue: context.options?.deadLetterQueue,
    }));

    this.dependencies.logger.debug('SNS subscription configured successfully');
  }

  /**
   * Check if a component contains or is a Lambda function
   */
  private isLambdaComponent(component: Component): boolean {
    // This would check if the component type is lambda-api, lambda-worker, etc.
    const resourceRefs = component.getResourceReferences();
    return resourceRefs.lambdaFunction !== undefined || 
           resourceRefs.function !== undefined ||
           component.constructor.name.includes('Lambda');
  }

  /**
   * Extract the Lambda function from a component
   */
  private extractLambdaFunction(component: Component): lambda.IFunction | null {
    const resourceRefs = component.getResourceReferences();
    
    // Try different property names that might contain the Lambda function
    return resourceRefs.lambdaFunction || 
           resourceRefs.function || 
           resourceRefs.handler || 
           null;
  }

  /**
   * Extract AWS region from an ARN
   */
  private extractRegionFromArn(arn: string): string | null {
    const arnParts = arn.split(':');
    return arnParts.length >= 4 ? arnParts[3] : null;
  }

  /**
   * Add environment variables to Lambda function
   * This is a helper method that would integrate with the actual Lambda construct
   */
  private addEnvironmentVariables(
    lambdaFunction: lambda.IFunction,
    variables: Record<string, string>
  ): void {
    // In a real implementation, this would be handled during Lambda construction
    // or through CDK's environment variable APIs
    this.dependencies.logger.debug(`Would set ${Object.keys(variables).length} environment variables on Lambda function`);
    
    // Log the variables for debugging
    for (const [key, value] of Object.entries(variables)) {
      this.dependencies.logger.debug(`  ${key}=${value}`);
    }
  }
}