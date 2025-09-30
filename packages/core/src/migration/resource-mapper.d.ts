/**
 * Resource Mapper
 * Phase 2: Maps CloudFormation resources to platform components and generates manifest
 */
import { Logger } from '../core-engine/logger';
import { StackAnalysisResult } from './cloudformation-analyzer';
import { UnmappableResource } from './migration-engine';
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
export declare class ResourceMapper {
    private logger;
    private resourceTypeMap;
    constructor(logger: Logger);
    mapResources(analysisResult: StackAnalysisResult, serviceName: string, complianceFramework: string): Promise<ResourceMappingResult>;
    private initializeResourceMappings;
    private groupRelatedResources;
    private findRelatedResources;
    private extractBaseName;
    private areResourcesRelatedByNaming;
    private areResourcesRelatedByDependency;
    private areResourcesRelatedByService;
    private mapResourceGroup;
    private identifyPrimaryResource;
    private mapLambdaFunction;
    private mapRdsDatabase;
    private mapSqsQueue;
    private mapS3Bucket;
    private mapApiGateway;
    private generateComponentName;
    private mapLambdaRuntime;
    private extractLambdaConfig;
    private extractS3PublicAccess;
    private extractBindingsFromGroup;
    private generateSuggestedAction;
}
//# sourceMappingURL=resource-mapper.d.ts.map