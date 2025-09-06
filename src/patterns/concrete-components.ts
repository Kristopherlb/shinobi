/**
 * Concrete Component Implementations
 * Demonstrates the Factory Method pattern with real component types
 */

import { Component, ComponentSpec, ComponentContext, ComponentCreator, ComponentCapabilities } from './component-factory';

/**
 * Lambda API Component - Concrete Product
 */
export class LambdaApiComponent extends Component {
  getType(): string {
    return 'lambda-api';
  }

  synth(): any {
    // Create the Lambda function construct properties
    const lambdaProps = {
      type: 'AWS::Lambda::Function',
      properties: {
        functionName: `${this.context.serviceName}-${this.spec.name}`,
        runtime: 'nodejs20.x',
        handler: 'index.handler',
        code: {
          zipFile: this.generateHandlerCode()
        },
        environment: {
          variables: this.buildEnvironmentVariables()
        },
        memorySize: this.spec.overrides?.function?.memorySize || this.getDefaultMemorySize(),
        timeout: this.spec.overrides?.function?.timeout || this.getDefaultTimeout()
      }
    };

    // Store construct for later access by binding and patching phases
    this.constructs.set('lambda.Function', lambdaProps);
    this.constructs.set('main', lambdaProps); // Primary construct reference

    return lambdaProps;
  }

  getCapabilities(): ComponentCapabilities {
    return {
      'api:rest': {
        endpoint: `https://api.${this.context.serviceName}.aws.com`,
        stage: this.context.environment
      },
      'net:security-group': {
        sgId: `sg-${this.spec.name}-lambda`
      }
    };
  }

  private generateHandlerCode(): string {
    const routes = this.spec.config.routes || [];
    return `
exports.handler = async (event) => {
  const { httpMethod, path } = event;
  
  ${routes.map((route: any) => `
  if (httpMethod === '${route.method}' && path === '${route.path}') {
    // Route: ${route.method} ${route.path}
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Handler for ${route.path}' })
    };
  }`).join('')}
  
  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Route not found' })
  };
};
    `.trim();
  }

  private buildEnvironmentVariables(): Record<string, any> {
    const baseVars = {
      SERVICE_NAME: this.context.serviceName,
      ENVIRONMENT: this.context.environment,
      COMPLIANCE_FRAMEWORK: this.context.complianceFramework
    };

    // Add environment variables from binds
    if (this.spec.binds) {
      this.spec.binds.forEach(bind => {
        if (bind.env) {
          Object.assign(baseVars, bind.env);
        }
      });
    }

    return baseVars;
  }

  private getDefaultMemorySize(): number {
    // Framework-specific defaults
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 1024; // More memory for enhanced security processing
      case 'fedramp-moderate':
        return 768;
      default:
        return 512;
    }
  }

  private getDefaultTimeout(): number {
    return this.context.complianceFramework.startsWith('fedramp') ? 30 : 15;
  }
}

/**
 * RDS Postgres Component - Concrete Product
 */
export class RdsPostgresComponent extends Component {
  getType(): string {
    return 'rds-postgres';
  }

  synth(): any {
    // Create the RDS instance construct properties
    const rdsProps = {
      type: 'AWS::RDS::DBInstance',
      properties: {
        dbInstanceIdentifier: `${this.context.serviceName}-${this.spec.name}`,
        dbName: this.spec.config.dbName,
        engine: 'postgres',
        engineVersion: this.getEngineVersion(),
        dbInstanceClass: this.getInstanceClass(),
        allocatedStorage: this.getAllocatedStorage(),
        storageEncrypted: this.isEncryptionRequired(),
        backupRetentionPeriod: this.getBackupRetentionDays(),
        multiAZ: this.isMultiAZRequired(),
        storageType: 'gp3',
        performanceInsights: this.isPerformanceInsightsEnabled(),
        deletionProtection: this.isDeletionProtectionEnabled()
      }
    };

    // Store constructs for later access by binding and patching phases
    this.constructs.set('rds.DatabaseInstance', rdsProps);
    this.constructs.set('main', rdsProps); // Primary construct reference

    // Create associated security group
    const securityGroup = {
      type: 'AWS::EC2::SecurityGroup',
      properties: {
        groupDescription: `Security group for ${this.context.serviceName}-${this.spec.name} RDS instance`,
        vpcId: '${vpc.ref}',
        securityGroupIngress: [] // Will be populated by binders
      }
    };
    this.constructs.set('rds.SecurityGroup', securityGroup);

    return rdsProps;
  }

