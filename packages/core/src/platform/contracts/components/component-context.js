// src/platform/contracts/components/component-context.ts
// Component context for factory instantiation
/**
 * Builder for creating ComponentContext instances
 */
export class ComponentContextBuilder {
    context = {};
    /**
     * Set service name
     */
    serviceName(name) {
        this.context.serviceName = name;
        return this;
    }
    /**
     * Set environment
     */
    environment(env) {
        this.context.environment = env;
        return this;
    }
    /**
     * Set compliance framework
     */
    complianceFramework(framework) {
        this.context.complianceFramework = framework;
        return this;
    }
    /**
     * Set AWS region
     */
    region(region) {
        this.context.region = region;
        return this;
    }
    /**
     * Set AWS account ID
     */
    accountId(accountId) {
        this.context.accountId = accountId;
        return this;
    }
    /**
     * Set service owner
     */
    owner(owner) {
        this.context.owner = owner;
        return this;
    }
    /**
     * Set metadata
     */
    metadata(metadata) {
        this.context.metadata = metadata;
        return this;
    }
    /**
     * Set tags
     */
    tags(tags) {
        this.context.tags = tags;
        return this;
    }
    /**
     * Set platform configuration
     */
    platformConfig(config) {
        this.context.platformConfig = config;
        return this;
    }
    /**
     * Build the component context
     */
    build() {
        // Validate required fields
        if (!this.context.serviceName) {
            throw new Error('Service name is required');
        }
        if (!this.context.environment) {
            throw new Error('Environment is required');
        }
        if (!this.context.complianceFramework) {
            throw new Error('Compliance framework is required');
        }
        if (!this.context.region) {
            throw new Error('Region is required');
        }
        if (!this.context.accountId) {
            throw new Error('Account ID is required');
        }
        return this.context;
    }
}
//# sourceMappingURL=component-context.js.map