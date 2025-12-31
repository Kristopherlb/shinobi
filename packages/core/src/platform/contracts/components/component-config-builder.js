// src/platform/contracts/components/component-config-builder.ts
// Component configuration builder with 5-layer precedence chain
/**
 * Configuration layer enumeration
 */
export var ConfigLayer;
(function (ConfigLayer) {
    ConfigLayer[ConfigLayer["HARDCODED_DEFAULTS"] = 0] = "HARDCODED_DEFAULTS";
    ConfigLayer[ConfigLayer["COMPLIANCE_DEFAULTS"] = 1] = "COMPLIANCE_DEFAULTS";
    ConfigLayer[ConfigLayer["PLATFORM_DEFAULTS"] = 2] = "PLATFORM_DEFAULTS";
    ConfigLayer[ConfigLayer["COMPONENT_CONFIG"] = 3] = "COMPONENT_CONFIG";
    ConfigLayer[ConfigLayer["ENVIRONMENT_OVERRIDES"] = 4] = "ENVIRONMENT_OVERRIDES";
})(ConfigLayer || (ConfigLayer = {}));
/**
 * Configuration builder for components
 * Implements 5-layer precedence chain:
 * 1. Hardcoded defaults (lowest priority)
 * 2. Compliance defaults
 * 3. Platform defaults
 * 4. Environment overrides
 * 5. Component config (highest priority)
 */
