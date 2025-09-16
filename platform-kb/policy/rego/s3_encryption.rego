# S3 Encryption Policy
# Ensures all S3 buckets have encryption enabled

package s3.encryption

import rego.v1

# Check if S3 bucket has encryption enabled
has_encryption_enabled(bucket) {
    bucket.server_side_encryption_configuration
    bucket.server_side_encryption_configuration.rules
    some rule in bucket.server_side_encryption_configuration.rules
    rule.apply_server_side_encryption_by_default
    rule.apply_server_side_encryption_by_default.sse_algorithm
}

# Check if S3 bucket has proper encryption algorithm
has_proper_encryption_algorithm(bucket, framework) {
    bucket.server_side_encryption_configuration.rules
    some rule in bucket.server_side_encryption_configuration.rules
    rule.apply_server_side_encryption_by_default.sse_algorithm == expected_algorithm[framework]
}

# Expected encryption algorithms by framework
expected_algorithm := {
    "commercial": "AES256",
    "fedramp-moderate": "aws:kms",
    "fedramp-high": "aws:kms"
}

# Check if S3 bucket has KMS key for moderate/high frameworks
has_kms_key(bucket, framework) {
    framework in ["fedramp-moderate", "fedramp-high"]
    bucket.server_side_encryption_configuration.rules
    some rule in bucket.server_side_encryption_configuration.rules
    rule.apply_server_side_encryption_by_default.kms_master_key_id
}

# Main policy check
violation[msg] {
    bucket := input.buckets[_]
    not has_encryption_enabled(bucket)
    msg := sprintf("S3 bucket %s does not have encryption enabled", [bucket.name])
}

violation[msg] {
    bucket := input.buckets[_]
    framework := input.compliance_framework
    not has_proper_encryption_algorithm(bucket, framework)
    msg := sprintf("S3 bucket %s does not have proper encryption algorithm for framework %s", [bucket.name, framework])
}

violation[msg] {
    bucket := input.buckets[_]
    framework := input.compliance_framework
    not has_kms_key(bucket, framework)
    msg := sprintf("S3 bucket %s does not have KMS key for framework %s", [bucket.name, framework])
}

# Allow violation if explicitly suppressed
violation[msg] {
    bucket := input.buckets[_]
    not has_encryption_enabled(bucket)
    not is_suppressed(bucket.name, "s3_encryption")
    msg := sprintf("S3 bucket %s does not have encryption enabled", [bucket.name])
}

# Check if bucket is suppressed
is_suppressed(bucket_name, rule_id) {
    some suppression in input.governance.suppressions
    suppression.rule_id == rule_id
    suppression.target_ref == bucket_name
    suppression.expiry > time.now_ns()
}

# Unit tests
test_has_encryption_enabled {
    bucket := {
        "name": "test-bucket",
        "server_side_encryption_configuration": {
            "rules": [{
                "apply_server_side_encryption_by_default": {
                    "sse_algorithm": "AES256"
                }
            }]
        }
    }
    has_encryption_enabled(bucket)
}

test_has_proper_encryption_algorithm {
    bucket := {
        "name": "test-bucket",
        "server_side_encryption_configuration": {
            "rules": [{
                "apply_server_side_encryption_by_default": {
                    "sse_algorithm": "AES256"
                }
            }]
        }
    }
    has_proper_encryption_algorithm(bucket, "commercial")
}

test_has_kms_key {
    bucket := {
        "name": "test-bucket",
        "server_side_encryption_configuration": {
            "rules": [{
                "apply_server_side_encryption_by_default": {
                    "sse_algorithm": "aws:kms",
                    "kms_master_key_id": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
                }
            }]
        }
    }
    has_kms_key(bucket, "fedramp-moderate")
}

test_violation_no_encryption {
    input := {
        "buckets": [{
            "name": "test-bucket"
        }],
        "compliance_framework": "commercial",
        "governance": {
            "suppressions": []
        }
    }
    violation["S3 bucket test-bucket does not have encryption enabled"]
}

test_violation_wrong_algorithm {
    input := {
        "buckets": [{
            "name": "test-bucket",
            "server_side_encryption_configuration": {
                "rules": [{
                    "apply_server_side_encryption_by_default": {
                        "sse_algorithm": "AES256"
                    }
                }]
            }
        }],
        "compliance_framework": "fedramp-moderate",
        "governance": {
            "suppressions": []
        }
    }
    violation["S3 bucket test-bucket does not have proper encryption algorithm for framework fedramp-moderate"]
}

test_suppression {
    input := {
        "buckets": [{
            "name": "test-bucket"
        }],
        "compliance_framework": "commercial",
        "governance": {
            "suppressions": [{
                "rule_id": "s3_encryption",
                "target_ref": "test-bucket",
                "expiry": time.now_ns() + 86400000000000  # 1 day from now
            }]
        }
    }
    count(violation) == 0
}

