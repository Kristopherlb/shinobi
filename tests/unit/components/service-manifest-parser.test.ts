// tests/unit/components/service-manifest-parser.test.ts
// Unit tests for Service Manifest Parser

import { ServiceManifestParser, ServiceManifest } from '../@shinobi/core/components/service-manifest-parser';
import { ComponentFactory, ComponentFactoryBuilder } from '../@shinobi/core/components/component-factory';
import { ExampleS3BucketComponent } from '../@shinobi/core/components/example-s3-bucket-component';
import { ComplianceFramework } from '../@shinobi/core/bindings';

describe('ServiceManifestParser', () => {
  let parser: ServiceManifestParser;
  let factory: ComponentFactory;

  beforeEach(() => {
    const builder = new ComponentFactoryBuilder();
    factory = builder
      .registerComponent('s3-bucket', ExampleS3BucketComponent)
      .build();

    parser = new ServiceManifestParser(factory);
  });

  describe('parseManifest', () => {
    const validManifest: ServiceManifest = {
      manifestVersion: '1.0.0',
      service: {
        name: 'test-service',
        owner: 'test-owner',
        description: 'Test service',
        tags: {
          Environment: 'dev'
        }
      },
      environments: {
        dev: {
          complianceFramework: 'commercial',
          region: 'us-east-1',
          accountId: '123456789012'
        },
        prod: {
          complianceFramework: 'fedramp-moderate',
          region: 'us-west-2',
          accountId: '987654321098'
        }
      },
      components: [
        {
          name: 'test-bucket',
          type: 's3-bucket',
          config: {
            versioned: true
          }
        },
        {
          name: 'another-bucket',
          type: 's3-bucket',
          config: {
            versioned: false
          },
          dependencies: ['test-bucket']
        }
      ],
      binds: [
        {
          from: 'test-bucket',
          to: 'another-bucket',
          capability: 's3:read',
          access: 'read'
        }
      ]
    };

    it('should parse manifest successfully for valid environment', () => {
      const result = parser.parseManifest(validManifest, 'dev');

      expect(result.components).toBeDefined();
      expect(result.components.size).toBe(2);
      expect(result.context).toBeDefined();
      expect(result.dependencies).toBeDefined();

      // Check components
      expect(result.components.has('test-bucket')).toBe(true);
      expect(result.components.has('another-bucket')).toBe(true);

      // Check context
      expect(result.context.serviceName).toBe('test-service');
      expect(result.context.environment).toBe('dev');
      expect(result.context.complianceFramework).toBe('commercial');
      expect(result.context.region).toBe('us-east-1');
      expect(result.context.accountId).toBe('123456789012');

      // Check dependencies
      expect(result.dependencies.get('another-bucket')).toEqual(['test-bucket']);
    });

    it('should apply environment overrides', () => {
      const manifestWithOverrides: ServiceManifest = {
        ...validManifest,
        environments: {
          dev: {
            complianceFramework: 'commercial',
            region: 'us-east-1',
            accountId: '123456789012',
            overrides: {
              components: {
                'test-bucket': {
                  versioned: false,
                  customProperty: 'override-value'
                }
              }
            }
          }
        }
      };

      const result = parser.parseManifest(manifestWithOverrides, 'dev');
      const testBucket = result.components.get('test-bucket');

      expect(testBucket.getConfig().versioned).toBe(false);
      expect(testBucket.getConfig().customProperty).toBe('override-value');
    });

    it('should throw error for non-existent environment', () => {
      expect(() => {
        parser.parseManifest(validManifest, 'non-existent');
      }).toThrow("Environment 'non-existent' not found in manifest");
    });

    it('should throw error for unsupported component type', () => {
      const manifestWithUnsupportedComponent: ServiceManifest = {
        ...validManifest,
        components: [
          {
            name: 'unsupported-component',
            type: 'unsupported-type',
            config: {}
          }
        ]
      };

      expect(() => {
        parser.parseManifest(manifestWithUnsupportedComponent, 'dev');
      }).toThrow('Unsupported component type: unsupported-type');
    });
  });

  describe('validateManifest', () => {
    it('should validate complete manifest successfully', () => {
      const validManifest: ServiceManifest = {
        manifestVersion: '1.0.0',
        service: {
          name: 'test-service',
          owner: 'test-owner',
          description: 'Test service'
        },
        environments: {
          dev: {
            complianceFramework: 'commercial',
            region: 'us-east-1',
            accountId: '123456789012'
          }
        },
        components: [
          {
            name: 'test-bucket',
            type: 's3-bucket',
            config: {}
          }
        ]
      };

      // Should not throw
      expect(() => {
        parser.parseManifest(validManifest, 'dev');
      }).not.toThrow();
    });

    it('should throw error for missing manifest version', () => {
      const invalidManifest = {
        service: {
          name: 'test-service',
          owner: 'test-owner',
          description: 'Test service'
        },
        environments: {},
        components: []
      } as any;

      expect(() => {
        parser.parseManifest(invalidManifest, 'dev');
      }).toThrow('Manifest version is required');
    });

    it('should throw error for missing service name', () => {
      const invalidManifest: ServiceManifest = {
        manifestVersion: '1.0.0',
        service: {
          name: '',
          owner: 'test-owner',
          description: 'Test service'
        },
        environments: {},
        components: []
      };

      expect(() => {
        parser.parseManifest(invalidManifest, 'dev');
      }).toThrow('Service name is required');
    });

    it('should throw error for missing environments', () => {
      const invalidManifest: ServiceManifest = {
        manifestVersion: '1.0.0',
        service: {
          name: 'test-service',
          owner: 'test-owner',
          description: 'Test service'
        },
        environments: {},
        components: []
      };

      expect(() => {
        parser.parseManifest(invalidManifest, 'dev');
      }).toThrow('At least one environment must be defined');
    });

    it('should throw error for missing components', () => {
      const invalidManifest: ServiceManifest = {
        manifestVersion: '1.0.0',
        service: {
          name: 'test-service',
          owner: 'test-owner',
          description: 'Test service'
        },
        environments: {
          dev: {
            complianceFramework: 'commercial',
            region: 'us-east-1',
            accountId: '123456789012'
          }
        },
        components: []
      };

      expect(() => {
        parser.parseManifest(invalidManifest, 'dev');
      }).toThrow('At least one component must be defined');
    });

    it('should throw error for missing environment compliance framework', () => {
      const invalidManifest: ServiceManifest = {
        manifestVersion: '1.0.0',
        service: {
          name: 'test-service',
          owner: 'test-owner',
          description: 'Test service'
        },
        environments: {
          dev: {
            complianceFramework: '' as ComplianceFramework,
            region: 'us-east-1',
            accountId: '123456789012'
          }
        },
        components: [
          {
            name: 'test-bucket',
            type: 's3-bucket',
            config: {}
          }
        ]
      };

      expect(() => {
        parser.parseManifest(invalidManifest, 'dev');
      }).toThrow("Compliance framework is required for environment 'dev'");
    });

    it('should throw error for missing component name', () => {
      const invalidManifest: ServiceManifest = {
        manifestVersion: '1.0.0',
        service: {
          name: 'test-service',
          owner: 'test-owner',
          description: 'Test service'
        },
        environments: {
          dev: {
            complianceFramework: 'commercial',
            region: 'us-east-1',
            accountId: '123456789012'
          }
        },
        components: [
          {
            name: '',
            type: 's3-bucket',
            config: {}
          }
        ]
      };

      expect(() => {
        parser.parseManifest(invalidManifest, 'dev');
      }).toThrow('Component name is required');
    });

    it('should throw error for missing component type', () => {
      const invalidManifest: ServiceManifest = {
        manifestVersion: '1.0.0',
        service: {
          name: 'test-service',
          owner: 'test-owner',
          description: 'Test service'
        },
        environments: {
          dev: {
            complianceFramework: 'commercial',
            region: 'us-east-1',
            accountId: '123456789012'
          }
        },
        components: [
          {
            name: 'test-bucket',
            type: '',
            config: {}
          }
        ]
      };

      expect(() => {
        parser.parseManifest(invalidManifest, 'dev');
      }).toThrow('Component type is required');
    });

    it('should validate binds structure', () => {
      const manifestWithInvalidBinds: ServiceManifest = {
        manifestVersion: '1.0.0',
        service: {
          name: 'test-service',
          owner: 'test-owner',
          description: 'Test service'
        },
        environments: {
          dev: {
            complianceFramework: 'commercial',
            region: 'us-east-1',
            accountId: '123456789012'
          }
        },
        components: [
          {
            name: 'test-bucket',
            type: 's3-bucket',
            config: {}
          }
        ],
        binds: [
          {
            from: '',
            to: 'test-bucket',
            capability: 's3:read',
            access: 'read'
          }
        ]
      };

      expect(() => {
        parser.parseManifest(manifestWithInvalidBinds, 'dev');
      }).toThrow('Bind source component is required');
    });
  });

  describe('getDependencyGraph', () => {
    it('should create dependency graph from components and dependencies', () => {
      const components = new Map([
        ['component-a', {}],
        ['component-b', {}],
        ['component-c', {}]
      ]);

      const dependencies = new Map([
        ['component-b', ['component-a']],
        ['component-c', ['component-a', 'component-b']]
      ]);

      const graph = parser.getDependencyGraph(components, dependencies);

      expect(graph.get('component-a')).toEqual([]);
      expect(graph.get('component-b')).toEqual(['component-a']);
      expect(graph.get('component-c')).toEqual(['component-a', 'component-b']);
    });
  });

  describe('validateDependencyGraph', () => {
    it('should validate acyclic dependency graph', () => {
      const graph = new Map([
        ['component-a', []],
        ['component-b', ['component-a']],
        ['component-c', ['component-b']]
      ]);

      expect(() => {
        parser.validateDependencyGraph(graph);
      }).not.toThrow();
    });

    it('should throw error for cyclic dependency graph', () => {
      const graph = new Map([
        ['component-a', ['component-c']],
        ['component-b', ['component-a']],
        ['component-c', ['component-b']]
      ]);

      expect(() => {
        parser.validateDependencyGraph(graph);
      }).toThrow('Circular dependency detected involving component: component-a');
    });
  });
});
