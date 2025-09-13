package platform.ec2_instance.compliance

# EC2 Instance Security and Compliance Policies
# Implements AWS Foundational Security Best Practices and FedRAMP controls

# REVIEW: Ensure EC2 instances do not allow unrestricted SSH access (EC2.1)
allow_ec2_ssh_access {
    some resource
    resource.type == "AWS::EC2::SecurityGroup"
    resource.properties.GroupName =~ ".*ec2.*"
    
    # Check that SSH (port 22) is not open to 0.0.0.0/0
    not resource.properties.SecurityGroupIngress[].IpRanges[].CidrIp == "0.0.0.0/0"
    not resource.properties.SecurityGroupIngress[].IpRanges[].CidrIp == "::/0"
}

# REVIEW: Ensure EC2 instances use supported AMIs (EC2.2)
allow_ec2_ami_compliance {
    some resource
    resource.type == "AWS::EC2::Instance"
    
    # Check that AMI is from approved owners
    resource.properties.ImageId =~ "ami-[a-f0-9]{8,17}"
    # TODO: Add condition to verify AMI is from approved owners (amazon, self, aws-marketplace)
}

# REVIEW: Ensure EC2 instances have proper IAM role policies (AC-6, Least Privilege)
allow_ec2_iam_least_privilege {
    some resource
    resource.type == "AWS::IAM::Role"
    resource.properties.AssumeRolePolicyDocument.Statement[].Principal.Service == "ec2.amazonaws.com"
    
    # Check that role has minimal required policies
    some policy in resource.properties.ManagedPolicyArns
    policy == "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
    
    # TODO: Add condition to verify policies don't use wildcard resources unless necessary
}

# REVIEW: Ensure EC2 instances have proper VPC configuration for compliance (SC-7, Boundary Protection)
allow_ec2_vpc_configuration {
    some resource
    resource.type == "AWS::EC2::Instance"
    
    # Instance must be in a VPC (not EC2-Classic)
    resource.properties.SubnetId != null
    
    # TODO: Add condition to verify VPC configuration meets compliance requirements
    # For FedRAMP: must be in private subnet with restricted internet access
}

# REVIEW: Ensure EC2 instances have encryption enabled (SC-13, Cryptographic Protection)
allow_ec2_encryption {
    some resource
    resource.type == "AWS::EC2::Instance"
    
    # Check that EBS volumes are encrypted
    some block_device in resource.properties.BlockDeviceMappings
    block_device.Ebs.Encrypted == true
    block_device.Ebs.KmsKeyId != null
    
    # TODO: Add condition to verify KMS key is customer-managed for FedRAMP
}

# REVIEW: Ensure CloudWatch logging is enabled (AU-2, AU-3, Audit Events)
allow_ec2_logging {
    some resource
    resource.type == "AWS::Logs::LogGroup"
    resource.properties.LogGroupName =~ "/aws/ec2/.*"
    
    # Check that log group has proper retention policy
    resource.properties.RetentionInDays >= 90
    
    # TODO: Add condition to verify retention meets compliance requirements
    # Commercial: 30 days, FedRAMP Moderate: 3 years, FedRAMP High: 7 years
}

# REVIEW: Ensure EC2 instances have detailed monitoring enabled for compliance
allow_ec2_monitoring {
    some resource
    resource.type == "AWS::EC2::Instance"
    
    # Check that detailed monitoring is enabled
    resource.properties.Monitoring == true
    
    # TODO: Add condition to verify CloudWatch agent is configured
}

# REVIEW: Ensure EC2 instances have proper tagging (AC-2, Account Management)
allow_ec2_tagging {
    some resource
    resource.type == "AWS::EC2::Instance"
    
    # Check that required tags are present
    resource.properties.Tags["service-name"] != null
    resource.properties.Tags["environment"] != null
    resource.properties.Tags["compliance-framework"] != null
    resource.properties.Tags["data-classification"] != null
    
    # TODO: Add condition to verify compliance-specific tags are present
    # FedRAMP: compliance:ssp-id, STIG compliance tags
}

# REVIEW: Ensure EC2 instances have IMDSv2 enforced for security
allow_ec2_imdsv2 {
    some resource
    resource.type == "AWS::EC2::Instance"
    
    # Check that IMDSv2 is required
    resource.properties.MetadataOptions.HttpTokens == "required"
    resource.properties.MetadataOptions.HttpEndpoint == "enabled"
    
    # TODO: Add condition to verify IMDSv2 is enforced for compliance frameworks
}

# REVIEW: Ensure EC2 instances have proper security group rules (SC-7)
allow_ec2_security_group_rules {
    some resource
    resource.type == "AWS::EC2::SecurityGroup"
    resource.properties.GroupName =~ ".*ec2.*"
    
    # Check that security group doesn't allow unrestricted access
    not resource.properties.SecurityGroupIngress[].IpRanges[].CidrIp == "0.0.0.0/0"
    
    # Check that only necessary ports are open
    some ingress in resource.properties.SecurityGroupIngress
    ingress.IpProtocol == "tcp"
    ingress.FromPort in [22, 80, 443, 8080]  # Common application ports
    
    # TODO: Add condition to verify security group rules are least privilege
}

# REVIEW: Ensure EC2 instances have proper backup configuration (CP-9, Information System Backup)
allow_ec2_backup {
    some resource
    resource.type == "AWS::EC2::Instance"
    
    # Check that EBS volumes have proper backup configuration
    some block_device in resource.properties.BlockDeviceMappings
    block_device.Ebs.DeleteOnTermination == false  # Preserve data on termination
    
    # TODO: Add condition to verify backup strategy is implemented
    # This might require separate backup service configuration
}
