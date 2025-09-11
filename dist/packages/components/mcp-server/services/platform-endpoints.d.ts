/**
 * Platform-Level Endpoints (The "Developer's Toolbox")
 * These endpoints provide read-only context for understanding the platform.
 */
export interface PlatformComponent {
    name: string;
    type: string;
    version: string;
    description: string;
    author: string;
    keywords: string[];
    supportedFrameworks: string[];
    configSchema: any;
    capabilities: string[];
    bindings: string[];
    triggers: string[];
}
export interface ComponentSchema {
    type: string;
    title: string;
    description: string;
    properties: Record<string, any>;
    required: string[];
    defaults: Record<string, any>;
}
export interface CapabilityDefinition {
    name: string;
    description: string;
    type: 'compute' | 'storage' | 'database' | 'messaging' | 'api' | 'security' | 'monitoring';
    fields: Record<string, {
        type: string;
        description: string;
        required: boolean;
    }>;
    examples: Record<string, any>[];
}
export interface BindingMatrix {
    sourceType: string;
    targetType: string;
    capability: string;
    supportedAccess: string[];
    description: string;
    strategy: string;
    constraints: Record<string, any>;
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    suggestions: string[];
}
export interface ValidationError {
    path: string;
    message: string;
    code: string;
    severity: 'error' | 'warning';
}
export interface ValidationWarning {
    path: string;
    message: string;
    code: string;
    suggestion?: string;
}
/**
 * Platform Endpoints Service
 */
export declare class PlatformEndpointsService {
    /**
     * GET /platform/components
     * Lists all available, versioned components.
     */
    getComponents(): Promise<PlatformComponent[]>;
    /**
     * GET /platform/components/{type}/schema
     * Returns the Config.schema.json for a component.
     */
    getComponentSchema(componentType: string): Promise<ComponentSchema>;
    /**
     * GET /platform/capabilities
     * Returns the official Capability Naming Standard.
     */
    getCapabilities(): Promise<CapabilityDefinition[]>;
    /**
     * GET /platform/bindings
     * Returns the BindingMatrix from the BinderRegistry.
     */
    getBindings(): Promise<BindingMatrix[]>;
    /**
     * POST /platform/validate
     * Validates a provided service.yml manifest.
     */
    validateManifest(manifest: any): Promise<ValidationResult>;
}
