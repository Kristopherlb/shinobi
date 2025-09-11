"use strict";
/**
 * Feature Flag Component
 *
 * Defines individual feature flags within an OpenFeature provider.
 * Implements Platform Feature Flagging & Canary Deployment Standard v1.0.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagComponent = exports.FEATURE_FLAG_CONFIG_SCHEMA = void 0;
const appconfig = __importStar(require("aws-cdk-lib/aws-appconfig"));
const contracts_1 = require("@platform/contracts");
/**
 * Configuration schema for Feature Flag component
 */
exports.FEATURE_FLAG_CONFIG_SCHEMA = {
    type: 'object',
    title: 'Feature Flag Configuration',
    description: 'Configuration for creating individual feature flags',
    properties: {
        flagKey: {
            type: 'string',
            description: 'Unique identifier for the feature flag',
            pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
            minLength: 1,
            maxLength: 100
        },
        flagType: {
            type: 'string',
            enum: ['boolean', 'string', 'number', 'object'],
            description: 'Data type of the flag value',
            default: 'boolean'
        },
        defaultValue: {
            description: 'Default value when flag cannot be retrieved'
        },
        description: {
            type: 'string',
            description: 'Human-readable description of the flag purpose',
            maxLength: 500
        },
        enabled: {
            type: 'boolean',
            description: 'Whether the flag is enabled',
            default: true
        }
    },
    required: ['flagKey', 'flagType', 'defaultValue'],
    additionalProperties: false,
    defaults: {
        flagType: 'boolean',
        enabled: true
    }
};
/**
 * Feature Flag Component implementing OpenFeature Standard
 */
