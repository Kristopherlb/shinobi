#!/usr/bin/env node

/**
 * Component Bootstrap Script
 * 
 * Creates a new component from scratch following the Platform Component API Contract v1.1.
 * This script generates all the necessary files, tests, and documentation for a new component.
 * 
 * Usage:
 *   ./bootstrap-component.js --name=my-component --category=storage --description="My component description"
 *   ./bootstrap-component.js --name=redis-cache --category=cache --aws-service=ElastiCache
 */

const fs = require('fs');
const path = require('path');

// Configuration
const COMPONENTS_DIR = './src/components';
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const FORCE = process.argv.includes('--force');

// Parse command line arguments
const getArgValue = (argName) => {
  const arg = process.argv.find(arg => arg.startsWith(`--${argName}=`));
  return arg ? arg.split('=')[1] : null;
};

const COMPONENT_NAME = getArgValue('name');
const COMPONENT_CATEGORY = getArgValue('category') || 'misc';
const COMPONENT_DESCRIPTION = getArgValue('description') || '';
const AWS_SERVICE = getArgValue('aws-service') || '';
const AUTHOR = getArgValue('author') || 'Platform Team';

// Component categories and their typical AWS services
const COMPONENT_CATEGORIES = {
  'api': {
    description: 'API Gateway and REST/GraphQL APIs',
    services: ['API Gateway', 'AppSync'],
    capabilities: ['api', 'http', 'graphql']
  },
  'compute': {
    description: 'Compute services and serverless functions',
    services: ['Lambda', 'EC2', 'ECS', 'Fargate', 'Batch'],
    capabilities: ['compute', 'serverless', 'container']
  },
  'storage': {
    description: 'Storage services and file systems',
    services: ['S3', 'EFS', 'FSx'],
    capabilities: ['storage', 'file-system', 'object-storage']
  },
  'database': {
    description: 'Database services and data stores',
    services: ['RDS', 'DynamoDB', 'DocumentDB', 'Neptune'],
    capabilities: ['database', 'relational', 'nosql']
  },
  'cache': {
    description: 'Caching and in-memory data stores',
    services: ['ElastiCache', 'MemoryDB', 'DAX'],
    capabilities: ['cache', 'in-memory', 'redis', 'memcached']
  },
  'networking': {
    description: 'Networking and content delivery',
    services: ['VPC', 'CloudFront', 'Route53', 'Load Balancer'],
    capabilities: ['networking', 'cdn', 'dns', 'load-balancing']
  },
  'security': {
    description: 'Security and identity services',
    services: ['IAM', 'Secrets Manager', 'KMS', 'Certificate Manager'],
    capabilities: ['security', 'identity', 'encryption', 'certificates']
  },
  'messaging': {
    description: 'Messaging and event streaming',
    services: ['SQS', 'SNS', 'Kinesis', 'EventBridge'],
    capabilities: ['messaging', 'queue', 'streaming', 'events']
  },
  'monitoring': {
    description: 'Monitoring and observability',
    services: ['CloudWatch', 'X-Ray', 'Systems Manager'],
    capabilities: ['monitoring', 'observability', 'metrics', 'tracing']
  },
  'ml': {
    description: 'Machine learning and AI services',
    services: ['SageMaker', 'Comprehend', 'Rekognition'],
    capabilities: ['machine-learning', 'ai', 'training', 'inference']
  },
  'analytics': {
    description: 'Analytics and data processing',
    services: ['Glue', 'EMR', 'Athena', 'Redshift'],
    capabilities: ['analytics', 'etl', 'data-processing', 'data-warehouse']
  },
  'workflow': {
    description: 'Workflow orchestration and state machines',
    services: ['Step Functions', 'SWF'],
    capabilities: ['workflow', 'orchestration', 'state-machine']
  }
};

