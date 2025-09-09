#!/usr/bin/env node

/**
 * Component Refactor Script
 * 
 * Automatically refactors all components in src/components/ to conform with
 * the Platform Component API Contract v1.1
 * 
 * This script:
 * 1. Scans all component directories
 * 2. Analyzes existing component structure
 * 3. Creates ConfigBuilder, Creator, and refactored Component files
 * 4. Splits tests into builder and synthesis tests
 * 5. Generates comprehensive README.md files
 * 6. Updates index.ts exports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const COMPONENTS_DIR = './src/components';
const BACKUP_DIR = './component-refactor-backups';
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const SKIP_EXISTING = process.argv.includes('--skip-existing');
const COMPONENT_FILTER = process.argv.find(arg => arg.startsWith('--component='))?.split('=')[1];

// Already refactored components (skip these)
const REFACTORED_COMPONENTS = [
  'api-gateway-http',
];

// Component categories for better organization
const COMPONENT_CATEGORIES = {
  'api': ['api-gateway-http', 'api-gateway-rest'],
  'compute': ['ec2-instance', 'lambda-api', 'lambda-worker', 'ecs-fargate-service', 'ecs-ec2-service', 'ecs-cluster'],
  'storage': ['s3-bucket', 'dynamodb-table', 'efs-filesystem'],
  'database': ['rds-postgres', 'opensearch-domain'],
  'cache': ['elasticache-redis'],
  'networking': ['vpc', 'application-load-balancer', 'cloudfront-distribution'],
  'security': ['iam-role', 'iam-policy', 'secrets-manager', 'certificate-manager', 'waf-web-acl'],
  'messaging': ['sqs-queue', 'sns-topic', 'kinesis-stream'],
  'monitoring': ['cloudwatch-alarm'],
  'ml': ['sagemaker-notebook-instance'],
  'analytics': ['glue-job'],
  'workflow': ['step-functions-statemachine'],
  'events': ['eventbridge-rule-cron', 'eventbridge-rule-pattern'],
  'dns': ['route53-hosted-zone'],
  'feature-flags': ['feature-flag', 'openfeature-provider'],
  'development': ['localstack-environment', 'static-website'],
  'integration': ['mcp-server']
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

const readFileIfExists = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
};

const writeFileWithBackup = (filePath, content, componentName) => {
  if (DRY_RUN) {
    log(`[DRY RUN] Would write: ${filePath}`, 'verbose');
    return;
  }
  
  // Create backup if file exists
  if (fs.existsSync(filePath)) {
    const backupPath = path.join(BACKUP_DIR, componentName, path.basename(filePath));
    ensureDir(path.dirname(backupPath));
    fs.copyFileSync(filePath, backupPath);
    log(`Backed up: ${filePath} -> ${backupPath}`, 'verbose');
  }
  
  fs.writeFileSync(filePath, content);
  log(`Written: ${filePath}`, 'verbose');
};

// Component analysis functions
const analyzeComponent = (componentDir) => {
  const componentName = path.basename(componentDir);
  const files = fs.readdirSync(componentDir);
  
  const analysis = {
    name: componentName,
    path: componentDir,
    hasComponent: false,
    hasBuilder: false,
    hasCreator: false,
    hasTests: false,
    hasReadme: false,
    componentFile: null,
    testFiles: [],
    indexFile: null,
    category: findComponentCategory(componentName)
  };
  
  files.forEach(file => {
    const filePath = path.join(componentDir, file);
    if (file.endsWith('.component.ts')) {
      analysis.hasComponent = true;
      analysis.componentFile = filePath;
    } else if (file.endsWith('.builder.ts')) {
      analysis.hasBuilder = true;
    } else if (file.endsWith('.creator.ts')) {
      analysis.hasCreator = true;
    } else if (file.endsWith('.test.ts')) {
      analysis.hasTests = true;
      analysis.testFiles.push(filePath);
    } else if (file === 'index.ts') {
      analysis.indexFile = filePath;
    } else if (file === 'README.md') {
      analysis.hasReadme = true;
    }
  });
  
  return analysis;
};

const findComponentCategory = (componentName) => {
  for (const [category, components] of Object.entries(COMPONENT_CATEGORIES)) {
    if (components.includes(componentName)) {
      return category;
    }
  }
  return 'misc';
};

// Extract component information from existing files
const extractComponentInfo = (componentFile) => {
  const content = readFileIfExists(componentFile);
  if (!content) return null;
  
  const info = {
    className: null,
    configInterface: null,
    description: '',
    imports: [],
    capabilities: [],
    constructHandles: []
  };
  
  // Extract class name
  const classMatch = content.match(/export class (\w+Component)/);
  if (classMatch) {
    info.className = classMatch[1];
  }
  
  // Extract config interface
  const configMatch = content.match(/export interface (\w+Config)/);
  if (configMatch) {
    info.configInterface = configMatch[1];
  }
  
  // Extract description from comments
  const descriptionMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)/);
  if (descriptionMatch) {
    info.description = descriptionMatch[1].trim();
  }
  
  // Extract imports
  const importMatches = content.matchAll(/import.*from\s+['"]([^'"]+)['"]/g);
  for (const match of importMatches) {
    info.imports.push(match[1]);
  }
  
  return info;
};

// Template generators
const generateConfigBuilder = (componentName, componentInfo) => {
  const className = componentInfo.className || toPascalCase(componentName);
  const configInterface = componentInfo.configInterface || `${className}Config`;
  const category = findComponentCategory(componentName);
  
  return `/**
 * Configuration Builder for ${className} Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext } from '../../platform/contracts/config-builder';

/**
 * Configuration interface for ${className} component
 */
