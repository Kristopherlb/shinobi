/**
 * Logical ID Manager
 * Enhanced system for preserving CloudFormation logical IDs and avoiding drift
 * Integrates with planning phase and provides comprehensive drift avoidance
 */

import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@platform/logger';

export interface LogicalIdMapEntry {
  originalId: string;
  newId: string;
  resourceType: string;
  componentName: string;
  componentType: string;
  preservationStrategy: 'exact-match' | 'hash-suffix' | 'naming-convention' | 'deterministic';
  metadata?: {
    stackName?: string;
    environment?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface LogicalIdMap {
  version: string;
  stackName: string;
  environment?: string;
  createdAt: string;
  updatedAt: string;
  mappings: Record<string, LogicalIdMapEntry>;
  driftAvoidanceConfig: {
    enableDeterministicNaming: boolean;
    preserveResourceOrder: boolean;
    validateBeforeApply: boolean;
  };
}

export interface DriftAvoidanceConfig {
  enableDeterministicNaming: boolean;
  preserveResourceOrder: boolean;
  validateBeforeApply: boolean;
  allowedResourceTypes: string[];
  blockedResourceTypes: string[];
}

/**
 * Enhanced CDK Aspect for Logical ID Preservation with drift avoidance
 */
export class LogicalIdPreservationAspect implements cdk.IAspect {
  private readonly logicalIdMap: Record<string, string>;
  private readonly driftAvoidanceConfig: DriftAvoidanceConfig;
  private readonly logger: Logger;
  private readonly appliedMappings: Set<string> = new Set();

  constructor(
    logicalIdMap: Record<string, string>,
    driftAvoidanceConfig: DriftAvoidanceConfig,
    logger: Logger
  ) {
    this.logicalIdMap = logicalIdMap;
    this.driftAvoidanceConfig = driftAvoidanceConfig;
    this.logger = logger;
  }

  visit(node: IConstruct): void {
    if (cdk.CfnResource.isCfnResource(node)) {
      const stack = cdk.Stack.of(node);
      const resourceType = node.cfnResourceType;

      // Use CDK's canonical default logical ID for this resource
      const defaultId = stack.getLogicalId(node);

      // Debug: Log all resources being visited
      this.logger.debug(`Visiting resource: ${defaultId} (${resourceType})`);

      // Check if resource type is allowed for preservation
      if (!this.isResourceTypeAllowed(resourceType)) {
        this.logger.debug(`Skipping logical ID preservation for blocked resource type: ${resourceType}`);
        return;
      }

      // Check if we have a preserved ID for this resource
      if (this.logicalIdMap[defaultId]) {
        const preservedId = this.logicalIdMap[defaultId];

        // Debug: Log mapping found
        this.logger.debug(`Found mapping for ${defaultId} -> ${preservedId}`);

        // Validate before applying if configured
        if (this.driftAvoidanceConfig.validateBeforeApply) {
          const validationResult = this.validateLogicalIdMapping(defaultId, preservedId, resourceType);
          if (!validationResult.valid) {
            this.logger.warn(`Validation failed for logical ID mapping: ${validationResult.reason}`);
            return;
          }
        }

        // Override the logical ID to match the original
        node.overrideLogicalId(preservedId);
        this.appliedMappings.add(`${defaultId} -> ${preservedId}`);

        this.logger.debug(`Preserved logical ID: ${defaultId} -> ${preservedId} (${resourceType})`);
      } else {
        // Debug: Log when no mapping found
        this.logger.debug(`No mapping found for ${defaultId}`);

        if (this.driftAvoidanceConfig.enableDeterministicNaming) {
          // Apply deterministic naming for unmapped resources
          const deterministicId = this.generateDeterministicLogicalId(node, resourceType);
          if (deterministicId !== defaultId) {
            node.overrideLogicalId(deterministicId);
            this.logger.debug(`Applied deterministic naming: ${defaultId} -> ${deterministicId} (${resourceType})`);
          }
        }
      }
    }
  }

  private isResourceTypeAllowed(resourceType: string): boolean {
    if (this.driftAvoidanceConfig.blockedResourceTypes.includes(resourceType)) {
      return false;
    }

    if (this.driftAvoidanceConfig.allowedResourceTypes.length > 0) {
      return this.driftAvoidanceConfig.allowedResourceTypes.includes(resourceType);
    }

    return true;
  }

  private validateLogicalIdMapping(
    currentId: string,
    preservedId: string,
    resourceType: string
  ): { valid: boolean; reason?: string } {
    // Basic validation rules
    if (!preservedId || preservedId.length === 0) {
      return { valid: false, reason: 'Preserved ID is empty' };
    }

    if (preservedId.length > 255) {
      return { valid: false, reason: 'Preserved ID exceeds CloudFormation limit (255 characters)' };
    }

    // Validate CloudFormation logical ID format
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(preservedId)) {
      return { valid: false, reason: 'Preserved ID contains invalid characters' };
    }

    return { valid: true };
  }

  private generateDeterministicLogicalId(node: IConstruct, resourceType: string): string {
    // Generate deterministic logical ID based on resource properties
    const constructPath = this.getConstructPath(node);
    const resourceSuffix = this.getResourceTypeSuffix(resourceType);

    // Create a deterministic ID based on construct path and resource type
    const baseId = constructPath.replace(/[^A-Za-z0-9]/g, '');
    return `${baseId}${resourceSuffix}`;
  }

  private getConstructPath(node: IConstruct): string {
    const path: string[] = [];
    let current: IConstruct | undefined = node;

    while (current && current.node.id !== 'Default') {
      path.unshift(current.node.id);
      current = current.node.scope;
    }

    return path.join('/');
  }

  private getResourceTypeSuffix(resourceType: string): string {
    const suffixMap: Record<string, string> = {
      'AWS::Lambda::Function': 'Function',
      'AWS::RDS::DBInstance': 'Database',
      'AWS::S3::Bucket': 'Bucket',
      'AWS::EC2::VPC': 'Vpc',
      'AWS::EC2::SecurityGroup': 'SecurityGroup',
      'AWS::IAM::Role': 'Role',
      'AWS::Logs::LogGroup': 'LogGroup',
      'AWS::ApiGateway::RestApi': 'Api',
      'AWS::SQS::Queue': 'Queue',
      'AWS::SNS::Topic': 'Topic',
      'AWS::DynamoDB::Table': 'Table',
      'AWS::ElastiCache::CacheCluster': 'CacheCluster',
      'AWS::EFS::FileSystem': 'FileSystem',
      'AWS::SecretsManager::Secret': 'Secret'
    };

    return suffixMap[resourceType] || 'Resource';
  }

  getAppliedMappings(): string[] {
    return Array.from(this.appliedMappings);
  }

  getMappingStats(): { total: number; applied: number; skipped: number } {
    const total = Object.keys(this.logicalIdMap).length;
    const applied = this.appliedMappings.size;
    const skipped = total - applied;

    return { total, applied, skipped };
  }

  private generateExpectedLogicalId(constructPath: string, resourceType: string): string {
    // Generate the expected logical ID that CDK would create
    // This is based on the CDK naming convention
    const parts = constructPath.split('/');
    const stackName = parts[0] || 'Stack';

    // For CDK constructs, the pattern is typically:
    // StackName + ConstructId + ResourceType
    // For nested constructs: StackName + ParentId + ... + ConstructId + ResourceType

    // Extract the main construct IDs and create the expected logical ID
    const logicalIdParts = [...parts]; // Include stack name and all parts

    // Add appropriate suffix based on resource type
    const suffix = this.getResourceTypeSuffix(resourceType);
    logicalIdParts.push(suffix);

    return logicalIdParts.join('');
  }
}

/**
 * Logical ID Manager - Main class for handling logical ID preservation
 */
export class LogicalIdManager {
  private readonly logger: Logger;
  private readonly driftAvoidanceConfig: DriftAvoidanceConfig;

