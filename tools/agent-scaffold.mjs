#!/usr/bin/env node

/**
 * Agent Scaffold - KB-driven component scaffolding
 * 
 * Creates component package structure with audit plan and observability stubs
 * following the Platform KB pack selection and compliance requirements.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function log(...args) {
  console.log('[agent-scaffold]', ...args);
}

function error(...args) {
  console.error('[agent-scaffold] ERROR:', ...args);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsed[key] = value;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }

  return parsed;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`);
  }
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  ensureDir(dir);

  if (fs.existsSync(filePath)) {
    log(`File already exists, skipping: ${filePath}`);
    return false;
  }

  fs.writeFileSync(filePath, content);
  log(`Created file: ${filePath}`);
  return true;
}

function generateComponentPlan(componentName, serviceType, framework, packs, extraControls = []) {
  const timestamp = new Date().toISOString();

  return {
    component: componentName,
    service_type: serviceType,
    framework,
    timestamp,
    version: "1.0.0",
    packs: packs || [],
    nist_controls: [
      // Common controls for all components
      "AC-2", "AC-3", "AC-4", "AC-6", "AC-17", "AC-18",
      "AU-2", "AU-3", "AU-6", "AU-8", "AU-12",
      "CA-2", "CA-7",
      "CM-2", "CM-3", "CM-6", "CM-8",
      "CP-9", "CP-10",
      "IA-2", "IA-4", "IA-5",
      "IR-4", "IR-5", "IR-6",
      "MA-2", "MA-4", "MA-5",
      "PE-3", "PE-6", "PE-8", "PE-13", "PE-16",
      "PL-8",
      "PS-3", "PS-4", "PS-5",
      "RA-2", "RA-5",
      "SA-4", "SA-8", "SA-9", "SA-11", "SA-17", "SA-18", "SA-19", "SA-20", "SA-21", "SA-22",
      "SC-1", "SC-5", "SC-7", "SC-8", "SC-12", "SC-13", "SC-15", "SC-28", "SC-39", "SC-43",
      "SI-2", "SI-3", "SI-4", "SI-7", "SI-12"
    ].concat(extraControls),
    rules: [],
    capabilities: {
      encryption: true,
      logging: true,
      monitoring: true,
      backup: false,
      high_availability: false,
      auto_scaling: false
    },
    environment_assumptions: [
      "AWS environment with appropriate IAM permissions",
      "CDK bootstrap completed",
      "Compliance framework requirements met"
    ],
    security_features: [
      "Encryption at rest and in transit",
      "Access logging enabled",
      "CloudTrail integration",
      "Tag-based resource management"
    ],
    gaps: []
  };
}

function generatePackageJson(componentName, serviceType) {
  return {
    name: `@cdk-lib/${componentName}`,
    version: "0.1.0",
    description: `CDK L3 component for ${serviceType}`,
    main: "dist/index.js",
    types: "dist/index.d.ts",
    scripts: {
      build: "tsc",
      test: "jest",
      "test:watch": "jest --watch",
      lint: "eslint src/**/*.ts",
      "lint:fix": "eslint src/**/*.ts --fix"
    },
    keywords: ["aws", "cdk", "infrastructure", "component"],
    dependencies: {
      "aws-cdk-lib": "^2.100.0",
      "constructs": "^10.0.0"
    },
    devDependencies: {
      "@types/node": "^20.0.0",
      "typescript": "^5.0.0",
      "jest": "^29.0.0",
      "ts-jest": "^29.0.0",
      "@types/jest": "^29.0.0",
      "eslint": "^8.0.0",
      "@typescript-eslint/eslint-plugin": "^6.0.0",
      "@typescript-eslint/parser": "^6.0.0"
    },
    peerDependencies: {
      "aws-cdk-lib": "^2.100.0",
      "constructs": "^10.0.0"
    }
  };
}

function generateTsConfig() {
  return {
    extends: "../../../tsconfig.base.json",
    compilerOptions: {
      outDir: "dist",
      rootDir: "src",
      declaration: true,
      declarationMap: true,
      sourceMap: true
    },
    include: ["src/**/*"],
    exclude: ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"]
  };
}

function generateJestConfig() {
  return {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src", "<rootDir>/tests"],
    testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
    transform: {
      "^.+\\.ts$": "ts-jest"
    },
    collectCoverageFrom: [
      "src/**/*.ts",
      "!src/**/*.d.ts",
      "!src/**/*.test.ts",
      "!src/**/*.spec.ts"
    ]
  };
}

function generateReadme(componentName, serviceType, framework) {
  return `# ${componentName}

CDK L3 component for ${serviceType} with ${framework} compliance.

## Features

- Production-ready CDK L3 component
- ${framework.toUpperCase()} compliance by construction
- Comprehensive observability integration
- Automated testing and validation
- Security best practices built-in

## Usage

\`\`\`typescript
import { ${componentName} } from '@cdk-lib/${componentName}';

const component = new ${componentName}(scope, 'My${componentName}', {
  // Configuration options
});
\`\`\`

## Compliance

This component enforces the following compliance requirements:

- **Framework**: ${framework.toUpperCase()}
- **NIST Controls**: See \`audit/component.plan.json\`
- **Security Features**: Encryption, logging, monitoring
- **Observability**: CloudWatch alarms and dashboards

## Development

\`\`\`bash
npm install
npm run build
npm test
\`\`\`

## Architecture

- **Component**: Main CDK construct
- **Builder**: Configuration builder with 5-layer precedence
- **Creator**: Component factory with validation
- **Tests**: Unit, integration, and compliance tests
- **Observability**: Alarms, dashboards, and metrics
`;
}