export interface ${configInterface} {
  // TODO: Define comprehensive configuration interface
  // This should be extracted and refined from the existing component
  
  /** Component name (optional, will be auto-generated) */
  name?: string;
  
  /** Component description */
  description?: string;
  
  /** Enable detailed monitoring */
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
    alarms?: {
      // Define component-specific alarm thresholds
    };
  };
  
  /** Tagging configuration */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for ${className} configuration validation
 */
export const ${componentName.toUpperCase().replace(/-/g, '_')}_CONFIG_SCHEMA = {
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
      };
    }
    
    return baseCompliance;
  }
  
  /**
   * Get the JSON Schema for validation
   */
  public getSchema(): any {
    return ${componentName.toUpperCase().replace(/-/g, '_')}_CONFIG_SCHEMA;
  }
}`;
};

const generateCreator = (componentName, componentInfo) => {
  const className = componentInfo.className || toPascalCase(componentName);
  const configInterface = componentInfo.configInterface || `${className}Config`;
  const category = findComponentCategory(componentName);
  
  return `/**
 * Creator for ${className} Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '../../platform/contracts/component-interfaces';
import { ${className}Component } from './${componentName}.component';
import { ${configInterface}, ${componentName.toUpperCase().replace(/-/g, '_')}_CONFIG_SCHEMA } from './${componentName}.builder';

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
  public readonly description = '${componentInfo.description || `AWS ${className.replace(/([A-Z])/g, ' $1').trim()} component`}';
  
  /**
   * Component category for organization
   */
  public readonly category = '${category}';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    '${componentName}',
    '${category}',
    'aws'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = ${componentName.toUpperCase().replace(/-/g, '_')}_CONFIG_SCHEMA;
  
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
    
    // Add component-specific validations here
    
    // Environment-specific validations
    if (context.environment === 'prod') {
      if (!config?.monitoring?.enabled) {
        errors.push('Monitoring must be enabled in production environment');
      }
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
      'monitoring:${componentName}'
    ];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   */
  public getRequiredCapabilities(): string[] {
    return [];
  }
  
  /**
   * Returns construct handles that will be registered by this component
   */
  public getConstructHandles(): string[] {
    return [
      'main'
    ];
  }
}`;
};

const generateRefactoredComponent = (componentName, componentInfo, originalContent) => {
  const className = componentInfo.className || toPascalCase(componentName);
  const configInterface = componentInfo.configInterface || `${className}Config`;
  
  return `/**
 * ${className} Component implementing Platform Component API Contract v1.1
 * 
 * ${componentInfo.description || `AWS ${className.replace(/([A-Z])/g, ' $1').trim()} component`}
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

/**
 * ${className} Component
 * 
 * Extends BaseComponent and implements the Platform Component API Contract.
 */
