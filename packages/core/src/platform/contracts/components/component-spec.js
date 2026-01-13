// src/platform/contracts/components/component-spec.ts
// Component specification for factory instantiation
/**
 * Builder for creating ComponentSpec instances
 */
export class ComponentSpecBuilder {
    spec = {};
    /**
     * Set component name
     */
    name(name) {
        this.spec.name = name;
        return this;
    }
    /**
     * Set component type
     */
    type(type) {
        this.spec.type = type;
        return this;
    }
    /**
     * Set component configuration
     */
    config(config) {
        this.spec.config = config;
        return this;
    }
    /**
     * Set component properties
     */
    properties(properties) {
        this.spec.properties = properties;
        return this;
    }
    /**
     * Set component dependencies
     */
    dependencies(dependencies) {
        this.spec.dependencies = dependencies;
        return this;
    }
    /**
     * Set component metadata
     */
    metadata(metadata) {
        this.spec.metadata = metadata;
        return this;
    }
    /**
     * Build the component specification
     */
    build() {
        // Validate required fields
        if (!this.spec.name) {
            throw new Error('Component name is required');
        }
        if (!this.spec.type) {
            throw new Error('Component type is required');
        }
        if (!this.spec.config) {
            this.spec.config = {};
        }
        return this.spec;
    }
}
//# sourceMappingURL=component-spec.js.map