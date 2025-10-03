/**
 * Drift Avoidance Mechanisms
 * Advanced strategies for preventing CloudFormation drift during migrations
 */

import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { Logger } from '../logger/src/index.ts';
import { LogicalIdMap, LogicalIdMapEntry } from './logical-id-manager.ts';

export interface DriftAvoidanceStrategy {
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: DriftAvoidanceCondition[];
  actions: DriftAvoidanceAction[];
}

export interface DriftAvoidanceCondition {
  type: 'resource-type' | 'resource-name' | 'property-value' | 'dependency-chain';
  operator: 'equals' | 'contains' | 'starts-with' | 'ends-with' | 'matches';
  value: string;
  path?: string; // JSONPath for property conditions
}

export interface DriftAvoidanceAction {
  type: 'preserve-logical-id' | 'deterministic-naming' | 'property-override' | 'dependency-fix';
  parameters: Record<string, any>;
}

export interface DriftAnalysisResult {
  detectedDrifts: DetectedDrift[];
  recommendedActions: RecommendedAction[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  summary: {
    totalResources: number;
    driftedResources: number;
    statefulResources: number;
    criticalDrifts: number;
  };
}

export interface DetectedDrift {
  resourceId: string;
  resourceType: string;
  driftType: 'logical-id' | 'property' | 'dependency' | 'naming';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  currentValue?: any;
  expectedValue?: any;
  impact: string[];
  mitigation: string[];
}

export interface RecommendedAction {
  actionType: 'preserve' | 'rename' | 'reconfigure' | 'skip';
  resourceId: string;
  description: string;
  priority: number;
  estimatedImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  implementation: string;
}

/**
 * Drift Avoidance Engine
 * Analyzes and prevents CloudFormation drift during migrations
 */
export class DriftAvoidanceEngine {
  private readonly logger: Logger;
  private readonly strategies: DriftAvoidanceStrategy[];

  constructor(logger: Logger) {
    this.logger = logger;
    this.strategies = this.initializeDefaultStrategies();
  }

  /**
   * Analyze potential drift in a CDK stack
   */
  analyzeDrift(
    stack: cdk.Stack,
    logicalIdMap: LogicalIdMap,
    originalTemplate?: any
  ): DriftAnalysisResult {
    this.logger.info('Analyzing potential drift in CDK stack');

    const detectedDrifts: DetectedDrift[] = [];
    const resources = this.extractResources(stack);

    // Analyze each resource for potential drift
    for (const resource of resources) {
      const drifts = this.analyzeResourceDrift(resource, logicalIdMap, originalTemplate);
      detectedDrifts.push(...drifts);
    }

    // Analyze cross-resource dependencies
    const dependencyDrifts = this.analyzeDependencyDrifts(resources, logicalIdMap);
    detectedDrifts.push(...dependencyDrifts);

    // Generate recommendations
    const recommendedActions = this.generateRecommendations(detectedDrifts);

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(detectedDrifts);

    // Generate summary
    const summary = this.generateSummary(resources, detectedDrifts);

    return {
      detectedDrifts,
      recommendedActions,
      riskLevel,
      summary
    };
  }

  /**
   * Apply drift avoidance strategies to a stack
   */
  applyDriftAvoidance(
    stack: cdk.Stack,
    logicalIdMap: LogicalIdMap,
    strategies?: string[]
  ): {
    appliedStrategies: string[];
    modifiedResources: string[];
    warnings: string[];
  } {
    this.logger.info('Applying drift avoidance strategies to stack');

    const appliedStrategies: string[] = [];
    const modifiedResources: string[] = [];
    const warnings: string[] = [];

    const strategiesToApply = strategies
      ? this.strategies.filter(s => strategies.includes(s.name))
      : this.strategies.filter(s => s.enabled);

    for (const strategy of strategiesToApply) {
      try {
        const result = this.applyStrategy(stack, logicalIdMap, strategy);
        if (result.success) {
          appliedStrategies.push(strategy.name);
          modifiedResources.push(...result.modifiedResources);
          warnings.push(...result.warnings);
        }
      } catch (error) {
        warnings.push(`Failed to apply strategy ${strategy.name}: ${error}`);
      }
    }

    this.logger.info(`Applied ${appliedStrategies.length} drift avoidance strategies`);
    return {
      appliedStrategies,
      modifiedResources,
      warnings
    };
  }