export class ComponentConfigBuilder {
    hardcodedDefaults = new Map();
    complianceDefaults = new Map();
    platformDefaults = new Map();
    constructor() {
        this.initializeDefaultConfigurations();
    }
    /**
     * Build final configuration using 5-layer precedence
     */
    buildConfig(type, context, spec) {
        const config = {};
        // Layer 1: Hardcoded defaults (lowest priority)
        this.applyLayer(config, this.getHardcodedDefaults(type), ConfigLayer.HARDCODED_DEFAULTS);
        // Layer 2: Compliance defaults
        this.applyLayer(config, this.getComplianceDefaults(type, context.complianceFramework), ConfigLayer.COMPLIANCE_DEFAULTS);
        // Layer 3: Platform defaults
        this.applyLayer(config, this.getPlatformDefaults(type), ConfigLayer.PLATFORM_DEFAULTS);
        // Layer 4: Component config
        this.applyLayer(config, spec.config, ConfigLayer.COMPONENT_CONFIG);
        // Layer 5: Environment overrides (highest priority)
        this.applyLayer(config, this.getEnvironmentOverrides(type, context, spec), ConfigLayer.ENVIRONMENT_OVERRIDES);
        // Add context metadata
        config._context = {
            serviceName: context.serviceName,
            environment: context.environment,
            complianceFramework: context.complianceFramework,
            region: context.region,
            accountId: context.accountId
        };
        // Add component metadata
        config._component = {
            name: spec.name,
            type: spec.type,
            dependencies: spec.dependencies || []
        };
        return config;
    }
    /**
     * Apply configuration layer with deep merge
     */
    applyLayer(target, source, layer) {
        if (!source)
            return;
        for (const [key, value] of Object.entries(source)) {
            if (value !== null && value !== undefined) {
                if (typeof value === 'object' && !Array.isArray(value) && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                    // Deep merge objects
                    target[key] = { ...target[key], ...value };
                }
                else {
                    // Override primitive values, arrays, and null/undefined
                    target[key] = value;
                }
            }
        }
    }
    /**
     * Get hardcoded defaults for component type
     */
    getHardcodedDefaults(type) {
        return this.hardcodedDefaults.get(type) || {};
    }
    /**
     * Get compliance defaults for component type and framework
     */
    getComplianceDefaults(type, framework) {
        const frameworkDefaults = this.complianceDefaults.get(framework);
        if (!frameworkDefaults)
            return {};
        return frameworkDefaults.get(type) || {};
    }
    /**
     * Get platform defaults for component type
     */
    getPlatformDefaults(type) {
        return this.platformDefaults.get(type) || {};
    }
    /**
     * Get environment overrides for component type
     */
    getEnvironmentOverrides(type, context, spec) {
        // Check for environment-specific overrides in platform config by component name
        if (context.platformConfig?.environments?.[context.environment]?.components?.[spec.name]) {
            return context.platformConfig.environments[context.environment].components[spec.name];
        }
        // Check for environment-specific overrides in platform config by component type
        if (context.platformConfig?.environments?.[context.environment]?.components?.[type]) {
            return context.platformConfig.environments[context.environment].components[type];
        }
        // Check for component-specific environment overrides
        if (context.metadata?.environmentOverrides?.[spec.name]) {
            return context.metadata.environmentOverrides[spec.name];
        }
        if (context.metadata?.environmentOverrides?.[type]) {
            return context.metadata.environmentOverrides[type];
        }
        return {};
    }
    /**
     * Initialize default configurations for all component types
     */
    initializeDefaultConfigurations() {
        this.initializeHardcodedDefaults();
        this.initializeComplianceDefaults();
        this.initializePlatformDefaults();
    }
    /**
     * Initialize hardcoded defaults for component types
     */
    initializeHardcodedDefaults() {
        // S3 Bucket defaults
        this.hardcodedDefaults.set('s3-bucket', {
            versioned: false,
            publicReadAccess: false,
            blockPublicAccess: true,
            encryption: 'AES256'
        });
        // Lambda API defaults
        this.hardcodedDefaults.set('lambda-api', {
            runtime: 'nodejs20.x',
            memorySize: 128,
            timeout: 30,
            tracing: {
                mode: 'Active'
            }
        });
        // RDS Postgres defaults
        this.hardcodedDefaults.set('rds-postgres', {
            engine: 'postgres',
            engineVersion: '15.4',
            instanceClass: 'db.t3.micro',
            allocatedStorage: 20,
            storageEncrypted: true,
            backupRetentionPeriod: 7
        });
        // ECS Cluster defaults
        this.hardcodedDefaults.set('ecs-cluster', {
            capacityProviders: ['FARGATE'],
            defaultCapacityProviderStrategy: [
                {
                    capacityProvider: 'FARGATE',
                    weight: 1
                }
            ]
        });
        // ECR Repository defaults
        this.hardcodedDefaults.set('ecr-repository', {
            imageScanOnPush: true,
            lifecyclePolicy: {
                rules: [
                    {
                        rulePriority: 1,
                        description: 'Keep last 10 images',
                        selection: {
                            tagStatus: 'tagged',
                            countType: 'imageCountMoreThan',
                            countNumber: 10
                        },
                        action: {
                            type: 'expire'
                        }
                    }
                ]
            }
        });
    }
    /**
     * Initialize compliance-specific defaults
     */
    initializeComplianceDefaults() {
        // Commercial defaults
        const commercialDefaults = new Map();
        commercialDefaults.set('s3-bucket', {
            accessLogging: false,
            versioned: false
        });
        commercialDefaults.set('lambda-api', {
            logRetention: 14
        });
        commercialDefaults.set('rds-postgres', {
            backupRetentionPeriod: 7,
            monitoringInterval: 0
        });
        this.complianceDefaults.set('commercial', commercialDefaults);
        // FedRAMP Moderate defaults
        const fedrampModerateDefaults = new Map();
        fedrampModerateDefaults.set('s3-bucket', {
            accessLogging: true,
            versioned: true,
            encryption: 'aws:kms'
        });
        fedrampModerateDefaults.set('lambda-api', {
            logRetention: 90,
            tracing: {
                mode: 'Active'
            }
        });
        fedrampModerateDefaults.set('rds-postgres', {
            backupRetentionPeriod: 30,
            monitoringInterval: 60,
            performanceInsightsEnabled: true
        });
        this.complianceDefaults.set('fedramp-moderate', fedrampModerateDefaults);
        // FedRAMP High defaults
        const fedrampHighDefaults = new Map();
        fedrampHighDefaults.set('s3-bucket', {
            accessLogging: true,
            versioned: true,
            encryption: 'aws:kms',
            kmsKeyId: 'alias/aws/s3',
            objectLock: true,
            objectLockRetentionDays: 2555 // 7 years
        });
        fedrampHighDefaults.set('lambda-api', {
            logRetention: 2555, // 7 years
            tracing: {
                mode: 'Active'
            },
            environment: {
                FIPS_ENABLED: 'true'
            }
        });
        fedrampHighDefaults.set('rds-postgres', {
            backupRetentionPeriod: 90,
            monitoringInterval: 60,
            performanceInsightsEnabled: true,
            multiAz: true,
            deletionProtection: true
        });
        this.complianceDefaults.set('fedramp-high', fedrampHighDefaults);
    }
    /**
     * Initialize platform defaults
     */
    initializePlatformDefaults() {
        // Common platform defaults
        this.platformDefaults.set('s3-bucket', {
            tags: {
                ManagedBy: 'Shinobi',
                Platform: 'AWS'
            }
        });
        this.platformDefaults.set('lambda-api', {
            tags: {
                ManagedBy: 'Shinobi',
                Platform: 'AWS'
            },
            environment: {
                NODE_ENV: 'production'
            }
        });
        this.platformDefaults.set('rds-postgres', {
            tags: {
                ManagedBy: 'Shinobi',
                Platform: 'AWS'
            }
        });
        this.platformDefaults.set('ecs-cluster', {
            tags: {
                ManagedBy: 'Shinobi',
                Platform: 'AWS'
            }
        });
        this.platformDefaults.set('ecr-repository', {
            tags: {
                ManagedBy: 'Shinobi',
                Platform: 'AWS'
            }
        });
    }
}
//# sourceMappingURL=component-config-builder.js.map