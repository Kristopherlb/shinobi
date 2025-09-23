/**
 * Logical ID Preserver
 * Phase 3: Generates logical ID mapping to preserve CloudFormation resource state
 */

import { Logger } from '../core-engine/logger';
import { StackAnalysisResult } from './cloudformation-analyzer';
import { ResourceMappingResult } from './resource-mapper';

export interface LogicalIdPreservationMapping {
  originalId: string;
  newId: string;
  resourceType: string;
  componentName: string;
  componentType: string;
  preservationStrategy: 'exact-match' | 'hash-suffix' | 'naming-convention';
}

export interface LogicalIdPreservationResult {
  logicalIdMap: Record<string, string>;
  mappings: LogicalIdPreservationMapping[];
  preservationStrategies: Record<string, number>;
  warnings: string[];
}

/**
 * Generates logical ID mappings to ensure CloudFormation state preservation
 */
export class LogicalIdPreserver {
  constructor(private logger: Logger) {}

  async generateLogicalIdMap(
    analysisResult: StackAnalysisResult,
    mappingResult: ResourceMappingResult
  ): Promise<LogicalIdPreservationResult> {
    this.logger.debug('Generating logical ID preservation mapping');

    const mappings: LogicalIdPreservationMapping[] = [];
    const logicalIdMap: Record<string, string> = {};
    const preservationStrategies: Record<string, number> = {};
    const warnings: string[] = [];

    // Create mapping for each successfully mapped resource
    for (const mappedResource of mappingResult.mappedResources) {
      const originalResource = analysisResult.resources.find(
        r => r.logicalId === mappedResource.logicalId
      );

      if (!originalResource) {
        warnings.push(`Original resource not found for mapped resource: ${mappedResource.logicalId}`);
        continue;
      }

      // Generate expected new logical ID based on platform naming conventions
      const newLogicalId = this.generateExpectedLogicalId(
        mappedResource.componentName,
        mappedResource.componentType,
        originalResource.type
      );

      // Determine preservation strategy
      const strategy = this.determinePreservationStrategy(
        originalResource.logicalId,
        newLogicalId,
        originalResource.type
      );

      const mapping: LogicalIdPreservationMapping = {
        originalId: originalResource.logicalId,
        newId: newLogicalId,
        resourceType: originalResource.type,
        componentName: mappedResource.componentName,
        componentType: mappedResource.componentType,
        preservationStrategy: strategy
      };

      mappings.push(mapping);

      // Add to logical ID map (newId -> originalId for CDK Aspect usage)
      logicalIdMap[newLogicalId] = originalResource.logicalId;

      // Track strategy usage
      preservationStrategies[strategy] = (preservationStrategies[strategy] || 0) + 1;

      this.logger.debug(`Mapped ${newLogicalId} -> ${originalResource.logicalId} (${strategy})`);
    }

    // Validate for potential conflicts
    const conflicts = this.detectLogicalIdConflicts(mappings);
    if (conflicts.length > 0) {
      warnings.push(...conflicts);
    }

    this.logger.info(`Generated ${mappings.length} logical ID mappings`);
    
    return {
      logicalIdMap,
      mappings,
      preservationStrategies,
      warnings
    };
  }

  private generateExpectedLogicalId(
    componentName: string,
    componentType: string,
    resourceType: string
  ): string {
    // Generate the logical ID that our platform would create
    const componentPrefix = this.normalizeComponentName(componentName);
    const resourceSuffix = this.getResourceSuffix(componentType, resourceType);

    return `${componentPrefix}${resourceSuffix}`;
  }