  constructor(logger: Logger, driftAvoidanceConfig?: Partial<DriftAvoidanceConfig>) {
    this.logger = logger;
    this.driftAvoidanceConfig = {
      enableDeterministicNaming: true,
      preserveResourceOrder: true,
      validateBeforeApply: true,
      allowedResourceTypes: [],
      blockedResourceTypes: [
        'AWS::CloudFormation::Stack',
        'AWS::CDK::Metadata'
      ],
      ...driftAvoidanceConfig
    };
  }

  /**
   * Load logical ID mapping from file
   */
  async loadLogicalIdMap(mapPath: string): Promise<LogicalIdMap | null> {
    try {
      if (!fs.existsSync(mapPath)) {
        this.logger.debug(`Logical ID map file not found: ${mapPath}`);
        return null;
      }

      const mapContent = fs.readFileSync(mapPath, 'utf8');
      const logicalIdMap = JSON.parse(mapContent) as LogicalIdMap;

      // Validate the loaded map
      const validationResult = this.validateLogicalIdMap(logicalIdMap);
      if (!validationResult.valid) {
        this.logger.warn(`Invalid logical ID map: ${validationResult.reason}`);
        return null;
      }

      this.logger.info(`Loaded logical ID map with ${Object.keys(logicalIdMap.mappings).length} mappings`);
      return logicalIdMap;
    } catch (error) {
      this.logger.error(`Failed to load logical ID map: ${error}`);
      return null;
    }
  }

  /**
   * Save logical ID mapping to file
   */
  async saveLogicalIdMap(logicalIdMap: LogicalIdMap, mapPath: string): Promise<void> {
    try {
      const mapDir = path.dirname(mapPath);
      if (!fs.existsSync(mapDir)) {
        fs.mkdirSync(mapDir, { recursive: true });
      }

      logicalIdMap.updatedAt = new Date().toISOString();
      fs.writeFileSync(mapPath, JSON.stringify(logicalIdMap, null, 2));

      this.logger.info(`Saved logical ID map to: ${mapPath}`);
    } catch (error) {
      this.logger.error(`Failed to save logical ID map: ${error}`);
      throw error;
    }
  }

