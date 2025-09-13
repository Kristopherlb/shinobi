package platform.lambda_api.fedramp

# FedRAMP Compliance Policies for Lambda API Component
# Implements FedRAMP Moderate and High control requirements

# REVIEW: Ensure FedRAMP Moderate compliance requirements are met
allow_fedramp_moderate_compliance {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.Tags["compliance:framework"] == "fedramp-moderate"
    
    # VPC deployment required
    resource.properties.VpcConfig != null
    
    # Enhanced logging with 3-month retention
    some log_group
    log_group.type == "AWS::Logs::LogGroup"
    log_group.properties.RetentionInDays >= 90
    
    # X-Ray tracing enabled
    resource.properties.TracingConfig.Mode == "Active"
    
    # Security monitoring enabled
    resource.properties.Environment.Variables["FALCO_ENABLED"] == "true"
}

# REVIEW: Ensure FedRAMP High compliance requirements are met
allow_fedramp_high_compliance {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.Tags["compliance:framework"] == "fedramp-high"
    
    # VPC deployment required
    resource.properties.VpcConfig != null
    
    # Extended logging with 1-year audit retention
    some audit_log_group
    audit_log_group.type == "AWS::Logs::LogGroup"
    audit_log_group.properties.LogGroupName =~ "/audit$"
    audit_log_group.properties.RetentionInDays >= 365
    
    # Customer-managed KMS encryption
    resource.properties.Environment.EncryptionConfig.KmsKeyId != null
    
    # STIG compliance configuration
    resource.properties.Environment.Variables["STIG_COMPLIANCE"] == "true"
    resource.properties.Environment.Variables["SECURITY_LEVEL"] == "high"
    
    # Enhanced security monitoring
    resource.properties.Environment.Variables["FALCO_ENABLED"] == "true"
}

# REVIEW: Ensure proper data classification tagging (AC-2, Account Management)
allow_data_classification_tagging {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.Tags["data-classification"] in ["CUI", "PII", "Public"]
    # TODO: Add condition to verify data classification is appropriate for the function
}

# REVIEW: Ensure proper access control enforcement (AC-3, Access Enforcement)
allow_access_control_enforcement {
    some resource
    resource.type == "AWS::IAM::Role"
    resource.properties.AssumeRolePolicyDocument.Statement[].Effect == "Allow"
    resource.properties.AssumeRolePolicyDocument.Statement[].Principal.Service == "lambda.amazonaws.com"
    # TODO: Add condition to verify IAM policies enforce least privilege
}

# REVIEW: Ensure audit events are properly configured (AU-2, Audit Events)
allow_audit_events {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.Tags["compliance:framework"] in ["fedramp-moderate", "fedramp-high"]
    
    # CloudTrail logging enabled (implicit for Lambda)
    # CloudWatch logging enabled
    some log_group
    log_group.type == "AWS::Logs::LogGroup"
    log_group.properties.LogGroupName =~ "/aws/lambda/.*"
}

# REVIEW: Ensure boundary protection is implemented (SC-7, Boundary Protection)
allow_boundary_protection {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.Tags["compliance:framework"] in ["fedramp-moderate", "fedramp-high"]
    
    # VPC deployment required for FedRAMP
    resource.properties.VpcConfig != null
    
    # Security groups configured
    count(resource.properties.VpcConfig.SecurityGroupIds) > 0
    count(resource.properties.VpcConfig.SubnetIds) > 0
}

# REVIEW: Ensure cryptographic protection is implemented (SC-13, Cryptographic Protection)
allow_cryptographic_protection {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.Tags["compliance:framework"] in ["fedramp-moderate", "fedramp-high"]
    
    # Environment variable encryption
    resource.properties.Environment.EncryptionConfig != null
    
    # For FedRAMP High, customer-managed KMS key required
    resource.properties.Tags["compliance:framework"] == "fedramp-high"
    resource.properties.Environment.EncryptionConfig.KmsKeyId != null
}

# REVIEW: Ensure proper resource tagging for compliance tracking (AU-6, Audit Review)
allow_compliance_tagging {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.Tags["compliance:framework"] != null
    resource.properties.Tags["data-classification"] != null
    resource.properties.Tags["owner"] != null
    resource.properties.Tags["environment"] != null
    # TODO: Add condition to verify all required compliance tags are present
}