// Utility functions
const log = (message, level = 'info') => {
  if (level === 'verbose' && !VERBOSE) return;
  const prefix = {
    info: '📝',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    verbose: '🔍'
  }[level] || '📝';
  console.log(`${prefix} ${message}`);
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const writeFile = (filePath, content) => {
  if (DRY_RUN) {
    log(`[DRY RUN] Would create: ${filePath}`, 'verbose');
    return;
  }
  
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
  log(`Created: ${filePath}`, 'verbose');
};

const toPascalCase = (str) => {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
};

const toKebabCase = (str) => {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
};

// Validation functions
const validateInputs = () => {
  const errors = [];
  
  if (!COMPONENT_NAME) {
    errors.push('Component name is required (--name=component-name)');
  } else if (!/^[a-z][a-z0-9-]*$/.test(COMPONENT_NAME)) {
    errors.push('Component name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens');
  }
  
  if (!COMPONENT_CATEGORIES[COMPONENT_CATEGORY]) {
    errors.push(`Invalid category: ${COMPONENT_CATEGORY}. Valid categories: ${Object.keys(COMPONENT_CATEGORIES).join(', ')}`);
  }
  
  // Check if component already exists
  const componentPath = path.join(COMPONENTS_DIR, COMPONENT_NAME);
  if (fs.existsSync(componentPath) && !FORCE) {
    errors.push(`Component ${COMPONENT_NAME} already exists. Use --force to overwrite.`);
  }
  
  return errors;
};

// Template generators
const generateConfigBuilder = (componentName, className, category, description, awsService) => {
  const configInterface = `${className}Config`;
  const schemaName = `${componentName.toUpperCase().replace(/-/g, '_')}_CONFIG_SCHEMA`;
  
  return `/**
 * Configuration Builder for ${className} Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 * 
 * @author ${AUTHOR}
 * @category ${category}
 * @service ${awsService || 'AWS'}
 */

import { ConfigBuilder, ConfigBuilderContext } from '../../platform/contracts/config-builder';

/**
 * Configuration interface for ${className} component
 */
export interface ${configInterface} {
  /** Component name (optional, will be auto-generated) */
  name?: string;
  
  /** Component description */
  description?: string;
  
  /** Enable detailed monitoring */
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
    alarms?: {
      // TODO: Define component-specific alarm thresholds
    };
  };
  
  /** Tagging configuration */
  tags?: Record<string, string>;
  
  // TODO: Add component-specific configuration properties
  // Example for ${awsService || 'AWS'} service:
  // ${awsService ? `
  // /** ${awsService} specific configuration */
  // ${awsService.toLowerCase()}?: {
  //   // Add service-specific properties here
  // };` : ''}
}

/**
 * JSON Schema for ${className} configuration validation
 */
export const ${schemaName} = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Component name (optional, will be auto-generated from component name)',
      pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$',
      maxLength: 128
    },
    description: {
      type: 'string',
      description: 'Component description for documentation',
      maxLength: 1024
    },
    monitoring: {
      type: 'object',
      description: 'Monitoring and observability configuration',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
          description: 'Enable monitoring'
        },
        detailedMetrics: {
          type: 'boolean',
          default: false,
          description: 'Enable detailed CloudWatch metrics'
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Additional resource tags',
      additionalProperties: { type: 'string' }
    }
    // TODO: Add component-specific schema properties
  },
  additionalProperties: false
};

/**
 * ConfigBuilder for ${className} component
 * 
 * Implements the 5-layer configuration precedence chain:
 * 1. Hardcoded Fallbacks (ultra-safe baseline)
 * 2. Platform Defaults (from platform config)
 * 3. Environment Defaults (from environment config) 
 * 4. Component Overrides (from service.yml)
 * 5. Policy Overrides (from governance policies)
 */
export class ${className}ConfigBuilder extends ConfigBuilder<${configInterface}> {
  
  /**
   * Layer 1: Hardcoded Fallbacks
   * Ultra-safe baseline configuration that works in any environment
   */
  protected getHardcodedFallbacks(): Partial<${configInterface}> {
    return {
      monitoring: {
        enabled: true,
        detailedMetrics: false
      },
      tags: {}
      // TODO: Add component-specific hardcoded fallbacks
    };
  }
  
  /**
   * Layer 2: Compliance Framework Defaults
   * Security and compliance-specific configurations
   */
  protected getComplianceFrameworkDefaults(): Partial<${configInterface}> {
    const framework = this.context.complianceFramework;
    
    const baseCompliance: Partial<${configInterface}> = {
      monitoring: {
        enabled: true,
        detailedMetrics: true
      }
    };
    
    if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
      return {
        ...baseCompliance,
        monitoring: {
          ...baseCompliance.monitoring,
          detailedMetrics: true // Mandatory for FedRAMP
        }
        // TODO: Add FedRAMP-specific compliance defaults
      };
    }
    
