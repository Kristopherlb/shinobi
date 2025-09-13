package platform.lambda_api.compliance

# Lambda API Security and Compliance Policies
# Implements AWS Foundational Security Best Practices and FedRAMP controls

# REVIEW: Ensure Lambda function policies do not allow public access (Lambda.1)
allow_lambda_public_access {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.PublicAccess == true
}

# REVIEW: Ensure Lambda functions use supported runtimes (Lambda.2)
allow_lambda_runtime {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.Runtime in ["nodejs18.x", "nodejs20.x", "python3.9", "python3.10", "python3.11"]
}

# REVIEW: Ensure Lambda functions have proper IAM role policies (AC-6, Least Privilege)
allow_lambda_iam_least_privilege {
    some resource
    resource.type == "AWS::IAM::Role"
    resource.properties.Policies[].PolicyDocument.Statement[].Effect == "Allow"
    # TODO: Add condition to check that policies don't use wildcard resources unless necessary
}

# REVIEW: Ensure Lambda functions have proper VPC configuration for FedRAMP (SC-7, Boundary Protection)
allow_lambda_vpc_configuration {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.VpcConfig != null
    # TODO: Add condition to verify VPC configuration is present for FedRAMP deployments
}

# REVIEW: Ensure Lambda functions have encryption enabled (SC-13, Cryptographic Protection)
allow_lambda_encryption {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.Environment.EncryptionConfig != null
    # TODO: Add condition to verify KMS encryption is configured
}

# REVIEW: Ensure CloudWatch logging is enabled (AU-2, AU-3, Audit Events)
allow_lambda_logging {
    some resource
    resource.type == "AWS::Logs::LogGroup"
    resource.properties.LogGroupName =~ "/aws/lambda/.*"
    # TODO: Add condition to verify log group retention policy meets compliance requirements
}

# REVIEW: Ensure API Gateway has proper security configuration
allow_api_gateway_security {
    some resource
    resource.type == "AWS::ApiGateway::RestApi"
    resource.properties.EndpointConfiguration.Types == ["REGIONAL"]
    # TODO: Add condition to verify API Gateway security settings
}

# REVIEW: Ensure proper tagging for compliance (AU-6, Audit Review)
allow_lambda_tagging {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.Tags["compliance:framework"] != null
    resource.properties.Tags["data-classification"] != null
    # TODO: Add condition to verify all required compliance tags are present
}

# REVIEW: Ensure X-Ray tracing is enabled for FedRAMP deployments
allow_lambda_tracing {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.TracingConfig.Mode == "Active"
    # TODO: Add condition to verify tracing is enabled for FedRAMP frameworks
}

# REVIEW: Ensure Lambda function has proper timeout configuration
allow_lambda_timeout {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.Timeout <= 900  # Maximum 15 minutes
    # TODO: Add condition to verify timeout is appropriate for compliance framework
}

# REVIEW: Ensure Lambda function has appropriate memory allocation
allow_lambda_memory {
    some resource
    resource.type == "AWS::Lambda::Function"
    resource.properties.MemorySize >= 128
    resource.properties.MemorySize <= 10240
    # TODO: Add condition to verify memory allocation meets compliance requirements
}
