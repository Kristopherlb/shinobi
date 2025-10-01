/**
 * Manifest Schema Composer - Dynamically composes master schema from base manifest and component schemas
 * Implements comprehensive JSON Schema validation with component-specific configuration validation
 */
import { Logger } from '../platform/logger/src/index.js';
export interface ComponentSchemaInfo {
    componentType: string;
    schemaPath: string;
    schema: any;
}
export interface ManifestSchemaComposerDependencies {
    logger: Logger;
}
/**
 * Composes a master JSON Schema by merging the base manifest schema with component-specific schemas
 * This enables validation of component configurations against their individual Config.schema.json files
 */
export declare class ManifestSchemaComposer {
    private dependencies;
    private componentSchemas;
    private baseSchema;
    constructor(dependencies: ManifestSchemaComposerDependencies);
    /**
     * Load and compose the master schema from base manifest schema and all component schemas
     */
    composeMasterSchema(): Promise<any>;
    /**
     * Load the base service manifest schema
     */
    private loadBaseSchema;
    /**
     * Discover and load all component Config.schema.json files
     */
    private loadComponentSchemas;
    /**
     * Load a single component schema file
     */
    private loadComponentSchema;
    /**
     * Derive component type from file path
     */
    private deriveComponentTypeFromPath;
    /**
     * Compose the master schema by merging base schema with component-specific validation
     */
    private composeSchema;
    /**
     * Enhance the component definition in the schema to include dynamic config validation
     */
    private enhanceComponentDefinition;
    /**
     * Resolve the component definition from the schema, handling $refs
     */
    private resolveComponentDefinition;
    /**
     * Check if a component type has a schema
     */
    hasComponentSchema(componentType: string): boolean;
    /**
     * Get component schema for a specific component type
     */
    getComponentSchema(componentType: string): ComponentSchemaInfo | undefined;
    /**
     * Get all loaded component types
     */
    getLoadedComponentTypes(): string[];
    /**
     * Get schema loading statistics
     */
    getSchemaStats(): {
        baseSchemaLoaded: boolean;
        componentSchemasLoaded: number;
        componentTypes: string[];
    };
    private rewriteSchemaRefs;
}
//# sourceMappingURL=manifest-schema-composer.d.ts.map