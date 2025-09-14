// tests/unit/components/component-factory.test.ts
// Unit tests for Component Factory & Registry

import { ComponentFactory, ComponentFactoryBuilder } from '../../../src/platform/contracts/components/component-factory';
import { ComponentRegistry } from '../../../src/platform/contracts/components/component-registry';
import { ComponentConfigBuilder } from '../../../src/platform/contracts/components/component-config-builder';
import { ComponentContext, ComponentContextBuilder } from '../../../src/platform/contracts/components/component-context';
import { ComponentSpec, ComponentSpecBuilder } from '../../../src/platform/contracts/components/component-spec';
import { ExampleS3BucketComponent } from '../../../src/platform/contracts/components/example-s3-bucket-component';
import { ComplianceFramework } from '../../../src/platform/contracts/bindings';

describe('ComponentFactory', () => {
  let factory: ComponentFactory;
  let registry: ComponentRegistry;
  let configBuilder: ComponentConfigBuilder;

  beforeEach(() => {
    registry = new ComponentRegistry();
    configBuilder = new ComponentConfigBuilder();
    factory = new ComponentFactory(registry, configBuilder);
  });

  describe('ComponentFactoryBuilder', () => {
    it('should build component factory with registered components', () => {
      const builder = new ComponentFactoryBuilder();
      const builtFactory = builder
        .registerComponent('s3-bucket', ExampleS3BucketComponent)
        .build();

      expect(builtFactory).toBeInstanceOf(ComponentFactory);
      expect(builtFactory.isSupported('s3-bucket')).toBe(true);
    });
  });

  describe('create', () => {
    let context: ComponentContext;
    let spec: ComponentSpec;

    beforeEach(() => {
      // Register test component
      registry.register('s3-bucket', ExampleS3BucketComponent);

      // Create test context
      context = new ComponentContextBuilder()
        .serviceName('test-service')
        .environment('dev')
        .complianceFramework('commercial')
        .region('us-east-1')
        .accountId('123456789012')
        .build();

      // Create test spec
      spec = new ComponentSpecBuilder()
        .name('test-bucket')
        .type('s3-bucket')
        .config({ versioned: true })
        .build();
    });

    it('should create component instance successfully', () => {
      const component = factory.create('s3-bucket', context, spec);

      expect(component).toBeInstanceOf(ExampleS3BucketComponent);
      expect(component.getType()).toBe('s3-bucket');
      expect(component.getServiceName()).toBe('test-service');
    });

    it('should throw error for unsupported component type', () => {
      expect(() => {
        factory.create('unsupported-type', context, spec);
      }).toThrow('Unsupported component type: unsupported-type');
    });

    it('should throw error for unregistered component', () => {
      registry.clear();

      expect(() => {
        factory.create('s3-bucket', context, spec);
      }).toThrow('Unsupported component type: s3-bucket');
    });

    it('should validate component implements IComponent interface', () => {
      // Create mock component that passes registration but fails interface validation
      class InvalidComponent {
        constructor(config: any, context: ComponentContext) { }
        getName() { return 'invalid'; }
        getId() { return 'invalid-id'; }
        getType() { return 'invalid'; }
        getCapabilityData() { return {} as any; }
        getServiceName() { return 'invalid'; }
        synth() { /* empty implementation */ }
        // This component will pass registration but fail factory validation
      }

      // Register the component (should pass)
      registry.register('invalid-component', InvalidComponent as any);

      // The validation happens at factory creation time
      expect(() => {
        factory.create('invalid-component', context, spec);
      }).toThrow('Component invalid-component does not implement IComponent interface');
    });
  });

  describe('isSupported', () => {
    it('should return true for supported component types', () => {
      registry.register('s3-bucket', ExampleS3BucketComponent);

      expect(factory.isSupported('s3-bucket')).toBe(true);
    });

    it('should return false for unsupported component types', () => {
      expect(factory.isSupported('unsupported-type')).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return all registered component types', () => {
      registry.register('s3-bucket', ExampleS3BucketComponent);
      registry.register('lambda-api', ExampleS3BucketComponent); // Using same class for test

      const types = factory.getSupportedTypes();
      expect(types).toContain('s3-bucket');
      expect(types).toContain('lambda-api');
      expect(types).toHaveLength(2);
    });

    it('should return empty array when no components registered', () => {
      const types = factory.getSupportedTypes();
      expect(types).toHaveLength(0);
    });
  });
});

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;

  beforeEach(() => {
    registry = new ComponentRegistry();
  });

  describe('register', () => {
    it('should register component successfully', () => {
      registry.register('s3-bucket', ExampleS3BucketComponent);

      expect(registry.hasComponent('s3-bucket')).toBe(true);
      expect(registry.getComponentClass('s3-bucket')).toBe(ExampleS3BucketComponent);
    });

    it('should throw error for invalid component type', () => {
      expect(() => {
        registry.register('', ExampleS3BucketComponent);
      }).toThrow('Component type must be a non-empty string');
    });

    it('should throw error for invalid component class', () => {
      expect(() => {
        registry.register('s3-bucket', null as any);
      }).toThrow('Component class must be a constructor function');
    });

    it('should validate component class has required methods', () => {
      class InvalidComponent {
        constructor(config: any, context: ComponentContext) { }
        // Missing required methods
      }

      expect(() => {
        registry.register('invalid-component', InvalidComponent as any);
      }).toThrow('Component class must implement getName method');
    });
  });

  describe('getComponentClass', () => {
    it('should return component class for registered type', () => {
      registry.register('s3-bucket', ExampleS3BucketComponent);

      const componentClass = registry.getComponentClass('s3-bucket');
      expect(componentClass).toBe(ExampleS3BucketComponent);
    });

    it('should return undefined for unregistered type', () => {
      const componentClass = registry.getComponentClass('unregistered-type');
      expect(componentClass).toBeUndefined();
    });
  });

  describe('hasComponent', () => {
    it('should return true for registered component', () => {
      registry.register('s3-bucket', ExampleS3BucketComponent);

      expect(registry.hasComponent('s3-bucket')).toBe(true);
    });

    it('should return false for unregistered component', () => {
      expect(registry.hasComponent('unregistered-type')).toBe(false);
    });
  });

  describe('getRegisteredTypes', () => {
    it('should return all registered types', () => {
      registry.register('s3-bucket', ExampleS3BucketComponent);
      registry.register('lambda-api', ExampleS3BucketComponent);

      const types = registry.getRegisteredTypes();
      expect(types).toContain('s3-bucket');
      expect(types).toContain('lambda-api');
      expect(types).toHaveLength(2);
    });
  });

  describe('unregister', () => {
    it('should unregister component successfully', () => {
      registry.register('s3-bucket', ExampleS3BucketComponent);

      const result = registry.unregister('s3-bucket');
      expect(result).toBe(true);
      expect(registry.hasComponent('s3-bucket')).toBe(false);
    });

    it('should return false for unregistered component', () => {
      const result = registry.unregister('unregistered-type');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all registered components', () => {
      registry.register('s3-bucket', ExampleS3BucketComponent);
      registry.register('lambda-api', ExampleS3BucketComponent);

      registry.clear();

      expect(registry.getRegisteredTypes()).toHaveLength(0);
    });
  });
});