  getCapabilities(): ComponentCapabilities {
    return {
      'db:postgres': {
        host: `${this.spec.name}.${this.context.serviceName}.rds.amazonaws.com`,
        port: 5432,
        dbName: this.spec.config.dbName,
        secretArn: `arn:aws:secretsmanager:region:account:secret:${this.spec.name}-secret`,
        sgId: `sg-${this.spec.name}-rds`
      }
    };
  }

  private getEngineVersion(): string {
    // Framework-specific version requirements
    return this.context.complianceFramework.startsWith('fedramp') ? '15.4' : '15.3';
  }

  private getInstanceClass(): string {
    const override = this.spec.overrides?.instance?.class;
    if (override) {
      if (typeof override === 'object') {
        return override[this.context.environment] || 'db.t3.micro';
      }
      return override;
    }

    // Default based on compliance framework
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 'db.r5.large';
      case 'fedramp-moderate':
        return 'db.r5.medium';
      default:
        return 'db.t3.micro';
    }
  }

  private getAllocatedStorage(): number {
    const override = this.spec.overrides?.instance?.storageGb;
    if (override) {
      if (typeof override === 'object') {
        return override[this.context.environment] || 20;
      }
      return override;
    }
    return 20;
  }

  private isEncryptionRequired(): boolean {
    // Always encrypted for FedRAMP
    return this.context.complianceFramework.startsWith('fedramp') || 
           this.spec.config.encrypted === true;
  }

  private getBackupRetentionDays(): number {
    const configValue = this.spec.config.backupRetentionDays;
    if (typeof configValue === 'object') {
      return configValue[this.context.environment] || this.getDefaultRetention();
    }
    return configValue || this.getDefaultRetention();
  }

  private getDefaultRetention(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 35;
      case 'fedramp-moderate':
        return 30;
      default:
        return 7;
    }
  }

  private isMultiAZRequired(): boolean {
    return this.context.environment === 'prod' || 
           this.context.complianceFramework.startsWith('fedramp');
  }

  private isPerformanceInsightsEnabled(): boolean {
    return this.context.complianceFramework.startsWith('fedramp');
  }

  private isDeletionProtectionEnabled(): boolean {
    return this.context.environment === 'prod' || 
           this.context.complianceFramework.startsWith('fedramp');
  }
}

/**
 * SQS Queue Component - Concrete Product
 */
export class SqsQueueComponent extends Component {
  getType(): string {
    return 'sqs-queue';
  }

  synth(): any {
    return {
      type: 'AWS::SQS::Queue',
      properties: {
        queueName: `${this.context.serviceName}-${this.spec.name}`,
        fifoQueue: this.spec.config.fifo || false,
        visibilityTimeoutSeconds: this.spec.config.visibilityTimeout || 300,
        messageRetentionPeriod: this.getRetentionPeriod(),
        kmsMasterKeyId: this.getKmsKeyId(),
        deadLetterTargetArn: this.getDeadLetterQueueArn(),
        maxReceiveCount: this.getMaxReceiveCount()
      }
    };
  }

  getCapabilities(): ComponentCapabilities {
    const queueName = `${this.context.serviceName}-${this.spec.name}`;
    return {
      'queue:sqs': {
        queueUrl: `https://sqs.region.amazonaws.com/account/${queueName}`,
        queueArn: `arn:aws:sqs:region:account:${queueName}`
      }
    };
  }

  private getRetentionPeriod(): number {
    // FedRAMP requires longer retention for audit purposes
    return this.context.complianceFramework.startsWith('fedramp') ? 1209600 : 345600;
  }

  private getKmsKeyId(): string | undefined {
    // Encryption required for FedRAMP
    return this.context.complianceFramework.startsWith('fedramp') ? 'alias/aws/sqs' : undefined;
  }

  private getDeadLetterQueueArn(): string | undefined {
    return this.spec.overrides?.queue?.deadLetter ? 
           `arn:aws:sqs:region:account:${this.spec.name}-dlq` : 
           undefined;
  }

  private getMaxReceiveCount(): number {
    return this.spec.overrides?.queue?.deadLetter?.maxReceiveCount || 3;
  }
}

/**
 * Concrete Creators for each component type
 */
export class LambdaApiCreator extends ComponentCreator {
  createComponent(spec: ComponentSpec, context: ComponentContext): Component {
    return new LambdaApiComponent(spec, context);
  }
}

export class RdsPostgresCreator extends ComponentCreator {
  createComponent(spec: ComponentSpec, context: ComponentContext): Component {
    return new RdsPostgresComponent(spec, context);
  }
}

export class SqsQueueCreator extends ComponentCreator {
  createComponent(spec: ComponentSpec, context: ComponentContext): Component {
    return new SqsQueueComponent(spec, context);
  }
}