class FeatureFlagComponent extends contracts_1.Component {
    hostedConfigurationVersion;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create feature flag definition
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting Feature Flag component synthesis', {
            flagKey: this.spec.config?.flagKey,
            flagType: this.spec.config?.flagType
        });
        const startTime = Date.now();
        try {
            // Build configuration
            this.config = this.buildConfigSync();
            this.logComponentEvent('config_built', 'Feature Flag configuration built successfully', {
                flagKey: this.config.flagKey,
                flagType: this.config.flagType,
                enabled: this.config.enabled
            });
            // Create flag definition based on provider type
            this.createFeatureFlagDefinition();
            // Register capabilities
            this.registerCapability('feature:flag', this.buildFlagCapability());
            // Log successful synthesis completion
            const duration = Date.now() - startTime;
            this.logPerformanceMetric('component_synthesis', duration, {
                resourcesCreated: Object.keys(this.capabilities).length
            });
            this.logComponentEvent('synthesis_complete', 'Feature Flag component synthesis completed successfully', {
                flagKey: this.config.flagKey,
                resourcesCreated: Object.keys(this.constructs).length
            });
        }
        catch (error) {
            this.logError(error, 'component synthesis', {
                componentType: 'feature-flag',
                stage: 'synthesis'
            });
            throw error;
        }
    }
    /**
     * Get the capabilities this component provides
     */
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    /**
     * Get the component type identifier
     */
    getType() {
        return 'feature-flag';
    }
    /**
     * Create feature flag definition
     */
    createFeatureFlagDefinition() {
        // Create AWS AppConfig hosted configuration for the flag
        // This creates a JSON configuration that defines the feature flag
        const flagDefinition = this.buildFlagDefinitionJson();
        this.hostedConfigurationVersion = new appconfig.CfnHostedConfigurationVersion(this, 'FlagDefinition', {
            applicationId: this.resolveDependentResource('openfeature-provider', 'applicationId'),
            configurationProfileId: this.resolveDependentResource('openfeature-provider', 'configurationProfileId'),
            content: JSON.stringify(flagDefinition),
            contentType: 'application/json',
            description: `Feature flag definition for ${this.config.flagKey}`
        });
        this.applyStandardTags(this.hostedConfigurationVersion, {
            'feature-flag-key': this.config.flagKey,
            'feature-flag-type': this.config.flagType,
            'openfeature-standard': 'v1.0'
        });
        // Register constructs
        this.registerConstruct('flagDefinition', this.hostedConfigurationVersion);
        this.logResourceCreation('feature-flag', this.config.flagKey, {
            flagType: this.config.flagType,
            enabled: this.config.enabled,
            defaultValue: this.config.defaultValue
        });
    }
    /**
     * Build JSON definition for the feature flag compatible with OpenFeature
     */
    buildFlagDefinitionJson() {
        const flagDefinition = {
            flags: {}
        };
        const flag = {
            enabled: this.config.enabled ?? true,
            defaultVariant: 'default',
            variants: {
                default: {
                    value: this.config.defaultValue
                }
            }
        };
        // Add targeting rules if specified
        if (this.config.targetingRules) {
            flag.targeting = this.buildTargetingRules();
        }
        // Add provider-specific constraints
        if (this.config.providerConfig?.awsAppConfig?.constraints) {
            flag.constraints = this.config.providerConfig.awsAppConfig.constraints;
        }
        flagDefinition.flags[this.config.flagKey] = flag;
        flagDefinition.values = {};
        flagDefinition.version = '1';
        return flagDefinition;
    }
    /**
     * Build targeting rules for progressive delivery
     */
    buildTargetingRules() {
        const rules = this.config.targetingRules;
        const targeting = {};
        // Percentage rollout
        if (rules.percentage !== undefined) {
            targeting.percentage = {
                variants: [
                    { variant: 'default', weight: rules.percentage },
                    { variant: 'disabled', weight: 100 - rules.percentage }
                ]
            };
            // Add disabled variant if not exists
            if (!targeting.variants) {
                targeting.variants = {};
            }
            targeting.variants.disabled = {
                value: this.getDisabledValue()
            };
        }
        // Context-based conditions
        if (rules.conditions) {
            targeting.rules = rules.conditions.map(condition => ({
                attribute: condition.attribute,
                operator: this.mapOperatorToAppConfig(condition.operator),
                value: condition.value,
                variant: 'default'
            }));
        }
        // Variant configuration for A/B testing
        if (rules.variants) {
            targeting.variants = {};
            rules.variants.forEach(variant => {
                targeting.variants[variant.name] = {
                    value: variant.value
                };
            });
            targeting.percentage = {
                variants: rules.variants.map(variant => ({
                    variant: variant.name,
                    weight: variant.weight
                }))
            };
        }
        return targeting;
    }
    /**
     * Get disabled value based on flag type
     */
    getDisabledValue() {
        switch (this.config.flagType) {
            case 'boolean':
                return false;
            case 'string':
                return '';
            case 'number':
                return 0;
            case 'object':
                return {};
            default:
                return false;
        }
    }
    /**
     * Map generic operators to AWS AppConfig operators
     */
    mapOperatorToAppConfig(operator) {
        const mapping = {
            'equals': 'Equals',
            'not_equals': 'NotEquals',
            'in': 'In',
            'not_in': 'NotIn',
            'contains': 'Contains',
            'starts_with': 'StartsWith',
            'ends_with': 'EndsWith'
        };
        return mapping[operator] || 'Equals';
    }
    /**
     * Resolve dependent resource from bound components
     */
    resolveDependentResource(componentType, resourceKey) {
        // This would typically resolve bound component resources
        // This would be resolved during platform synthesis with actual bound component ARNs
        return `\${${componentType}.${resourceKey}}`;
    }
    /**
     * Build flag capability data shape
     */
    buildFlagCapability() {
        return {
            flagKey: this.config.flagKey,
            flagType: this.config.flagType,
            defaultValue: this.config.defaultValue,
            description: this.config.description,
            targetingRules: this.config.targetingRules
        };
    }
    /**
     * Simplified config building for component
     */
    buildConfigSync() {
        const config = {
            flagKey: this.spec.config?.flagKey,
            flagType: this.spec.config?.flagType || 'boolean',
            defaultValue: this.spec.config?.defaultValue,
            description: this.spec.config?.description,
            enabled: this.spec.config?.enabled ?? true,
            targetingRules: this.spec.config?.targetingRules,
            providerConfig: this.spec.config?.providerConfig
        };
        // Validation
        if (!config.flagKey) {
            throw new Error('Feature flag flagKey is required');
        }
        if (config.defaultValue === undefined) {
            throw new Error('Feature flag defaultValue is required');
        }
        return config;
    }
}
exports.FeatureFlagComponent = FeatureFlagComponent;
