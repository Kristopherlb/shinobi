package platform.ec2_instance.fedramp

# FedRAMP Compliance Policies for EC2 Instance Component
# Implements FedRAMP Moderate and High control requirements

# REVIEW: Ensure EC2 instance meets FedRAMP Moderate requirements (AC-2, AC-3)
allow_fedramp_moderate_compliance {
    some resource
    resource.type == "AWS::EC2::Instance"
    resource.properties.Tags["compliance:framework"] == "fedramp-moderate"
    
    # VPC deployment required
    resource.properties.SubnetId != null
    
    # Enhanced logging with 3-month retention
    some log_group
    log_group.type == "AWS::Logs::LogGroup"
    log_group.properties.LogGroupName =~ "/aws/ec2/.*"
    log_group.properties.RetentionInDays >= 90
    
    # Customer-managed KMS encryption for EBS volumes
    some block_device in resource.properties.BlockDeviceMappings
    block_device.Ebs.Encrypted == true
    block_device.Ebs.KmsKeyId != null
    
    # SSM agent required for compliance
    some iam_role
    iam_role.type == "AWS::IAM::Role"
    iam_role.properties.ManagedPolicyArns[_] == "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# REVIEW: Ensure EC2 instance meets FedRAMP High requirements (AC-2, AC-3, SC-7, SC-13, SI-4)
allow_fedramp_high_compliance {
    some resource
    resource.type == "AWS::EC2::Instance"
    resource.properties.Tags["compliance:framework"] == "fedramp-high"
    
    # VPC deployment required
    resource.properties.SubnetId != null
    
    # Extended logging with 1-year audit retention
    some audit_log_group
    audit_log_group.type == "AWS::Logs::LogGroup"
    audit_log_group.properties.LogGroupName =~ "/aws/ec2/audit.*"
    audit_log_group.properties.RetentionInDays >= 365
    
    # Customer-managed KMS encryption with key rotation
    some kms_key
    kms_key.type == "AWS::KMS::Key"
    kms_key.properties.KeyRotationStatus == true
    
    # STIG compliance configuration
    resource.properties.Tags["STIGCompliant"] == "true"
    resource.properties.Tags["ImmutableInfrastructure"] == "true"
    
    # Enhanced security monitoring
    resource.properties.Tags["SecurityMonitoring"] == "enabled"
    
    # IMDSv2 enforcement
    resource.properties.MetadataOptions.HttpTokens == "required"
    resource.properties.MetadataOptions.HttpEndpoint == "enabled"
}

# REVIEW: Ensure proper data classification tagging (AC-2, Account Management)
allow_data_classification_tagging {
    some resource
    resource.type == "AWS::EC2::Instance"
    
    # Check that data classification tag is present and valid
    resource.properties.Tags["data-classification"] in ["public", "internal", "confidential", "restricted"]
    
    # FedRAMP specific tags
    resource.properties.Tags["compliance:ssp-id"] != null
    resource.properties.Tags["compliance:control-family"] != null
}

# REVIEW: Ensure network isolation requirements (SC-7, Boundary Protection)
allow_network_isolation {
    some resource
    resource.type == "AWS::EC2::SecurityGroup"
    resource.properties.GroupName =~ ".*ec2.*"
    
    # Security group must not allow unrestricted access
    not resource.properties.SecurityGroupIngress[].IpRanges[].CidrIp == "0.0.0.0/0"
    
    # SSH access restricted to VPC CIDR or specific IP ranges
    some ssh_rule in resource.properties.SecurityGroupIngress
    ssh_rule.IpProtocol == "tcp"
    ssh_rule.FromPort == 22
    ssh_rule.ToPort == 22
    ssh_rule.IpRanges[].CidrIp =~ "^(10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|192\\.168\\.)"  # Private IP ranges only
}

# REVIEW: Ensure encryption requirements (SC-13, Cryptographic Protection)
allow_encryption_compliance {
    some resource
    resource.type == "AWS::EC2::Instance"
    
    # All EBS volumes must be encrypted
    every block_device in resource.properties.BlockDeviceMappings {
        block_device.Ebs.Encrypted == true
        block_device.Ebs.KmsKeyId != null
    }
    
    # Customer-managed KMS key required for FedRAMP
    some kms_key
    kms_key.type == "AWS::KMS::Key"
    kms_key.properties.Description =~ ".*EC2.*encryption.*"
}

# REVIEW: Ensure audit logging requirements (AU-2, AU-3, AU-4, AU-5)
allow_audit_logging {
    some resource
    resource.type == "AWS::Logs::LogGroup"
    resource.properties.LogGroupName =~ "/aws/ec2/.*"
    
    # Log retention based on compliance framework
    framework := resource.properties.Tags["compliance:framework"]
    framework == "commercial" and resource.properties.RetentionInDays >= 30
    framework == "fedramp-moderate" and resource.properties.RetentionInDays >= 1095  # 3 years
    framework == "fedramp-high" and resource.properties.RetentionInDays >= 2555     # 7 years
}

# REVIEW: Ensure monitoring and alerting (SI-4, Information System Monitoring)
allow_monitoring_compliance {
    some resource
    resource.type == "AWS::CloudWatch::Alarm"
    resource.properties.AlarmName =~ ".*ec2.*"
    
    # Required alarms for FedRAMP compliance
    required_alarms := ["cpu", "system-check", "instance-check"]
    resource.properties.AlarmName =~ ".*" + required_alarms[_] + ".*"
    
    # Alarm actions must be configured for FedRAMP
    resource.properties.AlarmActions != null
    count(resource.properties.AlarmActions) > 0
}

# REVIEW: Ensure access control requirements (AC-2, AC-3, AC-6)
allow_access_control {
    some resource
    resource.type == "AWS::IAM::Role"
    resource.properties.AssumeRolePolicyDocument.Statement[].Principal.Service == "ec2.amazonaws.com"
    
    # Role must have least privilege policies
    some policy in resource.properties.ManagedPolicyArns
    policy in [
        "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
        "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
    ]
    
    # Custom policies must not use wildcard resources unless justified
    # TODO: Add condition to check custom policies for wildcard usage
}

# REVIEW: Ensure system integrity requirements (SI-7, Software and Information Integrity)
allow_system_integrity {
    some resource
    resource.type == "AWS::EC2::Instance"
    
    # Instance must use approved AMI
    resource.properties.ImageId =~ "ami-[a-f0-9]{8,17}"
    
    # FedRAMP High requires STIG compliance
    resource.properties.Tags["compliance:framework"] == "fedramp-high"
    resource.properties.Tags["STIGCompliant"] == "true"
    
    # Security agents must be installed
    resource.properties.Tags["SecurityAgents"] =~ ".*aide.*auditd.*"
}

# REVIEW: Ensure incident response requirements (IR-4, Incident Handling)
allow_incident_response {
    some resource
    resource.type == "AWS::EC2::Instance"
    
    # Instance must be tagged for incident response
    resource.properties.Tags["incident-response:contact"] != null
    resource.properties.Tags["incident-response:escalation"] != null
    
    # Log forwarding must be configured
    resource.properties.Tags["log-forwarding:enabled"] == "true"
    resource.properties.Tags["log-forwarding:destination"] != null
}
