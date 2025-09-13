#!/usr/bin/env node

/**
 * Generate REGO Policies from Plan
 * 
 * Creates REGO policies based on component plan compliance requirements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function log(...args) {
  console.log('[gen-rego]', ...args);
}

function error(...args) {
  console.error('[gen-rego] ERROR:', ...args);
}

function generateRegoPolicy(componentName, framework) {
  return `package ${componentName.replace(/-/g, '_')}

# ${componentName} Component Compliance Policy
# Framework: ${framework}
# Generated from component plan

import rego.v1

# Default deny policy
default allow := false

# Allow if all compliance checks pass
allow if {
  encryption_enabled
  logging_enabled
  monitoring_enabled
  tags_applied
  access_controls_valid
}

# Encryption checks
encryption_enabled if {
  input.encryption == true
  input.encryption_at_rest == true
  input.encryption_in_transit == true
}

# Logging checks
logging_enabled if {
  input.logging == true
  input.access_logging == true
  input.audit_logging == true
}

# Monitoring checks
monitoring_enabled if {
  input.monitoring == true
  input.alarms_configured == true
  input.metrics_enabled == true
}

# Tag compliance checks
tags_applied if {
  input.tags["compliance:framework"] == "${framework}"
  input.tags["platform:component"] == "${componentName}"
  input.tags["platform:service-type"] == input.service_type
  input.tags["compliance:nist-controls"] != ""
}

# Access control validation
access_controls_valid if {
  input.access_control == "private"
  input.public_access == false
}

# Framework-specific checks
${framework === 'fedramp-high' ? `
# FedRAMP High specific requirements
fedramp_high_compliant if {
  input.encryption == true
  input.logging == true
  input.monitoring == true
  input.backup_enabled == true
  input.disaster_recovery == true
  input.continuous_monitoring == true
}
` : ''}

${framework === 'fedramp-moderate' ? `
# FedRAMP Moderate specific requirements
fedramp_moderate_compliant if {
  input.encryption == true
  input.logging == true
  input.monitoring == true
  input.backup_enabled == true
}
` : ''}

# NIST Control enforcement
nist_controls_enforced if {
  # AC-2: Account Management
  input.account_management == true
  
  # AC-3: Access Enforcement
  input.access_enforcement == true
  
  # AC-4: Information Flow Enforcement
  input.information_flow_control == true
  
  # AC-6: Least Privilege
  input.least_privilege == true
  
  # AU-2: Audit Events
  input.audit_events == true
  
  # AU-3: Content of Audit Records
  input.audit_record_content == true
  
  # AU-6: Audit Review, Analysis, and Reporting
  input.audit_review == true
  
  # AU-8: Time Stamps
  input.timestamp_synchronization == true
  
  # AU-12: Audit Generation
  input.audit_generation == true
  
  # SC-7: Boundary Protection
  input.boundary_protection == true
  
  # SC-8: Transmission Confidentiality and Integrity
  input.transmission_confidentiality == true
  
  # SC-12: Cryptographic Key Establishment and Management
  input.cryptographic_key_management == true
  
  # SC-13: Cryptographic Protection
  input.cryptographic_protection == true
  
  # SC-28: Protection of Information at Rest
  input.information_at_rest_protection == true
}

# Violation detection
violation["encryption_disabled"] if {
  not encryption_enabled
}

violation["logging_disabled"] if {
  not logging_enabled
}

violation["monitoring_disabled"] if {
  not monitoring_enabled
}

violation["tags_missing"] if {
  not tags_applied
}

violation["access_controls_invalid"] if {
  not access_controls_valid
}

violation["nist_controls_not_enforced"] if {
  not nist_controls_enforced
}

# Compliance score calculation
compliance_score := {
  "total_checks": 6,
  "passed_checks": count([true | 
    encryption_enabled,
    logging_enabled,
    monitoring_enabled,
    tags_applied,
    access_controls_valid,
    nist_controls_enforced
  ]),
  "compliance_percentage": round((count([true | 
    encryption_enabled,
    logging_enabled,
    monitoring_enabled,
    tags_applied,
    access_controls_valid,
    nist_controls_enforced
  ]) / 6) * 100)
}
`;
}

function generateRegoTest(componentName) {
  return `package ${componentName.replace(/-/g, '_')}_test

import rego.v1

# Test cases for ${componentName} compliance policy

test_compliant_component if {
  input := {
    "encryption": true,
    "encryption_at_rest": true,
    "encryption_in_transit": true,
    "logging": true,
    "access_logging": true,
    "audit_logging": true,
    "monitoring": true,
    "alarms_configured": true,
    "metrics_enabled": true,
    "tags": {
      "compliance:framework": "fedramp-moderate",
      "platform:component": "${componentName}",
      "platform:service-type": "test-service",
      "compliance:nist-controls": "AC-2,AC-3,AC-4,AU-2,SC-7,SC-28"
    },
    "access_control": "private",
    "public_access": false,
    "service_type": "test-service",
    "account_management": true,
    "access_enforcement": true,
    "information_flow_control": true,
    "least_privilege": true,
    "audit_events": true,
    "audit_record_content": true,
    "audit_review": true,
    "timestamp_synchronization": true,
    "audit_generation": true,
    "boundary_protection": true,
    "transmission_confidentiality": true,
    "cryptographic_key_management": true,
    "cryptographic_protection": true,
    "information_at_rest_protection": true
  }
  
  allow with input as input
}

test_non_compliant_encryption if {
  input := {
    "encryption": false,
    "logging": true,
    "monitoring": true,
    "tags": {
      "compliance:framework": "fedramp-moderate",
      "platform:component": "${componentName}"
    },
    "access_control": "private",
    "public_access": false
  }
  
  not allow with input as input
  violation["encryption_disabled"] with input as input
}

test_non_compliant_logging if {
  input := {
    "encryption": true,
    "logging": false,
    "monitoring": true,
    "tags": {
      "compliance:framework": "fedramp-moderate",
      "platform:component": "${componentName}"
    },
    "access_control": "private",
    "public_access": false
  }
  
  not allow with input as input
  violation["logging_disabled"] with input as input
}

test_non_compliant_tags if {
  input := {
    "encryption": true,
    "logging": true,
    "monitoring": true,
    "tags": {
      "compliance:framework": "wrong-framework",
      "platform:component": "wrong-component"
    },
    "access_control": "private",
    "public_access": false
  }
  
  not allow with input as input
  violation["tags_missing"] with input as input
}

test_compliance_score_calculation if {
  input := {
    "encryption": true,
    "encryption_at_rest": true,
    "encryption_in_transit": true,
    "logging": true,
    "access_logging": true,
    "audit_logging": true,
    "monitoring": true,
    "alarms_configured": true,
    "metrics_enabled": true,
    "tags": {
      "compliance:framework": "fedramp-moderate",
      "platform:component": "${componentName}",
      "platform:service-type": "test-service",
      "compliance:nist-controls": "AC-2,AC-3,AC-4,AU-2,SC-7,SC-28"
    },
    "access_control": "private",
    "public_access": false,
    "service_type": "test-service",
    "account_management": true,
    "access_enforcement": true,
    "information_flow_control": true,
    "least_privilege": true,
    "audit_events": true,
    "audit_record_content": true,
    "audit_review": true,
    "timestamp_synchronization": true,
    "audit_generation": true,
    "boundary_protection": true,
    "transmission_confidentiality": true,
    "cryptographic_key_management": true,
    "cryptographic_protection": true,
    "information_at_rest_protection": true
  }
  
  compliance_score == {
    "total_checks": 6,
    "passed_checks": 6,
    "compliance_percentage": 100
  } with input as input
}
`;
}

function main() {
  const componentName = process.argv[2];

  if (!componentName) {
    error('Usage: node gen-rego-from-plan.mjs <componentName>');
    process.exit(1);
  }

  log(`Generating REGO policies for component: ${componentName}`);

  const componentDir = path.join(ROOT, 'packages', 'components', componentName);
  const auditDir = path.join(componentDir, 'audit');
  const regoDir = path.join(auditDir, 'rego');

  try {
    // Check if component plan exists
    const planPath = path.join(auditDir, 'component.plan.json');
    if (!fs.existsSync(planPath)) {
      error(`Component plan not found: ${planPath}`);
      process.exit(1);
    }

    // Load component plan to get framework
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    const framework = plan.framework || 'commercial';

    // Ensure rego directory exists
    if (!fs.existsSync(regoDir)) {
      fs.mkdirSync(regoDir, { recursive: true });
    }

    // Generate REGO policy and test files
    const regoPolicy = generateRegoPolicy(componentName, framework);
    const regoTest = generateRegoTest(componentName);

    // Write REGO files
    fs.writeFileSync(path.join(regoDir, `${componentName}.rego`), regoPolicy);
    log(`Created: ${path.join(regoDir, `${componentName}.rego`)}`);

    fs.writeFileSync(path.join(regoDir, `${componentName}_test.rego`), regoTest);
    log(`Created: ${path.join(regoDir, `${componentName}_test.rego`)}`);

    log(`✅ Successfully generated REGO policies for ${componentName}`);
    log(`📋 Framework: ${framework}`);
    log(`📁 REGO directory: ${regoDir}`);

  } catch (err) {
    error('REGO generation failed:', err.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