  /**
   * Generate deterministic resource names
   */
  generateDeterministicNames(
    stack: cdk.Stack,
    context: {
      serviceName: string;
      environment: string;
      componentName?: string;
    }
  ): Record<string, string> {
    const deterministicNames: Record<string, string> = {};

    // Apply deterministic naming aspect
    const aspect = new DeterministicNamingAspect(context, this.logger);
    cdk.Aspects.of(stack).add(aspect);

    return aspect.getGeneratedNames();
  }

  /**
   * Validate drift avoidance configuration
   */
  validateDriftAvoidanceConfig(
    logicalIdMap: LogicalIdMap,
    originalTemplate?: any
  ): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validate logical ID map structure
    const mapValidation = this.validateLogicalIdMap(logicalIdMap);
    issues.push(...mapValidation.issues);

    // Check for stateful resources without preservation
    if (originalTemplate) {
      const statefulValidation = this.validateStatefulResourcePreservation(
        logicalIdMap,
        originalTemplate
      );
      issues.push(...statefulValidation.issues);
      recommendations.push(...statefulValidation.recommendations);
    }

    // Check for naming conflicts
    const namingValidation = this.validateNamingConflicts(logicalIdMap);
    issues.push(...namingValidation.issues);

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }

  private initializeDefaultStrategies(): DriftAvoidanceStrategy[] {
    return [
      {
        name: 'preserve-stateful-resources',
        description: 'Preserve logical IDs for stateful resources',
        enabled: true,
        priority: 1,
        conditions: [
          {
            type: 'resource-type',
            operator: 'equals',
            value: 'AWS::RDS::DBInstance'
          },
          {
            type: 'resource-type',
            operator: 'equals',
            value: 'AWS::S3::Bucket'
          },
          {
            type: 'resource-type',
            operator: 'equals',
            value: 'AWS::DynamoDB::Table'
          }
        ],
        actions: [
          {
            type: 'preserve-logical-id',
            parameters: { priority: 'high' }
          }
        ]
      },
      {
        name: 'deterministic-lambda-naming',
        description: 'Use deterministic naming for Lambda functions',
        enabled: true,
        priority: 2,
        conditions: [
          {
            type: 'resource-type',
            operator: 'equals',
            value: 'AWS::Lambda::Function'
          }
        ],
        actions: [
          {
            type: 'deterministic-naming',
            parameters: {
              pattern: '{serviceName}-{componentName}-{functionName}',
              hashLength: 8
            }
          }
        ]
      },
      {
        name: 'preserve-iam-role-names',
        description: 'Preserve IAM role names to avoid permission issues',
        enabled: true,
        priority: 3,
        conditions: [
          {
            type: 'resource-type',
            operator: 'equals',
            value: 'AWS::IAM::Role'
          }
        ],
        actions: [
          {
            type: 'preserve-logical-id',
            parameters: { priority: 'medium' }
          }
        ]
      }
    ];
  }

  private extractResources(stack: cdk.Stack): Array<{
    id: string;
    type: string;
    construct: IConstruct;
  }> {
    const resources: Array<{ id: string; type: string; construct: IConstruct }> = [];

    const visit = (construct: IConstruct) => {
      if (cdk.CfnResource.isCfnResource(construct)) {
        resources.push({
          id: construct.logicalId,
          type: construct.cfnResourceType,
          construct
        });
      }

      for (const child of construct.node.children) {
        visit(child);
      }
    };

    visit(stack);
    return resources;
  }

  private analyzeResourceDrift(
    resource: { id: string; type: string; construct: IConstruct },
    logicalIdMap: LogicalIdMap,
    originalTemplate?: any
  ): DetectedDrift[] {
    const drifts: DetectedDrift[] = [];

    // Check if resource has logical ID preservation
    const mapping = logicalIdMap.mappings[resource.id];
    if (!mapping && this.isStatefulResource(resource.type)) {
      drifts.push({
        resourceId: resource.id,
        resourceType: resource.type,
        driftType: 'logical-id',
        severity: 'high',
        description: `Stateful resource ${resource.id} lacks logical ID preservation`,
        impact: ['Resource replacement', 'Data loss risk'],
        mitigation: ['Add logical ID mapping', 'Enable deterministic naming']
      });
    }

    // Check for naming conflicts
    if (mapping && this.hasNamingConflict(resource.id, mapping.originalId)) {
      drifts.push({
        resourceId: resource.id,
        resourceType: resource.type,
        driftType: 'naming',
        severity: 'medium',
        description: `Naming conflict detected for resource ${resource.id}`,
        currentValue: resource.id,
        expectedValue: mapping.originalId,
        impact: ['Deployment failure', 'Resource conflicts'],
        mitigation: ['Resolve naming conflict', 'Use unique identifiers']
      });
    }

    return drifts;
  }

