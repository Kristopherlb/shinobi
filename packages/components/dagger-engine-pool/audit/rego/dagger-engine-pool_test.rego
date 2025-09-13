package dagger_engine_pool.compliance

import rego.v1

# Test cases for compliance policy

test_encryption_at_rest_s3_pass if {
  allow with input as {
    "resources": [
      {
        "type": "AWS::S3::Bucket",
        "properties": {
          "BucketEncryption": {
            "ServerSideEncryptionConfiguration": [
              {
                "ServerSideEncryptionByDefault": {
                  "SSEAlgorithm": "aws:kms"
                }
              }
            ]
          }
        }
      }
    ]
  }
}

test_encryption_at_rest_s3_fail if {
  not allow with input as {
    "resources": [
      {
        "type": "AWS::S3::Bucket",
        "properties": {
          "BucketEncryption": {
            "ServerSideEncryptionConfiguration": [
              {
                "ServerSideEncryptionByDefault": {
                  "SSEAlgorithm": "AES256"
                }
              }
            ]
          }
        }
      }
    ]
  }
}

test_network_boundary_protection_pass if {
  allow with input as {
    "resources": [
      {
        "type": "AWS::ElasticLoadBalancingV2::LoadBalancer",
        "properties": {
          "Scheme": "internal"
        }
      }
    ]
  }
}

test_network_boundary_protection_fail if {
  not allow with input as {
    "resources": [
      {
        "type": "AWS::ElasticLoadBalancingV2::LoadBalancer", 
        "properties": {
          "Scheme": "internet-facing"
        }
      }
    ]
  }
}

test_logging_enabled_pass if {
  allow with input as {
    "resources": [
      {
        "type": "AWS::Logs::LogGroup",
        "properties": {
          "LogGroupName": "/aws/dagger-engine/test-service"
        }
      }
    ]
  }
}

test_logging_enabled_fail if {
  not allow with input as {
    "resources": []
  }
}

test_fips_compliance_fedramp_pass if {
  allow with input as {
    "context": {
      "complianceFramework": "fedramp-moderate"
    },
    "config": {
      "fipsMode": true,
      "stigBaseline": "UBI9"
    }
  }
}

test_fips_compliance_fedramp_fail if {
  not allow with input as {
    "context": {
      "complianceFramework": "fedramp-moderate"
    },
    "config": {
      "fipsMode": false
    }
  }
}

test_comprehensive_compliance_pass if {
  allow with input as {
    "context": {
      "complianceFramework": "commercial"
    },
    "config": {
      "fipsMode": true,
      "endpoint": {
        "nlbInternal": true
      },
      "compliance": {
        "forbidNoKms": true
      }
    },
    "resources": [
      {
        "type": "AWS::S3::Bucket",
        "properties": {
          "BucketEncryption": {
            "ServerSideEncryptionConfiguration": [
              {
                "ServerSideEncryptionByDefault": {
                  "SSEAlgorithm": "aws:kms"
                }
              }
            ]
          }
        }
      },
      {
        "type": "AWS::ElasticLoadBalancingV2::LoadBalancer",
        "properties": {
          "Scheme": "internal"
        }
      },
      {
        "type": "AWS::Logs::LogGroup",
        "properties": {
          "LogGroupName": "/aws/dagger-engine/test-service"
        }
      }
    ]
  }
}

test_violations_detected if {
  violations with input as {
    "context": {
      "complianceFramework": "fedramp-moderate"
    },
    "config": {
      "fipsMode": false
    },
    "resources": []
  }
  
  count(violations) > 0
}
