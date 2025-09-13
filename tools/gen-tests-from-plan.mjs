#!/usr/bin/env node

/**
 * Generate Tests from Plan
 * 
 * Creates unit tests based on component plan compliance requirements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function log(...args) {
  console.log('[gen-tests]', ...args);
}

function error(...args) {
  console.error('[gen-tests] ERROR:', ...args);
}

function generateBuilderTest(componentName) {
  return `import { ${componentName}Builder } from '../src/${componentName}.builder';
import { ${componentName}Config } from '../src/${componentName}.builder';

describe('${componentName}Builder', () => {
  let builder: ${componentName}Builder;

  beforeEach(() => {
    builder = new ${componentName}Builder();
  });

  describe('configuration precedence', () => {
    it('should use hardcoded fallbacks when no config provided', () => {
      const config = builder.build();
      expect(config).toBeDefined();
      // Add specific assertions based on component requirements
    });

    it('should override hardcoded values with user config', () => {
      const userConfig = {
        // Add user config properties
      };
      const config = builder.build(userConfig);
      expect(config).toEqual(expect.objectContaining(userConfig));
    });

    it('should apply framework defaults for fedramp-moderate', () => {
      const config = builder.build({}, 'fedramp-moderate');
      expect(config).toBeDefined();
      // Add framework-specific assertions
    });

    it('should apply framework defaults for fedramp-high', () => {
      const config = builder.build({}, 'fedramp-high');
      expect(config).toBeDefined();
      // Add framework-specific assertions
    });
  });

  describe('validation', () => {
    it('should validate required properties', () => {
      expect(() => builder.build({})).not.toThrow();
    });

    it('should throw on invalid configuration', () => {
      const invalidConfig = {
        // Add invalid config properties
      };
      expect(() => builder.build(invalidConfig)).toThrow();
    });
  });
});
`;
}

function generateComponentTest(componentName) {
  return `import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ${componentName}Component } from '../src/${componentName}.component';
import { ${componentName}Builder } from '../src/${componentName}.builder';

describe('${componentName}Component', () => {
  let app: App;
  let stack: Stack;
  let builder: ${componentName}Builder;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
    builder = new ${componentName}Builder();
  });

  describe('synth', () => {
    it('should create component with default configuration', () => {
      const config = builder.build();
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Add specific assertions based on component resources
      // Example: template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    it('should apply compliance tags', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify compliance tags are applied
      // Example: template.hasResourceProperties('AWS::S3::Bucket', {
      //   Tags: expect.arrayContaining([
      //     expect.objectContaining({ Key: 'compliance:framework', Value: 'fedramp-moderate' })
      //   ])
      // });
    });

    it('should enable encryption for fedramp-moderate', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify encryption is enabled
      // Add encryption-specific assertions
    });

    it('should enable logging', () => {
      const config = builder.build();
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify logging is enabled
      // Add logging-specific assertions
    });
  });

  describe('capabilities', () => {
    it('should support encryption capability', () => {
      const config = builder.build({ encryption: true });
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify encryption capability
    });

    it('should support monitoring capability', () => {
      const config = builder.build({ monitoring: true });
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify monitoring capability
    });
  });
});
`;
}

function generateComplianceTest(componentName) {
  return `import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ${componentName}Component } from '../src/${componentName}.component';
import { ${componentName}Builder } from '../src/${componentName}.builder';

describe('${componentName}Component Compliance', () => {
  let app: App;
  let stack: Stack;
  let builder: ${componentName}Builder;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
    builder = new ${componentName}Builder();
  });

  describe('NIST Controls', () => {
    it('should enforce AC-2 (Account Management)', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify AC-2 controls are enforced
      // Add specific AC-2 assertions
    });

    it('should enforce AC-3 (Access Enforcement)', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify AC-3 controls are enforced
      // Add specific AC-3 assertions
    });

    it('should enforce AC-4 (Information Flow Enforcement)', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify AC-4 controls are enforced
      // Add specific AC-4 assertions
    });

    it('should enforce AU-2 (Audit Events)', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify AU-2 controls are enforced
      // Add specific AU-2 assertions
    });

    it('should enforce SC-7 (Boundary Protection)', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify SC-7 controls are enforced
      // Add specific SC-7 assertions
    });

    it('should enforce SC-28 (Protection of Information at Rest)', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify SC-28 controls are enforced
      // Add specific SC-28 assertions
    });
  });

  describe('Framework Compliance', () => {
    it('should meet FedRAMP Moderate requirements', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify FedRAMP Moderate compliance
      // Add framework-specific assertions
    });

    it('should meet FedRAMP High requirements', () => {
      const config = builder.build({}, 'fedramp-high');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify FedRAMP High compliance
      // Add framework-specific assertions
    });
  });
});
`;
}

function generateObservabilityTest(componentName) {
  return `import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ${componentName}Component } from '../src/${componentName}.component';
import { ${componentName}Builder } from '../src/${componentName}.builder';

describe('${componentName}Component Observability', () => {
  let app: App;
  let stack: Stack;
  let builder: ${componentName}Builder;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
    builder = new ${componentName}Builder();
  });

  describe('CloudWatch Alarms', () => {
    it('should create health check alarm', () => {
      const config = builder.build();
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify health check alarm is created
      // template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
      // template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      //   AlarmName: '${componentName}-health-check',
      //   ComparisonOperator: 'LessThanThreshold',
      //   Threshold: 1,
      //   EvaluationPeriods: 2
      // });
    });

    it('should create performance alarms', () => {
      const config = builder.build({ monitoring: true });
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify performance alarms are created
      // Add performance alarm assertions
    });
  });

  describe('Logging', () => {
    it('should enable access logging', () => {
      const config = builder.build({ logging: true });
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify access logging is enabled
      // Add logging assertions
    });

    it('should configure log retention based on framework', () => {
      const config = builder.build({}, 'fedramp-moderate');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify log retention is configured correctly
      // Add retention assertions
    });
  });

  describe('Metrics', () => {
    it('should create custom metrics', () => {
      const config = builder.build();
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify custom metrics are created
      // Add metrics assertions
    });

    it('should configure metric retention based on framework', () => {
      const config = builder.build({}, 'fedramp-high');
      const component = new ${componentName}Component(stack, 'Test${componentName}', config);
      
      const template = Template.fromStack(stack);
      
      // Verify metric retention is configured correctly
      // Add retention assertions
    });
  });
});
`;
}

function main() {
  const componentName = process.argv[2];

  if (!componentName) {
    error('Usage: node gen-tests-from-plan.mjs <componentName>');
    process.exit(1);
  }

  log(`Generating tests for component: ${componentName}`);

  const componentDir = path.join(ROOT, 'packages', 'components', componentName);
  const testsDir = path.join(componentDir, 'tests');
  const unitDir = path.join(testsDir, 'unit');

  try {
    // Ensure directories exist
    if (!fs.existsSync(componentDir)) {
      error(`Component directory not found: ${componentDir}`);
      process.exit(1);
    }

    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    if (!fs.existsSync(unitDir)) {
      fs.mkdirSync(unitDir, { recursive: true });
    }

    // Generate test files
    const builderTest = generateBuilderTest(componentName);
    const componentTest = generateComponentTest(componentName);
    const complianceTest = generateComplianceTest(componentName);
    const observabilityTest = generateObservabilityTest(componentName);

    // Write test files
    fs.writeFileSync(path.join(unitDir, 'builder.test.ts'), builderTest);
    log(`Created: ${path.join(unitDir, 'builder.test.ts')}`);

    fs.writeFileSync(path.join(unitDir, 'component.test.ts'), componentTest);
    log(`Created: ${path.join(unitDir, 'component.test.ts')}`);

    fs.writeFileSync(path.join(testsDir, 'compliance.test.ts'), complianceTest);
    log(`Created: ${path.join(testsDir, 'compliance.test.ts')}`);

    fs.writeFileSync(path.join(testsDir, 'observability.test.ts'), observabilityTest);
    log(`Created: ${path.join(testsDir, 'observability.test.ts')}`);

    log(`✅ Successfully generated tests for ${componentName}`);

  } catch (err) {
    error('Test generation failed:', err.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
