#!/usr/bin/env node

/**
 * Shinobi Component Generator CLI
 * 
 * CLI wrapper for the Shinobi MCP agent to generate components from CI
 */

import fs from 'node:fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];

  if (key === 'packsToInclude' || key === 'extraControlTags') {
    params[key] = value ? value.split(',') : [];
  } else {
    params[key] = value;
  }
}

// Default values
const config = {
  componentName: params.componentName || 's3-bucket',
  serviceType: params.serviceType || 's3-bucket',
  framework: params.framework || 'fedramp-moderate',
  packsToInclude: params.packsToInclude || [],
  extraControlTags: params.extraControlTags || [],
  includeTests: params.includeTests !== 'false',
  includeObservability: params.includeObservability !== 'false',
  includePolicies: params.includePolicies !== 'false'
};

console.log('🚀 Shinobi Component Generator');
console.log('==============================');
console.log(`Component: ${config.componentName}`);
console.log(`Service Type: ${config.serviceType}`);
console.log(`Framework: ${config.framework}`);
console.log(`Packs: ${config.packsToInclude.join(', ') || 'auto-selected'}`);
console.log(`Extra Controls: ${config.extraControlTags.join(', ') || 'none'}`);
console.log('');

// For CI usage, this would invoke the MCP agent
// For now, we'll create a placeholder that shows what would be generated
console.log('📋 Component Generation Plan:');
console.log('');

const componentDir = path.join('packages', 'components', config.componentName);
console.log(`📁 Directory: ${componentDir}/`);

console.log('\n📄 Files to be generated:');
console.log('├── src/');
console.log(`│   ├── ${config.componentName}.component.ts`);
console.log(`│   ├── ${config.componentName}.builder.ts`);
console.log(`│   ├── ${config.componentName}.creator.ts`);
console.log('│   └── index.ts');
console.log('├── tests/');
console.log('│   ├── unit/');
console.log('│   │   ├── builder.test.ts');
console.log('│   │   └── component.test.ts');
console.log('│   ├── compliance.test.ts');
console.log('│   └── observability.test.ts');
console.log('├── audit/');
console.log('│   ├── component.plan.json');
console.log(`│   ├── ${config.componentName}.oscal.json`);
console.log('│   └── rego/');
console.log('│       └── *.rego');
console.log('├── observability/');
console.log('│   ├── alarms-config.json');
console.log('│   └── otel-dashboard-template.json');
console.log('├── package.json');
console.log('└── README.md');

console.log('\n🎯 Compliance Features:');
console.log(`✅ Framework: ${config.framework}`);
console.log(`✅ NIST Controls: ${config.extraControlTags.length > 0 ? config.extraControlTags.join(', ') : 'auto-detected'}`);
console.log(`✅ 6-step synth() pattern`);
console.log(`✅ ConfigBuilder with 5-layer precedence`);
console.log(`✅ Compliance tagging with applyComplianceTags()`);
console.log(`✅ REGO policies for posture rules`);
console.log(`✅ Observability configs with ${config.framework} retention`);
console.log(`✅ Comprehensive test suite`);

console.log('\n📊 Estimated Artifacts:');
console.log(`• Component files: 4`);
console.log(`• Test files: ${config.includeTests ? '4' : '0'}`);
console.log(`• Compliance files: 2`);
console.log(`• REGO policies: ${config.includePolicies ? 'variable' : '0'}`);
console.log(`• Observability files: ${config.includeObservability ? '2' : '0'}`);
console.log(`• Documentation: 1`);

console.log('\n🔧 Next Steps:');
console.log('1. Run this via Cursor MCP: mcp_shinobi_generate_component');
console.log('2. Review generated files');
console.log('3. Run tests: npm test');
console.log('4. Validate compliance: tools/svc-audit-static.mjs');

// Create a summary file for CI
const summary = {
  componentName: config.componentName,
  serviceType: config.serviceType,
  framework: config.framework,
  packsToInclude: config.packsToInclude,
  extraControlTags: config.extraControlTags,
  estimatedFiles: {
    component: 4,
    tests: config.includeTests ? 4 : 0,
    compliance: 2,
    rego: config.includePolicies ? 'variable' : 0,
    observability: config.includeObservability ? 2 : 0,
    documentation: 1
  },
  complianceFeatures: [
    '6-step synth() pattern',
    'ConfigBuilder with 5-layer precedence',
    'Compliance tagging',
    'REGO policies',
    'Observability configs',
    'Comprehensive test suite'
  ]
};

fs.writeFileSync(
  path.join(componentDir, 'generation-summary.json'),
  JSON.stringify(summary, null, 2)
);

console.log(`\n💾 Generation summary saved to: ${componentDir}/generation-summary.json`);
