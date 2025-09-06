/**
 * Builder Pattern Implementation
 * Manages complex component configuration with layered precedence
 */

import { ComponentSpec, ComponentContext } from './component-factory';

export interface ConfigurationLayer {
  name: string;
  priority: number;
  config: Record<string, any>;
}

/**
 * Abstract builder for component configuration
 */
export abstract class ComponentConfigBuilder<T = any> {
  protected layers: ConfigurationLayer[] = [];
  protected context: ComponentContext;
  protected spec: ComponentSpec;

  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Apply platform defaults (lowest priority)
   */
  applyPlatformDefaults(): this {
    const platformDefaults = this.getPlatformDefaults();
    this.layers.push({
      name: 'platform-defaults',
      priority: 1,
      config: platformDefaults
    });
    return this;
  }

  /**
   * Apply compliance framework defaults
   */
  applyComplianceFrameworkDefaults(): this {
    const frameworkDefaults = this.getComplianceFrameworkDefaults(this.context.complianceFramework);
    this.layers.push({
      name: 'compliance-framework',
      priority: 2,
      config: frameworkDefaults
    });
    return this;
  }

  /**
   * Apply environment-specific configuration
   */
  applyEnvironmentConfig(): this {
    const envConfig = this.getEnvironmentConfig(this.context.environment);
    this.layers.push({
      name: 'environment-config',
      priority: 3,
      config: envConfig
    });
    return this;
  }

  /**
   * Apply user overrides (highest priority)
   */
  applyManifestOverrides(): this {
    if (this.spec.overrides) {
      this.layers.push({
        name: 'manifest-overrides',
        priority: 4,
        config: this.spec.overrides
      });
    }
    return this;
  }

  /**
   * Build final configuration by merging layers in priority order
   */
  build(): T {
    // Sort layers by priority (lowest to highest)
    const sortedLayers = this.layers.sort((a, b) => a.priority - b.priority);
    
    let finalConfig = {};
    
    // Merge layers with higher priority overriding lower priority
    for (const layer of sortedLayers) {
      finalConfig = this.mergeConfig(finalConfig, layer.config);
    }

    return this.transformConfig(finalConfig);
  }

  /**
   * Get build summary showing which layers contributed what
   */
  getBuildSummary(): {
    layers: ConfigurationLayer[];
    conflicts: Array<{
      key: string;
      values: Array<{ layer: string; value: any }>;
      winner: { layer: string; value: any };
    }>;
  } {
    const conflicts: Array<{
      key: string;
      values: Array<{ layer: string; value: any }>;
      winner: { layer: string; value: any };
    }> = [];

    // Identify conflicts and their resolution
    const allKeys = new Set<string>();
    this.layers.forEach(layer => {
      this.collectKeys(layer.config, '', allKeys);
    });

    allKeys.forEach(key => {
      const values = this.layers
        .map(layer => ({ layer: layer.name, value: this.getValue(layer.config, key) }))
        .filter(item => item.value !== undefined);

      if (values.length > 1) {
        conflicts.push({
          key,
          values,
          winner: values[values.length - 1] // Highest priority wins
        });
      }
    });

    return {
      layers: [...this.layers],
      conflicts
    };
  }

  /**
   * Abstract methods to be implemented by concrete builders
   */
  protected abstract getPlatformDefaults(): Record<string, any>;
  protected abstract getComplianceFrameworkDefaults(framework: string): Record<string, any>;
  protected abstract getEnvironmentConfig(environment: string): Record<string, any>;
  protected abstract transformConfig(config: Record<string, any>): T;

  /**
   * Deep merge configuration objects
   */
  protected mergeConfig(base: any, override: any): any {
    if (override === null || override === undefined) {
      return base;
    }

    if (typeof override !== 'object' || Array.isArray(override)) {
      return override;
    }

    const result = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
      if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key]) &&
          value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.mergeConfig(result[key], value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private collectKeys(obj: any, prefix: string, keys: Set<string>): void {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.add(fullKey);
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.collectKeys(value, fullKey, keys);
      }
    }
  }

  private getValue(obj: any, key: string): any {
    const parts = key.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
}

/**
 * RDS Configuration Builder
 */
export class RdsConfigBuilder extends ComponentConfigBuilder<any> {
  protected getPlatformDefaults(): Record<string, any> {
    return {
      engine: 'postgres',
      engineVersion: '15.3',
      instanceClass: 'db.t3.micro',
      allocatedStorage: 20,
      storageType: 'gp3',
      storageEncrypted: false,
      backupRetentionPeriod: 7,
      multiAZ: false,
      deletionProtection: false,
      performanceInsights: false,
      monitoringInterval: 0
    };
  }

  protected getComplianceFrameworkDefaults(framework: string): Record<string, any> {
    switch (framework) {
      case 'fedramp-high':
        return {
          engineVersion: '15.4',
          instanceClass: 'db.r5.large',
          storageEncrypted: true,
          backupRetentionPeriod: 35,
          multiAZ: true,
          deletionProtection: true,
          performanceInsights: true,
          monitoringInterval: 60,
          enableLogging: {
            postgresql: true,
            upgrade: true
          },
          parameterGroup: {
            logStatement: 'all',
            logMinDurationStatement: 0,
            sharedPreloadLibraries: ['pg_stat_statements', 'pgaudit']
          }
        };
      case 'fedramp-moderate':
        return {
          engineVersion: '15.4',
          instanceClass: 'db.r5.medium',
          storageEncrypted: true,
          backupRetentionPeriod: 30,
          multiAZ: true,
          deletionProtection: true,
          performanceInsights: true,
          monitoringInterval: 30,
          enableLogging: {
            postgresql: true
          }
        };
      default:
        return {};
    }
  }

