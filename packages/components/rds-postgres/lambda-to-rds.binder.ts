/**
 * Lambda to RDS Binder Strategy
 * Enterprise-grade binding with CDK L2 construct integration
 */

import { BindingContext, BindingResult, IBinderStrategy } from '@platform/contracts';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * Enhanced Lambda to RDS binding with enterprise security
 */
export class LambdaToRdsBinderStrategy implements IBinderStrategy {
  canHandle(sourceType: string, targetCapability: string): boolean {
    return (sourceType === 'lambda-api' || sourceType === 'lambda-worker') && 
           targetCapability === 'database:rds';
  }

  bind(context: BindingContext): BindingResult {
    const { source, target, directive } = context;

    // 1. Get the REAL L2 construct handles from the component instances
    const lambdaConstruct = source.getConstruct('main') as lambda.Function;
    const rdsConstruct = target.getConstruct('main') as rds.DatabaseInstance;

    if (!lambdaConstruct || !rdsConstruct) {
      throw new Error(`Could not retrieve construct handles for binding ${source.spec.name} -> ${target.spec.name}`);
    }

    // 2. Use high-level L2 methods to apply database connections and permissions
    this.grantRDSAccess(rdsConstruct, lambdaConstruct, directive.access);

    // 3. Configure VPC connectivity using CDK security groups
    this.configureNetworkAccess(rdsConstruct, lambdaConstruct, context);

    // 4. Apply security enhancements based on the database security profile
    const securityProfile = this.getSecurityProfile(target);
    if (this.requiresEnhancedSecurity(securityProfile)) {
      this.applyEnhancedSecurityPolicies(rdsConstruct, lambdaConstruct, context, securityProfile);
    }

    // 5. Handle SSL/TLS configuration for secure connections
    if (directive.options?.ssl !== false) {
      this.configureSecureConnection(rdsConstruct, lambdaConstruct, securityProfile);
    }

    // 6. Return environment variables from the REAL construct
    return {
      environmentVariables: {
        [directive.env?.host || 'DB_HOST']: rdsConstruct.instanceEndpoint.hostname,
        [directive.env?.port || 'DB_PORT']: rdsConstruct.instanceEndpoint.port.toString(),
        [directive.env?.database || 'DB_NAME']: target.getCapabilities()['database:rds'].database,
        [directive.env?.connectionString || 'DATABASE_URL']: this.buildConnectionString(rdsConstruct, target, directive.options?.ssl !== false)
      }
    };
  }

  /**
   * Grant Lambda access to the database using CDK L2 methods
   */
  private grantRDSAccess(
    rdsConstruct: rds.DatabaseInstance, 
    lambdaConstruct: lambda.Function, 
    access: string
  ): void {
    switch (access) {
      case 'read':
      case 'readwrite': // Both read and readwrite need secret access
        // Grant Lambda permission to read database credentials from Secrets Manager
        rdsConstruct.secret?.grantRead(lambdaConstruct);
        break;
      case 'write':
        // Write operations still need credential access
        rdsConstruct.secret?.grantRead(lambdaConstruct);
        break;
      case 'admin':
        // Full access including secret management
        rdsConstruct.secret?.grantRead(lambdaConstruct);
        rdsConstruct.secret?.grantWrite(lambdaConstruct);
        break;
      default:
        throw new Error(`Invalid access level: ${access}. Valid values: read, write, readwrite, admin`);
    }
  }

  /**
   * Configure VPC network access using CDK security groups
   */
  private configureNetworkAccess(
    rdsConstruct: rds.DatabaseInstance,
    lambdaConstruct: lambda.Function,
    context: BindingContext
  ): void {
    // Use CDK's high-level connection methods to allow Lambda to connect to RDS
    rdsConstruct.connections.allowDefaultPortFrom(
      lambdaConstruct.connections,
      `Allow ${context.source.spec.name} to connect to ${context.target.spec.name}`
    );
  }

  /**
   * Apply FedRAMP-specific security enhancements using CDK
   */
  private requiresEnhancedSecurity(profile?: string): boolean {
    return profile ? ['hardened', 'stig'].includes(profile) : false;
  }

  private applyEnhancedSecurityPolicies(
    rdsConstruct: rds.DatabaseInstance,
    lambdaConstruct: lambda.Function,
    context: BindingContext,
    profile?: string
  ): void {
    lambdaConstruct.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'rds:DescribeDBInstances',
          'rds:DescribeDBClusters',
          'rds:ListTagsForResource'
        ],
        resources: [rdsConstruct.instanceArn],
        conditions: {
          'StringEquals': {
            'aws:RequestedRegion': context.environment,
            'aws:SecureTransport': 'true'
          }
        }
      })
    );
  }

  /**
   * Configure SSL/TLS secure connection requirements
   */
  private configureSecureConnection(
    rdsConstruct: rds.DatabaseInstance,
    lambdaConstruct: lambda.Function,
    securityProfile?: string
  ): void {
    // Add environment variable to enforce SSL connections
    lambdaConstruct.addEnvironment('DB_SSL_MODE', 'require');
    
    if (this.requiresEnhancedSecurity(securityProfile)) {
      lambdaConstruct.addEnvironment('DB_SSL_MODE', 'verify-full');
    }
  }

  /**
   * Build secure connection string with proper SSL configuration
   */
  private buildConnectionString(
    rdsConstruct: rds.DatabaseInstance,
    target: any,
    requireSsl: boolean
  ): string {
    const dbName = target.getCapabilities()['database:rds'].database;
    const sslParam = requireSsl ? '?sslmode=require' : '';
    
    return `postgresql://{username}:{password}@${rdsConstruct.instanceEndpoint.hostname}:${rdsConstruct.instanceEndpoint.port}/${dbName}${sslParam}`;
  }

  private getSecurityProfile(target: any): string | undefined {
    const capabilities = target.getCapabilities();
    const databaseCapability = capabilities['db:postgres'] || capabilities['database:rds'];
    return databaseCapability?.securityProfile;
  }
}
