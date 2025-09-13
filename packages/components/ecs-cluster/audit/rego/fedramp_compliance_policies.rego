package platform.ecs_cluster.fedramp

# FedRAMP Compliance Policies for ECS Cluster
# These policies enforce FedRAMP-specific requirements

# REVIEW: Ensure ECS cluster meets FedRAMP Moderate requirements (AC-2, AC-3)
allow {
    some resource
    resource.type == "AWS::ECS::Cluster"
    # TODO: Add condition to check FedRAMP Moderate compliance
    # resource.properties.Tags contains compliance-framework: "fedramp-moderate"
    # resource.properties.ClusterSettings contains Container Insights enabled
    # resource.properties.CapacityProviders includes FARGATE and FARGATE_SPOT
}

# REVIEW: Ensure ECS cluster meets FedRAMP High requirements (AC-2, AC-3, SC-7, SC-13, SI-4)
allow {
    some resource
    resource.type == "AWS::ECS::Cluster"
    # TODO: Add condition to check FedRAMP High compliance
    # resource.properties.Tags contains compliance-framework: "fedramp-high"
    # resource.properties.ClusterSettings contains Container Insights enabled
    # resource.properties.CapacityProviders includes FARGATE and FARGATE_SPOT
    # Enhanced monitoring and logging requirements
}

# REVIEW: Ensure Service Connect namespace meets FedRAMP network security requirements (SC-7)
allow {
    some resource
    resource.type == "AWS::ServiceDiscovery::PrivateDnsNamespace"
    # TODO: Add condition to check FedRAMP network security compliance
    # resource.properties.Vpc is properly configured for government cloud
    # resource.properties.Name follows FedRAMP naming conventions
}

# REVIEW: Ensure Auto Scaling Group meets FedRAMP security requirements (SC-7, SC-13)
allow {
    some resource
    resource.type == "AWS::AutoScaling::AutoScalingGroup"
    # TODO: Add condition to check FedRAMP security compliance
    # resource.properties.LaunchConfigurationName references secure launch config
    # resource.properties.VPCZoneIdentifier uses private subnets
    # Enhanced monitoring enabled for compliance
}

# REVIEW: Ensure ECS cluster has proper encryption for FedRAMP (SC-13)
allow {
    some resource
    resource.type == "AWS::ECS::Cluster"
    # TODO: Add condition to check encryption compliance
    # resource.properties.ClusterSettings contains encryption settings
    # KMS keys are properly configured for encryption
}

# REVIEW: Ensure ECS cluster has proper monitoring for FedRAMP (SI-4)
allow {
    some resource
    resource.type == "AWS::ECS::Cluster"
    # TODO: Add condition to check monitoring compliance
    # resource.properties.ClusterSettings contains Container Insights enabled
    # CloudWatch alarms are properly configured
    # Log groups have proper retention policies
}

# REVIEW: Ensure ECS cluster has proper access control for FedRAMP (AC-2, AC-3)
allow {
    some resource
    resource.type == "AWS::IAM::Role"
    resource.properties.RoleName contains "ecs"
    # TODO: Add condition to check access control compliance
    # resource.properties.AssumeRolePolicyDocument allows only ECS to assume the role
    # resource.properties.Policies contains least privilege permissions
    # resource.properties.Tags contains proper access control metadata
}

# REVIEW: Ensure ECS cluster has proper data protection for FedRAMP (SC-28)
allow {
    some resource
    resource.type == "AWS::ECS::Cluster"
    # TODO: Add condition to check data protection compliance
    # resource.properties.ClusterSettings contains data protection settings
    # Backup and recovery procedures are properly configured
    # Data classification tags are properly applied
}