    return baseCompliance;
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return ${schemaName};
  }
}`;
};

const generateCreator = (componentName, className, category, description, awsService) => {
  const configInterface = `${className}Config`;
  const schemaName = `${componentName.toUpperCase().replace(/-/g, '_')}_CONFIG_SCHEMA`;
  const categoryInfo = COMPONENT_CATEGORIES[category] || { capabilities: ['misc'] };
  
  return `/**
 * Creator for ${className} Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 * 
 * @author ${AUTHOR}
 * @category ${category}
 * @service ${awsService || 'AWS'}
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '../../platform/contracts/component-interfaces';
import { ${className}Component } from './${componentName}.component';
import { ${configInterface}, ${schemaName} } from './${componentName}.builder';

/**
 * Creator class for ${className} component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class ${className}Creator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = '${componentName}';
  
  /**
   * Component display name
   */
  public readonly displayName = '${className.replace(/([A-Z])/g, ' $1').trim()}';
  
  /**
   * Component description
   */
  public readonly description = '${description || `${awsService || 'AWS'} ${className.replace(/([A-Z])/g, ' $1').trim()} component`}';
  
  /**
   * Component category for organization
   */
  public readonly category = '${category}';
  
  /**
   * AWS service this component manages
   */
  public readonly awsService = '${awsService || 'AWS'}';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    '${componentName}',
    '${category}',
    'aws'${awsService ? `,\n    '${awsService.toLowerCase()}'` : ''}
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = ${schemaName};
  
  /**
   * Factory method to create component instances
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): ${className}Component {
    return new ${className}Component(scope, spec, context);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as ${configInterface};
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // TODO: Add component-specific validations here
    // Example:
    // if (config.someProperty && config.someProperty < 1) {
    //   errors.push('someProperty must be greater than 0');
    // }
    
    // Environment-specific validations
    if (context.environment === 'prod') {
      if (!config?.monitoring?.enabled) {
        errors.push('Monitoring must be enabled in production environment');
      }
      
      // TODO: Add production-specific validations
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Returns the capabilities this component provides when synthesized
   */
  public getProvidedCapabilities(): string[] {
    return [
      '${category}:${componentName}',
      'monitoring:${componentName}'${categoryInfo.capabilities.map(cap => `,\n      '${cap}:${componentName}'`).join('')}
    ];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [
      // TODO: Define required capabilities
      // Example: 'networking:vpc' if this component needs a VPC
    ];
  }
  
  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return [
      'main'
      // TODO: Add additional construct handles if needed
    ];
  }
}`;
};

const generateComponent = (componentName, className, category, description, awsService) => {
  const configInterface = `${className}Config`;
  
  return `/**
 * ${className} Component implementing Platform Component API Contract v1.1
 * 
 * ${description || `${awsService || 'AWS'} ${className.replace(/([A-Z])/g, ' $1').trim()} component`}
 * 
 * @author ${AUTHOR}
 * @category ${category}
 * @service ${awsService || 'AWS'}
 */