function generateObservabilityStub(componentName) {
  const alarmsConfig = {
    alarms: [
      {
        name: `${componentName}-health-check`,
        description: "Component health check alarm",
        metric: "health_check",
        threshold: 1,
        comparison: "LessThanThreshold",
        period: 300,
        evaluation_periods: 2
      }
    ]
  };

  const dashboardTemplate = {
    dashboard: {
      name: `${componentName}-dashboard`,
      widgets: [
        {
          type: "metric",
          properties: {
            metrics: [
              ["AWS/CloudWatch", "HealthCheck", "Component", componentName]
            ],
            period: 300,
            stat: "Average",
            region: "us-east-1",
            title: `${componentName} Health`
          }
        }
      ]
    }
  };

  return { alarmsConfig, dashboardTemplate };
}

function main() {
  const args = parseArgs();

  if (!args.component || !args['service-type'] || !args.framework) {
    error('Missing required arguments: --component, --service-type, --framework');
    process.exit(1);
  }

  const componentName = args.component;
  const serviceType = args['service-type'];
  const framework = args.framework;
  const packsFile = args.packs;
  const extraControls = (args.controls || '').split(',').filter(Boolean);

  log(`Scaffolding component: ${componentName}`);
  log(`Service type: ${serviceType}`);
  log(`Framework: ${framework}`);
  log(`Extra controls: ${extraControls.join(', ')}`);

  // Load packs if provided
  let packs = [];
  if (packsFile && fs.existsSync(packsFile)) {
    try {
      const packsData = JSON.parse(fs.readFileSync(packsFile, 'utf8'));
      packs = (packsData.chosen || []).map(p => p.meta?.id || p.id).filter(Boolean);
      log(`Loaded packs: ${packs.join(', ')}`);
    } catch (err) {
      error(`Failed to load packs from ${packsFile}:`, err.message);
    }
  }

  const componentDir = path.join(ROOT, 'packages', 'components', componentName);

  try {
    // Create directory structure
    ensureDir(componentDir);
    ensureDir(path.join(componentDir, 'src'));
    ensureDir(path.join(componentDir, 'tests'));
    ensureDir(path.join(componentDir, 'audit'));
    ensureDir(path.join(componentDir, 'audit', 'rego'));
    ensureDir(path.join(componentDir, 'observability'));

    // Generate component plan
    const componentPlan = generateComponentPlan(componentName, serviceType, framework, packs, extraControls);
    writeFile(
      path.join(componentDir, 'audit', 'component.plan.json'),
      JSON.stringify(componentPlan, null, 2)
    );

    // Generate package.json
    writeFile(
      path.join(componentDir, 'package.json'),
      JSON.stringify(generatePackageJson(componentName, serviceType), null, 2)
    );

    // Generate tsconfig.json
    writeFile(
      path.join(componentDir, 'tsconfig.json'),
      JSON.stringify(generateTsConfig(), null, 2)
    );

    // Generate jest.config.js
    writeFile(
      path.join(componentDir, 'jest.config.js'),
      `module.exports = ${JSON.stringify(generateJestConfig(), null, 2)};`
    );

    // Generate README.md
    writeFile(
      path.join(componentDir, 'README.md'),
      generateReadme(componentName, serviceType, framework)
    );

    // Generate observability stubs
    const { alarmsConfig, dashboardTemplate } = generateObservabilityStub(componentName);
    writeFile(
      path.join(componentDir, 'observability', 'alarms-config.json'),
      JSON.stringify(alarmsConfig, null, 2)
    );
    writeFile(
      path.join(componentDir, 'observability', 'otel-dashboard-template.json'),
      JSON.stringify(dashboardTemplate, null, 2)
    );

    // Generate OSCAL stub
    const oscalStub = {
      "oscal-version": "1.0.4",
      "system-security-plan": {
        "uuid": `component-${componentName}-${Date.now()}`,
        "metadata": {
          "title": `${componentName} Component Security Plan`,
          "last-modified": new Date().toISOString(),
          "version": "1.0.0"
        },
        "import-profile": {
          "href": "https://raw.githubusercontent.com/usnistgov/OSCAL/main/content/nist.gov/SP800-53/rev5/xml/NIST_SP-800-53_rev5_HIGH-baseline_profile.xml"
        },
        "system-characteristics": {
          "system-name": componentName,
          "system-name-short": componentName,
          "description": `CDK L3 component for ${serviceType} with ${framework} compliance`
        }
      }
    };

    writeFile(
      path.join(componentDir, 'audit', `${componentName}.oscal.json`),
      JSON.stringify(oscalStub, null, 2)
    );

    log(`✅ Successfully scaffolded component: ${componentName}`);
    log(`📁 Component directory: ${componentDir}`);
    log(`📋 Component plan: ${path.join(componentDir, 'audit', 'component.plan.json')}`);

  } catch (err) {
    error('Scaffolding failed:', err.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
