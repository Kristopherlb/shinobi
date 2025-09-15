/**
 * Comprehensive Tests for Enhanced Logical ID Preservation System
 * Tests the complete logical ID mapping and drift avoidance functionality
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  LogicalIdManager,
  LogicalIdPreservationAspect,
  LogicalIdMap,
  LogicalIdMapEntry
} from '@platform/logical-id/logical-id-manager';
import {
  PlanningLogicalIdIntegration,
  PlanningContext,
  PlanningResult
} from '@platform/logical-id/planning-integration';
import {
  DriftAvoidanceEngine,
  DriftAnalysisResult
} from '@platform/logical-id/drift-avoidance';
import { Logger } from '@platform/logger';

describe('Enhanced Logical ID Preservation System', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let logger: Logger;
  let logicalIdManager: LogicalIdManager;
  let planningIntegration: PlanningLogicalIdIntegration;
  let driftAvoidanceEngine: DriftAvoidanceEngine;
  let tempDir: string;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    logger = new Logger(); // Logger with default INFO level
    logicalIdManager = new LogicalIdManager(logger);
    planningIntegration = new PlanningLogicalIdIntegration(logger);
    driftAvoidanceEngine = new DriftAvoidanceEngine(logger);

    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logical-id-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('LogicalIdManager', () => {
    test('should create and validate logical ID map', async () => {
      // Arrange
      const logicalIdMap = logicalIdManager.generateLogicalIdMap('TestStack', 'dev');

      // Act
      const validationResult = logicalIdManager.validateLogicalIdMap(logicalIdMap);

      // Assert
      expect(validationResult.valid).toBe(true);
      expect(logicalIdMap.version).toBe('1.0.0');
      expect(logicalIdMap.stackName).toBe('TestStack');
      expect(logicalIdMap.environment).toBe('dev');
      expect(logicalIdMap.mappings).toBeDefined();
    });

    test('should load and save logical ID map', async () => {
      // Arrange
      const logicalIdMap = logicalIdManager.generateLogicalIdMap('TestStack', 'dev');
      const mapPath = path.join(tempDir, 'logical-id-map.json');

      // Act
      await logicalIdManager.saveLogicalIdMap(logicalIdMap, mapPath);
      const loadedMap = await logicalIdManager.loadLogicalIdMap(mapPath);

      // Assert
      expect(loadedMap).not.toBeNull();
      expect(loadedMap!.version).toBe(logicalIdMap.version);
      expect(loadedMap!.stackName).toBe(logicalIdMap.stackName);
      expect(loadedMap!.environment).toBe(logicalIdMap.environment);
    });

    test('should detect logical ID conflicts', () => {
      // Arrange
      const logicalIdMap: LogicalIdMap = {
        version: '1.0.0',
        stackName: 'TestStack',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mappings: {
          'Resource1': {
            originalId: 'OriginalResource1',
            newId: 'Resource1',
            resourceType: 'AWS::Lambda::Function',
            componentName: 'api',
            componentType: 'lambda-api',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          'Resource2': {
            originalId: 'OriginalResource1', // Conflict: same original ID
            newId: 'Resource2',
            resourceType: 'AWS::RDS::DBInstance',
            componentName: 'database',
            componentType: 'rds-postgres',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        },
        driftAvoidanceConfig: {
          enableDeterministicNaming: true,
          preserveResourceOrder: true,
          validateBeforeApply: true
        }
      };

      // Act
      const conflicts = logicalIdManager.detectConflicts(logicalIdMap);

      // Assert
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0]).toContain('OriginalResource1');
    });

    test('should apply logical ID preservation aspect', () => {
      // Arrange
      const lambdaFunction = new lambda.Function(stack, 'ApiFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {};')
      });

      const database = new rds.DatabaseInstance(stack, 'Database', {
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        vpc: new ec2.Vpc(stack, 'Vpc'),
        credentials: rds.Credentials.fromGeneratedSecret('dbuser'),
        databaseName: 'testdb'
      });

      const logicalIdMap: LogicalIdMap = {
        version: '1.0.0',
        stackName: 'TestStack',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mappings: {
          'ApiFunctionCE271BD4': {
            originalId: 'OriginalApiFunction123',
            newId: 'ApiFunctionCE271BD4',
            resourceType: 'AWS::Lambda::Function',
            componentName: 'api',
            componentType: 'lambda-api',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          'DatabaseB269D8BB': {
            originalId: 'OriginalDatabase456',
            newId: 'DatabaseB269D8BB',
            resourceType: 'AWS::RDS::DBInstance',
            componentName: 'database',
            componentType: 'rds-postgres',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        },
        driftAvoidanceConfig: {
          enableDeterministicNaming: true,
          preserveResourceOrder: true,
          validateBeforeApply: true
        }
      };

      // Act
      const aspect = logicalIdManager.applyLogicalIdPreservation(stack, logicalIdMap);
      const template = app.synth().getStackByName('TestStack').template;
      const appliedMappings = aspect.getAppliedMappings();
      const stats = aspect.getMappingStats();


      // Assert
      expect(template.Resources['OriginalApiFunction123']).toBeDefined();
      expect(template.Resources['OriginalDatabase456']).toBeDefined();
      expect(template.Resources['ApiFunctionCE271BD4']).toBeUndefined();
      expect(template.Resources['DatabaseB269D8BB']).toBeUndefined();
      expect(appliedMappings.length).toBeGreaterThan(0);
      expect(stats.applied).toBeGreaterThan(0);
    });
  });

  describe('PlanningLogicalIdIntegration', () => {
    test('should apply logical ID preservation during planning phase', async () => {
      // Arrange
      const lambdaFunction = new lambda.Function(stack, 'ApiFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {};')
      });

      const logicalIdMap: LogicalIdMap = {
        version: '1.0.0',
        stackName: 'TestStack',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mappings: {
          'ApiFunction': {
            originalId: 'OriginalApiFunction123',
            newId: 'ApiFunction',
            resourceType: 'AWS::Lambda::Function',
            componentName: 'api',
            componentType: 'lambda-api',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        },
        driftAvoidanceConfig: {
          enableDeterministicNaming: true,
          preserveResourceOrder: true,
          validateBeforeApply: true
        }
      };

      const mapPath = path.join(tempDir, 'logical-id-map.json');
      await logicalIdManager.saveLogicalIdMap(logicalIdMap, mapPath);

      const planningContext: PlanningContext = {
        stackName: 'TestStack',
        environment: 'dev',
        logicalIdMapPath: mapPath,
        enableDriftAvoidance: true,
        validateBeforePlan: true
      };

      // Act
      const planningResult = await planningIntegration.applyLogicalIdPreservationToPlan(
        stack,
        planningContext
      );

      // Assert
      expect(planningResult.success).toBe(true);
      expect(planningResult.template).toBeDefined();
      expect(planningResult.logicalIdMap).toBeDefined();
      expect(planningResult.driftAvoidanceReport).toBeDefined();
    });

    test('should generate comprehensive planning report', async () => {
      // Arrange
      const planningResult: PlanningResult = {
        success: true,
        appliedMappings: ['ApiFunction -> OriginalApiFunction123'],
        template: {
          Resources: {
            'OriginalApiFunction123': {
              Type: 'AWS::Lambda::Function'
            }
          }
        },
        logicalIdMap: logicalIdManager.generateLogicalIdMap('TestStack', 'dev'),
        driftAvoidanceReport: {
          summary: {
            totalMappings: 1,
            appliedMappings: 1,
            skippedMappings: 0,
            deterministicNaming: true
          },
          details: {
            preservationStrategies: { 'exact-match': 1 },
            resourceTypeBreakdown: { 'AWS::Lambda::Function': 1 },
            conflicts: []
          },
          recommendations: []
        },
        errors: [],
        warnings: []
      };

      // Act
      const report = planningIntegration.generatePlanningReport(planningResult);

      // Assert
      expect(report).toContain('Logical ID Preservation Planning Report');
      expect(report).toContain('✅ Logical ID preservation applied successfully');
      expect(report).toContain('Applied 1 logical ID mappings');
      expect(report).toContain('Drift Avoidance Summary');
    });
  });

  describe('DriftAvoidanceEngine', () => {
    test('should analyze drift in CDK stack', () => {
      // Arrange
      const lambdaFunction = new lambda.Function(stack, 'ApiFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {};')
      });

      const database = new rds.DatabaseInstance(stack, 'Database', {
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        vpc: new ec2.Vpc(stack, 'Vpc'),
        credentials: rds.Credentials.fromGeneratedSecret('dbuser'),
        databaseName: 'testdb'
      });

      const logicalIdMap: LogicalIdMap = {
        version: '1.0.0',
        stackName: 'TestStack',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mappings: {
          'ApiFunction': {
            originalId: 'OriginalApiFunction123',
            newId: 'ApiFunction',
            resourceType: 'AWS::Lambda::Function',
            componentName: 'api',
            componentType: 'lambda-api',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
          // Database mapping intentionally missing to test drift detection
        },
        driftAvoidanceConfig: {
          enableDeterministicNaming: true,
          preserveResourceOrder: true,
          validateBeforeApply: true
        }
      };

      // Act
      const driftAnalysis = driftAvoidanceEngine.analyzeDrift(stack, logicalIdMap);

      // Assert
      expect(driftAnalysis.detectedDrifts.length).toBeGreaterThan(0);
      expect(driftAnalysis.detectedDrifts.some((d: any) => d.resourceType === 'AWS::RDS::DBInstance')).toBe(true);
      expect(driftAnalysis.riskLevel).toBeDefined();
      expect(driftAnalysis.summary.totalResources).toBeGreaterThan(0);
      expect(driftAnalysis.recommendedActions.length).toBeGreaterThan(0);
    });

    test('should apply drift avoidance strategies', () => {
      // Arrange
      const lambdaFunction = new lambda.Function(stack, 'ApiFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {};')
      });

      const logicalIdMap: LogicalIdMap = {
        version: '1.0.0',
        stackName: 'TestStack',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mappings: {},
        driftAvoidanceConfig: {
          enableDeterministicNaming: true,
          preserveResourceOrder: true,
          validateBeforeApply: true
        }
      };

      // Act
      const result = driftAvoidanceEngine.applyDriftAvoidance(stack, logicalIdMap);

      // Assert
      expect(result.appliedStrategies.length).toBeGreaterThan(0);
      expect(result.modifiedResources).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    test('should validate drift avoidance configuration', () => {
      // Arrange
      const logicalIdMap: LogicalIdMap = {
        version: '1.0.0',
        stackName: 'TestStack',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mappings: {
          'Resource1': {
            originalId: 'OriginalResource1',
            newId: 'Resource1',
            resourceType: 'AWS::Lambda::Function',
            componentName: 'api',
            componentType: 'lambda-api',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        },
        driftAvoidanceConfig: {
          enableDeterministicNaming: true,
          preserveResourceOrder: true,
          validateBeforeApply: true
        }
      };

      // Act
      const validation = driftAvoidanceEngine.validateDriftAvoidanceConfig(logicalIdMap);

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.issues).toBeDefined();
      expect(validation.recommendations).toBeDefined();
    });
  });

  describe('Zero-Drift Migration Validation', () => {
    test('should achieve zero drift with logical ID preservation', async () => {
      // Arrange: Create resources that would normally get platform-generated logical IDs
      const lambdaFunction = new lambda.Function(stack, 'ApiFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {};')
      });

      const bucket = new s3.Bucket(stack, 'DataBucket', {
        bucketName: 'test-bucket-name'
      });

      const database = new rds.DatabaseInstance(stack, 'Database', {
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_4 }),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        vpc: new ec2.Vpc(stack, 'Vpc'),
        credentials: rds.Credentials.fromGeneratedSecret('dbuser'),
        databaseName: 'testdb'
      });

      // Create comprehensive logical ID mapping
      const logicalIdMap: LogicalIdMap = {
        version: '1.0.0',
        stackName: 'TestStack',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mappings: {
          'ApiFunctionCE271BD4': {
            originalId: 'OriginalApiFunction123ABC',
            newId: 'ApiFunctionCE271BD4',
            resourceType: 'AWS::Lambda::Function',
            componentName: 'api',
            componentType: 'lambda-api',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          'DataBucketE3889A50': {
            originalId: 'OriginalDataBucket456DEF',
            newId: 'DataBucketE3889A50',
            resourceType: 'AWS::S3::Bucket',
            componentName: 'storage',
            componentType: 's3-bucket',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          'DatabaseB269D8BB': {
            originalId: 'OriginalDatabase789GHI',
            newId: 'DatabaseB269D8BB',
            resourceType: 'AWS::RDS::DBInstance',
            componentName: 'database',
            componentType: 'rds-postgres',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        },
        driftAvoidanceConfig: {
          enableDeterministicNaming: true,
          preserveResourceOrder: true,
          validateBeforeApply: true
        }
      };

      // Act: Apply logical ID preservation
      const aspect = logicalIdManager.applyLogicalIdPreservation(stack, logicalIdMap);
      const template = app.synth().getStackByName('TestStack').template;
      const appliedMappings = aspect.getAppliedMappings();
      const stats = aspect.getMappingStats();


      // Assert: Verify zero drift achieved
      expect(template.Resources['OriginalApiFunction123ABC']).toBeDefined();
      expect(template.Resources['OriginalDataBucket456DEF']).toBeDefined();
      expect(template.Resources['OriginalDatabase789GHI']).toBeDefined();

      // Verify new platform logical IDs are NOT present
      expect(template.Resources['TestStackApiFunctionResourceFunction']).toBeUndefined();
      expect(template.Resources['TestStackDataBucketResourceBucket']).toBeUndefined();
      expect(template.Resources['TestStackDatabaseResourceDatabase']).toBeUndefined();

      // Verify all mappings were applied
      expect(stats.applied).toBe(3);
      expect(stats.skipped).toBe(0);
      expect(appliedMappings.length).toBe(3);

      // Verify resource types are preserved
      expect(template.Resources['OriginalApiFunction123ABC'].Type).toBe('AWS::Lambda::Function');
      expect(template.Resources['OriginalDataBucket456DEF'].Type).toBe('AWS::S3::Bucket');
      expect(template.Resources['OriginalDatabase789GHI'].Type).toBe('AWS::RDS::DBInstance');
    });

    test('should handle complex resource hierarchies with dependencies', () => {
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

      // Create comprehensive logical ID mapping for complex hierarchy
      const logicalIdMap: LogicalIdMap = {
        version: '1.0.0',
        stackName: 'TestStack',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mappings: {
          'AppVpc80F1F7F9': {
            originalId: 'ProdAppVpcABC123',
            newId: 'AppVpc80F1F7F9',
            resourceType: 'AWS::EC2::VPC',
            componentName: 'networking',
            componentType: 'vpc',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          'LambdaSecurityGroup0BD9FC99': {
            originalId: 'ProdSecurityGroupXYZ456',
            newId: 'LambdaSecurityGroup0BD9FC99',
            resourceType: 'AWS::EC2::SecurityGroup',
            componentName: 'security',
            componentType: 'security-group',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          'ApiFunctionCE271BD4': {
            originalId: 'ProdApiFunctionDEF789',
            newId: 'ApiFunctionCE271BD4',
            resourceType: 'AWS::Lambda::Function',
            componentName: 'api',
            componentType: 'lambda-api',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          'DatabaseB269D8BB': {
            originalId: 'ProdDatabaseGHI012',
            newId: 'DatabaseB269D8BB',
            resourceType: 'AWS::RDS::DBInstance',
            componentName: 'database',
            componentType: 'rds-postgres',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        },
        driftAvoidanceConfig: {
          enableDeterministicNaming: true,
          preserveResourceOrder: true,
          validateBeforeApply: true
        }
      };

      // Act: Apply preservation
      const aspect = logicalIdManager.applyLogicalIdPreservation(stack, logicalIdMap);
      const template = app.synth().getStackByName('TestStack').template;

      // Assert: All resources preserve their production logical IDs
      expect(template.Resources['ProdAppVpcABC123']).toBeDefined();
      expect(template.Resources['ProdSecurityGroupXYZ456']).toBeDefined();
      expect(template.Resources['ProdApiFunctionDEF789']).toBeDefined();
      expect(template.Resources['ProdDatabaseGHI012']).toBeDefined();

      // Assert: Dependencies are maintained with preserved IDs
      const lambdaResource = template.Resources['ProdApiFunctionDEF789'];
      expect(lambdaResource.Properties.VpcConfig.SecurityGroupIds).toContainEqual({
        'Fn::GetAtt': ['ProdSecurityGroupXYZ456', 'GroupId']
      });

      // Verify security group references are updated
      const sgResource = template.Resources['ProdSecurityGroupXYZ456'];
      expect(sgResource.Properties.VpcId).toEqual({ Ref: 'ProdAppVpcABC123' });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty logical ID map gracefully', () => {
      // Arrange
      const logicalIdMap: LogicalIdMap = {
        version: '1.0.0',
        stackName: 'TestStack',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mappings: {},
        driftAvoidanceConfig: {
          enableDeterministicNaming: true,
          preserveResourceOrder: true,
          validateBeforeApply: true
        }
      };

      const lambdaFunction = new lambda.Function(stack, 'ApiFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {};')
      });

      // Act
      const aspect = logicalIdManager.applyLogicalIdPreservation(stack, logicalIdMap);
      const template = app.synth().getStackByName('TestStack').template;
      const stats = aspect.getMappingStats();

      // Assert - should have default CDK logical ID since no mapping applied
      const resourceKeys = Object.keys(template.Resources);
      const lambdaResourceKey = resourceKeys.find(key =>
        template.Resources[key].Type === 'AWS::Lambda::Function'
      );
      expect(lambdaResourceKey).toBeDefined();
      expect(template.Resources[lambdaResourceKey!]).toBeDefined();
      expect(stats.applied).toBe(0);
      expect(stats.skipped).toBe(0);
    });

    test('should handle invalid logical ID map gracefully', async () => {
      // Arrange
      const invalidMapPath = path.join(tempDir, 'invalid-map.json');
      fs.writeFileSync(invalidMapPath, '{"invalid": "json"}');

      // Act
      const result = await logicalIdManager.loadLogicalIdMap(invalidMapPath);

      // Assert
      expect(result).toBeNull();
    });

    test('should handle special characters in logical IDs', () => {
      // Arrange
      const lambdaFunction = new lambda.Function(stack, 'TestFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => {};')
      });

      const logicalIdMap: LogicalIdMap = {
        version: '1.0.0',
        stackName: 'TestStack',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mappings: {
          'TestFunctionCE271BD4': {
            originalId: 'Original-Function_With.Special123',
            newId: 'TestFunctionCE271BD4',
            resourceType: 'AWS::Lambda::Function',
            componentName: 'api',
            componentType: 'lambda-api',
            preservationStrategy: 'exact-match',
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        },
        driftAvoidanceConfig: {
          enableDeterministicNaming: true,
          preserveResourceOrder: true,
          validateBeforeApply: true
        }
      };

      // Act
      const aspect = logicalIdManager.applyLogicalIdPreservation(stack, logicalIdMap);
      const template = app.synth().getStackByName('TestStack').template;

      // Assert: Should handle special characters gracefully
      const resourceKeys = Object.keys(template.Resources);
      const lambdaResourceKey = resourceKeys.find(key =>
        template.Resources[key].Type === 'AWS::Lambda::Function'
      );
      expect(lambdaResourceKey).toBeDefined();
      expect(template.Resources[lambdaResourceKey!]).toBeDefined();
    });
  });
});
