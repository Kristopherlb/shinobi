import { ComponentContext, ComponentSpec, IComponentCreator } from '@platform/contracts';
import { DaggerEnginePool } from './dagger-engine-pool.component.js';
import { DaggerEnginePoolProps } from './types.js';

/**
 * Factory class for creating DaggerEnginePool component instances.
 * Implements IComponentCreator to enable platform discovery and instantiation.
 */
export class DaggerEnginePoolCreator implements IComponentCreator {
  public readonly componentType = 'dagger-engine-pool';

  /**
   * Creates a new DaggerEnginePool component instance.
   */
  public createComponent(
    scope: any, // REVIEW: Should be properly typed as Construct
    id: string,
    context: ComponentContext,
    spec: ComponentSpec
  ): DaggerEnginePool {
    // Extract component-specific props from spec
    const props: DaggerEnginePoolProps = {
      overrides: spec.config || {}
    };

    return new DaggerEnginePool(scope, id, context, spec, props);
  }

  /**
   * Validates the component specification for this component type.
   * Performs additional validation beyond JSON Schema.
   */
  public validateSpec(spec: ComponentSpec): void {
    if (!spec.config) {
      throw new Error('DaggerEnginePool requires configuration');
    }

    const config = spec.config as any;

    // Validate required capacity configuration
    if (!config.capacity) {
      throw new Error('DaggerEnginePool requires capacity configuration with min and max values');
    }

    if (typeof config.capacity.min !== 'number' || config.capacity.min < 1) {
      throw new Error('DaggerEnginePool capacity.min must be a positive integer');
    }

    if (typeof config.capacity.max !== 'number' || config.capacity.max < 1) {
      throw new Error('DaggerEnginePool capacity.max must be a positive integer');
    }

    if (config.capacity.min > config.capacity.max) {
      throw new Error('DaggerEnginePool capacity.min cannot be greater than capacity.max');
    }

    // Validate FIPS mode configuration
    if (config.fipsMode === false && context?.complianceFramework?.includes('fedramp')) {
      throw new Error('FIPS mode is required for FedRAMP compliance frameworks');
    }

    // Validate storage configuration
    if (config.storage?.cache && !['EBS', 'EFS', 'DISK'].includes(config.storage.cache)) {
      throw new Error('DaggerEnginePool storage.cache must be one of: EBS, EFS, DISK');
    }

    // Validate STIG baseline
    if (config.stigBaseline && !['RHEL8', 'UBI9', 'UBUNTU-20'].includes(config.stigBaseline)) {
      throw new Error('DaggerEnginePool stigBaseline must be one of: RHEL8, UBI9, UBUNTU-20');
    }

    // Validate endpoint configuration
    if (config.endpoint?.mtls && !config.endpoint.mtls.acmPcaArn) {
      throw new Error('DaggerEnginePool endpoint.mtls requires acmPcaArn');
    }

    // Validate feature flags
    if (config.featureFlags) {
      if (config.featureFlags.sharedCacheEfs && config.storage?.cache !== 'EFS') {
        throw new Error('sharedCacheEfs feature flag requires storage.cache to be EFS');
      }
    }

    // REVIEW: Add additional validation for compliance-specific requirements
    // For example, check that FedRAMP High mode has appropriate security settings
  }

  /**
   * Returns the component's capabilities that can be bound to by other components.
   */
  public getCapabilities(): string[] {
    return [
      'dagger:endpoint',
      'storage:artifacts',
      'security:kms',
      'logging:cloudwatch'
    ];
  }

  /**
   * Returns the component's dependencies on other platform services.
   */
  public getDependencies(): string[] {
    return [
      '@platform/core-engine',
      '@platform/contracts',
      '@platform/tagging-service'
    ];
  }
}

// Export singleton instance for platform registration
export const daggerEnginePoolCreator = new DaggerEnginePoolCreator();
