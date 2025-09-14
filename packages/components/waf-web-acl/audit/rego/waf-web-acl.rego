package waf_web_acl

# waf-web-acl Component Compliance Policy
# Framework: fedramp-moderate
# Generated from component plan with 3 packs and 2 controls

import rego.v1

# Default deny policy
default allow := false

# Allow if all compliance checks pass
allow if {
  encryption_enabled
  logging_enabled
  tags_applied
  access_controls_valid
}

# Rule-specific checks from component plan
encryption_enabled if {
  input.resource.type == "AWS::S3::Bucket"
  input.resource.properties.BucketEncryption
}

logging_enabled if {
  input.resource.type == "AWS::S3::Bucket"
  input.resource.properties.LoggingConfiguration
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
  input.tags["compliance:framework"] == "fedramp-moderate"
  input.tags["platform:component"] == "waf-web-acl"
  input.tags["platform:service-type"] == input.service_type
  input.tags["compliance:nist-controls"] != ""
}

# Access control validation
access_controls_valid if {
  input.access_control == "private"
  input.public_access == false
}

# Framework-specific checks



# FedRAMP Moderate specific requirements
fedramp_moderate_compliant if {
  input.encryption == true
  input.logging == true
  input.monitoring == true
  input.backup_enabled == true
}


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
