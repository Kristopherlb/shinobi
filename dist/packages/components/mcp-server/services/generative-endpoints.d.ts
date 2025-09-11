/**
 * Generative Tooling Endpoints (The "Scaffolding Engine")
 * These endpoints are used to generate the code needed to extend the platform.
 */
export interface ComponentGenerationRequest {
    componentName: string;
    componentType: string;
    description: string;
    awsService: string;
    capabilities: string[];
    bindings: string[];
    triggers: string[];
    complianceFramework?: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
    templateOptions?: {
        includeTests?: boolean;
        includeDocumentation?: boolean;
        includeBinders?: boolean;
        includeCreator?: boolean;
    };
}
export interface ComponentGenerationResult {
    componentName: string;
    files: GeneratedFile[];
    dependencies: string[];
    instructions: string[];
    summary: string;
}
export interface GeneratedFile {
    path: string;
    content: string;
    type: 'typescript' | 'json' | 'yaml' | 'markdown' | 'dockerfile';
    description: string;
}
export interface ComponentTemplate {
    name: string;
    description: string;
    awsServices: string[];
    fileTemplates: FileTemplate[];
    requiredDependencies: string[];
    optionalDependencies: string[];
}
export interface FileTemplate {
    templatePath: string;
    outputPath: string;
    type: 'mustache' | 'handlebars' | 'simple';
    variables: TemplateVariable[];
}
export interface TemplateVariable {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
    defaultValue?: any;
}
/**
 * Generative Endpoints Service
 */
export declare class GenerativeEndpointsService {
    /**
     * POST /platform/generate/component
     * Generates the complete, multi-file boilerplate for a new component,
     * including its builder, creator, and test files.
     */
    generateComponent(request: ComponentGenerationRequest): Promise<ComponentGenerationResult>;
    private generateComponentFile;
    private generateIndexFile;
    private generatePackageJson;
    private generateTsConfig;
    private generateTestFile;
    private generateBinderFile;
    private generateCreatorFile;
    private generateDocumentation;
    private toPascalCase;
    private toCamelCase;
    private toTitleCase;
    private generateBinderName;
    private needsCreator;
    private getAwsResourceType;
    private generateCapabilityMethod;
    private getCapabilityDescription;
}
