import { ComplianceFramework } from '../bindings.ts';
/**
 * Component context containing environment and configuration data
 */
export interface ComponentContext {
    /**
     * Service name from manifest
     */
    serviceName: string;
    /**
     * Environment name (dev, staging, prod, etc.)
     */
    environment: string;
    /**
     * Compliance framework being used
     */
    complianceFramework: ComplianceFramework;
    /**
     * AWS region for deployment
     */
    region: string;
    /**
     * AWS account ID
     */
    accountId: string;
    /**
     * Service owner
     */
    owner?: string;
    /**
     * Component-specific metadata
     */
    metadata?: Record<string, any>;
    /**
     * Tags to apply to all resources
     */
    tags?: Record<string, string>;
    /**
     * Platform configuration overrides
     */
    platformConfig?: Record<string, any>;
    /**
     * OTEL collector endpoint for observability
     */
    otelCollectorEndpoint?: string;
}
/**
 * Builder for creating ComponentContext instances
 */
export declare class ComponentContextBuilder {
    private context;
    /**
     * Set service name
     */
    serviceName(name: string): this;
    /**
     * Set environment
     */
    environment(env: string): this;
    /**
     * Set compliance framework
     */
    complianceFramework(framework: ComplianceFramework): this;
    /**
     * Set AWS region
     */
    region(region: string): this;
    /**
     * Set AWS account ID
     */
    accountId(accountId: string): this;
    /**
     * Set service owner
     */
    owner(owner: string): this;
    /**
     * Set metadata
     */
    metadata(metadata: Record<string, any>): this;
    /**
     * Set tags
     */
    tags(tags: Record<string, string>): this;
    /**
     * Set platform configuration
     */
    platformConfig(config: Record<string, any>): this;
    /**
     * Build the component context
     */
    build(): ComponentContext;
}
//# sourceMappingURL=component-context.d.ts.map