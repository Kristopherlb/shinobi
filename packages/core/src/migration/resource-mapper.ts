/**
 * Resource Mapper
 * Phase 2: Maps CloudFormation resources to platform components and generates manifest
 */

import { Logger } from '../core-engine/logger.js';
import { CloudFormationResource, StackAnalysisResult } from './cloudformation-analyzer.js';
import { UnmappableResource } from './migration-engine.js';

export interface ComponentMapping {
  name: string;
  type: string;
  config: Record<string, any>;
  binds?: Array<{
    to: string;
    capability: string;
    access: string;
    env?: Record<string, string>;
    options?: Record<string, any>;
  }>;
  overrides?: Record<string, any>;
}

export interface ResourceMappingResult {
  components: ComponentMapping[];
  mappedResources: Array<{
    logicalId: string;
    componentName: string;
    componentType: string;
  }>;
  unmappableResources: UnmappableResource[];
  bindings: any[];
}

/**
 * Maps CloudFormation resources to platform components using predefined mappings
 */
export class ResourceMapper {
  private resourceTypeMap: Map<string, ResourceTypeHandler>;

  constructor(private logger: Logger) {
    this.resourceTypeMap = new Map();
    this.initializeResourceMappings();
  }

  async mapResources(
    analysisResult: StackAnalysisResult,
    serviceName: string,
    complianceFramework: string
  ): Promise<ResourceMappingResult> {
    const components: ComponentMapping[] = [];
    const mappedResources: Array<{ logicalId: string; componentName: string; componentType: string }> = [];
    const unmappableResources: UnmappableResource[] = [];
    const bindings: any[] = [];

    // Group related resources into components
    const resourceGroups = this.groupRelatedResources(analysisResult.resources);

    for (const group of resourceGroups) {
      try {
        const mappingResult = await this.mapResourceGroup(group, serviceName, complianceFramework);
        
        if (mappingResult.success) {
          components.push(mappingResult.component!);
          
          group.forEach(resource => {
            mappedResources.push({
              logicalId: resource.logicalId,
              componentName: mappingResult.component!.name,
              componentType: mappingResult.component!.type
            });
          });

          // Extract bindings from resource relationships
          const extractedBindings = this.extractBindingsFromGroup(group, components);
          bindings.push(...extractedBindings);
        } else {
          // Add to unmappable resources
          group.forEach(resource => {
            unmappableResources.push({
              logicalId: resource.logicalId,
              type: resource.type,
              reason: mappingResult.reason || 'No mapping available',
              cfnDefinition: {
                Type: resource.type,
                Properties: resource.properties
              },
              suggestedAction: this.generateSuggestedAction(resource)
            });
          });
        }
      } catch (error: any) {
        this.logger.warn(`Failed to map resource group: ${error.message}`);
        
        group.forEach(resource => {
          unmappableResources.push({
            logicalId: resource.logicalId,
            type: resource.type,
            reason: `Mapping error: ${error.message}`,
            cfnDefinition: {
              Type: resource.type,
              Properties: resource.properties
            },
            suggestedAction: 'Add manually using patches.ts with L1 constructs'
          });
        });
      }
    }

    return {
      components,
      mappedResources,
      unmappableResources,
      bindings
    };
  }

  private initializeResourceMappings(): void {
    // Lambda Function mappings
    this.resourceTypeMap.set('AWS::Lambda::Function', {
      canHandle: (resources) => resources.some(r => r.type === 'AWS::Lambda::Function'),
      map: this.mapLambdaFunction.bind(this)
    });

    // RDS Database mappings
    this.resourceTypeMap.set('AWS::RDS::DBInstance', {
      canHandle: (resources) => resources.some(r => r.type === 'AWS::RDS::DBInstance'),
      map: this.mapRdsDatabase.bind(this)
    });

    // SQS Queue mappings
    this.resourceTypeMap.set('AWS::SQS::Queue', {
      canHandle: (resources) => resources.some(r => r.type === 'AWS::SQS::Queue'),
      map: this.mapSqsQueue.bind(this)
    });

    // S3 Bucket mappings
    this.resourceTypeMap.set('AWS::S3::Bucket', {
      canHandle: (resources) => resources.some(r => r.type === 'AWS::S3::Bucket'),
      map: this.mapS3Bucket.bind(this)
    });

    // API Gateway mappings
    this.resourceTypeMap.set('AWS::ApiGateway::RestApi', {
      canHandle: (resources) => resources.some(r => r.type === 'AWS::ApiGateway::RestApi'),
      map: this.mapApiGateway.bind(this)
    });
  }

