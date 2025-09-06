/**
 * Concrete Component Implementations
 * Demonstrates the Factory Method pattern with real component types
 */

import { Component, ComponentSpec, ComponentContext, ComponentCreator, ComponentCapabilities } from './component-factory';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';

/**
 * Lambda API Component - Concrete Product
 */
export class LambdaApiComponent extends Component {
  getType(): string {
    return 'lambda-api';
  }

  synth(): void {
    // Step 1: Assemble final properties for the Lambda function
    const finalLambdaProps: lambda.FunctionProps = {
      functionName: `${this.context.serviceName}-${this.spec.name}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(this.generateHandlerCode()),
      environment: this.buildEnvironmentVariables(),
      memorySize: this.spec.overrides?.function?.memorySize || this.getDefaultMemorySize(),
      timeout: cdk.Duration.seconds(this.spec.overrides?.function?.timeout || this.getDefaultTimeout())
    };

    // Step 2: Instantiate the NATIVE CDK L2 construct
    const lambdaFunction = new lambda.Function(this.context.scope, `${this.spec.name}-function`, finalLambdaProps);

    // Step 3: Store handle to the REAL construct object
    this.constructs.set('lambda.Function', lambdaFunction);
    this.constructs.set('main', lambdaFunction);

    // Step 4: Set capabilities with REAL tokenized outputs from the construct
    this.setCapabilities({
      'api:rest': {
        functionArn: lambdaFunction.functionArn,
        functionName: lambdaFunction.functionName,
        roleArn: lambdaFunction.role?.roleArn
      }
    });
  }

  getCapabilities(): ComponentCapabilities {
    this.ensureSynthesized();
    return this.capabilities;
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

  synth(): void {
    // Step 1: Use private helpers to assemble final properties for the L2 construct
    const finalRdsProps: rds.DatabaseInstanceProps = {
      vpc: this.getRequiredVpc(),
      engine: rds.DatabaseInstanceEngine.postgres({
        version: this.getPostgresVersion()
      }),
      instanceType: this.parseInstanceType(),
      allocatedStorage: this.getAllocatedStorage(),
      storageEncrypted: this.isEncryptionRequired(),
      backupRetention: cdk.Duration.days(this.getBackupRetentionDays()),
      multiAz: this.isMultiAZRequired(),
      storageType: rds.StorageType.GP3,
      enablePerformanceInsights: this.isPerformanceInsightsEnabled(),
      performanceInsightRetention: this.isPerformanceInsightsEnabled() 
        ? rds.PerformanceInsightRetention.DEFAULT 
        : undefined,
      deletionProtection: this.isDeletionProtectionEnabled(),
      databaseName: this.spec.config.dbName,
      credentials: rds.Credentials.fromGeneratedSecret('postgres')
    };

    // Step 2: Instantiate the NATIVE CDK L2 construct
    const rdsInstance = new rds.DatabaseInstance(
      this.context.scope,
      `${this.spec.name}-db`,
      finalRdsProps
    );

    // Step 3: Store handle to the REAL construct object
    this.constructs.set('rds.DatabaseInstance', rdsInstance);
    this.constructs.set('main', rdsInstance);

    // Step 4: Set capabilities with REAL tokenized outputs from the construct
    this.setCapabilities({
      'db:postgres': {
        host: rdsInstance.instanceEndpoint.hostname,
        port: rdsInstance.instanceEndpoint.port,
        secretArn: rdsInstance.secret!.secretArn, // Deploy-time token
        sgId: rdsInstance.connections.securityGroups[0].securityGroupId,
        instanceArn: rdsInstance.instanceArn
      }
    });
  }

  getCapabilities(): ComponentCapabilities {
    this.ensureSynthesized();
    return this.capabilities;
  }

  private getEngineVersion(): string {
    // Framework-specific version requirements
    return this.context.complianceFramework.startsWith('fedramp') ? '15.4' : '15.3';
  }

  private getPostgresVersion(): rds.PostgresEngineVersion {
    // Use proper CDK constants for engine versions
    const version = this.getEngineVersion();
    switch (version) {
      case '15.4':
        return rds.PostgresEngineVersion.VER_15_4;
      case '15.3':
        return rds.PostgresEngineVersion.VER_15_3;
      default:
        return rds.PostgresEngineVersion.VER_15_4; // Safe fallback
    }
  }

  private getRequiredVpc(): ec2.IVpc {
    if (!this.context.vpc) {
      throw new Error(`VPC is required for RDS component '${this.spec.name}'. Please provide vpc in ComponentContext.`);
    }
    return this.context.vpc;
  }

  private parseInstanceType(): ec2.InstanceType {
    const instanceClass = this.getInstanceClass();
    const [db, family, size] = instanceClass.split('.');
    
    // Map family and size to proper CDK enums
    const instanceClassEnum = family.toUpperCase() as keyof typeof ec2.InstanceClass;
    const instanceSizeEnum = size.toUpperCase() as keyof typeof ec2.InstanceSize;
    
    return ec2.InstanceType.of(
      ec2.InstanceClass[instanceClassEnum],
      ec2.InstanceSize[instanceSizeEnum]
    );
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

  synth(): void {
    // Step 1: Assemble final properties for the SQS queue
    const finalQueueProps: sqs.QueueProps = {
      queueName: this.buildQueueName(),
      fifo: this.spec.config.fifo || false,
      visibilityTimeout: cdk.Duration.seconds(this.spec.config.visibilityTimeout || 300),
      retentionPeriod: cdk.Duration.seconds(this.getRetentionPeriod()),
      encryption: this.getEncryptionConfig(),
      deadLetterQueue: this.getDeadLetterQueueConfig()
    };

    // Step 2: Instantiate the NATIVE CDK L2 construct
    const queue = new sqs.Queue(this.context.scope, `${this.spec.name}-queue`, finalQueueProps);

    // Step 3: Store handle to the REAL construct object
    this.constructs.set('sqs.Queue', queue);
    this.constructs.set('main', queue);

    // Step 4: Set capabilities with REAL tokenized outputs from the construct
    this.setCapabilities({
      'queue:sqs': {
        queueUrl: queue.queueUrl, // Deploy-time token
        queueArn: queue.queueArn, // Deploy-time token
        queueName: queue.queueName
      }
    });
  }

  getCapabilities(): ComponentCapabilities {
    this.ensureSynthesized();
    return this.capabilities;
  }

  private getRetentionPeriod(): number {
    // FedRAMP requires longer retention for audit purposes
    return this.context.complianceFramework.startsWith('fedramp') ? 1209600 : 345600;
  }

  private getEncryptionConfig(): sqs.QueueEncryption {
    // Encryption required for FedRAMP
    return this.context.complianceFramework.startsWith('fedramp') 
      ? sqs.QueueEncryption.KMS_MANAGED 
      : sqs.QueueEncryption.UNENCRYPTED;
  }

  private getDeadLetterQueueConfig(): sqs.DeadLetterQueue | undefined {
    if (!this.spec.overrides?.queue?.deadLetter) {
      return undefined;
    }

    // Create dead letter queue with CDK L2 construct
    const dlqProps: sqs.QueueProps = {
      queueName: this.buildDLQName(),
      fifo: this.spec.config.fifo || false,
      encryption: this.getEncryptionConfig(),
      retentionPeriod: cdk.Duration.seconds(1209600) // 14 days for DLQ
    };

    const dlq = new sqs.Queue(this.context.scope, `${this.spec.name}-dlq`, dlqProps);
    
    return {
      queue: dlq,
      maxReceiveCount: this.getMaxReceiveCount()
    };
  }

  private buildQueueName(): string {
    const baseName = `${this.context.serviceName}-${this.spec.name}`;
    const isFifo = this.spec.config.fifo || false;
    
    // FIFO queues must end with .fifo suffix
    if (isFifo && !baseName.endsWith('.fifo')) {
      return `${baseName}.fifo`;
    }
    
    return baseName;
  }

  private buildDLQName(): string {
    const baseName = `${this.context.serviceName}-${this.spec.name}-dlq`;
    const isFifo = this.spec.config.fifo || false;
    
    // FIFO DLQ must also end with .fifo suffix
    if (isFifo && !baseName.endsWith('.fifo')) {
      return `${baseName}.fifo`;
    }
    
    return baseName;
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