import { Construct, IConstruct } from 'constructs';
import { BaseComponent } from '../../platform/contracts/component';
import {
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '../../platform/contracts/component-interfaces';
import { 
  ${configInterface}, 
  ${className}ConfigBuilder 
} from './${componentName}.builder';

// TODO: Import AWS CDK constructs for ${awsService || 'the AWS service'}
// Example:
// import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * ${className} Component
 * 
 * Extends BaseComponent and implements the Platform Component API Contract.
 * Provides ${description || `${awsService || 'AWS'} ${className.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`} functionality with:
 * - Production-ready defaults
 * - Compliance framework support (Commercial, FedRAMP)
 * - Integrated monitoring and observability
 * - Security-first configuration
 */
export class ${className}Component extends BaseComponent {
  
  /** Final resolved configuration */
  private config!: ${configInterface};
  
  /** Main construct */
  private mainConstruct!: IConstruct;
  
  // TODO: Add component-specific properties
  // Example:
  // private bucket!: s3.Bucket;
  // private role!: iam.Role;
  
  /**
   * Constructor
   */
  constructor(scope: Construct, spec: ComponentSpec, context: ComponentContext) {
    super(scope, spec, context);
  }
  
  /**
   * Component type identifier
   */
  public getType(): string {
    return '${componentName}';
  }
  
  /**
   * Main synthesis method
   * 
   * Follows the exact sequence defined in the Platform Component API Contract:
   * 1. Build configuration using ConfigBuilder
   * 2. Call BaseComponent helper methods
   * 3. Instantiate CDK constructs
   * 4. Apply standard tags
   * 5. Register constructs
   * 6. Register capabilities
   */
  public synth(): void {
    // Step 1: Build configuration using ConfigBuilder
    const configBuilder = new ${className}ConfigBuilder(this.context, this.spec);
    this.config = configBuilder.buildSync();
    
    // Step 2: Call BaseComponent helper methods
    const logger = this.getLogger();
    logger.info('Starting ${className} synthesis', {
      context: {
        componentName: this.spec.name,
        componentType: this.getType(),
        environment: this.context.environment,
        complianceFramework: this.context.complianceFramework
      }
    });
    
    // Step 3: Instantiate CDK constructs
    this.createMainConstruct();
    
    // Step 4: Apply standard tags (handled by BaseComponent helpers)
    this.applyStandardTags();
    
    // Step 5: Register constructs for patches.ts access
    this.registerConstructs();
    
    // Step 6: Register capabilities for component binding
    this.registerCapabilities();
    
    logger.info('${className} synthesis completed', {
      context: {
        componentName: this.spec.name
      }
    });
  }
  
  /**
   * Creates the main construct and all related resources
   * TODO: Implement actual CDK construct creation
   */
  private createMainConstruct(): void {
    // TODO: Replace this placeholder with actual ${awsService || 'AWS service'} construct creation
    
    // Example for S3 Bucket:
    // this.bucket = new s3.Bucket(this, 'Bucket', {
    //   bucketName: this.config.name || this.spec.name,
    //   encryption: s3.BucketEncryption.S3_MANAGED,
    //   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    //   versioned: this.context.complianceFramework !== 'commercial'
    // });
    
    // For now, use a placeholder
    this.mainConstruct = this;
    
    // Apply compliance-specific hardening
    this.applyComplianceHardening();
    
    // Apply standard tags
    this._applyStandardTags(this.mainConstruct);
  }
  
  /**
   * Applies compliance-specific hardening based on the framework
   */
  private applyComplianceHardening(): void {
    const framework = this.context.complianceFramework;
    
    if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
      // TODO: Apply FedRAMP-specific hardening
      // Example:
      // - Enable additional encryption
      // - Configure stricter access policies
      // - Enable detailed logging
    }
    
    // TODO: Add component-specific compliance hardening
  }
  
  /**
   * Applies standard tags to all resources
   */
  private applyStandardTags(): void {
    // BaseComponent handles standard tagging automatically
    // Additional component-specific tags can be added here
    const additionalTags = {
      'component-type': this.getType(),
      'aws-service': '${awsService || 'AWS'}'
    };
    
    this._applyStandardTags(this.mainConstruct, additionalTags);
  }
  
  /**
   * Registers construct handles for patches.ts access
   */
  private registerConstructs(): void {
    this._registerConstruct('main', this.mainConstruct);
    
    // TODO: Register additional constructs if needed
    // Example:
    // this._registerConstruct('bucket', this.bucket);
    // this._registerConstruct('role', this.role);
  }
  
  /**
   * Registers capabilities for component binding
   */
  private registerCapabilities(): void {
    const capabilities: ComponentCapabilities = {};
    
    // TODO: Define component-specific capabilities
    capabilities['${category}:${componentName}'] = {
      // TODO: Add capability data that other components can use
      // Example for S3:
      // bucketName: this.bucket.bucketName,
      // bucketArn: this.bucket.bucketArn
    };
    
    // Register monitoring capability
    capabilities['monitoring:${componentName}'] = {
      // TODO: Add monitoring-related capability data
      // Example:
      // metricsNamespace: 'AWS/${awsService || 'Service'}',
      // alarmPrefix: this.spec.name
    };
    
    // Register all capabilities
    Object.entries(capabilities).forEach(([key, data]) => {
      this._registerCapability(key, data);
    });
  }
  
  /**
   * Returns the machine-readable capabilities of the component
   */
  public getCapabilities(): ComponentCapabilities {
    return this.capabilities || {};
  }
}`;
};

const generateBuilderTests = (componentName, className) => {
  const configInterface = `${className}Config`;
  
  return `/**
 * ${className} ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 * 
 * @author ${AUTHOR}
 */

import { ${className}ConfigBuilder, ${configInterface} } from '../${componentName}.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

const createMockContext = (
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'test-service',
    'owner': 'test-team',
    'environment': environment,
    'compliance-framework': complianceFramework
  }
});

const createMockSpec = (config: Partial<${configInterface}> = {}): ComponentSpec => ({
  name: 'test-${componentName}',
  type: '${componentName}',
  config
});

