# Logging Required Policy
# Ensures all services have proper logging configuration

package logging.required

import rego.v1

# Check if Lambda function has structured logging
has_structured_logging(lambda) {
    lambda.environment_variables
    lambda.environment_variables.OTEL_SERVICE_NAME
    lambda.environment_variables.OTEL_RESOURCE_ATTRIBUTES
    lambda.environment_variables.OTEL_EXPORTER_OTLP_ENDPOINT
}

# Check if Lambda function has proper log retention
has_proper_log_retention(lambda, framework) {
    lambda.log_retention >= expected_retention[framework]
}

# Check if RDS instance has proper logging
has_rds_logging(rds, framework) {
    framework in ["fedramp-moderate", "fedramp-high"]
    rds.enabled_cloudwatch_logs_exports
    count(rds.enabled_cloudwatch_logs_exports) > 0
}

# Check if ECS service has proper logging
has_ecs_logging(ecs) {
    ecs.log_configuration
    ecs.log_configuration.log_driver == "awslogs"
    ecs.log_configuration.options
    ecs.log_configuration.options["awslogs-group"]
    ecs.log_configuration.options["awslogs-region"]
    ecs.log_configuration.options["awslogs-stream-prefix"]
}

# Check if S3 bucket has access logging
has_s3_access_logging(s3, framework) {
    framework in ["fedramp-moderate", "fedramp-high"]
    s3.logging_configuration
    s3.logging_configuration.destination_bucket_name
    s3.logging_configuration.log_file_prefix
}

# Expected log retention by framework
expected_retention := {
    "commercial": 7,
    "fedramp-moderate": 30,
    "fedramp-high": 90
}

# Main policy checks
violation[msg] {
    lambda := input.lambda_functions[_]
    not has_structured_logging(lambda)
    msg := sprintf("Lambda function %s does not have structured logging configured", [lambda.name])
}

violation[msg] {
    lambda := input.lambda_functions[_]
    framework := input.compliance_framework
    not has_proper_log_retention(lambda, framework)
    msg := sprintf("Lambda function %s does not have proper log retention for framework %s", [lambda.name, framework])
}

violation[msg] {
    rds := input.rds_instances[_]
    framework := input.compliance_framework
    not has_rds_logging(rds, framework)
    msg := sprintf("RDS instance %s does not have proper logging for framework %s", [rds.name, framework])
}

violation[msg] {
    ecs := input.ecs_services[_]
    not has_ecs_logging(ecs)
    msg := sprintf("ECS service %s does not have proper logging configured", [ecs.name])
}

violation[msg] {
    s3 := input.s3_buckets[_]
    framework := input.compliance_framework
    not has_s3_access_logging(s3, framework)
    msg := sprintf("S3 bucket %s does not have access logging for framework %s", [s3.name, framework])
}

# Allow violation if explicitly suppressed
violation[msg] {
    lambda := input.lambda_functions[_]
    not has_structured_logging(lambda)
    not is_suppressed(lambda.name, "logging_required")
    msg := sprintf("Lambda function %s does not have structured logging configured", [lambda.name])
}

# Check if resource is suppressed
is_suppressed(resource_name, rule_id) {
    some suppression in input.governance.suppressions
    suppression.rule_id == rule_id
    suppression.target_ref == resource_name
    suppression.expiry > time.now_ns()
}

# Unit tests
test_has_structured_logging {
    lambda := {
        "name": "test-lambda",
        "environment_variables": {
            "OTEL_SERVICE_NAME": "test-service",
            "OTEL_RESOURCE_ATTRIBUTES": "service.name=test-service",
            "OTEL_EXPORTER_OTLP_ENDPOINT": "http://adot-collector:4317"
        }
    }
    has_structured_logging(lambda)
}

test_has_proper_log_retention {
    lambda := {
        "name": "test-lambda",
        "log_retention": 30
    }
    has_proper_log_retention(lambda, "fedramp-moderate")
}

test_has_rds_logging {
    rds := {
        "name": "test-rds",
        "enabled_cloudwatch_logs_exports": ["error", "general"]
    }
    has_rds_logging(rds, "fedramp-moderate")
}

test_has_ecs_logging {
    ecs := {
        "name": "test-ecs",
        "log_configuration": {
            "log_driver": "awslogs",
            "options": {
                "awslogs-group": "/ecs/test-service",
                "awslogs-region": "us-east-1",
                "awslogs-stream-prefix": "ecs"
            }
        }
    }
    has_ecs_logging(ecs)
}

test_has_s3_access_logging {
    s3 := {
        "name": "test-bucket",
        "logging_configuration": {
            "destination_bucket_name": "access-logs-bucket",
            "log_file_prefix": "access-logs/"
        }
    }
    has_s3_access_logging(s3, "fedramp-moderate")
}

test_violation_no_structured_logging {
    input := {
        "lambda_functions": [{
            "name": "test-lambda"
        }],
        "compliance_framework": "commercial",
        "governance": {
            "suppressions": []
        }
    }
    violation["Lambda function test-lambda does not have structured logging configured"]
}

test_violation_insufficient_retention {
    input := {
        "lambda_functions": [{
            "name": "test-lambda",
            "log_retention": 5
        }],
        "compliance_framework": "fedramp-moderate",
        "governance": {
            "suppressions": []
        }
    }
    violation["Lambda function test-lambda does not have proper log retention for framework fedramp-moderate"]
}

test_violation_no_rds_logging {
    input := {
        "rds_instances": [{
            "name": "test-rds"
        }],
        "compliance_framework": "fedramp-moderate",
        "governance": {
            "suppressions": []
        }
    }
    violation["RDS instance test-rds does not have proper logging for framework fedramp-moderate"]
}

test_violation_no_ecs_logging {
    input := {
        "ecs_services": [{
            "name": "test-ecs"
        }],
        "compliance_framework": "commercial",
        "governance": {
            "suppressions": []
        }
    }
    violation["ECS service test-ecs does not have proper logging configured"]
}

test_violation_no_s3_access_logging {
    input := {
        "s3_buckets": [{
            "name": "test-bucket"
        }],
        "compliance_framework": "fedramp-moderate",
        "governance": {
            "suppressions": []
        }
    }
    violation["S3 bucket test-bucket does not have access logging for framework fedramp-moderate"]
}

test_suppression {
    input := {
        "lambda_functions": [{
            "name": "test-lambda"
        }],
        "compliance_framework": "commercial",
        "governance": {
            "suppressions": [{
                "rule_id": "logging_required",
                "target_ref": "test-lambda",
                "expiry": time.now_ns() + 86400000000000  # 1 day from now
            }]
        }
    }
    count(violation) == 0
}