describe('ComponentConfigBuilder', () => {
  let configBuilder: ComponentConfigBuilder;
  let context: ComponentContext;
  let spec: ComponentSpec;

  beforeEach(() => {
    configBuilder = new ComponentConfigBuilder();

    context = new ComponentContextBuilder()
      .serviceName('test-service')
      .environment('dev')
      .complianceFramework('commercial')
      .region('us-east-1')
      .accountId('123456789012')
      .build();

    spec = new ComponentSpecBuilder()
      .name('test-bucket')
      .type('s3-bucket')
      .config({ versioned: true })
      .build();
  });

  describe('buildConfig', () => {
    it('should build configuration with 5-layer precedence', () => {
      const config = configBuilder.buildConfig('s3-bucket', context, spec);

      // Should include hardcoded defaults
      expect(config.blockPublicAccess).toBe(true);

      // Should include compliance defaults
      expect(config.accessLogging).toBe(false); // Commercial default

      // Should include platform defaults
      expect(config.tags).toBeDefined();
      expect(config.tags.ManagedBy).toBe('Shinobi');

      // Should include component config (highest priority)
      expect(config.versioned).toBe(true);

      // Should include context metadata
      expect(config._context).toBeDefined();
      expect(config._context.serviceName).toBe('test-service');

      // Should include component metadata
      expect(config._component).toBeDefined();
      expect(config._component.name).toBe('test-bucket');
    });

    it('should apply FedRAMP Moderate configuration', () => {
      const fedrampContext = new ComponentContextBuilder()
        .serviceName('test-service')
        .environment('dev')
        .complianceFramework('fedramp-moderate')
        .region('us-east-1')
        .accountId('123456789012')
        .build();

      const config = configBuilder.buildConfig('s3-bucket', fedrampContext, spec);

      expect(config.versioned).toBe(true); // FedRAMP Moderate default
      expect(config.encryption).toBe('aws:kms'); // FedRAMP Moderate default
      expect(config.accessLogging).toBe(true); // FedRAMP Moderate default
    });

    it('should apply FedRAMP High configuration', () => {
      const fedrampHighContext = new ComponentContextBuilder()
        .serviceName('test-service')
        .environment('dev')
        .complianceFramework('fedramp-high')
        .region('us-east-1')
        .accountId('123456789012')
        .build();

      const config = configBuilder.buildConfig('s3-bucket', fedrampHighContext, spec);

      expect(config.versioned).toBe(true); // FedRAMP High default
      expect(config.encryption).toBe('aws:kms'); // FedRAMP High default
      expect(config.accessLogging).toBe(true); // FedRAMP High default
      expect(config.objectLock).toBe(true); // FedRAMP High default
    });

    it('should apply environment overrides', () => {
      const contextWithOverrides = new ComponentContextBuilder()
        .serviceName('test-service')
        .environment('dev')
        .complianceFramework('commercial')
        .region('us-east-1')
        .accountId('123456789012')
        .platformConfig({
          environments: {
            dev: {
              components: {
                'test-bucket': {
                  versioned: false,
                  customProperty: 'override-value'
                }
              }
            }
          }
        })
        .build();

      const config = configBuilder.buildConfig('s3-bucket', contextWithOverrides, spec);

      // Environment override should take precedence over component config
      expect(config.versioned).toBe(false);
      expect(config.customProperty).toBe('override-value');
    });
  });
});