describe('${className}ConfigBuilder', () => {
  
  describe('Hardcoded Fallbacks (Layer 1)', () => {
    
    it('should provide ultra-safe baseline configuration', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new ${className}ConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify hardcoded fallbacks are applied
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(false);
      expect(config.tags).toBeDefined();
    });
    
  });
  
  describe('Compliance Framework Defaults (Layer 2)', () => {
    
    it('should apply commercial compliance defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const builder = new ${className}ConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true);
    });
    
    it('should apply FedRAMP moderate compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const builder = new ${className}ConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true); // Mandatory for FedRAMP
    });
    
    it('should apply FedRAMP high compliance defaults', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();
      
      const builder = new ${className}ConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      expect(config.monitoring?.enabled).toBe(true);
      expect(config.monitoring?.detailedMetrics).toBe(true); // Mandatory for FedRAMP
    });
    
  });
  
  describe('5-Layer Precedence Chain', () => {
    
    it('should apply component overrides over platform defaults', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: false,
          detailedMetrics: false
        }
      });
      
      const builder = new ${className}ConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Verify component config overrides platform defaults
      expect(config.monitoring?.enabled).toBe(false);
      expect(config.monitoring?.detailedMetrics).toBe(false);
    });
    
    it('should merge nested configuration objects correctly', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        monitoring: {
          enabled: false
          // detailedMetrics not specified - should come from defaults
        }
      });
      
      const builder = new ${className}ConfigBuilder(context, spec);
      const config = builder.buildSync();
      
      // Component override should win for enabled
      expect(config.monitoring?.enabled).toBe(false);
      // Default should win for detailedMetrics
      expect(config.monitoring?.detailedMetrics).toBe(true);
    });
    
  });
  
  describe('Schema Validation', () => {
    
    it('should return the component schema', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const builder = new ${className}ConfigBuilder(context, spec);
      const schema = builder.getSchema();
      
      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });
    
  });
  
});`;
};

const generateSynthesisTests = (componentName, className) => {
  const configInterface = `${className}Config`;
  
  return `/**
 * ${className} Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 * 
 * @author ${AUTHOR}
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { ${className}Component } from '../${componentName}.component';
import { ${configInterface} } from '../${componentName}.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

const createMockContext = (
  complianceFramework: string = 'commercial',
  environment: string = 'dev'
): ComponentContext => ({
  serviceName: 'test-service',
  owner: 'test-team',
  environment,
  complianceFramework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'test-service',
    'owner': 'test-team',
    'environment': environment,
    'compliance-framework': complianceFramework
  }
});

const createMockSpec = (config: Partial<${configInterface}> = {}): ComponentSpec => ({
  name: 'test-${componentName}',
  type: '${componentName}',
  config
});

const synthesizeComponent = (
  context: ComponentContext,
  spec: ComponentSpec
): { component: ${className}Component; template: Template } => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  
  const component = new ${className}Component(stack, spec, context);
  component.synth();
  
  const template = Template.fromStack(stack);
  return { component, template };
};

describe('${className}Component Synthesis', () => {
  
  describe('Default Happy Path Synthesis', () => {
    
    it('should synthesize basic ${componentName} with commercial compliance', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template, component } = synthesizeComponent(context, spec);
      
      // TODO: Add specific CloudFormation resource assertions
      // Example:
      // template.hasResourceProperties('AWS::S3::Bucket', {
      //   BucketName: Match.stringLikeRegexp('test-${componentName}'),
      //   PublicAccessBlockConfiguration: {
      //     BlockPublicAcls: true,
      //     BlockPublicPolicy: true,
      //     IgnorePublicAcls: true,
      //     RestrictPublicBuckets: true
      //   }
      // });
      
      // Verify component was created
      expect(component).toBeDefined();
      expect(component.getType()).toBe('${componentName}');
    });
    
    it('should apply standard platform tags', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // TODO: Verify standard tags are applied to resources
      // Example:
      // template.hasResourceProperties('AWS::S3::Bucket', {
      //   Tags: Match.arrayWith([
      //     { Key: 'service-name', Value: 'test-service' },
      //     { Key: 'owner', Value: 'test-team' },
      //     { Key: 'environment', Value: 'dev' },
      //     { Key: 'compliance-framework', Value: 'commercial' }
      //   ])
      // });
    });
    
  });
  
  describe('Compliance Framework Hardening', () => {
    
    it('should apply FedRAMP moderate compliance hardening', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // TODO: Verify FedRAMP-specific hardening is applied
      // Example:
      // template.hasResourceProperties('AWS::S3::Bucket', {
      //   VersioningConfiguration: { Status: 'Enabled' },
      //   BucketEncryption: {
      //     ServerSideEncryptionConfiguration: Match.anyValue()
      //   }
      // });
    });
    
    it('should apply FedRAMP high compliance hardening', () => {
      const context = createMockContext('fedramp-high');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // TODO: Verify FedRAMP High-specific hardening is applied
      // This might include additional encryption, stricter policies, etc.
    });
    
  });
  
  describe('Component Capabilities and Constructs', () => {
    
    it('should register correct capabilities after synthesis', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      const capabilities = component.getCapabilities();
      
      // Verify component-specific capabilities
      expect(capabilities).toBeDefined();
      expect(capabilities['${COMPONENT_CATEGORY}:${componentName}']).toBeDefined();
      expect(capabilities['monitoring:${componentName}']).toBeDefined();
    });
    
    it('should register construct handles for patches.ts access', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      // Verify main construct is registered
      expect(component.getConstruct('main')).toBeDefined();
    });
    
  });
  
  describe('Error Handling', () => {
    
    it('should handle invalid configuration gracefully', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec({
        // TODO: Add invalid configuration that should be caught
      });
      
      // TODO: Test error handling scenarios
      expect(() => {
        synthesizeComponent(context, spec);
      }).not.toThrow();
    });
    
  });
  
});`;
};

const generateReadme = (componentName, className, category, description, awsService) => {
  const categoryInfo = COMPONENT_CATEGORIES[category] || { description: 'Miscellaneous component' };
  
  return `# ${className} Component

${description || `${awsService || 'AWS'} ${className.replace(/([A-Z])/g, ' $1').trim()} component`} with comprehensive security, monitoring, and compliance features.

## Overview

The ${className} component provides:

- **Production-ready** ${className.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} functionality
- **Comprehensive compliance** (Commercial, FedRAMP Moderate/High)
- **Integrated monitoring** and observability
- **Security-first** configuration
- **Platform integration** with other components

### Category: ${category}

${categoryInfo.description}

${awsService ? `### AWS Service: ${awsService}

This component manages ${awsService} resources and provides a simplified, secure interface for common use cases.` : ''}

## Usage Example

### Basic Configuration

\`\`\`yaml
service: my-service
owner: platform-team
complianceFramework: commercial

components:
  - name: my-${componentName}
    type: ${componentName}
    config:
      description: "Production ${componentName} instance"
      monitoring:
        enabled: true
        detailedMetrics: true
\`\`\`

### Advanced Configuration

\`\`\`yaml
components:
  - name: advanced-${componentName}
    type: ${componentName}
    config:
      description: "Advanced ${componentName} with custom settings"
      monitoring:
        enabled: true
        detailedMetrics: true
        alarms:
          # Component-specific alarm thresholds
      tags:
        project: "platform"
        criticality: "high"
        # TODO: Add component-specific configuration examples
\`\`\`

## Configuration Reference

### Root Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| \`name\` | string | No | Component name (auto-generated if not provided) |
| \`description\` | string | No | Component description for documentation |
| \`monitoring\` | object | No | Monitoring and observability configuration |
| \`tags\` | object | No | Additional resource tags |

<!-- TODO: Add component-specific configuration properties -->

### Monitoring Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| \`enabled\` | boolean | No | Enable monitoring (default: true) |
| \`detailedMetrics\` | boolean | No | Enable detailed CloudWatch metrics |

## Capabilities Provided

This component provides the following capabilities for binding with other components:

- \`${category}:${componentName}\` - Main ${componentName} capability
- \`monitoring:${componentName}\` - Monitoring capability

<!-- TODO: Document component-specific capabilities -->

## Construct Handles

The following construct handles are available for use in \`patches.ts\`:

- \`main\` - Main ${componentName} construct

<!-- TODO: Add additional construct handles -->

## Compliance Frameworks

### Commercial

- Standard monitoring configuration
- Basic resource tagging
- Standard security settings

### FedRAMP Moderate/High

- Enhanced monitoring with detailed metrics
- Comprehensive audit logging
- Stricter security configurations
- Extended compliance tagging

<!-- TODO: Document compliance-specific features -->

## Best Practices

1. **Always enable monitoring** in production environments
2. **Use descriptive names** for better resource identification
3. **Configure appropriate tags** for cost allocation and governance
4. **Review compliance requirements** for your environment
5. **Test configurations** in development before production deployment

<!-- TODO: Add component-specific best practices -->

## Examples

### Integration with Other Components

\`\`\`yaml
# TODO: Add examples of how this component works with others
# Example:
# components:
#   - name: my-vpc
#     type: vpc
#   - name: my-${componentName}
#     type: ${componentName}
#     config:
#       # Reference VPC capability if needed
\`\`\`

## Troubleshooting

### Common Issues

1. **Configuration validation errors** - Check the JSON schema requirements
2. **Missing capabilities** - Verify component synthesis completed successfully
3. **Tag propagation issues** - Ensure BaseComponent is properly extended

<!-- TODO: Add component-specific troubleshooting -->

### Debugging

1. **Enable verbose logging** in the platform CLI
2. **Check CloudWatch metrics** for component health
3. **Review CloudFormation events** for deployment issues
4. **Use patches.ts** for advanced customization if needed

## Performance Considerations

1. **Monitor resource utilization** through CloudWatch metrics
2. **Configure appropriate scaling** if applicable
3. **Review cost implications** of detailed monitoring
4. **Optimize configurations** based on usage patterns

<!-- TODO: Add component-specific performance considerations -->

## Security Considerations

1. **Follow principle of least privilege** for IAM permissions
2. **Enable encryption** for data at rest and in transit
3. **Use secure defaults** provided by compliance frameworks
4. **Regular security reviews** of component configurations
5. **Monitor access patterns** through CloudTrail and CloudWatch

<!-- TODO: Add component-specific security considerations -->

## Development

### Running Tests

\`\`\`bash
# Run all tests for this component
npm test -- --testPathPattern=${componentName}

# Run only builder tests
npm test -- --testPathPattern=${componentName}.builder

# Run only synthesis tests
npm test -- --testPathPattern=${componentName}.component.synthesis
\`\`\`

### Contributing

When contributing to this component:

1. **Follow the Platform Component API Contract v1.1**
2. **Add tests for new functionality**
3. **Update documentation** for configuration changes
4. **Verify compliance** with all supported frameworks
5. **Test in multiple environments** before submitting

---

*Generated by Component Bootstrap Script v1.0*  
*Author: ${AUTHOR}*  
*Category: ${category}*  
${awsService ? `*AWS Service: ${awsService}*` : ''}`;
};

const generateIndexExports = (componentName, className) => {
  const configInterface = `${className}Config`;
  const schemaName = `${componentName.toUpperCase().replace(/-/g, '_')}_CONFIG_SCHEMA`;
  
  return `/**
 * @platform/${componentName} - ${className} Component
 * ${COMPONENT_DESCRIPTION || `${AWS_SERVICE || 'AWS'} ${className.replace(/([A-Z])/g, ' $1').trim()} component`}
 * 
 * @author ${AUTHOR}
 * @category ${COMPONENT_CATEGORY}
 * @service ${AWS_SERVICE || 'AWS'}
 */

