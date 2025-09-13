package dagger_engine_pool.compliance

import rego.v1

# Default deny policy
default allow := false

# Allow if all compliance checks pass
allow if {
  encryption_at_rest_enabled
  encryption_in_transit_enabled
  network_boundary_protection
  logging_enabled
  access_controls_valid
  fips_compliance
}

# SC-13: Cryptographic Protection - Ensure all data at rest is encrypted
encryption_at_rest_enabled if {
  # S3 bucket encryption
  some bucket in input.resources
  bucket.type == "AWS::S3::Bucket"
  bucket.properties.BucketEncryption.ServerSideEncryptionConfiguration[_].ServerSideEncryptionByDefault.SSEAlgorithm == "aws:kms"
}

encryption_at_rest_enabled if {
  # EBS volume encryption
  some volume in input.resources
  volume.type == "AWS::EC2::Volume"
  volume.properties.Encrypted == true
}

encryption_at_rest_enabled if {
  # EFS encryption
  some filesystem in input.resources
  filesystem.type == "AWS::EFS::FileSystem"
  filesystem.properties.Encrypted == true
}

# SC-7: Boundary Protection - Ensure network access controls
network_boundary_protection if {
  # Network Load Balancer is internal
  some nlb in input.resources
  nlb.type == "AWS::ElasticLoadBalancingV2::LoadBalancer"
  nlb.properties.Scheme == "internal"
}

network_boundary_protection if {
  # Security groups restrict access
  some sg in input.resources
  sg.type == "AWS::EC2::SecurityGroup"
  sg.properties.SecurityGroupIngress[_].IpProtocol == "tcp"
  sg.properties.SecurityGroupIngress[_].FromPort == 8443
  sg.properties.SecurityGroupIngress[_].ToPort == 8443
}

# Encryption in transit via mTLS
encryption_in_transit_enabled if {
  # Load balancer listener on secure port
  some listener in input.resources
  listener.type == "AWS::ElasticLoadBalancingV2::Listener"
  listener.properties.Port == 8443
  listener.properties.Protocol == "TLS"
}

# AU-2: Audit Events - Ensure logging is enabled
logging_enabled if {
  # CloudWatch Log Group exists
  some log_group in input.resources
  log_group.type == "AWS::Logs::LogGroup"
  log_group.properties.LogGroupName == "/aws/dagger-engine"
}

logging_enabled if {
  # S3 access logging enabled (if applicable)
  some bucket in input.resources
  bucket.type == "AWS::S3::Bucket"
  bucket.properties.LoggingConfiguration
}

# AC-2: Account Management - Ensure proper access controls
access_controls_valid if {
  # IAM roles follow least privilege
  some role in input.resources
  role.type == "AWS::IAM::Role"
  not contains(role.properties.AssumeRolePolicyDocument.Statement[_].Action[_], "*")
}

access_controls_valid if {
  # KMS key policies are restrictive
  some key in input.resources
  key.type == "AWS::KMS::Key"
  key.properties.KeyPolicy.Statement[_].Effect == "Allow"
  key.properties.KeyPolicy.Statement[_].Principal.AWS != "*"
}

# FIPS compliance for FedRAMP frameworks
fips_compliance if {
  # FIPS mode is enabled in configuration
  input.config.fipsMode == true
}

fips_compliance if {
  # STIG baseline is specified for FedRAMP
  input.config.stigBaseline in ["RHEL8", "UBI9", "UBUNTU-20"]
}

# CM-6: Configuration Settings - Ensure secure defaults
secure_configuration if {
  # Public exposure is forbidden
  input.config.endpoint.nlbInternal == true
}

secure_configuration if {
  # KMS encryption is required
  input.config.compliance.forbidNoKms == true
}

# Violation detection
violations contains violation if {
  violation := {
    "rule": "encryption_at_rest_required",
    "message": "S3 bucket must have KMS encryption enabled",
    "severity": "high",
    "nist_control": "SC-13"
  }
  not encryption_at_rest_enabled
}

violations contains violation if {
  violation := {
    "rule": "network_boundary_protection_required", 
    "message": "Network Load Balancer must be internal",
    "severity": "high",
    "nist_control": "SC-7"
  }
  not network_boundary_protection
}

violations contains violation if {
  violation := {
    "rule": "logging_required",
    "message": "CloudWatch logging must be enabled",
    "severity": "medium", 
    "nist_control": "AU-2"
  }
  not logging_enabled
}

violations contains violation if {
  violation := {
    "rule": "fips_compliance_required",
    "message": "FIPS mode must be enabled for FedRAMP compliance",
    "severity": "high",
    "nist_control": "SC-13"
  }
  input.context.complianceFramework in ["fedramp-moderate", "fedramp-high"]
  not fips_compliance
}