  private normalizeComponentName(name: string): string {
    // Convert component name to PascalCase for CDK logical IDs
    return name
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  private getResourceSuffix(componentType: string, resourceType: string): string {
    // Map component types and resource types to expected suffixes
    const suffixMap: Record<string, Record<string, string>> = {
      'lambda-api': {
        'AWS::Lambda::Function': 'Function',
        'AWS::IAM::Role': 'ServiceRole',
        'AWS::Logs::LogGroup': 'LogGroup',
        'AWS::ApiGateway::RestApi': 'Api',
        'AWS::Lambda::Permission': 'Permission'
      },
      'lambda-worker': {
        'AWS::Lambda::Function': 'Function',
        'AWS::IAM::Role': 'ServiceRole',
        'AWS::Logs::LogGroup': 'LogGroup'
      },
      'rds-postgres': {
        'AWS::RDS::DBInstance': 'Database',
        'AWS::RDS::DBSubnetGroup': 'SubnetGroup',
        'AWS::EC2::SecurityGroup': 'SecurityGroup',
        'AWS::SecretsManager::Secret': 'Secret'
      },
      'sqs-queue': {
        'AWS::SQS::Queue': 'Queue',
        'AWS::SQS::QueuePolicy': 'QueuePolicy'
      },
      's3-bucket': {
        'AWS::S3::Bucket': 'Bucket',
        'AWS::S3::BucketPolicy': 'BucketPolicy'
      }
    };

    const componentMap = suffixMap[componentType];
    if (componentMap && componentMap[resourceType]) {
      return componentMap[resourceType];
    }

    // Fallback: extract suffix from resource type
    return resourceType.split('::').pop() || 'Resource';
  }

  private determinePreservationStrategy(
    originalId: string,
    expectedNewId: string,
    resourceType: string
  ): 'exact-match' | 'hash-suffix' | 'naming-convention' {
    // If IDs match exactly, no preservation needed
    if (originalId === expectedNewId) {
      return 'exact-match';
    }

    // If original ID has CDK hash suffix, use hash-suffix strategy
    if (this.hasCdkHashSuffix(originalId)) {
      return 'hash-suffix';
    }

    // Otherwise, use naming convention strategy
    return 'naming-convention';
  }

  private hasCdkHashSuffix(logicalId: string): boolean {
    // CDK generates hash suffixes like "ABC123DEF" (8 alphanumeric characters)
    return /[A-Z0-9]{8}$/.test(logicalId);
  }

  private detectLogicalIdConflicts(mappings: LogicalIdPreservationMapping[]): string[] {
    const conflicts: string[] = [];
    const newIdCounts = new Map<string, string[]>();

    // Group by new logical ID
    for (const mapping of mappings) {
      if (!newIdCounts.has(mapping.newId)) {
        newIdCounts.set(mapping.newId, []);
      }
      newIdCounts.get(mapping.newId)!.push(mapping.originalId);
    }

    // Check for conflicts (multiple original IDs mapping to same new ID)
    for (const [newId, originalIds] of newIdCounts.entries()) {
      if (originalIds.length > 1) {
        conflicts.push(
          `Conflict detected: Multiple resources would map to logical ID '${newId}': ${originalIds.join(', ')}`
        );
      }
    }

    return conflicts;
  }

  /**
   * Generate CDK Aspect code for applying logical ID overrides
   */
  generateCdkAspectCode(preservationResult: LogicalIdPreservationResult): string {
    const aspectCode = `
/**
 * Logical ID Preservation Aspect
 * Automatically generated by svc migrate tool
 * This aspect ensures CloudFormation resource state is preserved during migration
 */

import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

export class LogicalIdPreservationAspect implements cdk.IAspect {
  private readonly logicalIdMap: Record<string, string>;

  constructor() {
    // Logical ID mapping from new platform IDs to original CDK IDs
    this.logicalIdMap = ${JSON.stringify(preservationResult.logicalIdMap, null, 4)};
  }

  visit(node: IConstruct): void {
    if (cdk.CfnResource.isCfnResource(node)) {
      const currentLogicalId = node.logicalId;
      
      // Check if we have a preserved ID for this resource
      if (this.logicalIdMap[currentLogicalId]) {
        const preservedId = this.logicalIdMap[currentLogicalId];
        
        // Override the logical ID to match the original
        node.overrideLogicalId(preservedId);
        
        console.log(\`Preserved logical ID: \${currentLogicalId} -> \${preservedId}\`);
      }
    }
  }
}

/**
 * Apply logical ID preservation to a CDK App
 * Call this in your app.ts or stack constructor
 */
export function applyLogicalIdPreservation(app: cdk.App): void {
  cdk.Aspects.of(app).add(new LogicalIdPreservationAspect());
}
`;

    return aspectCode;
  }

  /**
   * Generate instructions for manual logical ID preservation
   */
  generatePreservationInstructions(preservationResult: LogicalIdPreservationResult): string[] {
    const instructions: string[] = [];

    if (preservationResult.mappings.length === 0) {
      instructions.push('No logical ID mappings required - all resources mapped exactly.');
      return instructions;
    }

    instructions.push('=== Logical ID Preservation Instructions ===');
    instructions.push('');
    instructions.push('The migration tool has generated a logical-id-map.json file.');
    instructions.push('This file will be automatically used by the platform to preserve resource state.');
    instructions.push('');

    // Summary by strategy
    instructions.push('Preservation strategies used:');
    for (const [strategy, count] of Object.entries(preservationResult.preservationStrategies)) {
      instructions.push(`  - ${strategy}: ${count} resources`);
    }

    if (preservationResult.warnings.length > 0) {
      instructions.push('');
      instructions.push('⚠️  Warnings:');
      preservationResult.warnings.forEach(warning => {
        instructions.push(`  - ${warning}`);
      });
    }

    instructions.push('');
    instructions.push('To verify preservation is working:');
    instructions.push('1. Run: svc plan');
    instructions.push('2. Run: cdk diff (in original project)');
    instructions.push('3. Compare templates - they should be identical');

    return instructions;
  }

  /**
   * Validate that logical ID preservation will work correctly
   */
  validatePreservation(
    preservationResult: LogicalIdPreservationResult,
    originalTemplate: any,
    newTemplate: any
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check that all preserved resources exist in both templates
    for (const mapping of preservationResult.mappings) {
      const originalResource = originalTemplate.Resources?.[mapping.originalId];
      const newResource = newTemplate.Resources?.[mapping.newId];

      if (!originalResource) {
        issues.push(`Original resource ${mapping.originalId} not found in original template`);
      }

      if (!newResource) {
        issues.push(`New resource ${mapping.newId} not found in new template`);
      }

      // Verify resource types match
      if (originalResource && newResource && originalResource.Type !== newResource.Type) {
        issues.push(
          `Resource type mismatch for ${mapping.originalId}: ${originalResource.Type} -> ${newResource.Type}`
        );
      }
    }

    // Check for unmapped resources that might cause issues
    const originalResourceIds = new Set(Object.keys(originalTemplate.Resources || {}));
    const mappedOriginalIds = new Set(preservationResult.mappings.map(m => m.originalId));

    for (const originalId of originalResourceIds) {
      if (!mappedOriginalIds.has(originalId)) {
        const resourceType = originalTemplate.Resources[originalId].Type;
        if (this.isStatefulResourceType(resourceType)) {
          issues.push(
            `Stateful resource ${originalId} (${resourceType}) was not mapped and may be deleted during migration`
          );
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private isStatefulResourceType(resourceType: string): boolean {
    const statefulTypes = [
      'AWS::RDS::DBInstance',
      'AWS::S3::Bucket',
      'AWS::DynamoDB::Table',
      'AWS::EFS::FileSystem',
      'AWS::ElastiCache::CacheCluster',
      'AWS::SecretsManager::Secret'
    ];

    return statefulTypes.includes(resourceType);
  }
}