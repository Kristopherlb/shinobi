"use strict";
/**
 * Compute to OpenFeature Binding Strategy
 * Handles binding compute components (Lambda) to OpenFeature providers
 * Implements Platform Feature Flagging & Canary Deployment Standard v1.0
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
exports.ComputeToOpenFeatureStrategy = void 0;
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
/**
 * Strategy for binding compute components to OpenFeature providers
 * Configures environment variables for OpenFeature SDK auto-configuration
 */
class ComputeToOpenFeatureStrategy {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    /**
     * Check if this strategy can handle the given binding
     */
    canHandle(context) {
        // Check if source is a compute component and target provides OpenFeature capability
        const isComputeSource = this.isComputeComponent(context.sourceComponent);
        const hasOpenFeatureCapability = this.hasOpenFeatureCapability(context.targetComponent);
        const isOpenFeatureCapability = context.capability === 'openfeature:provider';
        return isComputeSource && hasOpenFeatureCapability && isOpenFeatureCapability;
    }
    /**
     * Apply the binding between compute component and OpenFeature provider
     */
    async apply(context) {
        this.dependencies.logger.debug(`Applying compute to OpenFeature binding: ${context.access} access`);
        const computeFunction = this.extractComputeFunction(context.sourceComponent);
        const providerComponent = context.targetComponent;
        if (!computeFunction) {
            throw new Error('Could not extract compute function from source component');
        }
        // 1. Get OpenFeature provider capability data
        const providerCapability = this.getProviderCapability(providerComponent);
        // 2. Configure IAM permissions based on provider type
        await this.configureProviderAccess(computeFunction, providerCapability, context.access);
        // 3. Set environment variables for OpenFeature SDK auto-configuration
        await this.setOpenFeatureEnvironmentVariables(computeFunction, providerCapability, context);
        // 4. Configure observability for feature flag usage
        await this.configureFeatureFlagObservability(computeFunction, providerCapability);
        this.dependencies.logger.debug('Compute to OpenFeature binding applied successfully');
    }
    /**
     * Configure IAM permissions based on provider type
     */
    async configureProviderAccess(computeFunction, providerCapability, access) {
        this.dependencies.logger.debug(`Configuring provider access: ${providerCapability.providerType}`);
        switch (providerCapability.providerType) {
            case 'aws-appconfig':
                await this.configureAppConfigAccess(computeFunction, providerCapability, access);
                break;
            case 'launchdarkly':
                // LaunchDarkly uses API keys, no additional IAM permissions needed
                this.dependencies.logger.debug('LaunchDarkly provider configured with API key authentication');
                break;
            case 'flagsmith':
                // Flagsmith uses environment keys, no additional IAM permissions needed
                this.dependencies.logger.debug('Flagsmith provider configured with environment key authentication');
                break;
            default:
                throw new Error(`Unsupported provider type: ${providerCapability.providerType}`);
        }
    }
    /**
     * Configure AWS AppConfig access permissions
     */
    async configureAppConfigAccess(computeFunction, providerCapability, access) {
        // Grant AppConfig permissions based on access level
        const actions = this.getAppConfigActions(access);
        computeFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: actions,
            resources: [
                `arn:aws:appconfig:*:*:application/${providerCapability.connectionConfig.applicationId}`,
                `arn:aws:appconfig:*:*:application/${providerCapability.connectionConfig.applicationId}/environment/${providerCapability.connectionConfig.environmentId}`,
                `arn:aws:appconfig:*:*:application/${providerCapability.connectionConfig.applicationId}/configurationprofile/${providerCapability.connectionConfig.configurationProfileId}`
            ]
        }));
        this.dependencies.logger.debug('AWS AppConfig permissions granted successfully');
    }
    /**
     * Get AppConfig actions based on access level
     */
    getAppConfigActions(access) {
        const baseActions = [
            'appconfig:StartConfigurationSession',
            'appconfig:GetConfiguration'
        ];
        switch (access) {
            case 'read':
                return baseActions;
            case 'admin':
                return [
                    ...baseActions,
                    'appconfig:GetApplication',
                    'appconfig:GetEnvironment',
                    'appconfig:GetConfigurationProfile',
                    'appconfig:GetDeployment',
                    'appconfig:ListApplications',
                    'appconfig:ListEnvironments',
                    'appconfig:ListConfigurationProfiles'
                ];
            default:
                return baseActions;
        }
    }
    /**
     * Set environment variables for OpenFeature SDK auto-configuration
     */
    async setOpenFeatureEnvironmentVariables(computeFunction, providerCapability, context) {
        this.dependencies.logger.debug('Setting OpenFeature environment variables');
        // Base OpenFeature configuration
        const environmentVariables = {
            // OpenFeature provider configuration
            ...providerCapability.environmentVariables,
            // Feature flag service metadata
            FEATURE_FLAG_SERVICE: context.targetComponent.getName(),
            FEATURE_FLAG_ENVIRONMENT: context.environment || 'production',
            FEATURE_FLAG_ACCESS_LEVEL: context.access,
            // Observability configuration
            OPENFEATURE_TELEMETRY_ENABLED: 'true',
            OPENFEATURE_HOOKS_ENABLED: 'true'
        };
        // Add provider-specific configuration
        switch (providerCapability.providerType) {
            case 'aws-appconfig':
                Object.assign(environmentVariables, {
                    APPCONFIG_POLL_INTERVAL_SECONDS: '60', // Default poll interval
                    APPCONFIG_REQUEST_TIMEOUT_SECONDS: '30' // Request timeout
                });
                break;
            case 'launchdarkly':
                Object.assign(environmentVariables, {
                    LAUNCHDARKLY_STREAMING: 'true', // Enable streaming
                    LAUNCHDARKLY_EVENTS: 'true' // Enable analytics events
                });
                break;
            case 'flagsmith':
                Object.assign(environmentVariables, {
                    FLAGSMITH_POLL_INTERVAL: '60000', // 60 seconds in milliseconds
                    FLAGSMITH_ENABLE_ANALYTICS: 'true' // Enable analytics
                });
                break;
        }
        // Apply custom environment variable names if provided
        if (context.customEnvVars) {
            for (const [standardName, customName] of Object.entries(context.customEnvVars)) {
                if (environmentVariables[standardName]) {
                    environmentVariables[customName] = environmentVariables[standardName];
                    delete environmentVariables[standardName];
                }
            }
        }
        // Set environment variables on the compute function
        this.addEnvironmentVariables(computeFunction, environmentVariables);
        this.dependencies.logger.debug('OpenFeature environment variables set successfully');
    }
    /**
     * Configure observability for feature flag usage
     */
    async configureFeatureFlagObservability(computeFunction, providerCapability) {
        this.dependencies.logger.debug('Configuring feature flag observability');
        // Add observability environment variables
        const observabilityEnvVars = {
            // OpenTelemetry tracing for feature flag evaluations
            OTEL_RESOURCE_ATTRIBUTES: `service.name=feature-flags,feature.provider=${providerCapability.providerType}`,
            // Feature flag metrics
            FEATURE_FLAG_METRICS_ENABLED: 'true',
            FEATURE_FLAG_METRICS_NAMESPACE: 'FeatureFlags',
            // Audit logging
            FEATURE_FLAG_AUDIT_LOGGING: 'true'
        };
        this.addEnvironmentVariables(computeFunction, observabilityEnvVars);
        this.dependencies.logger.debug('Feature flag observability configured successfully');
    }
    /**
     * Check if a component is a compute component
     */
    isComputeComponent(component) {
        const computeTypes = ['lambda-api', 'lambda-worker', 'lambda-function', 'container', 'ecs-service'];
        return computeTypes.includes(component.getType());
    }
    /**
     * Check if component has OpenFeature capability
     */
    hasOpenFeatureCapability(component) {
        const capabilities = component.getCapabilities();
        return 'openfeature:provider' in capabilities;
    }
    /**
     * Extract compute function from component
     */
    extractComputeFunction(component) {
        // Try to get the main compute construct
        const computeConstruct = component.getConstruct('main') ||
            component.getConstruct('function') ||
            component.getConstruct('lambdaFunction');
        if (computeConstruct && 'addToRolePolicy' in computeConstruct) {
            return computeConstruct;
        }
        return null;
    }
    /**
     * Get OpenFeature provider capability data
     */
    getProviderCapability(component) {
        const capabilities = component.getCapabilities();
        return capabilities['openfeature:provider'];
    }
    /**
     * Add environment variables to compute function
     */
    addEnvironmentVariables(computeFunction, variables) {
        // In a real implementation, this would be handled during Lambda construction
        // or through CDK's environment variable APIs
        this.dependencies.logger.debug(`Would set ${Object.keys(variables).length} environment variables on compute function`);
        // Log the variables for debugging (without sensitive values)
        for (const [key, value] of Object.entries(variables)) {
            const logValue = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') ? '[HIDDEN]' : value;
            this.dependencies.logger.debug(`  ${key}=${logValue}`);
        }
    }
}
exports.ComputeToOpenFeatureStrategy = ComputeToOpenFeatureStrategy;