describe('ComponentContextBuilder', () => {
  it('should build valid context with required fields', () => {
    const context = new ComponentContextBuilder()
      .serviceName('test-service')
      .environment('dev')
      .complianceFramework('commercial')
      .region('us-east-1')
      .accountId('123456789012')
      .build();

    expect(context.serviceName).toBe('test-service');
    expect(context.environment).toBe('dev');
    expect(context.complianceFramework).toBe('commercial');
    expect(context.region).toBe('us-east-1');
    expect(context.accountId).toBe('123456789012');
  });

  it('should throw error for missing required fields', () => {
    expect(() => {
      new ComponentContextBuilder().build();
    }).toThrow('Service name is required');
  });

  it('should include optional fields when provided', () => {
    const context = new ComponentContextBuilder()
      .serviceName('test-service')
      .environment('dev')
      .complianceFramework('commercial')
      .region('us-east-1')
      .accountId('123456789012')
      .tags({ Environment: 'dev' })
      .metadata({ custom: 'value' })
      .build();

    expect(context.tags).toEqual({ Environment: 'dev' });
    expect(context.metadata).toEqual({ custom: 'value' });
  });
});

describe('ComponentSpecBuilder', () => {
  it('should build valid spec with required fields', () => {
    const spec = new ComponentSpecBuilder()
      .name('test-bucket')
      .type('s3-bucket')
      .config({ versioned: true })
      .build();

    expect(spec.name).toBe('test-bucket');
    expect(spec.type).toBe('s3-bucket');
    expect(spec.config).toEqual({ versioned: true });
  });

  it('should throw error for missing required fields', () => {
    expect(() => {
      new ComponentSpecBuilder().build();
    }).toThrow('Component name is required');
  });

  it('should include optional fields when provided', () => {
    const spec = new ComponentSpecBuilder()
      .name('test-bucket')
      .type('s3-bucket')
      .config({ versioned: true })
      .properties({ custom: 'property' })
      .dependencies(['other-component'])
      .metadata({ custom: 'metadata' })
      .build();

    expect(spec.properties).toEqual({ custom: 'property' });
    expect(spec.dependencies).toEqual(['other-component']);
    expect(spec.metadata).toEqual({ custom: 'metadata' });
  });
});