  private groupRelatedResources(resources: CloudFormationResource[]): CloudFormationResource[][] {
    const groups: CloudFormationResource[][] = [];
    const processed = new Set<string>();

    for (const resource of resources) {
      if (processed.has(resource.logicalId)) continue;

      const group = [resource];
      processed.add(resource.logicalId);

      // Find related resources based on naming patterns and dependencies
      const relatedResources = this.findRelatedResources(resource, resources);
      
      for (const related of relatedResources) {
        if (!processed.has(related.logicalId)) {
          group.push(related);
          processed.add(related.logicalId);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private findRelatedResources(
    primaryResource: CloudFormationResource,
    allResources: CloudFormationResource[]
  ): CloudFormationResource[] {
    const related: CloudFormationResource[] = [];
    const baseName = this.extractBaseName(primaryResource.logicalId);

    for (const resource of allResources) {
      if (resource.logicalId === primaryResource.logicalId) continue;

      // Check if resources are related by naming convention
      if (this.areResourcesRelatedByNaming(baseName, resource.logicalId)) {
        related.push(resource);
        continue;
      }

      // Check if resources are related by dependencies
      if (this.areResourcesRelatedByDependency(primaryResource, resource)) {
        related.push(resource);
        continue;
      }

      // Check if resources are related by AWS service grouping
      if (this.areResourcesRelatedByService(primaryResource, resource)) {
        related.push(resource);
        continue;
      }
    }

    return related;
  }

  private extractBaseName(logicalId: string): string {
    // Remove common suffixes to find base name
    return logicalId
      .replace(/(Role|Policy|SecurityGroup|LogGroup|Table|Function|Api|Queue|Bucket)$/, '')
      .replace(/[A-Z0-9]{8}$/, ''); // Remove CDK hash suffixes
  }

  private areResourcesRelatedByNaming(baseName: string, logicalId: string): boolean {
    return logicalId.startsWith(baseName) && logicalId !== baseName;
  }

  private areResourcesRelatedByDependency(
    resource1: CloudFormationResource,
    resource2: CloudFormationResource
  ): boolean {
    // Check direct dependencies
    if (resource1.dependsOn?.includes(resource2.logicalId) || 
        resource2.dependsOn?.includes(resource1.logicalId)) {
      return true;
    }

    // Check property references
    const props1Str = JSON.stringify(resource1.properties);
    const props2Str = JSON.stringify(resource2.properties);
    
    return props1Str.includes(resource2.logicalId) || props2Str.includes(resource1.logicalId);
  }

  private areResourcesRelatedByService(
    resource1: CloudFormationResource,
    resource2: CloudFormationResource
  ): boolean {
    // Lambda-related resources
    if (resource1.type === 'AWS::Lambda::Function') {
      return ['AWS::IAM::Role', 'AWS::Logs::LogGroup', 'AWS::Lambda::Permission'].includes(resource2.type);
    }

    // RDS-related resources
    if (resource1.type === 'AWS::RDS::DBInstance') {
      return ['AWS::RDS::DBSubnetGroup', 'AWS::EC2::SecurityGroup', 'AWS::SecretsManager::Secret'].includes(resource2.type);
    }

    // API Gateway-related resources
    if (resource1.type === 'AWS::ApiGateway::RestApi') {
      return resource2.type.startsWith('AWS::ApiGateway::');
    }

    return false;
  }

  private async mapResourceGroup(
    group: CloudFormationResource[],
    serviceName: string,
    complianceFramework: string
  ): Promise<{ success: boolean; component?: ComponentMapping; reason?: string }> {
    // Find the primary resource type in the group
    const primaryResource = this.identifyPrimaryResource(group);
    if (!primaryResource) {
      return { success: false, reason: 'No primary resource identified in group' };
    }

    const handler = this.resourceTypeMap.get(primaryResource.type);
    if (!handler || !handler.canHandle(group)) {
      return { success: false, reason: `No handler available for resource type ${primaryResource.type}` };
    }

    try {
      const component = await handler.map(group, serviceName, complianceFramework);
      return { success: true, component };
    } catch (error: any) {
      return { success: false, reason: error.message };
    }
  }

  private identifyPrimaryResource(group: CloudFormationResource[]): CloudFormationResource | null {
    // Priority order for primary resource identification
    const primaryTypes = [
      'AWS::Lambda::Function',
      'AWS::RDS::DBInstance', 
      'AWS::SQS::Queue',
      'AWS::S3::Bucket',
      'AWS::ApiGateway::RestApi'
    ];

    for (const type of primaryTypes) {
      const primary = group.find(resource => resource.type === type);
      if (primary) return primary;
    }

    // If no primary type found, return first resource
    return group[0] || null;
  }

  // Resource mapping implementations
  private async mapLambdaFunction(
    group: CloudFormationResource[],
    serviceName: string,
    complianceFramework: string
  ): Promise<ComponentMapping> {
    const lambdaResource = group.find(r => r.type === 'AWS::Lambda::Function')!;
    const hasApiGateway = group.some(r => r.type.startsWith('AWS::ApiGateway::'));

    const componentName = this.generateComponentName(lambdaResource.logicalId);
    
    return {
      name: componentName,
      type: hasApiGateway ? 'lambda-api' : 'lambda-worker',
      config: {
        runtime: this.mapLambdaRuntime(lambdaResource.properties.Runtime),
        handler: lambdaResource.properties.Handler || 'index.handler',
        codePath: './src',
        timeout: lambdaResource.properties.Timeout || 30,
        memorySize: lambdaResource.properties.MemorySize || 128,
        ...(hasApiGateway && { createApi: true })
      },
      ...(lambdaResource.properties.Environment && {
        config: {
          ...this.extractLambdaConfig(lambdaResource),
          environment: lambdaResource.properties.Environment.Variables
        }
      })
    };
  }

  private async mapRdsDatabase(
    group: CloudFormationResource[],
    serviceName: string,
    complianceFramework: string
  ): Promise<ComponentMapping> {
    const rdsResource = group.find(r => r.type === 'AWS::RDS::DBInstance')!;
    const componentName = this.generateComponentName(rdsResource.logicalId);

    const engine = rdsResource.properties.Engine;
    let componentType = 'rds-postgres'; // Default

    if (engine?.includes('mysql')) {
      componentType = 'rds-mysql';
    } else if (engine?.includes('postgres')) {
      componentType = 'rds-postgres';
    }

    return {
      name: componentName,
      type: componentType,
      config: {
        dbName: rdsResource.properties.DatabaseName || rdsResource.properties.DBName,
        instanceClass: rdsResource.properties.DBInstanceClass,
        allocatedStorage: rdsResource.properties.AllocatedStorage || 20,
        encrypted: rdsResource.properties.StorageEncrypted || false,
        multiAz: rdsResource.properties.MultiAZ || false,
        backupRetention: rdsResource.properties.BackupRetentionPeriod || 7
      }
    };
  }

  private async mapSqsQueue(
    group: CloudFormationResource[],
    serviceName: string,
    complianceFramework: string
  ): Promise<ComponentMapping> {
    const sqsResource = group.find(r => r.type === 'AWS::SQS::Queue')!;
    const componentName = this.generateComponentName(sqsResource.logicalId);

    return {
      name: componentName,
      type: 'sqs-queue',
      config: {
        fifo: sqsResource.properties.QueueName?.endsWith('.fifo') || false,
        visibilityTimeout: sqsResource.properties.VisibilityTimeout || 300,
        messageRetentionPeriod: sqsResource.properties.MessageRetentionPeriod || 345600
      }
    };
  }

  private async mapS3Bucket(
    group: CloudFormationResource[],
    serviceName: string,
    complianceFramework: string
  ): Promise<ComponentMapping> {
    const s3Resource = group.find(r => r.type === 'AWS::S3::Bucket')!;
    const componentName = this.generateComponentName(s3Resource.logicalId);

    return {
      name: componentName,
      type: 's3-bucket',
      config: {
        bucketName: s3Resource.properties.BucketName,
        versioning: s3Resource.properties.VersioningConfiguration?.Status === 'Enabled',
        encrypted: !!s3Resource.properties.BucketEncryption,
        publicAccess: this.extractS3PublicAccess(s3Resource.properties)
      }
    };
  }

  private async mapApiGateway(
    group: CloudFormationResource[],
    serviceName: string,
    complianceFramework: string
  ): Promise<ComponentMapping> {
    // API Gateway is typically handled as part of Lambda mapping
    throw new Error('API Gateway should be mapped as part of Lambda function');
  }

  // Helper methods
  private generateComponentName(logicalId: string): string {
    return this.extractBaseName(logicalId)
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/--+/g, '-') || 'component';
  }

  private mapLambdaRuntime(runtime: string): string {
    const runtimeMap: Record<string, string> = {
      'nodejs18.x': 'nodejs18.x',
      'nodejs16.x': 'nodejs18.x', // Upgrade deprecated runtime
      'nodejs14.x': 'nodejs18.x', // Upgrade deprecated runtime
      'python3.11': 'python3.11',
      'python3.10': 'python3.10',
      'python3.9': 'python3.11', // Upgrade deprecated runtime
    };

    return runtimeMap[runtime] || runtime;
  }

  private extractLambdaConfig(lambdaResource: CloudFormationResource): Record<string, any> {
    const config: Record<string, any> = {
      runtime: this.mapLambdaRuntime(lambdaResource.properties.Runtime),
      handler: lambdaResource.properties.Handler || 'index.handler',
      codePath: './src'
    };

    if (lambdaResource.properties.Timeout) {
      config.timeout = lambdaResource.properties.Timeout;
    }

    if (lambdaResource.properties.MemorySize) {
      config.memorySize = lambdaResource.properties.MemorySize;
    }

    return config;
  }

  private extractS3PublicAccess(properties: any): boolean {
    if (properties.PublicAccessBlockConfiguration) {
      const blockConfig = properties.PublicAccessBlockConfiguration;
      return !(blockConfig.BlockPublicAcls && blockConfig.BlockPublicPolicy);
    }
    return false; // Default to private
  }

  private extractBindingsFromGroup(
    group: CloudFormationResource[],
    existingComponents: ComponentMapping[]
  ): any[] {
    // This would analyze resource relationships and generate binding configurations
    // For now, return empty array - bindings are complex to infer automatically
    return [];
  }

  private generateSuggestedAction(resource: CloudFormationResource): string {
    const actionMap: Record<string, string> = {
      'AWS::CloudFormation::CustomResource': 'Replace custom resource with equivalent platform component or use patches.ts',
      'AWS::ElastiCache::CacheCluster': 'Add using patches.ts - ElastiCache not yet supported by platform',
      'AWS::Route53::RecordSet': 'Add using patches.ts - DNS management not yet supported by platform',
      'AWS::CloudWatch::Alarm': 'Add using patches.ts - Custom alarms not yet supported by platform',
      'AWS::Events::Rule': 'Add using patches.ts - EventBridge rules not yet supported by platform'
    };

    return actionMap[resource.type] || `Add using patches.ts with L1 construct: new ${resource.type.split('::').pop()}(...)`;
  }
}

interface ResourceTypeHandler {
  canHandle: (resources: CloudFormationResource[]) => boolean;
  map: (group: CloudFormationResource[], serviceName: string, complianceFramework: string) => Promise<ComponentMapping>;
}