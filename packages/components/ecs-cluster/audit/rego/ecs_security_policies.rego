package platform.ecs_cluster.compliance

# ECS Cluster Security Policies
# These policies enforce security best practices for ECS clusters

# REVIEW: Ensure ECS cluster has Container Insights enabled (AWS Foundational BP ECS.1)
allow {
    some resource
    resource.type == "AWS::ECS::Cluster"
    # TODO: Add condition to check that Container Insights is enabled
    # resource.properties.ClusterSettings contains {"Name": "containerInsights", "Value": "enabled"}
}

# REVIEW: Ensure ECS cluster has proper capacity provider strategy (AWS Foundational BP ECS.2)
allow {
    some resource
    resource.type == "AWS::ECS::Cluster"
    # TODO: Add condition to check capacity provider strategy is configured
    # resource.properties.CapacityProviders is not empty
}

# REVIEW: Ensure ECS cluster has proper logging configuration (AWS Foundational BP ECS.3)
allow {
    some resource
    resource.type == "AWS::ECS::Cluster"
    # TODO: Add condition to check that logging is properly configured
    # This might involve checking for CloudWatch log groups
}

# REVIEW: Ensure ECS cluster has proper tagging (AWS Foundational BP ECS.4)
allow {
    some resource
    resource.type == "AWS::ECS::Cluster"
    # TODO: Add condition to check that required tags are present
    # resource.properties.Tags contains required platform tags
}

# REVIEW: Ensure ECS cluster has proper network configuration (AWS Foundational BP ECS.5)
allow {
    some resource
    resource.type == "AWS::ECS::Cluster"
    # TODO: Add condition to check that cluster is properly configured for VPC
    # This might involve checking for VPC configuration
}

# REVIEW: Ensure Service Connect namespace is properly configured
allow {
    some resource
    resource.type == "AWS::ServiceDiscovery::PrivateDnsNamespace"
    # TODO: Add condition to check that namespace is properly configured
    # resource.properties.Name matches expected pattern
    # resource.properties.Vpc is properly configured
}

# REVIEW: Ensure Auto Scaling Group has proper security configuration
allow {
    some resource
    resource.type == "AWS::AutoScaling::AutoScalingGroup"
    # TODO: Add condition to check that ASG has proper security configuration
    # resource.properties.LaunchConfigurationName references secure launch config
    # resource.properties.VPCZoneIdentifier is properly configured
}

# REVIEW: Ensure ECS cluster has proper IAM role configuration
allow {
    some resource
    resource.type == "AWS::IAM::Role"
    resource.properties.RoleName contains "ecs"
    # TODO: Add condition to check that IAM role has proper permissions
    # resource.properties.AssumeRolePolicyDocument allows ECS to assume the role
    # resource.properties.Policies contains only necessary permissions
}