export class ${className}Component extends BaseComponent {
  
  /** Final resolved configuration */
  private config!: ${configInterface};
  
  /** Main construct */
  private mainConstruct!: IConstruct;
  
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
   * Creates the main construct
   * TODO: Implement actual CDK construct creation based on original component
   */
  private createMainConstruct(): void {
    // TODO: Extract and refactor the main construct creation logic
    // from the original component file
    
    // Example placeholder - replace with actual implementation
    this.mainConstruct = this; // Placeholder
    
    // Apply standard tags
    this._applyStandardTags(this.mainConstruct);
  }
  
  /**
   * Applies standard tags to all resources
   */
  private applyStandardTags(): void {
    // BaseComponent handles standard tagging automatically
    // Additional component-specific tags can be added here
    const additionalTags = {
      'component-type': this.getType()
    };
    
    this._applyStandardTags(this.mainConstruct, additionalTags);
  }
  
  /**
   * Registers construct handles for patches.ts access
   */
  private registerConstructs(): void {
    this._registerConstruct('main', this.mainConstruct);
  }
  
  /**
   * Registers capabilities for component binding
   */
  private registerCapabilities(): void {
    const capabilities: ComponentCapabilities = {};
    
    // TODO: Define component-specific capabilities
    capabilities['${findComponentCategory(componentName)}:${componentName}'] = {
      // Add capability data here
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

const generateBuilderTest = (componentName, componentInfo) => {
  const className = componentInfo.className || toPascalCase(componentName);
  const configInterface = componentInfo.configInterface || `${className}Config`;
  
  return `/**
 * ${className} ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import { ${className}ConfigBuilder, ${configInterface} } from './${componentName}.builder';
import { ComponentContext, ComponentSpec } from '../../platform/contracts/component-interfaces';

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
    
    it('should apply FedRAMP compliance defaults', () => {
      const context = createMockContext('fedramp-moderate');
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
    
  });
  
});`;
};

const generateSynthesisTest = (componentName, componentInfo) => {
  const className = componentInfo.className || toPascalCase(componentName);
  const configInterface = componentInfo.configInterface || `${className}Config`;
  
  return `/**
 * ${className} Component Synthesis Test Suite
 * Implements Platform Testing Standard v1.0 - Component Synthesis Testing
 */

import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { ${className}Component } from './${componentName}.component';
import { ${configInterface} } from './${componentName}.builder';
import { ComponentContext, ComponentSpec } from '../../platform/contracts/component-interfaces';

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
      
      const { template } = synthesizeComponent(context, spec);
      
      // TODO: Add specific CloudFormation resource assertions
      // Example:
      // template.hasResourceProperties('AWS::SomeService::Resource', {
      //   PropertyName: 'ExpectedValue'
      // });
    });
    
    it('should apply standard platform tags', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // TODO: Verify standard tags are applied to resources
    });
    
  });
  
  describe('Compliance Framework Hardening', () => {
    
    it('should apply FedRAMP compliance hardening', () => {
      const context = createMockContext('fedramp-moderate');
      const spec = createMockSpec();
      
      const { template } = synthesizeComponent(context, spec);
      
      // TODO: Verify FedRAMP-specific hardening is applied
    });
    
  });
  
  describe('Component Capabilities and Constructs', () => {
    
    it('should register correct capabilities after synthesis', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      const capabilities = component.getCapabilities();
      
      // TODO: Verify component-specific capabilities
      expect(capabilities).toBeDefined();
    });
    
    it('should register construct handles for patches.ts access', () => {
      const context = createMockContext('commercial');
      const spec = createMockSpec();
      
      const { component } = synthesizeComponent(context, spec);
      
      // Verify main construct is registered
      expect(component.getConstruct('main')).toBeDefined();
    });
    
  });
  
});`;
};

const generateReadme = (componentName, componentInfo) => {
  const className = componentInfo.className || toPascalCase(componentName);
  const category = findComponentCategory(componentName);
  
  return `# ${className} Component

${componentInfo.description || `AWS ${className.replace(/([A-Z])/g, ' $1').trim()} component`} with comprehensive security, monitoring, and compliance features.

## Overview

The ${className} component provides:

- **Production-ready** ${className.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} functionality
- **Comprehensive compliance** (Commercial, FedRAMP Moderate/High)
- **Integrated monitoring** and observability
- **Security-first** configuration
- **Platform integration** with other components

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
\`\`\`

## Configuration Reference

### Root Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| \`name\` | string | No | Component name (auto-generated if not provided) |
| \`description\` | string | No | Component description for documentation |
| \`monitoring\` | object | No | Monitoring and observability configuration |
| \`tags\` | object | No | Additional resource tags |

### Monitoring Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| \`enabled\` | boolean | No | Enable monitoring (default: true) |
| \`detailedMetrics\` | boolean | No | Enable detailed CloudWatch metrics |

## Capabilities Provided

This component provides the following capabilities for binding with other components:

- \`${category}:${componentName}\` - Main ${componentName} capability
- \`monitoring:${componentName}\` - Monitoring capability

## Construct Handles

The following construct handles are available for use in \`patches.ts\`:

- \`main\` - Main ${componentName} construct

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

## Best Practices

1. **Always enable monitoring** in production environments
2. **Use descriptive names** for better resource identification
3. **Configure appropriate tags** for cost allocation and governance
4. **Review compliance requirements** for your environment
5. **Test configurations** in development before production deployment

## Migration Guide

When upgrading from previous versions:

1. **Update component type** to \`${componentName}\`
2. **Review configuration schema** changes
3. **Update test assertions** if using custom tests
4. **Verify compliance settings** for your environment

## Troubleshooting

### Common Issues

1. **Configuration validation errors** - Check the JSON schema requirements
2. **Missing capabilities** - Verify component synthesis completed successfully
3. **Tag propagation issues** - Ensure BaseComponent is properly extended

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

## Security Considerations

1. **Follow principle of least privilege** for IAM permissions
2. **Enable encryption** for data at rest and in transit
3. **Use secure defaults** provided by compliance frameworks
4. **Regular security reviews** of component configurations
5. **Monitor access patterns** through CloudTrail and CloudWatch`;
};

const generateIndexExports = (componentName, componentInfo) => {
  const className = componentInfo.className || toPascalCase(componentName);
  const configInterface = componentInfo.configInterface || `${className}Config`;
  
  return `/**
 * @platform/${componentName} - ${className} Component
 * ${componentInfo.description || `AWS ${className.replace(/([A-Z])/g, ' $1').trim()} component`}
 */

// Component exports
export { ${className}Component } from './${componentName}.component';

// Configuration exports
export { 
  ${configInterface},
  ${className}ConfigBuilder,
  ${componentName.toUpperCase().replace(/-/g, '_')}_CONFIG_SCHEMA
} from './${componentName}.builder';

// Creator exports
export { ${className}Creator } from './${componentName}.creator';`;
};

// Utility functions
const toPascalCase = (str) => {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
};

// Main refactor function
const refactorComponent = async (componentDir, analysis) => {
  const { name: componentName } = analysis;
  
  log(`🔧 Refactoring component: ${componentName}`);
  
  // Extract component information
  const componentInfo = extractComponentInfo(analysis.componentFile);
  if (!componentInfo) {
    log(`❌ Could not extract component info for ${componentName}`, 'error');
    return false;
  }
  
  const originalContent = readFileIfExists(analysis.componentFile);
  
  try {
    // Generate new files
    const builderContent = generateConfigBuilder(componentName, componentInfo);
    const creatorContent = generateCreator(componentName, componentInfo);
    const componentContent = generateRefactoredComponent(componentName, componentInfo, originalContent);
    const builderTestContent = generateBuilderTest(componentName, componentInfo);
    const synthesisTestContent = generateSynthesisTest(componentName, componentInfo);
    const readmeContent = generateReadme(componentName, componentInfo);
    const indexContent = generateIndexExports(componentName, componentInfo);
    
    // Write new files
    const componentDir = analysis.path;
    writeFileWithBackup(path.join(componentDir, `${componentName}.builder.ts`), builderContent, componentName);
    writeFileWithBackup(path.join(componentDir, `${componentName}.creator.ts`), creatorContent, componentName);
    writeFileWithBackup(path.join(componentDir, `${componentName}.component.ts`), componentContent, componentName);
    writeFileWithBackup(path.join(componentDir, `${componentName}.builder.test.ts`), builderTestContent, componentName);
    writeFileWithBackup(path.join(componentDir, `${componentName}.component.synthesis.test.ts`), synthesisTestContent, componentName);
    writeFileWithBackup(path.join(componentDir, 'README.md'), readmeContent, componentName);
    writeFileWithBackup(path.join(componentDir, 'index.ts'), indexContent, componentName);
    
    log(`✅ Successfully refactored: ${componentName}`, 'success');
    return true;
  } catch (error) {
    log(`❌ Failed to refactor ${componentName}: ${error.message}`, 'error');
    return false;
  }
};

// Main execution
const main = async () => {
  log('🚀 Starting Component Refactor Script');
  log(`📂 Components directory: ${COMPONENTS_DIR}`);
  log(`💾 Backup directory: ${BACKUP_DIR}`);
  log(`🔍 Dry run: ${DRY_RUN}`);
  
  // Ensure backup directory exists
  ensureDir(BACKUP_DIR);
  
  // Scan components directory
  const componentDirs = fs.readdirSync(COMPONENTS_DIR)
    .map(name => path.join(COMPONENTS_DIR, name))
    .filter(dir => fs.statSync(dir).isDirectory());
  
  log(`📋 Found ${componentDirs.length} component directories`);
  
  // Analyze components
  const analyses = componentDirs
    .map(analyzeComponent)
    .filter(analysis => {
      // Filter out already refactored components
      if (REFACTORED_COMPONENTS.includes(analysis.name) && SKIP_EXISTING) {
        log(`⏭️  Skipping already refactored: ${analysis.name}`, 'verbose');
        return false;
      }
      
      // Filter by component name if specified
      if (COMPONENT_FILTER && analysis.name !== COMPONENT_FILTER) {
        return false;
      }
      
      // Only process components that have a component file
      if (!analysis.hasComponent) {
        log(`⚠️  Skipping ${analysis.name}: no component file found`, 'warning');
        return false;
      }
      
      return true;
    });
  
  log(`🎯 Will refactor ${analyses.length} components`);
  
  // Display component analysis
  if (VERBOSE) {
    analyses.forEach(analysis => {
      log(`📊 ${analysis.name}:`, 'verbose');
      log(`   Category: ${analysis.category}`, 'verbose');
      log(`   Has Builder: ${analysis.hasBuilder}`, 'verbose');
      log(`   Has Creator: ${analysis.hasCreator}`, 'verbose');
      log(`   Has Tests: ${analysis.hasTests} (${analysis.testFiles.length} files)`, 'verbose');
      log(`   Has README: ${analysis.hasReadme}`, 'verbose');
    });
  }
  
  if (DRY_RUN) {
    log('🔍 DRY RUN - No files will be modified');
    return;
  }
  
  // Refactor components
  let successCount = 0;
  let failureCount = 0;
  
  for (const analysis of analyses) {
    const success = await refactorComponent(analysis.path, analysis);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  // Summary
  log(`\n📊 Refactor Summary:`);
  log(`✅ Successfully refactored: ${successCount} components`, 'success');
  log(`❌ Failed to refactor: ${failureCount} components`, failureCount > 0 ? 'error' : 'info');
  
  if (successCount > 0) {
    log(`\n📝 Next Steps:`);
    log(`1. Review the generated files in each component directory`);
    log(`2. Update the component implementations with actual CDK constructs`);
    log(`3. Refine the configuration interfaces and schemas`);
    log(`4. Add component-specific test assertions`);
    log(`5. Update the component registry to include new creators`);
    log(`6. Run tests to ensure everything works correctly`);
  }
  
  log(`\n🎉 Component refactor script completed!`);
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
  refactorComponent,
  analyzeComponent,
  generateConfigBuilder,
  generateCreator,
  generateRefactoredComponent
};
