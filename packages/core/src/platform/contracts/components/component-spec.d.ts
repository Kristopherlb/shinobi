/**
 * Component specification containing configuration and metadata
 */
export interface ComponentSpec {
    /**
     * Component name from manifest
     */
    name: string;
    /**
     * Component type from manifest
     */
    type: string;
    /**
     * Component configuration from manifest
     */
    config: Record<string, any>;
    /**
     * Component-specific properties
     */
    properties?: Record<string, any>;
    /**
     * Dependencies on other components
     */
    dependencies?: string[];
    /**
     * Component-specific metadata
     */
    metadata?: Record<string, any>;
}
/**
 * Builder for creating ComponentSpec instances
 */
export declare class ComponentSpecBuilder {
    private spec;
    /**
     * Set component name
     */
    name(name: string): this;
    /**
     * Set component type
     */
    type(type: string): this;
    /**
     * Set component configuration
     */
    config(config: Record<string, any>): this;
    /**
     * Set component properties
     */
    properties(properties: Record<string, any>): this;
    /**
     * Set component dependencies
     */
    dependencies(dependencies: string[]): this;
    /**
     * Set component metadata
     */
    metadata(metadata: Record<string, any>): this;
    /**
     * Build the component specification
     */
    build(): ComponentSpec;
}
//# sourceMappingURL=component-spec.d.ts.map