  /**
   * Apply logical ID preservation to a CDK App or Stack
   */
  applyLogicalIdPreservation(
    target: cdk.App | cdk.Stack,
    logicalIdMap: LogicalIdMap
  ): LogicalIdPreservationAspect {
    // Convert the mapping format for the aspect
    const aspectMapping: Record<string, string> = {};
    for (const [newId, entry] of Object.entries(logicalIdMap.mappings)) {
      aspectMapping[newId] = entry.originalId;
    }

    const aspect = new LogicalIdPreservationAspect(
      aspectMapping,
      this.driftAvoidanceConfig,
      this.logger
    );

    cdk.Aspects.of(target).add(aspect);
    this.logger.info(`Applied logical ID preservation aspect to ${target.constructor.name}`);

    return aspect;
  }

  /**
   * Generate logical ID map from CDK stack analysis
   */
  generateLogicalIdMap(
    stackName: string,
    environment?: string,
    existingMappings?: Record<string, LogicalIdMapEntry>
  ): LogicalIdMap {
    const now = new Date().toISOString();

    return {
      version: '1.0.0',
      stackName,
      environment,
      createdAt: now,
      updatedAt: now,
      mappings: existingMappings || {},
      driftAvoidanceConfig: {
        enableDeterministicNaming: this.driftAvoidanceConfig.enableDeterministicNaming,
        preserveResourceOrder: this.driftAvoidanceConfig.preserveResourceOrder,
        validateBeforeApply: this.driftAvoidanceConfig.validateBeforeApply
      }
    };
  }

  /**
   * Validate logical ID map structure and content
   */
  validateLogicalIdMap(logicalIdMap: LogicalIdMap): { valid: boolean; reason?: string } {
    if (!logicalIdMap.version) {
      return { valid: false, reason: 'Missing version field' };
    }

    if (!logicalIdMap.stackName) {
      return { valid: false, reason: 'Missing stackName field' };
    }

    if (!logicalIdMap.mappings || typeof logicalIdMap.mappings !== 'object') {
      return { valid: false, reason: 'Missing or invalid mappings field' };
    }

    // Validate each mapping entry
    for (const [newId, entry] of Object.entries(logicalIdMap.mappings)) {
      if (!entry.originalId || !entry.newId || !entry.resourceType) {
        return { valid: false, reason: `Invalid mapping entry for ${newId}` };
      }

      if (entry.newId !== newId) {
        return { valid: false, reason: `Mapping key mismatch for ${newId}` };
      }
    }

    return { valid: true };
  }

  /**
   * Check for logical ID conflicts in the map
   */
  detectConflicts(logicalIdMap: LogicalIdMap): string[] {
    const conflicts: string[] = [];
    const originalIdCounts = new Map<string, string[]>();

    // Group by original logical ID
    for (const [newId, entry] of Object.entries(logicalIdMap.mappings)) {
      if (!originalIdCounts.has(entry.originalId)) {
        originalIdCounts.set(entry.originalId, []);
      }
      originalIdCounts.get(entry.originalId)!.push(newId);
    }

    // Check for conflicts
    for (const [originalId, newIds] of originalIdCounts.entries()) {
      if (newIds.length > 1) {
        conflicts.push(
          `Conflict: Original ID '${originalId}' maps to multiple new IDs: ${newIds.join(', ')}`
        );
      }
    }

    return conflicts;
  }

  /**
   * Generate drift avoidance report
   */
  generateDriftAvoidanceReport(
    logicalIdMap: LogicalIdMap,
    appliedMappings: string[]
  ): {
    summary: {
      totalMappings: number;
      appliedMappings: number;
      skippedMappings: number;
      deterministicNaming: boolean;
    };
    details: {
      preservationStrategies: Record<string, number>;
      resourceTypeBreakdown: Record<string, number>;
      conflicts: string[];
    };
    recommendations: string[];
  } {
    const preservationStrategies: Record<string, number> = {};
    const resourceTypeBreakdown: Record<string, number> = {};

    for (const entry of Object.values(logicalIdMap.mappings)) {
      preservationStrategies[entry.preservationStrategy] =
        (preservationStrategies[entry.preservationStrategy] || 0) + 1;

      resourceTypeBreakdown[entry.resourceType] =
        (resourceTypeBreakdown[entry.resourceType] || 0) + 1;
    }

    const conflicts = this.detectConflicts(logicalIdMap);

    const recommendations: string[] = [];
    if (conflicts.length > 0) {
      recommendations.push('Resolve logical ID conflicts before deployment');
    }

    if (appliedMappings.length < Object.keys(logicalIdMap.mappings).length) {
      recommendations.push('Review skipped mappings to ensure they are intentional');
    }

    if (!this.driftAvoidanceConfig.enableDeterministicNaming) {
      recommendations.push('Consider enabling deterministic naming for better drift avoidance');
    }

    return {
      summary: {
        totalMappings: Object.keys(logicalIdMap.mappings).length,
        appliedMappings: appliedMappings.length,
        skippedMappings: Object.keys(logicalIdMap.mappings).length - appliedMappings.length,
        deterministicNaming: this.driftAvoidanceConfig.enableDeterministicNaming
      },
      details: {
        preservationStrategies,
        resourceTypeBreakdown,
        conflicts
      },
      recommendations
    };
  }
}
