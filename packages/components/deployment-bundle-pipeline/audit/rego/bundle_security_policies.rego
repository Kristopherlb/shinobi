package platform.deployment_bundle_pipeline.compliance

# REVIEW: Ensure deployment bundle has valid signature (FedRAMP control SC-13).
allow {
  some resource
  resource.type == "deployment_bundle"
  resource.signature.verified == true
  resource.signature.algorithm in ["ECDSA", "RSA"]
  resource.signature.keyType in ["kms", "oidc"]
}

# REVIEW: Ensure deployment bundle has SLSA provenance attestation (FedRAMP control SA-11).
allow {
  some resource
  resource.type == "deployment_bundle"
  resource.attestations.slsa_provenance.present == true
  resource.attestations.slsa_provenance.verified == true
  resource.attestations.slsa_provenance.builder_id == "dagger-engine-pool"
}

# REVIEW: Ensure deployment bundle has SBOM attached (FedRAMP control SA-12).
allow {
  some resource
  resource.type == "deployment_bundle"
  resource.sbom.present == true
  resource.sbom.format in ["spdx-json", "cyclonedx-json"]
  resource.sbom.verified == true
}

# REVIEW: Ensure deployment bundle passes vulnerability scan (FedRAMP control SI-2).
allow {
  some resource
  resource.type == "deployment_bundle"
  resource.vulnerability_scan.passed == true
  resource.vulnerability_scan.critical_count == 0
  resource.vulnerability_scan.high_count <= 5
}

# REVIEW: Ensure deployment bundle has compliance report (FedRAMP control CA-2).
allow {
  some resource
  resource.type == "deployment_bundle"
  resource.compliance_report.present == true
  resource.compliance_report.framework in ["fedramp-moderate", "fedramp-high", "iso27001", "soc2"]
  resource.compliance_report.compliant == true
}

# REVIEW: Ensure deployment bundle uses immutable references (FedRAMP control CM-2).
allow {
  some resource
  resource.type == "deployment_bundle"
  resource.reference_type == "digest"
  resource.reference.starts_with("sha256:")
}

# REVIEW: Ensure deployment bundle has proper tagging (FedRAMP control CM-2).
allow {
  some resource
  resource.type == "deployment_bundle"
  resource.tags.owner != ""
  resource.tags.environment != ""
  resource.tags.compliance_framework != ""
  resource.tags.data_classification != ""
  resource.tags.service != ""
}

# REVIEW: Ensure deployment bundle has audit trail (FedRAMP control AU-2).
allow {
  some resource
  resource.type == "deployment_bundle"
  resource.audit_trail.present == true
  resource.audit_trail.build_timestamp != ""
  resource.audit_trail.git_commit != ""
  resource.audit_trail.builder_version != ""
}

# REVIEW: Ensure deployment bundle uses FIPS-validated cryptography (FedRAMP control SC-13).
allow {
  some resource
  resource.type == "deployment_bundle"
  resource.compliance_framework in ["fedramp-moderate", "fedramp-high"]
  resource.crypto.fips_validated == true
  resource.crypto.algorithm in ["AES-256", "SHA-256", "ECDSA-P256"]
}

# REVIEW: Ensure deployment bundle has proper retention policy (FedRAMP control CP-9).
allow {
  some resource
  resource.type == "deployment_bundle"
  resource.retention_policy.present == true
  resource.retention_policy.retention_period >= 7  # days
  resource.retention_policy.immutable == true
}

# REVIEW: Ensure deployment bundle has proper access controls (FedRAMP control AC-3).
allow {
  some resource
  resource.type == "deployment_bundle"
  resource.access_control.encrypted == true
  resource.access_control.least_privilege == true
  resource.access_control.audit_logging == true
}