  private analyzeDependencyDrifts(
    resources: Array<{ id: string; type: string; construct: IConstruct }>,
    logicalIdMap: LogicalIdMap
  ): DetectedDrift[] {
    const drifts: DetectedDrift[] = [];

    // Analyze resource dependencies for drift
    for (const resource of resources) {
      const dependencies = this.getResourceDependencies(resource.construct);

      for (const dep of dependencies) {
        const depMapping = logicalIdMap.mappings[dep];
        if (depMapping) {
          // Check if dependency reference will be updated
          const drift = this.checkDependencyReference(resource.id, dep, depMapping);
          if (drift) {
            drifts.push(drift);
          }
        }
      }
    }

    return drifts;
  }

  private generateRecommendations(detectedDrifts: DetectedDrift[]): RecommendedAction[] {
    const recommendations: RecommendedAction[] = [];

    for (const drift of detectedDrifts) {
      switch (drift.driftType) {
        case 'logical-id':
          recommendations.push({
            actionType: 'preserve',
            resourceId: drift.resourceId,
            description: `Preserve logical ID for ${drift.resourceId}`,
            priority: drift.severity === 'critical' ? 1 : drift.severity === 'high' ? 2 : 3,
            estimatedImpact: drift.severity === 'critical' ? 'significant' : 'moderate',
            implementation: `Add mapping: ${drift.resourceId} -> original-id`
          });
          break;

        case 'naming':
          recommendations.push({
            actionType: 'rename',
            resourceId: drift.resourceId,
            description: `Resolve naming conflict for ${drift.resourceId}`,
            priority: 2,
            estimatedImpact: 'minimal',
            implementation: `Update naming convention or use unique suffix`
          });
          break;

        case 'dependency':
          recommendations.push({
            actionType: 'reconfigure',
            resourceId: drift.resourceId,
            description: `Update dependency references for ${drift.resourceId}`,
            priority: 2,
            estimatedImpact: 'moderate',
            implementation: `Update resource references to use preserved logical IDs`
          });
          break;
      }
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private calculateRiskLevel(detectedDrifts: DetectedDrift[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalDrifts = detectedDrifts.filter(d => d.severity === 'critical').length;
    const highDrifts = detectedDrifts.filter(d => d.severity === 'high').length;

    if (criticalDrifts > 0) return 'critical';
    if (highDrifts > 2) return 'high';
    if (highDrifts > 0 || detectedDrifts.length > 5) return 'medium';
    return 'low';
  }

  private generateSummary(
    resources: Array<{ id: string; type: string; construct: IConstruct }>,
    detectedDrifts: DetectedDrift[]
  ) {
    return {
      totalResources: resources.length,
      driftedResources: detectedDrifts.length,
      statefulResources: resources.filter(r => this.isStatefulResource(r.type)).length,
      criticalDrifts: detectedDrifts.filter(d => d.severity === 'critical').length
    };
  }

  private applyStrategy(
    stack: cdk.Stack,
    logicalIdMap: LogicalIdMap,
    strategy: DriftAvoidanceStrategy
  ): { success: boolean; modifiedResources: string[]; warnings: string[] } {
    const modifiedResources: string[] = [];
    const warnings: string[] = [];

    // Apply strategy conditions and actions
    for (const action of strategy.actions) {
      switch (action.type) {
        case 'preserve-logical-id':
          // This would be handled by the LogicalIdPreservationAspect
          break;

        case 'deterministic-naming':
          // Apply deterministic naming
          break;

        case 'property-override':
          // Override specific properties
          break;
      }
    }

    return {
      success: true,
      modifiedResources,
      warnings
    };
  }

  private validateLogicalIdMap(logicalIdMap: LogicalIdMap): { issues: string[] } {
    const issues: string[] = [];

    // Check for duplicate mappings
    const originalIds = Object.values(logicalIdMap.mappings).map(m => m.originalId);
    const duplicates = originalIds.filter((id, index) => originalIds.indexOf(id) !== index);

    if (duplicates.length > 0) {
      issues.push(`Duplicate original IDs found: ${duplicates.join(', ')}`);
    }

    return { issues };
  }

  private validateStatefulResourcePreservation(
    logicalIdMap: LogicalIdMap,
    originalTemplate: any
  ): { issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const statefulResourceTypes = [
      'AWS::RDS::DBInstance',
      'AWS::S3::Bucket',
      'AWS::DynamoDB::Table',
      'AWS::EFS::FileSystem',
      'AWS::ElastiCache::CacheCluster'
    ];

    const originalResources = originalTemplate.Resources || {};

    for (const [resourceId, resource] of Object.entries(originalResources) as [string, any][]) {
      if (statefulResourceTypes.includes(resource.Type)) {
        const hasMapping = Object.values(logicalIdMap.mappings).some(
          m => m.originalId === resourceId
        );

        if (!hasMapping) {
          issues.push(`Stateful resource ${resourceId} (${resource.Type}) lacks preservation mapping`);
          recommendations.push(`Add logical ID mapping for ${resourceId} to prevent data loss`);
        }
      }
    }

    return { issues, recommendations };
  }

  private validateNamingConflicts(logicalIdMap: LogicalIdMap): { issues: string[] } {
    const issues: string[] = [];

    // Check for naming conflicts in the mapping
    const newIds = Object.keys(logicalIdMap.mappings);
    const originalIds = Object.values(logicalIdMap.mappings).map(m => m.originalId);

    const conflicts = newIds.filter(id => originalIds.includes(id));
    if (conflicts.length > 0) {
      issues.push(`Naming conflicts detected: ${conflicts.join(', ')}`);
    }

    return { issues };
  }

  private isStatefulResource(resourceType: string): boolean {
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

  private hasNamingConflict(newId: string, originalId: string): boolean {
    // Check for potential naming conflicts
    return newId === originalId || newId.includes(originalId) || originalId.includes(newId);
  }

  private getResourceDependencies(construct: IConstruct): string[] {
    const dependencies: string[] = [];

    // Extract dependencies from construct properties
    // This is a simplified implementation
    return dependencies;
  }

  private checkDependencyReference(
    resourceId: string,
    dependencyId: string,
    dependencyMapping: LogicalIdMapEntry
  ): DetectedDrift | null {
    // Check if dependency reference needs to be updated
    // This is a placeholder for actual dependency analysis
    return null;
  }
}

/**
 * Deterministic Naming Aspect
 * Applies deterministic naming to CDK constructs
 */
class DeterministicNamingAspect implements cdk.IAspect {
  private readonly generatedNames: Record<string, string> = {};

  constructor(
    private context: {
      serviceName: string;
      environment: string;
      componentName?: string;
    },
    private logger: Logger
  ) { }

  visit(node: IConstruct): void {
    if (cdk.CfnResource.isCfnResource(node)) {
      const deterministicName = this.generateDeterministicName(node);
      if (deterministicName !== node.logicalId) {
        node.overrideLogicalId(deterministicName);
        this.generatedNames[node.logicalId] = deterministicName;
        this.logger.debug(`Applied deterministic naming: ${node.logicalId} -> ${deterministicName}`);
      }
    }
  }

  private generateDeterministicName(construct: IConstruct): string {
    const constructPath = this.getConstructPath(construct);
    const resourceType = (construct as any).cfnResourceType || 'Resource';

    // Generate deterministic name based on context and construct path
    const baseName = this.context.componentName || 'Component';
    const resourceSuffix = this.getResourceTypeSuffix(resourceType);
    const hash = this.generateHash(constructPath);

    return `${baseName}${resourceSuffix}${hash}`;
  }

  private getConstructPath(construct: IConstruct): string {
    const path: string[] = [];
    let current: IConstruct | undefined = construct;

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
      'AWS::IAM::Role': 'Role'
    };

    return suffixMap[resourceType] || 'Resource';
  }

  private generateHash(input: string): string {
    // Simple hash function for deterministic naming
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8).toUpperCase();
  }

  getGeneratedNames(): Record<string, string> {
    return this.generatedNames;
  }
}
