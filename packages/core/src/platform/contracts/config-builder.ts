// src/platform/contracts/config-builder.ts

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ComponentSpec, ComponentContext } from './component-interfaces.js';

/**
 * Context object passed to ConfigBuilder constructors
 */
export interface ConfigBuilderContext {
  /** Component context with service info and compliance framework */
  readonly context: ComponentContext;
  /** Component specification from manifest */
  readonly spec: ComponentSpec;
}

/**
 * JSON Schema definition for component configuration validation
 */
export interface ComponentConfigSchema {
  readonly type: string;
  readonly properties: Record<string, any>;
  readonly required?: string[];
  readonly additionalProperties?: boolean;
  readonly allOf?: any[];
  readonly definitions?: Record<string, any>;
}

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
export abstract class ConfigBuilder<T = Record<string, any>> {
  protected readonly builderContext: ConfigBuilderContext;
  protected readonly schema: ComponentConfigSchema;

  constructor(builderContext: ConfigBuilderContext, schema: ComponentConfigSchema) {
    this.builderContext = builderContext;
    this.schema = schema;
  }

  /**
   * Build the complete configuration by applying the 5-layer precedence chain.
   * This is the centralized configuration engine used by all components.
   */
  public buildSync(): T {
    const componentType = this.builderContext.spec.type;
    const componentName = this.builderContext.spec.name;
    
    // Layer 1: Hardcoded Fallbacks (Lowest Priority - Priority 5)
    const hardcodedFallbacks = this.getHardcodedFallbacks();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config-builder.ts:58',message:'Layer 1: Hardcoded Fallbacks',data:{componentType,componentName,layer:'hardcoded-fallbacks',priority:5,source:'getHardcodedFallbacks()',vpc:{vpcId:hardcodedFallbacks.vpc?.vpcId,subnetIds:hardcodedFallbacks.vpc?.subnetIds,subnetGroupName:hardcodedFallbacks.vpc?.subnetGroupName},backup:hardcodedFallbacks.backup,maintenance:hardcodedFallbacks.maintenance},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    // Layer 2: Segregated Platform Configuration (Priority 4)
    const platformConfig = this._loadPlatformConfiguration();
    
    // Layer 3: Service-Level Environment Configuration (Priority 3) 
    // TODO: This will be implemented when we have environment configuration support
    const environmentConfig = this._getEnvironmentConfiguration();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config-builder.ts:65',message:'Layer 3: Environment Configuration',data:{componentType,componentName,layer:'environment-config',priority:3,source:'service.yml environments block',vpc:environmentConfig.vpc,backup:environmentConfig.backup,maintenance:environmentConfig.maintenance},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    // Layer 4: Component-Level Overrides (Priority 2)
    const componentOverrides = this.builderContext.spec.config || {};
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config-builder.ts:68',message:'Layer 4: Component Overrides',data:{componentType,componentName,layer:'component-overrides',priority:2,source:'service.yml component config',vpc:componentOverrides.vpc,backup:componentOverrides.backup,maintenance:componentOverrides.maintenance},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    // Layer 5: Governance Policy Overrides (Priority 1) 
    // TODO: This will be implemented when we have policy override support
    const policyOverrides = this._getPolicyOverrides();
    
    // Merge all layers in precedence order (lowest to highest priority)
    const mergedConfig = this._deepMergeConfigs(
      hardcodedFallbacks,
      platformConfig,
      environmentConfig,
      componentOverrides,
      policyOverrides
    );
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config-builder.ts:75',message:'Merged config layers',data:{componentType,componentName,layer:'merged-config',source:'_deepMergeConfigs()',vpc:mergedConfig.vpc,backup:mergedConfig.backup,maintenance:mergedConfig.maintenance,hardcodedVpc:hardcodedFallbacks.vpc,platformVpc:platformConfig.vpc,environmentVpc:environmentConfig.vpc,componentVpc:componentOverrides.vpc},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    // Resolve environment interpolations (${env:key} patterns)
    const resolvedConfig = this._resolveEnvironmentInterpolationsSync(mergedConfig);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config-builder.ts:91',message:'Final resolved config',data:{componentType,componentName,layer:'resolved-config',source:'_resolveEnvironmentInterpolationsSync()',vpc:resolvedConfig.vpc,backup:resolvedConfig.backup,maintenance:resolvedConfig.maintenance},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    return resolvedConfig as T;
  }

  /**
   * Concrete implementations must provide component-specific hardcoded fallbacks.
   * These serve as the absolute lowest priority defaults when no other configuration is available.
   * Should contain ultra-safe, minimal configurations that work in any environment.
   */
  protected abstract getHardcodedFallbacks(): Record<string, any>;

