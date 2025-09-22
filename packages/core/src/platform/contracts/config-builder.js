"use strict";
// src/platform/contracts/config-builder.ts
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigBuilder = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
/**
 * Abstract base class for all component configuration builders.
 *
 * Implements the centralized 5-layer configuration precedence engine:
 * 1. Hardcoded Fallbacks (Priority 5 - Lowest)
 * 2. Platform Configuration (Priority 4)
 * 3. Environment Configuration (Priority 3)
 * 4. Component Overrides (Priority 2)
 * 5. Policy Overrides (Priority 1 - Highest)
 *
 * Concrete implementations only need to provide component-specific hardcoded fallbacks.
 * All orchestration, loading, merging, and validation is handled automatically.
 */
class ConfigBuilder {
    builderContext;
    schema;
    constructor(builderContext, schema) {
        this.builderContext = builderContext;
        this.schema = schema;
    }
    /**
     * Build the complete configuration by applying the 5-layer precedence chain.
     * This is the centralized configuration engine used by all components.
     */
    buildSync() {
        // Layer 1: Hardcoded Fallbacks (Lowest Priority - Priority 5)
        const hardcodedFallbacks = this.getHardcodedFallbacks();
        // Layer 2: Segregated Platform Configuration (Priority 4)
        const platformConfig = this._loadPlatformConfiguration();
        // Layer 3: Service-Level Environment Configuration (Priority 3) 
        // TODO: This will be implemented when we have environment configuration support
        const environmentConfig = this._getEnvironmentConfiguration();
        // Layer 4: Component-Level Overrides (Priority 2)
        const componentOverrides = this.builderContext.spec.config || {};
        // Layer 5: Governance Policy Overrides (Priority 1) 
        // TODO: This will be implemented when we have policy override support
        const policyOverrides = this._getPolicyOverrides();
        // Merge all layers in precedence order (lowest to highest priority)
        const mergedConfig = this._deepMergeConfigs(hardcodedFallbacks, platformConfig, environmentConfig, componentOverrides, policyOverrides);
        // Resolve environment interpolations (${env:key} patterns)
        const resolvedConfig = this._resolveEnvironmentInterpolationsSync(mergedConfig);
        return resolvedConfig;
    }
    /**
     * Load platform-wide configuration from segregated YAML files based on compliance framework
     */
    _loadPlatformConfiguration() {
        const framework = this.builderContext.context.complianceFramework;
        const configPath = this._getPlatformConfigPath(framework);
        try {
            if (!fs.existsSync(configPath)) {
                throw new Error(`Platform configuration file not found: ${configPath}`);
            }
            const fileContents = fs.readFileSync(configPath, 'utf8');
            const platformConfig = yaml.load(fileContents);
            // Extract configuration for this component type
            const componentType = this.builderContext.spec.type;
            if (!platformConfig?.defaults?.[componentType]) {
                throw new Error(`No ${componentType} configuration found in ${configPath}`);
            }
            return platformConfig.defaults[componentType];
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to load platform configuration for framework '${framework}': ${error.message}`);
            }
            throw new Error(`Unknown error loading platform configuration for framework '${framework}'`);
        }
    }
    /**
     * Get the file path for platform configuration based on compliance framework
     */
    _getPlatformConfigPath(framework) {
        const configDir = path.resolve(process.cwd(), 'config');
        switch (framework) {
            case 'commercial':
                return path.join(configDir, 'commercial.yml');
            case 'fedramp-moderate':
                return path.join(configDir, 'fedramp-moderate.yml');
            case 'fedramp-high':
                return path.join(configDir, 'fedramp-high.yml');
            default:
                throw new Error(`Unknown compliance framework: ${framework}. Supported frameworks: commercial, fedramp-moderate, fedramp-high`);
        }
    }
    /**
     * Get service-level environment configuration
     * TODO: This will be implemented when we have service-level environment configuration support
     */
    _getEnvironmentConfiguration() {
        // TODO: This will be implemented when we have service-level environment configuration support
        // Should parse environment blocks from service.yml and resolve based on current environment
        return {};
    }
    /**
     * Get governance policy overrides
     * TODO: This will be implemented when we have policy override support
     */
    _getPolicyOverrides() {
        // TODO: This will be implemented when we have policy override support
        // Should parse policy.overrides blocks and apply compliance rules
        return {};
    }
    /**
     * Deep merge multiple configuration objects in precedence order (lowest to highest priority).
     * This is the core merging engine that handles nested objects correctly.
     */
    _deepMergeConfigs(...configs) {
        return configs.reduce((merged, config) => {
            if (!config)
                return merged;
            return this._mergeConfigs(merged, config);
        }, {});
    }
    /**
     * Recursively merge two configuration objects, with source taking precedence over target
     */
    _mergeConfigs(target, source) {
        const result = { ...target };
        for (const [key, value] of Object.entries(source)) {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                // Recursively merge nested objects
                result[key] = this._mergeConfigs(result[key] || {}, value);
            }
            else {
                // Direct assignment for primitives, arrays, and null values
                result[key] = value;
            }
        }
        return result;
    }
    /**
     * Resolve environment variable interpolations in configuration values
     * Supports ${env:KEY} and ${env:KEY:default} patterns
     */
    _resolveEnvironmentInterpolationsSync(config) {
        const resolve = (obj) => {
            if (typeof obj === 'string') {
                return obj.replace(/\$\{env:([^:}]+)(?::([^}]*))?\}/g, (match, key, defaultValue) => {
                    return process.env[key] ?? defaultValue ?? match;
                });
            }
            else if (Array.isArray(obj)) {
                return obj.map(resolve);
            }
            else if (obj !== null && typeof obj === 'object') {
                const resolved = {};
                for (const [key, value] of Object.entries(obj)) {
                    resolved[key] = resolve(value);
                }
                return resolved;
            }
            return obj;
        };
        return resolve(config);
    }
}
exports.ConfigBuilder = ConfigBuilder;