  protected getEnvironmentConfig(environment: string): Record<string, any> {
    switch (environment) {
      case 'prod':
        return {
          multiAZ: true,
          deletionProtection: true,
          instanceClass: 'db.r5.large',
          allocatedStorage: 100,
          performanceInsights: true,
          monitoringInterval: 60
        };
      case 'staging':
        return {
          instanceClass: 'db.r5.medium',
          allocatedStorage: 50,
          performanceInsights: true
        };
      default: // dev
        return {
          instanceClass: 'db.t3.micro',
          allocatedStorage: 20
        };
    }
  }

  protected transformConfig(config: Record<string, any>): any {
    // Transform the merged config into AWS RDS format
    return {
      dbInstanceClass: config.instanceClass,
      engine: config.engine,
      engineVersion: config.engineVersion,
      allocatedStorage: config.allocatedStorage,
      storageType: config.storageType,
      storageEncrypted: config.storageEncrypted,
      backupRetentionPeriod: config.backupRetentionPeriod,
      multiAZ: config.multiAZ,
      deletionProtection: config.deletionProtection,
      enablePerformanceInsights: config.performanceInsights,
      monitoringInterval: config.monitoringInterval,
      enableCloudwatchLogsExports: config.enableLogging ? 
        Object.keys(config.enableLogging).filter(key => config.enableLogging[key]) : 
        [],
      dbParameterGroupName: config.parameterGroup ? 
        this.buildParameterGroup(config.parameterGroup) : 
        undefined
    };
  }

  private buildParameterGroup(params: Record<string, any>): string {
    // In real implementation, this would create/reference a parameter group
    return `${this.context.serviceName}-${this.spec.name}-params`;
  }
}

/**
 * Lambda Configuration Builder
 */
export class LambdaConfigBuilder extends ComponentConfigBuilder<any> {
  protected getPlatformDefaults(): Record<string, any> {
    return {
      runtime: 'nodejs20.x',
      memorySize: 512,
      timeout: 15,
      reservedConcurrency: null,
      environment: {
        variables: {}
      },
      deadLetterQueue: false,
      tracing: false,
      architecture: 'x86_64'
    };
  }

  protected getComplianceFrameworkDefaults(framework: string): Record<string, any> {
    switch (framework) {
      case 'fedramp-high':
        return {
          memorySize: 1024,
          timeout: 30,
          tracing: true,
          architecture: 'x86_64',
          environment: {
            variables: {
              COMPLIANCE_FRAMEWORK: 'fedramp-high',
              LOG_LEVEL: 'info',
              AUDIT_ENABLED: 'true'
            }
          },
          kmsKeyArn: 'arn:aws:kms:region:account:key/fedramp-high-key',
          vpcConfig: {
            subnetIds: ['subnet-private-1', 'subnet-private-2'],
            securityGroupIds: ['sg-lambda-fedramp-high']
          }
        };
      case 'fedramp-moderate':
        return {
          memorySize: 768,
          timeout: 25,
          tracing: true,
          environment: {
            variables: {
              COMPLIANCE_FRAMEWORK: 'fedramp-moderate',
              LOG_LEVEL: 'info'
            }
          }
        };
      default:
        return {
          environment: {
            variables: {
              COMPLIANCE_FRAMEWORK: 'commercial'
            }
          }
        };
    }
  }

  protected getEnvironmentConfig(environment: string): Record<string, any> {
    switch (environment) {
      case 'prod':
        return {
          memorySize: 1024,
          timeout: 30,
          reservedConcurrency: 100,
          deadLetterQueue: true,
          environment: {
            variables: {
              NODE_ENV: 'production',
              LOG_LEVEL: 'info'
            }
          }
        };
      case 'staging':
        return {
          memorySize: 768,
          timeout: 25,
          environment: {
            variables: {
              NODE_ENV: 'staging',
              LOG_LEVEL: 'debug'
            }
          }
        };
      default: // dev
        return {
          memorySize: 512,
          timeout: 15,
          environment: {
            variables: {
              NODE_ENV: 'development',
              LOG_LEVEL: 'debug'
            }
          }
        };
    }
  }

  protected transformConfig(config: Record<string, any>): any {
    return {
      functionName: `${this.context.serviceName}-${this.spec.name}`,
      runtime: config.runtime,
      handler: 'index.handler',
      code: {
        zipFile: this.generateCode()
      },
      memorySize: config.memorySize,
      timeout: config.timeout,
      reservedConcurrencyConfig: config.reservedConcurrency ? {
        reservedConcurrency: config.reservedConcurrency
      } : undefined,
      environment: config.environment,
      kmsKeyArn: config.kmsKeyArn,
      vpcConfig: config.vpcConfig,
      tracingConfig: config.tracing ? { mode: 'Active' } : undefined,
      architectures: [config.architecture]
    };
  }

  private generateCode(): string {
    // Generate handler code based on component configuration
    return `
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello from ${this.spec.name}',
      service: '${this.context.serviceName}',
      environment: '${this.context.environment}',
      compliance: '${this.context.complianceFramework}'
    })
  };
};
    `.trim();
  }
}

/**
 * Configuration Builder Factory
 */
export class ConfigBuilderFactory {
  static createBuilder(
    componentType: string, 
    context: ComponentContext, 
    spec: ComponentSpec
  ): ComponentConfigBuilder {
    switch (componentType) {
      case 'rds-postgres':
        return new RdsConfigBuilder(context, spec);
      case 'lambda-api':
      case 'lambda-worker':
        return new LambdaConfigBuilder(context, spec);
      default:
        throw new Error(`No configuration builder available for component type: ${componentType}`);
    }
  }
}