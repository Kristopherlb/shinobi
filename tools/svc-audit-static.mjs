#!/usr/bin/env node

/**
 * Static compliance audit tool
 * 
 * This tool runs static analysis on generated components to ensure compliance
 * with platform standards and external frameworks.
 */

import fs from 'node:fs';
import path from 'node:path';

const COMPONENTS_DIR = 'packages/components';

/**
 * Main audit function
 */
async function runStaticAudit() {
  console.log('🔍 Running static compliance audit...\n');

  const components = findComponents();
  let totalIssues = 0;

  for (const component of components) {
    console.log(`📦 Auditing component: ${component}`);
    const issues = await auditComponent(component);
    totalIssues += issues;

    if (issues > 0) {
      console.log(`   ⚠️  Found ${issues} compliance issues\n`);
    } else {
      console.log(`   ✅ Component passes static compliance checks\n`);
    }
  }

  console.log(`\n📊 Audit Summary:`);
  console.log(`   Components audited: ${components.length}`);
  console.log(`   Total issues found: ${totalIssues}`);

  if (totalIssues > 0) {
    console.log(`\n❌ Compliance audit failed`);
    process.exit(1);
  } else {
    console.log(`\n✅ All components pass static compliance checks`);
  }
}

/**
 * Find all component directories
 */
function findComponents() {
  if (!fs.existsSync(COMPONENTS_DIR)) {
    console.log('No components directory found');
    return [];
  }

  return fs.readdirSync(COMPONENTS_DIR)
    .filter(item => {
      const itemPath = path.join(COMPONENTS_DIR, item);
      return fs.statSync(itemPath).isDirectory() &&
        !item.startsWith('_') &&
        !item.startsWith('.');
    });
}

/**
 * Audit a single component
 */
async function auditComponent(componentName) {
  const componentPath = path.join(COMPONENTS_DIR, componentName);
  let issues = 0;

  // Check for required files
  const requiredFiles = [
    `${componentName}.component.ts`,
    `${componentName}.builder.ts`,
    `${componentName}.creator.ts`,
    'index.ts',
    'package.json',
    'README.md'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(componentPath, file);
    if (!fs.existsSync(filePath)) {
      console.log(`   ❌ Missing required file: ${file}`);
      issues++;
    }
  }

  // Check for audit directory and compliance plan
  const auditDir = path.join(componentPath, 'audit');
  if (!fs.existsSync(auditDir)) {
    console.log(`   ❌ Missing audit directory`);
    issues++;
  } else {
    const planFile = path.join(auditDir, 'component.plan.json');
    if (!fs.existsSync(planFile)) {
      console.log(`   ❌ Missing compliance plan: audit/component.plan.json`);
      issues++;
    } else {
      // Validate compliance plan structure
      try {
        const planContent = JSON.parse(fs.readFileSync(planFile, 'utf8'));
        const requiredPlanFields = ['component', 'service_type', 'framework', 'packs', 'rules', 'nist_controls'];

        for (const field of requiredPlanFields) {
          if (!planContent[field]) {
            console.log(`   ❌ Compliance plan missing field: ${field}`);
            issues++;
          }
        }

        // Check if extra control tags are included
        if (planContent.nist_controls && planContent.nist_controls.length > 0) {
          console.log(`   📋 NIST controls: ${planContent.nist_controls.join(', ')}`);
        }

      } catch (error) {
        console.log(`   ❌ Invalid JSON in compliance plan: ${error.message}`);
        issues++;
      }
    }
  }

  // Check for observability directory
  const observabilityDir = path.join(componentPath, 'observability');
  if (!fs.existsSync(observabilityDir)) {
    console.log(`   ⚠️  Missing observability directory (optional)`);
  }

  // Check for tests directory
  const testsDir = path.join(componentPath, 'tests');
  if (!fs.existsSync(testsDir)) {
    console.log(`   ⚠️  Missing tests directory`);
  }

  // Validate component implements required patterns
  const componentFile = path.join(componentPath, `${componentName}.component.ts`);
  if (fs.existsSync(componentFile)) {
    const componentContent = fs.readFileSync(componentFile, 'utf8');

    // Check for required patterns
    const requiredPatterns = [
      { pattern: 'extends BaseComponent', name: 'BaseComponent inheritance' },
      { pattern: 'synth()', name: 'synth() method' },
      { pattern: 'applyComplianceTags', name: 'compliance tagging' },
      { pattern: '_registerConstruct', name: 'construct registration' },
      { pattern: '_registerCapability', name: 'capability registration' }
    ];

    for (const { pattern, name } of requiredPatterns) {
      if (!componentContent.includes(pattern)) {
        console.log(`   ❌ Component missing ${name}`);
        issues++;
      }
    }
  }

  // Validate builder implements required patterns
  const builderFile = path.join(componentPath, `${componentName}.builder.ts`);
  if (fs.existsSync(builderFile)) {
    const builderContent = fs.readFileSync(builderFile, 'utf8');

    const requiredBuilderPatterns = [
      { pattern: 'extends ConfigBuilder', name: 'ConfigBuilder inheritance' },
      { pattern: 'getHardcodedFallbacks', name: 'hardcoded fallbacks' },
      { pattern: 'getComplianceFrameworkDefaults', name: 'framework defaults' }
    ];

    for (const { pattern, name } of requiredBuilderPatterns) {
      if (!builderContent.includes(pattern)) {
        console.log(`   ❌ Builder missing ${name}`);
        issues++;
      }
    }
  }

  return issues;
}

// Run the audit
runStaticAudit().catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});
