/**
 * Manifest Schema Composer - Dynamically composes master schema from base manifest and component schemas
 * Implements comprehensive JSON Schema validation with component-specific configuration validation
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
/**
 * Composes a master JSON Schema by merging the base manifest schema with component-specific schemas
 * This enables validation of component configurations against their individual Config.schema.json files
 */
export class ManifestSchemaComposer {
    dependencies;
    componentSchemas = new Map();
    baseSchema = null;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    /**
     * Load and compose the master schema from base manifest schema and all component schemas
     */
    async composeMasterSchema() {
        this.dependencies.logger.debug('Starting master schema composition');
        // Load base manifest schema
        this.baseSchema = await this.loadBaseSchema();
        // Load all component schemas
        await this.loadComponentSchemas();
        // Compose the master schema with dynamic component config validation
        const masterSchema = this.composeSchema();
        this.dependencies.logger.debug('Master schema composition completed');
        return masterSchema;
    }
    /**
     * Load the base service manifest schema
     */
    async loadBaseSchema() {
        const schemaPath = path.resolve(__dirname, 'service-manifest.schema.json');
        const schemaContent = await fs.readFile(schemaPath, 'utf8');
        return JSON.parse(schemaContent);
    }
    /**
     * Discover and load all component Config.schema.json files
     */
    async loadComponentSchemas() {
        this.dependencies.logger.debug('Discovering component schemas');
        const patterns = [
            'packages/components/**/Config.schema.json',
            'packages/components/**/src/schema/Config.schema.json'
        ];
        const files = new Set();
        const repoRoot = path.resolve(__dirname, '../../../..');
        try {
            for (const pattern of patterns) {
                for (const file of await glob(pattern, { cwd: repoRoot, posix: true })) {
                    files.add(file);
                }
            }
            this.dependencies.logger.debug(`Found ${files.size} component schema files`);
            for (const schemaFile of Array.from(files)) {
                await this.loadComponentSchema(schemaFile);
            }
        }
        catch (error) {
            this.dependencies.logger.warn('Error discovering component schemas');
            // Continue with base schema only if component schema discovery fails
        }
    }
    /**
     * Load a single component schema file
     */
    async loadComponentSchema(schemaFilePath) {
        try {
            const repoRoot = path.resolve(__dirname, '../../../..');
            const fullPath = path.resolve(repoRoot, schemaFilePath);
            const schemaContent = await fs.readFile(fullPath, 'utf8');
            const schema = JSON.parse(schemaContent);
            // Try to get componentType from path first (most reliable), then fallback to schema metadata
            const componentType = this.deriveComponentTypeFromPath(schemaFilePath) ||
                schema['x-component-type'] ||
                schema.info?.['x-component-type'];
            if (!componentType) {
                this.dependencies.logger.warn(`Cannot infer component type for schema: ${fullPath}`);
                return;
            }
            if (this.componentSchemas.has(componentType)) {
                this.dependencies.logger.debug(`Duplicate schema for component type "${componentType}". Using first loaded: ${this.componentSchemas.get(componentType).schemaPath}`);
                return;
            }
            const defKey = `component.${componentType}.config`;
            const normalizedSchema = JSON.parse(JSON.stringify(schema));
            normalizedSchema.$id = `#/$defs/${defKey}`;
            let extractedDefinitions;
            if (normalizedSchema.definitions) {
                extractedDefinitions = JSON.parse(JSON.stringify(normalizedSchema.definitions));
                delete normalizedSchema.definitions;
            }
            this.rewriteSchemaRefs(normalizedSchema, componentType);
            this.componentSchemas.set(componentType, {
                componentType,
                schemaPath: fullPath,
                schema: normalizedSchema,
                definitions: extractedDefinitions
            });
            this.dependencies.logger.debug(`Loaded schema for component type: ${componentType}`);
        }
        catch (error) {
            this.dependencies.logger.warn(`Failed to load component schema: ${schemaFilePath}`);
        }
    }
    /**
     * Derive component type from file path
     */
    deriveComponentTypeFromPath(filePath) {
        const parts = path.normalize(filePath).split(path.sep);
        const idx = parts.indexOf('components');
        return idx >= 0 ? parts[idx + 1] : undefined;
    }
    /**
     * Compose the master schema by merging base schema with component-specific validation
     */
    composeSchema() {
        if (!this.baseSchema) {
            throw new Error('Base schema not loaded');
        }
        // Create a deep copy of the base schema to avoid mutations
        const masterSchema = JSON.parse(JSON.stringify(this.baseSchema));
        // Enhance the component definition to include dynamic config validation
        this.enhanceComponentDefinition(masterSchema);
        return masterSchema;
    }
    /**
     * Enhance the component definition in the schema to include dynamic config validation
     */
    enhanceComponentDefinition(schema) {
        const componentDef = this.resolveComponentDefinition(schema);
        if (!componentDef) {
            this.dependencies.logger.warn('Component definition not found in base schema');
            return;
        }
        // Put every component config schema into $defs for clean refs
        schema.$defs = schema.$defs || {};
        const allTypes = Array.from(this.componentSchemas.keys());
        for (const [componentType, info] of Array.from(this.componentSchemas.entries())) {
            const defKey = `component.${componentType}.config`;
            schema.$defs[defKey] = info.schema;
            if (info.definitions) {
                for (const [definitionName, definitionSchema] of Object.entries(info.definitions)) {
                    const definitionKey = `component.${componentType}.definition.${definitionName.replace(/[\/#]/g, '.')}`;
                    schema.$defs[definitionKey] = definitionSchema;
                }
            }
        }
        // Strengthen `type` to the loaded component types (only if non-empty to avoid Ajv enum error)
        if (componentDef.properties?.type) {
            if (allTypes.length > 0) {
                componentDef.properties.type = {
                    type: 'string',
                    enum: allTypes,
                    description: `The type of component to create. Must be one of: ${allTypes.join(', ')}`
                };
            }
            else {
                // Fall back to a simple string type when no component schemas are discovered
                componentDef.properties.type = { type: 'string', description: 'Component type' };
            }
        }
        // Add conditionals that bind type -> config
        const conditionals = allTypes.map((componentType) => ({
            if: {
                properties: { type: { const: componentType } },
                required: ['type']
            },
            then: {
                properties: {
                    config: { $ref: `#/$defs/component.${componentType}.config` }
                }
            }
        }));
        // Merge with existing allOf (if any). Only append when there are conditionals.
        if (conditionals.length > 0) {
            componentDef.allOf = [...(componentDef.allOf || []), ...conditionals];
        }
        this.dependencies.logger.debug(`Enhanced component config validation with ${allTypes.length} component types`);
    }
    /**
     * Resolve the component definition from the schema, handling $refs
     */
    resolveComponentDefinition(schema) {
        // 1) Direct $defs.component
        if (schema.$defs?.component && typeof schema.$defs.component === 'object') {
            return schema.$defs.component;
        }
        // 2) items.$ref path (e.g., components.items.$ref)
        const items = schema.properties?.components?.items;
        if (items?.$ref && typeof items.$ref === 'string') {
            const ref = items.$ref; // e.g. "#/$defs/component"
            const match = ref.match(/^#\/(\$defs)\/(.+)$/);
            if (match) {
                const [, defsKey, defName] = match;
                return schema[defsKey]?.[defName] || null;
            }
        }
        // 3) items as inline object
        if (items && typeof items === 'object') {
            return items;
        }
        return null;
    }
    /**
     * Check if a component type has a schema
     */
    hasComponentSchema(componentType) {
        return this.componentSchemas.has(componentType);
    }
    /**
     * Get component schema for a specific component type
     */
    getComponentSchema(componentType) {
        return this.componentSchemas.get(componentType);
    }
    /**
     * Get all loaded component types
     */
    getLoadedComponentTypes() {
        return Array.from(this.componentSchemas.keys());
    }
    /**
     * Get schema loading statistics
     */
    getSchemaStats() {
        return {
            baseSchemaLoaded: this.baseSchema !== null,
            componentSchemasLoaded: this.componentSchemas.size,
            componentTypes: Array.from(this.componentSchemas.keys())
        };
    }
    rewriteSchemaRefs(node, componentType) {
        const configKey = `component.${componentType}.config`;
        const definitionPrefix = `component.${componentType}.definition`;
        if (!node || typeof node !== 'object') {
            return;
        }
        if (typeof node.$ref === 'string') {
            const ref = node.$ref;
            if (ref.startsWith('#/definitions/')) {
                const pointer = ref.slice('#/definitions/'.length);
                const sanitizedPointer = pointer.replace(/[\/#]/g, '.');
                node.$ref = `#/$defs/${definitionPrefix}.${sanitizedPointer}`;
            }
            else if (ref === '#') {
                node.$ref = `#/$defs/${configKey}`;
            }
        }
        for (const value of Object.values(node)) {
            this.rewriteSchemaRefs(value, componentType);
        }
    }
}
//# sourceMappingURL=manifest-schema-composer.js.map
