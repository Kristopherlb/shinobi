package platform.api_gateway_http.security

# API Gateway HTTP Security Policies
# Implements security best practices and controls

# Deny if API Gateway has public access without proper controls
deny_public_access_without_controls {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    
    # Check if execute API endpoint is enabled
    resource.properties.DisableExecuteApiEndpoint != true
    
    # And no WAF protection
    not some waf_association
    waf_association.type == "AWS::WAFv2::WebACLAssociation"
    waf_association.properties.ResourceArn == resource.arn
    
    # And no resource policy
    resource.properties.ResourcePolicy == null
    
    # And no API key requirement
    not some usage_plan
    usage_plan.type == "AWS::ApiGateway::UsagePlan"
    usage_plan.properties.ApiStages[_].ApiId == resource.id
}

# Deny if CORS allows credentials with wildcard origins
deny_credentials_with_wildcard {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    resource.properties.CorsConfiguration.AllowCredentials == true
    contains(resource.properties.CorsConfiguration.AllowOrigins[_], "*")
}

# Deny if throttling is not configured
deny_no_throttling {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    resource.properties.Tags["environment"] == "production"
    
    not some stage
    stage.type == "AWS::ApiGatewayV2::Stage"
    stage.properties.ApiId == resource.id
    stage.properties.DefaultRouteSettings.ThrottlingRateLimit > 0
}

# Deny if monitoring is not enabled
deny_no_monitoring {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    resource.properties.Tags["environment"] == "production"
    
    not some alarm
    alarm.type == "AWS::CloudWatch::Alarm"
    alarm.properties.Namespace == "AWS/ApiGateway"
}

# Deny if custom domain doesn't use HTTPS
deny_http_custom_domain {
    some domain
    domain.type == "AWS::ApiGatewayV2::DomainName"
    domain.properties.ProtocolType == "HTTP"
}

# Deny if API key is enabled but not required
deny_optional_api_key {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    resource.properties.Tags["api-key-enabled"] == "true"
    resource.properties.Tags["api-key-required"] != "true"
}

# Deny if JWT authorizer is misconfigured
deny_misconfigured_jwt {
    some authorizer
    authorizer.type == "AWS::ApiGatewayV2::Authorizer"
    authorizer.properties.AuthorizerType == "JWT"
    
    # Missing issuer
    authorizer.properties.JwtConfiguration.Issuer == ""
}

deny_misconfigured_jwt {
    some authorizer
    authorizer.type == "AWS::ApiGatewayV2::Authorizer"
    authorizer.properties.AuthorizerType == "JWT"
    
    # Missing audience
    count(authorizer.properties.JwtConfiguration.Audience) == 0
}

# Deny if resource policy allows overly broad access
deny_overly_broad_resource_policy {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    resource.properties.ResourcePolicy != null
    
    policy := resource.properties.ResourcePolicy
    some statement
    statement := policy.Statement[_]
    statement.Effect == "Allow"
    statement.Principal == "*"
    statement.Action == "execute-api:Invoke"
    statement.Resource == "arn:aws:execute-api:*:*:*/*/*"
    not statement.Condition
}

# Deny if access logs don't include required fields
deny_incomplete_access_logs {
    some log_group
    log_group.type == "AWS::Logs::LogGroup"
    log_group.properties.LogGroupName == "/platform/http-api"
    
    some stage
    stage.type == "AWS::ApiGatewayV2::Stage"
    stage.properties.AccessLogSettings.Format == ""
}

# Allow secure configuration
allow_secure_configuration {
    some resource
    resource.type == "AWS::ApiGatewayV2::Api"
    
    # Has proper access controls
    resource.properties.DisableExecuteApiEndpoint == true
    or some waf_association
    waf_association.type == "AWS::WAFv2::WebACLAssociation"
    waf_association.properties.ResourceArn == resource.arn
    or resource.properties.ResourcePolicy != null
    
    # CORS properly configured
    not contains(resource.properties.CorsConfiguration.AllowOrigins[_], "*")
    or resource.properties.CorsConfiguration.AllowCredentials != true
    
    # Throttling configured
    some stage
    stage.type == "AWS::ApiGatewayV2::Stage"
    stage.properties.DefaultRouteSettings.ThrottlingRateLimit > 0
    
    # Monitoring enabled
    some alarm
    alarm.type == "AWS::CloudWatch::Alarm"
    alarm.properties.Namespace == "AWS/ApiGateway"
}

# Security assessment
security_assessment[result] {
    resource := input.resources[_]
    resource.type == "AWS::ApiGatewayV2::Api"
    
    violations := []
    
    if deny_public_access_without_controls {
        violations := array.concat(violations, ["Public access without proper security controls"])
    }
    
    if deny_credentials_with_wildcard {
        violations := array.concat(violations, ["CORS credentials with wildcard origins not allowed"])
    }
    
    if deny_no_throttling {
        violations := array.concat(violations, ["Throttling must be configured for production"])
    }
    
    if deny_no_monitoring {
        violations := array.concat(violations, ["Monitoring must be enabled for production"])
    }
    
    if deny_http_custom_domain {
        violations := array.concat(violations, ["Custom domains must use HTTPS"])
    }
    
    if deny_optional_api_key {
        violations := array.concat(violations, ["API key should be required if enabled"])
    }
    
    if deny_misconfigured_jwt {
        violations := array.concat(violations, ["JWT authorizer misconfigured"])
    }
    
    if deny_overly_broad_resource_policy {
        violations := array.concat(violations, ["Resource policy too permissive"])
    }
    
    if deny_incomplete_access_logs {
        violations := array.concat(violations, ["Access logs missing required fields"])
    }
    
    result := {
        "resource": resource.name,
        "secure": count(violations) == 0,
        "violations": violations,
        "recommendations": [
            "Enable WAF protection for production APIs",
            "Configure resource policies for access control",
            "Use custom domains with TLS 1.2",
            "Enable comprehensive monitoring and alerting",
            "Configure appropriate throttling limits",
            "Use explicit CORS origins (no wildcards)",
            "Require API keys if authentication is needed"
        ]
    }
}
