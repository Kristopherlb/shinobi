/**
 * Platform Capability Naming Standard v1.0 - Implementation Examples
 * 
 * This file demonstrates how components provide and consume capabilities
 * according to the official Platform Capability Naming Standard.
 */

import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '../../contracts';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { Construct } from 'constructs';

/**
 * Example 1: Component Providing a Database Capability
 * 
 * Shows how an RDS PostgreSQL component exposes the `db:postgres` capability
 * with real, tokenized values from CDK constructs.
 */
export class RdsPostgresExampleComponent extends Component {
  private database!: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    // Create VPC for the database (simplified for example)
    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });
    
    // Create RDS instance (simplified for example)
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      databaseName: this.spec.config?.dbName || 'defaultdb',
      vpc
    });

    // Register construct for external access
    this.registerConstruct('database', this.database);

    // ✅ CRITICAL: Register capability following Platform Capability Naming Standard
    this.registerCapability('db:postgres', {
      host: this.database.instanceEndpoint.hostname,
      port: this.database.instanceEndpoint.port,
      dbName: this.spec.config?.dbName || 'defaultdb',
      secretArn: this.database.secret!.secretArn,
      sgId: this.database.connections.securityGroups[0].securityGroupId,
      instanceArn: this.database.instanceArn
    });
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'rds-postgres';
  }
}

/**
 * Example 2: Component Providing a Cache Capability
 * 
 * Shows how an ElastiCache Redis component exposes the `cache:redis` capability.
 */
export class ElastiCacheRedisExampleComponent extends Component {
  private replicationGroup!: elasticache.CfnReplicationGroup;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    // Create Redis replication group (simplified for example)
    this.replicationGroup = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
      replicationGroupDescription: 'Redis cluster for caching',
      numCacheClusters: 2,
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis'
    });

    // Register construct
    this.registerConstruct('replicationGroup', this.replicationGroup);

    // ✅ Register cache capability following standard
    this.registerCapability('cache:redis', {
      host: this.replicationGroup.attrPrimaryEndPointAddress,
      port: this.replicationGroup.attrPrimaryEndPointPort,
      sgId: 'sg-redis-example' // In real implementation, this would be actual SG ID
    });
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'elasticache-redis';
  }
}

/**
 * Example 3: Component Providing a Storage Capability
 * 
 * Shows how an S3 bucket component exposes the `bucket:s3` capability.
 */
export class S3BucketExampleComponent extends Component {
  private bucket!: s3.Bucket;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    // Create S3 bucket
    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: this.spec.config?.bucketName,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED
    });

    // Register construct
    this.registerConstruct('bucket', this.bucket);

    // ✅ Register storage capability following standard
    this.registerCapability('bucket:s3', {
      bucketName: this.bucket.bucketName,
      bucketArn: this.bucket.bucketArn
    });
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 's3-bucket';
  }
}

/**
 * Example 4: Component Providing a Streaming Capability
 * 
 * Shows how a Kinesis stream component exposes the `stream:kinesis` capability.
 */
export class KinesisStreamExampleComponent extends Component {
  private stream!: kinesis.Stream;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    // Create Kinesis stream
    this.stream = new kinesis.Stream(this, 'Stream', {
      streamName: this.spec.config?.streamName,
      shardCount: this.spec.config?.shardCount || 1,
      encryption: kinesis.StreamEncryption.MANAGED
    });

    // Register construct
    this.registerConstruct('stream', this.stream);

    // ✅ Register streaming capability following standard
    this.registerCapability('stream:kinesis', {
      streamName: this.stream.streamName,
      streamArn: this.stream.streamArn
    });
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'kinesis-stream';
  }
}

/**
 * Example Service Manifest Showing Capability Consumption
 * 
 * This demonstrates how components bind to capabilities using the
 * standard `category:service` naming convention.
 */
export const EXAMPLE_SERVICE_MANIFEST = `
service: example-microservice
owner: platform-team
complianceFramework: commercial

components:
  # Component providing database capability
  - name: user-database
    type: rds-postgres
    config:
      dbName: "users"

  # Component providing cache capability  
  - name: session-cache
    type: elasticache-redis
    
  # Component providing storage capability
  - name: file-storage
    type: s3-bucket
    config:
      bucketName: "user-uploads"

  # Component providing streaming capability
  - name: event-stream
    type: kinesis-stream
    config:
      streamName: "user-events"
      shardCount: 2

  # Component consuming multiple capabilities
  - name: user-api
    type: lambda-api
    config:
      handler: "src/user-api.handler"
    binds:
      # Bind to database capability
      - to: user-database
        capability: db:postgres
        access: readwrite
        
      # Bind to cache capability  
      - to: session-cache
        capability: cache:redis
        access: readwrite
        
      # Bind to storage capability
      - to: file-storage
        capability: bucket:s3
        access: write
        
      # Bind to streaming capability
      - to: event-stream
        capability: stream:kinesis
        access: write

  # Worker component consuming specific capabilities
  - name: analytics-worker
    type: lambda-worker
    config:
      handler: "src/analytics.handler"
    binds:
      # Read from event stream
      - to: event-stream
        capability: stream:kinesis
        access: read
        
      # Query user database
      - to: user-database
        capability: db:postgres
        access: read
`;

/**
 * Binding Strategy Example
 * 
 * Shows how a binding strategy uses the standardized capability data shapes
 * to wire components together automatically.
 */
export class LambdaToRdsBindingExample {
  /**
   * Example of how LambdaToRdsBinderStrategy would consume db:postgres capability
   */
  public static bindLambdaToPostgres(lambdaFunction: any, dbCapability: any) {
    // The binder strategy knows it will receive this exact data shape:
    const postgresData = dbCapability as {
      host: string;
      port: number;
      dbName: string;
      secretArn: string;
      sgId: string;
      instanceArn: string;
    };

    // Use the real, tokenized values for automatic wiring
    const environmentVariables = {
      DB_HOST: postgresData.host,
      DB_PORT: postgresData.port.toString(),
      DB_NAME: postgresData.dbName,
      DB_SECRET_ARN: postgresData.secretArn
    };

    console.log('Binding Lambda to PostgreSQL with environment variables:', environmentVariables);
    console.log('Granting access to security group:', postgresData.sgId);
    console.log('Granting access to RDS instance:', postgresData.instanceArn);
    
    // In real implementation:
    // 1. Set environment variables on Lambda function
    // 2. Grant Lambda role access to Secrets Manager secret
    // 3. Allow Lambda security group access to RDS security group
    // 4. Grant Lambda role RDS connection permissions
  }
}