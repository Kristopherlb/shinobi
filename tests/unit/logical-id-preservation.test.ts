/**
 * Logical ID Preservation Unit Tests
 * Tests the core CDK Aspect system for preserving CloudFormation resource state
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { LogicalIdPreserver } from '../../src/migration/logical-id-preserver';
import { Logger } from '../../src/utils/logger';

describe('TC-MIGRATE-LID-01: Logical ID Preservation Unit Tests', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let preserver: LogicalIdPreserver;
  let logger: Logger;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    logger = new Logger();
    preserver = new LogicalIdPreserver(logger);
  });

  test('should correctly override logical IDs using CDK Aspect', () => {
    // Arrange: Create resources that would normally get platform-generated logical IDs
    const lambdaFunction = new lambda.Function(stack, 'ApiFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    const vpc = new ec2.Vpc(stack, 'MyVpc', { maxAzs: 2 });
    
    const database = new rds.DatabaseInstance(stack, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc,
      credentials: rds.Credentials.fromGeneratedSecret('dbuser'),
      databaseName: 'testdb'
    });

    // Create logical ID mapping (new platform IDs → original CDK IDs)
    const logicalIdMap = {
      'ApiFunction': 'OriginalLambdaFunction123ABC',
      'Database': 'OriginalDatabaseXYZ456',
      'MyVpc': 'OriginalVpcDEF789'
    };

    // Act: Apply logical ID preservation aspect
    const aspect = new LogicalIdPreservationAspect(logicalIdMap);
    cdk.Aspects.of(stack).add(aspect);

    // Synthesize to apply aspects
    const template = app.synth().getStackByName('TestStack').template;

    // Assert: Verify original logical IDs are preserved
    expect(template.Resources['OriginalLambdaFunction123ABC']).toBeDefined();
    expect(template.Resources['OriginalLambdaFunction123ABC'].Type).toBe('AWS::Lambda::Function');
    
    expect(template.Resources['OriginalDatabaseXYZ456']).toBeDefined();
    expect(template.Resources['OriginalDatabaseXYZ456'].Type).toBe('AWS::RDS::DBInstance');
    
    expect(template.Resources['OriginalVpcDEF789']).toBeDefined();
    expect(template.Resources['OriginalVpcDEF789'].Type).toBe('AWS::EC2::VPC');

    // Assert: New platform logical IDs should NOT exist in template
    expect(template.Resources['ApiFunction']).toBeUndefined();
    expect(template.Resources['Database']).toBeUndefined();
    expect(template.Resources['MyVpc']).toBeUndefined();
  });

  test('should preserve complex resource hierarchies with dependencies', () => {
    // Arrange: Create resources with dependencies
    const vpc = new ec2.Vpc(stack, 'AppVpc', { maxAzs: 2 });
    
    const securityGroup = new ec2.SecurityGroup(stack, 'LambdaSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: true
    });

    const lambdaFunction = new lambda.Function(stack, 'ApiFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};'),
      vpc: vpc,
      securityGroups: [securityGroup]
    });

    const database = new rds.DatabaseInstance(stack, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpc,
      securityGroups: [securityGroup],
      credentials: rds.Credentials.fromGeneratedSecret('dbuser'),
      databaseName: 'testdb'
    });

    // Connect Lambda to Database
    database.connections.allowDefaultPortFrom(lambdaFunction);

    // Create comprehensive logical ID mapping
    const logicalIdMap = {
      'AppVpc': 'ProdAppVpcABC123',
      'LambdaSecurityGroup': 'ProdSecurityGroupXYZ456',
      'ApiFunction': 'ProdApiFunctionDEF789',
      'Database': 'ProdDatabaseGHI012'
    };

    // Act: Apply preservation
    const aspect = new LogicalIdPreservationAspect(logicalIdMap);
    cdk.Aspects.of(stack).add(aspect);
    const template = app.synth().getStackByName('TestStack').template;

    // Assert: All resources preserve their production logical IDs
    expect(template.Resources['ProdAppVpcABC123']).toBeDefined();
    expect(template.Resources['ProdSecurityGroupXYZ456']).toBeDefined();
    expect(template.Resources['ProdApiFunctionDEF789']).toBeDefined();
    expect(template.Resources['ProdDatabaseGHI012']).toBeDefined();

    // Assert: Dependencies are maintained with preserved IDs
    const lambdaResource = template.Resources['ProdApiFunctionDEF789'];
    expect(lambdaResource.Properties.VpcConfig.SecurityGroupIds).toContainEqual({
      Ref: 'ProdSecurityGroupXYZ456'
    });

    // Verify security group references are updated
    const sgResource = template.Resources['ProdSecurityGroupXYZ456'];
    expect(sgResource.Properties.VpcId).toEqual({ Ref: 'ProdAppVpcABC123' });
  });

  test('should only override logical IDs that exist in the mapping', () => {
    // Arrange: Create multiple resources but only map some
    const lambdaFunction = new lambda.Function(stack, 'MappedFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    const unmappedFunction = new lambda.Function(stack, 'UnmappedFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    // Only map one of the functions
    const logicalIdMap = {
      'MappedFunction': 'OriginalMappedFunction123'
      // UnmappedFunction intentionally not mapped
    };

    // Act: Apply preservation
    const aspect = new LogicalIdPreservationAspect(logicalIdMap);
    cdk.Aspects.of(stack).add(aspect);
    const template = app.synth().getStackByName('TestStack').template;

    // Assert: Mapped function uses original ID
    expect(template.Resources['OriginalMappedFunction123']).toBeDefined();
    expect(template.Resources['MappedFunction']).toBeUndefined();

    // Assert: Unmapped function keeps platform-generated ID
    expect(template.Resources['UnmappedFunction']).toBeDefined();
    expect(template.Resources['OriginalMappedFunction123'].Type).toBe('AWS::Lambda::Function');
    expect(template.Resources['UnmappedFunction'].Type).toBe('AWS::Lambda::Function');
  });

  test('should handle edge cases gracefully', () => {
    // Arrange: Create resources with various edge cases
    const lambdaFunction = new lambda.Function(stack, 'TestFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {};')
    });

    // Test cases with potential edge conditions
    const logicalIdMap = {
      'TestFunction': 'Original-Function_With.Special123',  // Special characters
      'NonExistentResource': 'ShouldNotCauseError',         // Mapping for non-existent resource
      '': 'EmptyKeyTest',                                    // Empty key
      'TestFunction2': ''                                    // Empty value
    };

    // Act: Apply preservation (should not throw errors)
    const aspect = new LogicalIdPreservationAspect(logicalIdMap);
    cdk.Aspects.of(stack).add(aspect);

    expect(() => {
      const template = app.synth().getStackByName('TestStack').template;
      
      // Assert: Valid mapping works with special characters
      expect(template.Resources['Original-Function_With.Special123']).toBeDefined();
      expect(template.Resources['TestFunction']).toBeUndefined();
      
    }).not.toThrow();
  });

  test('should generate correct logical ID mapping from analysis results', async () => {
    // Arrange: Mock analysis results that would come from actual CDK project
    const mockAnalysisResult = {
      stackName: 'TestStack',
      templatePath: '/tmp/template.json',
      template: {},
      resources: [
        {
          logicalId: 'ApiLambdaFunction8B5A7E7F',
          type: 'AWS::Lambda::Function',
          properties: { Runtime: 'nodejs18.x' }
        },
        {
          logicalId: 'DatabaseB269D8BB',
          type: 'AWS::RDS::DBInstance', 
          properties: { Engine: 'postgres' }
        },
        {
          logicalId: 'MyBucket8A1B2C3D',
          type: 'AWS::S3::Bucket',
          properties: {}
        }
      ],
      outputs: {},
      parameters: {},
      metadata: {}
    };

    const mockMappingResult = {
      components: [
        { name: 'api', type: 'lambda-api' },
        { name: 'database', type: 'rds-postgres' },
        { name: 'storage', type: 's3-bucket' }
      ],
      mappedResources: [
        { logicalId: 'ApiLambdaFunction8B5A7E7F', componentName: 'api', componentType: 'lambda-api' },
        { logicalId: 'DatabaseB269D8BB', componentName: 'database', componentType: 'rds-postgres' },
        { logicalId: 'MyBucket8A1B2C3D', componentName: 'storage', componentType: 's3-bucket' }
      ],
      unmappableResources: [],
      bindings: []
    };

    // Act: Generate logical ID mapping
    const preservationResult = await preserver.generateLogicalIdMap(
      mockAnalysisResult,
      mockMappingResult
    );

    // Assert: Verify mapping structure
    expect(preservationResult.logicalIdMap).toBeDefined();
    expect(preservationResult.mappings).toHaveLength(3);

    // Assert: Verify specific mappings (platform ID → original ID)
    expect(preservationResult.logicalIdMap['ApiFunction']).toBe('ApiLambdaFunction8B5A7E7F');
    expect(preservationResult.logicalIdMap['DatabaseDatabase']).toBe('DatabaseB269D8BB');
    expect(preservationResult.logicalIdMap['StorageBucket']).toBe('MyBucket8A1B2C3D');

    // Assert: Verify mapping details
    const apiMapping = preservationResult.mappings.find(m => m.originalId === 'ApiLambdaFunction8B5A7E7F');
    expect(apiMapping).toEqual({
      originalId: 'ApiLambdaFunction8B5A7E7F',
      newId: 'ApiFunction',
      resourceType: 'AWS::Lambda::Function',
      componentName: 'api',
      componentType: 'lambda-api',
      preservationStrategy: expect.stringMatching(/hash-suffix|naming-convention/)
    });
  });
});

/**
 * Test implementation of the Logical ID Preservation CDK Aspect
 * This replicates the production aspect that would be generated by the migration tool
 */
class LogicalIdPreservationAspect implements cdk.IAspect {
  constructor(private readonly logicalIdMap: Record<string, string>) {}

  visit(node: cdk.IConstruct): void {
    if (cdk.CfnResource.isCfnResource(node)) {
      const currentLogicalId = node.logicalId;
      
      if (this.logicalIdMap[currentLogicalId]) {
        const preservedId = this.logicalIdMap[currentLogicalId];
        node.overrideLogicalId(preservedId);
      }
    }
  }
}