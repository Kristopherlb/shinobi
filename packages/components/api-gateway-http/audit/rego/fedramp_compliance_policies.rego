package platform.api_gateway_http.fedramp

# FedRAMP Compliance Policies for API Gateway HTTP Component
# Implements FedRAMP Moderate and High control requirements

# REVIEW: Ensure FedRAMP Moderate compliance requirements are met
allow_fedramp_moderate_compliance {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    resource.properties.Tags["compliance:framework"] == "fedramp-moderate"
    
    # Access logging enabled
    some log_group
    log_group.type == "AWS::Logs::LogGroup"
    log_group.properties.RetentionInDays >= 90
    
    # CORS origins explicitly defined (no wildcards)
    resource.properties.CorsConfiguration.AllowOrigins != ["*"]
    
    # Resource policy configured for access control
    resource.properties.ResourcePolicy != null
    
    # WAF protection recommended (optional for moderate)
    # Note: WAF is optional for FedRAMP Moderate but recommended
}

# REVIEW: Ensure FedRAMP High compliance requirements are met
allow_fedramp_high_compliance {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    resource.properties.Tags["compliance:framework"] == "fedramp-high"
    
    # Enhanced logging with 1-year retention
    some log_group
    log_group.type == "AWS::Logs::LogGroup"
    log_group.properties.RetentionInDays >= 365
    
    # CORS origins explicitly defined (no wildcards)
    resource.properties.CorsConfiguration.AllowOrigins != ["*"]
    not contains(resource.properties.CorsConfiguration.AllowOrigins[_], "*")
    
    # Resource policy configured for strict access control
    resource.properties.ResourcePolicy != null
    
    # WAF protection mandatory for high
    some waf_association
    waf_association.type == "AWS::WAFv2::WebACLAssociation"
    waf_association.properties.ResourceArn == resource.arn
    
    # Custom domain with TLS 1.2
    some domain
    domain.type == "AWS::ApiGatewayV2::DomainName"
    domain.properties.SecurityPolicy == "TLS_1_2"
    
    # Custom metrics for security monitoring
    some custom_metric
    custom_metric.namespace == "Security/API"
    custom_metric.metricName == "SecurityEvents"
}

# Deny if CORS allows wildcard origins in production
deny_wildcard_cors {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    resource.properties.Tags["environment"] == "production"
    contains(resource.properties.CorsConfiguration.AllowOrigins[_], "*")
}

# Deny if access logging is disabled
deny_no_access_logging {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    not some log_group
    log_group.type == "AWS::Logs::LogGroup"
    log_group.properties.LogGroupName == resource.properties.Name
}

# Deny if retention period is insufficient for compliance framework
deny_insufficient_retention {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    some log_group
    log_group.type == "AWS::Logs::LogGroup"
    log_group.properties.LogGroupName == resource.properties.Name
    
    framework := resource.properties.Tags["compliance:framework"]
    framework == "fedramp-moderate"
    log_group.properties.RetentionInDays < 90
}

deny_insufficient_retention {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    some log_group
    log_group.type == "AWS::Logs::LogGroup"
    log_group.properties.LogGroupName == resource.properties.Name
    
    framework := resource.properties.Tags["compliance:framework"]
    framework == "fedramp-high"
    log_group.properties.RetentionInDays < 365
}

# Deny if WAF is not configured for FedRAMP High
deny_no_waf_fedramp_high {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    resource.properties.Tags["compliance:framework"] == "fedramp-high"
    
    not some waf_association
    waf_association.type == "AWS::WAFv2::WebACLAssociation"
    waf_association.properties.ResourceArn == resource.arn
}

# Deny if resource policy is not configured
deny_no_resource_policy {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    resource.properties.Tags["compliance:framework"] in ["fedramp-moderate", "fedramp-high"]
    resource.properties.ResourcePolicy == null
}

# Deny if custom domain doesn't use TLS 1.2
deny_insecure_tls {
    some domain
    domain.type == "AWS::ApiGatewayV2::DomainName"
    domain.properties.SecurityPolicy != "TLS_1_2"
}

# Allow commercial compliance (less strict)
allow_commercial_compliance {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    resource.properties.Tags["compliance:framework"] == "commercial"
    
    # Basic logging enabled
    some log_group
    log_group.type == "AWS::Logs::LogGroup"
    log_group.properties.RetentionInDays >= 30
    
    # CORS configured (can be permissive for commercial)
    resource.properties.CorsConfiguration != null
}

# Main compliance check
compliance_check[result] {
    resource := input.resources[_]
    resource.type == "AWS::ApiGatewayV2::Api"
    
    framework := resource.properties.Tags["compliance:framework"]
    
    result := {
        "resource": resource.name,
        "framework": framework,
        "compliant": false,
        "violations": []
    }
    
    # Check for violations
    violations := []
    
    if deny_wildcard_cors {
        violations := array.concat(violations, ["CORS wildcard origins not allowed in production"])
    }
    
    if deny_no_access_logging {
        violations := array.concat(violations, ["Access logging must be enabled"])
    }
    
    if deny_insufficient_retention {
        violations := array.concat(violations, ["Log retention period insufficient for compliance framework"])
    }
    
    if framework == "fedramp-high" and deny_no_waf_fedramp_high {
        violations := array.concat(violations, ["WAF protection mandatory for FedRAMP High"])
    }
    
    if framework in ["fedramp-moderate", "fedramp-high"] and deny_no_resource_policy {
        violations := array.concat(violations, ["Resource policy required for FedRAMP compliance"])
    }
    
    if deny_insecure_tls {
        violations := array.concat(violations, ["TLS 1.2 required for custom domains"])
    }
    
    # Set compliance status
    if count(violations) == 0 {
        result.compliant := true
    } else {
        result.violations := violations
    }
}
