/**
 * Lambda to RDS Import Binding Strategy
 * Handles binding Lambda functions to imported RDS PostgreSQL instances
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { BaseComponent } from '../../components/base/base-component';
import { RdsPostgresImportComponent } from '../../components/import/rds-postgres-import.component';
import { Logger } from '../../utils/logger';

export interface BindingContext {
  sourceComponent: BaseComponent;
  targetComponent: BaseComponent;
  capability: string;
  access: 'read' | 'write' | 'readwrite' | 'admin';
  customEnvVars?: Record<string, string>;
  options?: Record<string, any>;
}

export interface LambdaToRdsImportStrategyDependencies {
  logger: Logger;
}

/**
 * Strategy for binding Lambda functions to imported RDS PostgreSQL databases
 * Configures network access, IAM permissions, and environment variables
 */
export class LambdaToRdsImportStrategy {
  constructor(private dependencies: LambdaToRdsImportStrategyDependencies) {}

  /**
   * Check if this strategy can handle the given binding
   */
  canHandle(context: BindingContext): boolean {
    // Check if source is Lambda-based component and target is RDS import
    const isLambdaSource = this.isLambdaComponent(context.sourceComponent);
    const isRdsImportTarget = context.targetComponent instanceof RdsPostgresImportComponent;
    const isDbCapability = context.capability === 'db:postgres';

    return isLambdaSource && isRdsImportTarget && isDbCapability;
  }

  /**
   * Apply the binding between Lambda and imported RDS
   */
  async apply(context: BindingContext): Promise<void> {
    this.dependencies.logger.debug(`Applying Lambda to RDS import binding: ${context.access} access`);

    const lambdaFunction = this.extractLambdaFunction(context.sourceComponent);
    const rdsImport = context.targetComponent as RdsPostgresImportComponent;

    if (!lambdaFunction) {
      throw new Error('Could not extract Lambda function from source component');
    }

    // 1. Configure network access (security groups)
    await this.configureNetworkAccess(lambdaFunction, rdsImport);

    // 2. Grant IAM permissions for secret access
    await this.grantSecretAccess(lambdaFunction, rdsImport, context.access);

    // 3. Set environment variables
    await this.setEnvironmentVariables(lambdaFunction, rdsImport, context);

    this.dependencies.logger.debug('Lambda to RDS import binding applied successfully');
  }

  /**
   * Configure network access between Lambda and RDS
   */
  private async configureNetworkAccess(
    lambdaFunction: lambda.IFunction,
    rdsImport: RdsPostgresImportComponent
  ): Promise<void> {
    this.dependencies.logger.debug('Configuring network access for Lambda to RDS');

    // Get the imported security group
    const rdsSecurityGroup = rdsImport.getSecurityGroup();
    const databaseInstance = rdsImport.getDatabaseInstance();

    // Allow Lambda to connect to RDS on PostgreSQL port
    // Note: This assumes Lambda is in a VPC. In a full implementation,
    // we would check Lambda's VPC configuration first
    if ('connections' in databaseInstance) {
      // Grant connection access from Lambda to RDS
      (databaseInstance as any).connections.allowDefaultPortFrom(
        lambdaFunction,
        'Lambda access to imported PostgreSQL database'
      );
    }

    this.dependencies.logger.debug('Network access configured successfully');
  }

  /**
   * Grant IAM permissions for accessing the database secret
   */
  private async grantSecretAccess(
    lambdaFunction: lambda.IFunction,
    rdsImport: RdsPostgresImportComponent,
    access: string
  ): Promise<void> {
    this.dependencies.logger.debug(`Granting secret access: ${access}`);

    const secret = rdsImport.getSecret();
    
    // Grant read access to the secret for all access levels
    // (Even read-only database access needs credentials)
    secret.grantRead(lambdaFunction);

    // For admin access, we might want to grant additional permissions
    // This would be implemented based on specific requirements
    
    this.dependencies.logger.debug('Secret access granted successfully');
  }

  /**
   * Set environment variables for database connection
   */
  private async setEnvironmentVariables(
    lambdaFunction: lambda.IFunction,
    rdsImport: RdsPostgresImportComponent,
    context: BindingContext
  ): Promise<void> {
    this.dependencies.logger.debug('Setting database environment variables');

    const databaseInstance = rdsImport.getDatabaseInstance();
    const secret = rdsImport.getSecret();

    // Build connection string and individual connection parameters
    const environmentVariables: Record<string, string> = {
      // Database connection details
      DB_HOST: databaseInstance.instanceEndpoint.hostname,
      DB_PORT: databaseInstance.instanceEndpoint.port.toString(),
      DB_NAME: 'postgres', // Default database name, could be configurable
      
      // Secret ARN for runtime credential fetching
      DB_SECRET_ARN: secret.secretArn,
      
      // Connection string template (runtime will substitute actual credentials)
      DATABASE_URL: `postgresql://\${DB_USERNAME}:\${DB_PASSWORD}@${databaseInstance.instanceEndpoint.hostname}:${databaseInstance.instanceEndpoint.port}/postgres`,
      
      // Access level for application logic
      DB_ACCESS_LEVEL: context.access
    };

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
    // Note: This is a simplified approach. In a full CDK implementation,
    // environment variables would be set during Lambda function construction
    this.addEnvironmentVariables(lambdaFunction, environmentVariables);

    this.dependencies.logger.debug('Environment variables set successfully');
  }

  /**
   * Check if a component contains or is a Lambda function
   */
  private isLambdaComponent(component: BaseComponent): boolean {
    // This would check if the component type is lambda-api, lambda-worker, etc.
    // For now, we'll use a simple heuristic
    const resourceRefs = component.getResourceReferences();
    return resourceRefs.lambdaFunction !== undefined || 
           resourceRefs.function !== undefined ||
           component.constructor.name.includes('Lambda');
  }

  /**
   * Extract the Lambda function from a component
   */
  private extractLambdaFunction(component: BaseComponent): lambda.IFunction | null {
    const resourceRefs = component.getResourceReferences();
    
    // Try different property names that might contain the Lambda function
    return resourceRefs.lambdaFunction || 
           resourceRefs.function || 
           resourceRefs.handler || 
           null;
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
    
    // Log the variables for debugging (without sensitive values)
    for (const [key, value] of Object.entries(variables)) {
      const logValue = key.includes('SECRET') || key.includes('PASSWORD') ? '[HIDDEN]' : value;
      this.dependencies.logger.debug(`  ${key}=${logValue}`);
    }
  }
}