  /**
   * Load platform-wide configuration from segregated YAML files based on compliance framework
   */
  private _loadPlatformConfiguration(): Record<string, any> {
    const framework = this.builderContext.context.complianceFramework;
    const componentType = this.builderContext.spec.type;
    const componentName = this.builderContext.spec.name;
    const configPath = this._getPlatformConfigPath(framework);
    
    // #region agent log
    const configPathAbsolute = path.resolve(configPath);
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config-builder.ts:107',message:'Loading platform config file',data:{componentType,componentName,framework,configPath,configPathAbsolute,fileExists:fs.existsSync(configPath),cwd:process.cwd(),cwdAbsolute:path.resolve(process.cwd())},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    try {
      if (!fs.existsSync(configPath)) {
        throw new Error(`Platform configuration file not found: ${configPath}`);
      }
      
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const platformConfig = yaml.load(fileContents) as any;
      
      // Extract configuration for this component type
      if (!platformConfig?.defaults?.[componentType]) {
        throw new Error(`No ${componentType} configuration found in ${configPath}`);
      }
      
      const componentConfig = platformConfig.defaults[componentType];
      
      // #region agent log
      const configPathAbsolute = path.resolve(configPath);
      fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config-builder.ts:124',message:'Layer 2: Platform Configuration loaded',data:{componentType,componentName,layer:'platform-config',priority:4,source:configPath,sourceAbsolute:configPathAbsolute,filePath:configPath,filePathAbsolute:configPathAbsolute,vpc:componentConfig.vpc,backup:componentConfig.backup,maintenance:componentConfig.maintenance,rawConfig:componentConfig},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'J'})}).catch(()=>{});
      // #endregion
      
      return componentConfig;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config-builder.ts:134',message:'Platform config load error',data:{componentType,componentName,framework,configPath,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'J'})}).catch(()=>{});
      // #endregion
      
      if (error instanceof Error) {
        throw new Error(`Failed to load platform configuration for framework '${framework}': ${error.message}`);
      }
      throw new Error(`Unknown error loading platform configuration for framework '${framework}'`);
    }
  }

  /**
   * Get the file path for platform configuration based on compliance framework
   */
  private _getPlatformConfigPath(framework: string): string {
    // Always resolve config directory relative to workspace root
    // Look for the config directory by traversing up from current directory
    let currentDir = process.cwd();
    let configDir = path.join(currentDir, 'config');
    const searchPath: string[] = [configDir];
    
    // Traverse up the directory tree to find the workspace root (where config/ exists)
    while (!fs.existsSync(configDir) && currentDir !== path.dirname(currentDir)) {
      currentDir = path.dirname(currentDir);
      configDir = path.join(currentDir, 'config');
      searchPath.push(configDir);
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config-builder.ts:145',message:'Resolving platform config path',data:{framework,startingDir:process.cwd(),configDir,configDirExists:fs.existsSync(configDir),searchPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run10',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    if (!fs.existsSync(configDir)) {
      throw new Error(`Config directory not found. Searched from ${process.cwd()} up to ${currentDir}`);
    }
    
    const configFile = (() => {
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
    })();
    
    return configFile;
  }

  /**
   * Get service-level environment configuration
   * TODO: This will be implemented when we have service-level environment configuration support
   */
  private _getEnvironmentConfiguration(): Record<string, any> {
    // TODO: This will be implemented when we have service-level environment configuration support
    // Should parse environment blocks from service.yml and resolve based on current environment
    return {};
  }

  /**
   * Get governance policy overrides
   * TODO: This will be implemented when we have policy override support
   */
  private _getPolicyOverrides(): Record<string, any> {
    // TODO: This will be implemented when we have policy override support
    // Should parse policy.overrides blocks and apply compliance rules
    return {};
  }

  /**
   * Deep merge multiple configuration objects in precedence order (lowest to highest priority).
   * This is the core merging engine that handles nested objects correctly.
   */
  private _deepMergeConfigs(...configs: Record<string, any>[]): Record<string, any> {
    return configs.reduce((merged, config) => {
      if (!config) return merged;
      return this._mergeConfigs(merged, config);
    }, {});
  }

  /**
   * Recursively merge two configuration objects, with source taking precedence over target
   */
  private _mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively merge nested objects
        result[key] = this._mergeConfigs(result[key] || {}, value);
      } else {
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
  private _resolveEnvironmentInterpolationsSync(config: Record<string, any>): Record<string, any> {
    const resolve = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/\$\{env:([^:}]+)(?::([^}]*))?\}/g, (match, key, defaultValue) => {
          return process.env[key] ?? defaultValue ?? match;
        });
      } else if (Array.isArray(obj)) {
        return obj.map(resolve);
      } else if (obj !== null && typeof obj === 'object') {
        const resolved: Record<string, any> = {};
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
