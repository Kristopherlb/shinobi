// src/platform/contracts/components/component-registry.ts
// Component Registry for managing component type mappings
/**
 * Component Registry implementation
 * Maps component types to their constructors
 */
export class ComponentRegistry {
    components = new Map();
    /**
     * Register a component type with its constructor
     */
    register(type, componentClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('Component type must be a non-empty string');
        }
        if (!componentClass || typeof componentClass !== 'function') {
            throw new Error('Component class must be a constructor function');
        }
        // Validate component class has required methods
        this.validateComponentClass(componentClass);
        this.components.set(type, componentClass);
    }
    /**
     * Get component constructor by type
     */
    getComponentClass(type) {
        return this.components.get(type);
    }
    /**
     * Check if component type is registered
     */
    hasComponent(type) {
        return this.components.has(type);
    }
    /**
     * Get all registered component types
     */
    getRegisteredTypes() {
        return Array.from(this.components.keys());
    }
    /**
     * Unregister a component type
     */
    unregister(type) {
        return this.components.delete(type);
    }
    /**
     * Clear all registered components
     */
    clear() {
        this.components.clear();
    }
    /**
     * Validate component class has required methods
     */
    validateComponentClass(componentClass) {
        const prototype = componentClass.prototype;
        // Check for required methods
        const requiredMethods = ['getName', 'getId', 'getType', 'getCapabilityData', 'getServiceName', 'synth'];
        for (const method of requiredMethods) {
            if (typeof prototype[method] !== 'function') {
                throw new Error(`Component class must implement ${method} method`);
            }
        }
    }
}
/**
 * Default component registry with common AWS components
 */
export class DefaultComponentRegistry extends ComponentRegistry {
    constructor() {
        super();
        this.registerDefaultComponents();
    }
    /**
     * Register default AWS components
     */
    registerDefaultComponents() {
        // This will be populated with actual component classes
        // when they are implemented in packages/components/
        // Example registrations (commented out until components exist):
        // this.register('s3-bucket', S3BucketComponent);
        // this.register('lambda-api', LambdaApiComponent);
        // this.register('rds-postgres', RdsPostgresComponent);
        // this.register('ecs-cluster', EcsClusterComponent);
        // this.register('ecr-repository', EcrRepositoryComponent);
    }
}
//# sourceMappingURL=component-registry.js.map