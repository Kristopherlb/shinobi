"use strict";
/**
 * S3 Bucket configuration builder.
 *
 * Implements the shared ConfigBuilder precedence chain so that
 * all deployment defaults are sourced from the platform configuration
 * files in /config and developer overrides in service manifests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3BucketComponentConfigBuilder = exports.S3_BUCKET_CONFIG_SCHEMA = void 0;
const core_1 = require("@shinobi/core");
exports.S3_BUCKET_CONFIG_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        bucketName: {
            type: 'string',
            description: 'Optional name for the S3 bucket; must be globally unique',
            pattern: '^[a-z0-9.-]+$',
            minLength: 3,
            maxLength: 63
        },
        public: {
            type: 'boolean',
            description: 'Allow public read access to the bucket',
            default: false
        },
        website: {
            type: 'object',
            description: 'Static website hosting configuration',
            additionalProperties: false,
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable S3 static website hosting',
                    default: false
                },
                indexDocument: {
                    type: 'string',
                    description: 'Index document served for directory listings',
                    default: 'index.html'
                },
                errorDocument: {
                    type: 'string',
                    description: 'Error document served for missing objects',
                    default: 'error.html'
                }
            }
        },
        eventBridgeEnabled: {
            type: 'boolean',
            description: 'Emit bucket notifications to Amazon EventBridge',
            default: false
        },
        versioning: {
            type: 'boolean',
            description: 'Enable bucket versioning',
            default: false
        },
        encryption: {
            type: 'object',
            description: 'Server-side encryption configuration',
            additionalProperties: false,
            properties: {
                type: {
                    type: 'string',
                    enum: ['AES256', 'KMS'],
                    description: 'Encryption type for the bucket',
                    default: 'AES256'
                },
                kmsKeyArn: {
                    type: 'string',
                    description: 'Existing KMS key ARN to use when type is KMS',
                    pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$'
                }
            }
        },
        lifecycleRules: {
            type: 'array',
            description: 'Lifecycle rules applied to bucket objects',
            items: {
                type: 'object',
                required: ['id', 'enabled'],
                additionalProperties: false,
                properties: {
                    id: {
                        type: 'string',
                        description: 'Unique identifier for the lifecycle rule'
                    },
                    enabled: {
                        type: 'boolean',
                        description: 'Enable or disable the rule'
                    },
                    prefix: {
                        type: 'string',
                        description: 'Object key prefix filter for this rule'
                    },
                    tags: {
                        type: 'object',
                        description: 'Tag filters for this rule',
                        additionalProperties: { type: 'string' }
                    },
                    transitions: {
                        type: 'array',
                        description: 'Lifecycle transitions to alternate storage classes',
                        items: {
                            type: 'object',
                            required: ['storageClass', 'transitionAfter'],
                            additionalProperties: false,
                            properties: {
                                storageClass: {
                                    type: 'string',
                                    enum: ['STANDARD_IA', 'ONEZONE_IA', 'GLACIER', 'DEEP_ARCHIVE', 'GLACIER_IR'],
                                    description: 'Target storage class for the transition'
                                },
                                transitionAfter: {
                                    type: 'number',
                                    minimum: 1,
                                    description: 'Number of days after object creation to transition'
                                }
                            }
                        }
                    },
                    expiration: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            days: {
                                type: 'number',
                                minimum: 1,
                                description: 'Expire objects after the specified number of days'
                            },
                            expiredObjectDeleteMarker: {
                                type: 'boolean',
                                description: 'Remove delete markers for expired objects',
                                default: false
                            }
                        }
                    },
                    abortIncompleteMultipartUpload: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            daysAfterInitiation: {
                                type: 'number',
                                minimum: 1,
                                description: 'Abort incomplete multipart uploads after specified days'
                            }
                        }
                    }
                }
            }
        },
        security: {
            type: 'object',
            description: 'Security hardening configuration',
            additionalProperties: false,
            properties: {
                blockPublicAccess: {
                    type: 'boolean',
                    description: 'Apply the AWS Block Public Access configuration to the bucket',
                    default: true
                },
                requireSecureTransport: {
                    type: 'boolean',
                    description: 'Deny requests made without HTTPS (aws:SecureTransport)',
                    default: true
                },
                requireMfaDelete: {
                    type: 'boolean',
                    description: 'Require MFA for delete operations via bucket policy',
                    default: false
                },
                denyDeleteActions: {
                    type: 'boolean',
                    description: 'Deny delete-style actions to enforce immutability',
                    default: false
                },
                tools: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        clamavScan: {
                            type: 'boolean',
                            description: 'Enable the ClamAV virus scanning Lambda integration',
                            default: false
                        }
                    }
                }
            }
        },
        compliance: {
            type: 'object',
            description: 'Compliance-focused configuration',
            additionalProperties: false,
            properties: {
                auditLogging: {
                    type: 'boolean',
                    description: 'Enable server access logging to an audit bucket',
                    default: false
                },
                auditBucketName: {
                    type: 'string',
                    description: 'Override name for the audit bucket when auditLogging is enabled'
                },
                auditBucketRetentionDays: {
                    type: 'number',
                    minimum: 1,
                    description: 'Retention period in days for audit bucket lifecycle rules'
                },
                auditBucketObjectLock: {
                    type: 'object',
                    additionalProperties: false,
                    description: 'Object Lock configuration applied to the audit bucket',
                    properties: {
                        enabled: { type: 'boolean', default: false },
                        mode: { type: 'string', enum: ['GOVERNANCE', 'COMPLIANCE'] },
                        retentionDays: { type: 'number', minimum: 1 }
                    }
                },
                auditBucketLifecycleRules: {
                    type: 'array',
                    description: 'Lifecycle rules applied to the audit bucket',
                    items: {
                        type: 'object',
                        required: ['id', 'enabled'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: 'Unique identifier for the audit lifecycle rule'
                            },
                            enabled: {
                                type: 'boolean',
                                description: 'Enable or disable the audit bucket rule'
                            },
                            transitions: {
                                type: 'array',
                                description: 'Lifecycle transitions applied to audit objects',
                                items: {
                                    type: 'object',
                                    required: ['storageClass', 'transitionAfter'],
                                    additionalProperties: false,
                                    properties: {
                                        storageClass: {
                                            type: 'string',
                                            enum: ['STANDARD_IA', 'ONEZONE_IA', 'GLACIER', 'DEEP_ARCHIVE', 'GLACIER_IR'],
                                            description: 'Target storage class for the transition'
                                        },
                                        transitionAfter: {
                                            type: 'number',
                                            minimum: 1,
                                            description: 'Number of days after object creation to transition'
                                        }
                                    }
                                }
                            },
                            expiration: {
                                type: 'object',
                                additionalProperties: false,
                                properties: {
                                    days: {
                                        type: 'number',
                                        minimum: 1,
                                        description: 'Expire audit objects after the specified number of days'
                                    }
                                }
                            }
                        }
                    }
                },
                objectLock: {
                    type: 'object',
                    additionalProperties: false,
                    description: 'Object Lock configuration applied to the primary bucket',
                    properties: {
                        enabled: { type: 'boolean', default: false },
                        mode: { type: 'string', enum: ['GOVERNANCE', 'COMPLIANCE'] },
                        retentionDays: { type: 'number', minimum: 1 }
                    }
                }
            }
        },
        monitoring: {
            type: 'object',
            description: 'Monitoring and alerting configuration',
            additionalProperties: false,
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Enable CloudWatch alarms for the bucket',
                    default: false
                },
                clientErrorThreshold: {
                    type: 'number',
                    minimum: 0,
                    description: 'Alarm threshold for 4xx client errors',
                    default: 10
                },
                serverErrorThreshold: {
                    type: 'number',
                    minimum: 0,
                    description: 'Alarm threshold for 5xx server errors',
                    default: 1
                }
            }
        }
    },
    allOf: [
        {
            if: {
                properties: {
                    compliance: {
                        properties: {
                            objectLock: {
                                properties: {
                                    enabled: { const: true }
                                }
                            }
                        }
                    }
                }
            },
            then: {
                properties: {
                    versioning: {
                        const: true,
                        description: 'Versioning must be enabled when objectLock.enabled is true'
                    }
                }
            }
        }
    ]
};
class S3BucketComponentConfigBuilder extends core_1.ConfigBuilder {
    constructor(builderContext) {
        super(builderContext, exports.S3_BUCKET_CONFIG_SCHEMA);
    }
    getHardcodedFallbacks() {
        return {
            public: false,
            website: {
                enabled: false,
                indexDocument: 'index.html',
                errorDocument: 'error.html'
            },
            eventBridgeEnabled: false,
            versioning: true,
            encryption: {
                type: 'AES256'
            },
            lifecycleRules: [],
            security: {
                blockPublicAccess: true,
                requireSecureTransport: true,
                requireMfaDelete: false,
                denyDeleteActions: false,
                tools: {
                    clamavScan: false
                }
            },
            compliance: {
                auditLogging: false,
                auditBucketLifecycleRules: [
                    {
                        id: 'audit-retention',
                        enabled: true,
                        transitions: [
                            {
                                storageClass: 'GLACIER',
                                transitionAfter: 90
                            },
                            {
                                storageClass: 'DEEP_ARCHIVE',
                                transitionAfter: 365
                            }
                        ],
                        expiration: {
                            days: 365
                        }
                    }
                ],
                objectLock: {
                    enabled: false
                }
            },
            monitoring: {
                enabled: false,
                clientErrorThreshold: 10,
                serverErrorThreshold: 1
            }
        };
    }
    getComplianceFrameworkDefaults() {
        // Compliance defaults are delivered via the segregated /config/{framework}.yml files.
        // The builder defers to those platform-managed values so that all deployments remain
        // manifest-driven and auditable per the configuration standard.
        return {};
    }
}
exports.S3BucketComponentConfigBuilder = S3BucketComponentConfigBuilder;
//# sourceMappingURL=s3-bucket.builder.js.map