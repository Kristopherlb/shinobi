package waf_web_acl_test

import rego.v1

# Test cases for waf-web-acl compliance policy

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
      "platform:component": "waf-web-acl",
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
      "platform:component": "waf-web-acl"
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
      "platform:component": "waf-web-acl"
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
      "platform:component": "waf-web-acl",
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