// Component exports
export { ${className}Component } from './${componentName}.component';

// Configuration exports
export { 
  ${configInterface},
  ${className}ConfigBuilder,
  ${schemaName}
} from './${componentName}.builder';

// Creator exports
export { ${className}Creator } from './${componentName}.creator';`;
};

const generatePackageJson = (componentName, className, category, description, awsService) => {
  return `{
  "name": "@platform/${componentName}",
  "version": "1.0.0",
  "description": "${description || `${awsService || 'AWS'} ${className.replace(/([A-Z])/g, ' $1').trim()} component`}",
  "main": "index.js",
  "types": "index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix"
  },
  "keywords": [
    "aws",
    "cdk",
    "platform",
    "${category}",
    "${componentName}"${awsService ? `,\n    "${awsService.toLowerCase()}"` : ''}
  ],
  "author": "${AUTHOR}",
  "license": "MIT",
  "peerDependencies": {
    "aws-cdk-lib": "^2.0.0",
    "constructs": "^10.0.0"
  },
  "devDependencies": {
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}`;
};

// Main bootstrap function
const bootstrapComponent = () => {
  const componentName = COMPONENT_NAME;
  const className = toPascalCase(componentName);
  const componentPath = path.join(COMPONENTS_DIR, componentName);
  
  log(`🚀 Bootstrapping component: ${componentName}`);
  log(`📂 Component path: ${componentPath}`);
  log(`🏗️  Component class: ${className}`);
  log(`📋 Category: ${COMPONENT_CATEGORY}`);
  if (AWS_SERVICE) log(`☁️  AWS Service: ${AWS_SERVICE}`);
  if (COMPONENT_DESCRIPTION) log(`📝 Description: ${COMPONENT_DESCRIPTION}`);
  
  try {
    // Create component directory structure
    ensureDir(componentPath);
    ensureDir(path.join(componentPath, 'tests'));
    ensureDir(path.join(componentPath, 'lib'));
    
    // Generate all files
    const files = [
      // Main component files
      {
        path: path.join(componentPath, `${componentName}.component.ts`),
        content: generateComponent(componentName, className, COMPONENT_CATEGORY, COMPONENT_DESCRIPTION, AWS_SERVICE)
      },
      {
        path: path.join(componentPath, `${componentName}.builder.ts`),
        content: generateConfigBuilder(componentName, className, COMPONENT_CATEGORY, COMPONENT_DESCRIPTION, AWS_SERVICE)
      },
      {
        path: path.join(componentPath, `${componentName}.creator.ts`),
        content: generateCreator(componentName, className, COMPONENT_CATEGORY, COMPONENT_DESCRIPTION, AWS_SERVICE)
      },
      
      // Test files
      {
        path: path.join(componentPath, 'tests', `${componentName}.builder.test.ts`),
        content: generateBuilderTests(componentName, className)
      },
      {
        path: path.join(componentPath, 'tests', `${componentName}.component.synthesis.test.ts`),
        content: generateSynthesisTests(componentName, className)
      },
      
      // Documentation and exports
      {
        path: path.join(componentPath, 'README.md'),
        content: generateReadme(componentName, className, COMPONENT_CATEGORY, COMPONENT_DESCRIPTION, AWS_SERVICE)
      },
      {
        path: path.join(componentPath, 'index.ts'),
        content: generateIndexExports(componentName, className)
      },
      {
        path: path.join(componentPath, 'package.json'),
        content: generatePackageJson(componentName, className, COMPONENT_CATEGORY, COMPONENT_DESCRIPTION, AWS_SERVICE)
      }
    ];
    
    // Write all files
    files.forEach(file => {
      writeFile(file.path, file.content);
    });
    
    log(`✅ Successfully bootstrapped component: ${componentName}`, 'success');
    return true;
    
  } catch (error) {
    log(`❌ Failed to bootstrap component: ${error.message}`, 'error');
    return false;
  }
};

// Main execution
const main = async () => {
  log('🚀 Starting Component Bootstrap Script');
  
  // Validate inputs
  const validationErrors = validateInputs();
  if (validationErrors.length > 0) {
    log('❌ Validation errors:', 'error');
    validationErrors.forEach(error => log(`  - ${error}`, 'error'));
    process.exit(1);
  }
  
  // Show available categories if no category specified
  if (!COMPONENT_NAME) {
    log('\n📋 Available component categories:');
    Object.entries(COMPONENT_CATEGORIES).forEach(([category, info]) => {
      log(`  ${category}: ${info.description}`);
      log(`    Services: ${info.services.join(', ')}`);
      log(`    Capabilities: ${info.capabilities.join(', ')}`);
      log('');
    });
    
    log('Usage: ./bootstrap-component.js --name=my-component --category=storage --description="My component"');
    process.exit(0);
  }
  
  if (DRY_RUN) {
    log('🔍 DRY RUN - No files will be created');
    log(`Would create component: ${COMPONENT_NAME}`);
    log(`Component directory: ${path.join(COMPONENTS_DIR, COMPONENT_NAME)}`);
    return;
  }
  
  // Bootstrap the component
  const success = bootstrapComponent();
  
  if (success) {
    log(`\n📝 Next Steps:`);
    log(`1. Review the generated files in src/components/${COMPONENT_NAME}/`);
    log(`2. Implement the actual CDK constructs in ${COMPONENT_NAME}.component.ts`);
    log(`3. Define the configuration schema in ${COMPONENT_NAME}.builder.ts`);
    log(`4. Add specific test assertions in the tests/ directory`);
    log(`5. Update the component registry to include the new creator`);
    log(`6. Run tests: npm test -- --testPathPattern=${COMPONENT_NAME}`);
    
    log(`\n🎉 Component ${COMPONENT_NAME} bootstrapped successfully!`);
  } else {
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  bootstrapComponent,
  validateInputs,
  COMPONENT_CATEGORIES
};
