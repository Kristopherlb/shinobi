/**
 * CloudTrailBinderStrategy (Unified)
 * Handles audit:cloudtrail-trail bindings with mandatory compliance enforcement
 * 
 * Supports:
 * - Organization trails (multi-account logging)
 * - Multi-region trail support
 * - KMS encryption for log files
 * - S3 and CloudWatch Logs delivery
 * - CloudTrail Lake integration for SQL queries
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class CloudTrailBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['audit:cloudtrail-trail'];

  getStrategyName(): string {
    return 'CloudTrailBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'audit:cloudtrail-trail',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to CloudTrail trail for audit logging and compliance',
        examples: ['lambda-audit -> audit:cloudtrail-trail (read)', 'lambda-governance -> audit:cloudtrail-trail (admin)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for audit:cloudtrail-trail binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    return await this.bindToCloudTrailTrail(context, targetCapabilityData);
  }

  /**
   * Bind to audit:cloudtrail-trail
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - trailArn (required): string - CloudTrail trail ARN
   *   - s3BucketName (required): string - S3 bucket name for log delivery
   *   - trailName (optional): string - Trail name
   *   - status (optional): string - Trail status (e.g., "LOGGING", "NOT_LOGGING")
   *   - isOrganizationTrail (optional): boolean - Whether this is an organization trail
   *   - isMultiRegionTrail (optional): boolean - Whether this is a multi-region trail
   *   - lakeEventDataStoreArn (optional): string - CloudTrail Lake event data store ARN
   *   - kmsKeyId (optional): string - KMS key ID for log encryption
   *   - cloudWatchLogsLogGroupArn (optional): string - CloudWatch Logs log group ARN
   *   - eventSelectors (optional): array - Event selectors configuration
   *   - logFileValidationEnabled (optional): boolean - Log file validation enabled flag
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToCloudTrailTrail(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { directive } = context;
    const { access, options } = directive;

    if (!targetData?.trailArn) {
      throw new Error('Target component missing required trailArn property for audit:cloudtrail-trail binding');
    }
    if (!targetData?.s3BucketName) {
      throw new Error('Target component missing required s3BucketName property for audit:cloudtrail-trail binding');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {
      AWS_CLOUDTRAIL_TRAIL_ARN: targetData.trailArn,
      AWS_CLOUDTRAIL_S3_BUCKET_NAME: targetData.s3BucketName
    };

    if (targetData.trailName) {
      environmentVariables.AWS_CLOUDTRAIL_TRAIL_NAME = targetData.trailName;
    }

    if (targetData.status) {
      environmentVariables.AWS_CLOUDTRAIL_STATUS = targetData.status;
    }

    if (targetData.isOrganizationTrail !== undefined) {
      environmentVariables.AWS_CLOUDTRAIL_IS_ORGANIZATION_TRAIL = String(targetData.isOrganizationTrail);
    }

    if (targetData.isMultiRegionTrail !== undefined) {
      environmentVariables.AWS_CLOUDTRAIL_IS_MULTI_REGION_TRAIL = String(targetData.isMultiRegionTrail);
    }

    if (targetData.lakeEventDataStoreArn) {
      environmentVariables.AWS_CLOUDTRAIL_LAKE_EVENT_DATA_STORE_ARN = targetData.lakeEventDataStoreArn;
    }

    if (targetData.logFileValidationEnabled !== undefined) {
      environmentVariables.AWS_CLOUDTRAIL_LOG_FILE_VALIDATION_ENABLED = String(targetData.logFileValidationEnabled);
    }

    // IAM policies for CloudTrail operations
    if (access === 'read' || access === 'readwrite') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'cloudtrail:GetTrail',
            'cloudtrail:DescribeTrails',
            'cloudtrail:GetTrailStatus',
            'cloudtrail:ListTrails',
            'cloudtrail:LookupEvents',
            'cloudtrail:GetEventSelectors',
            'cloudtrail:GetInsightSelectors'
          ],
          resources: [targetData.trailArn]
        }),
        description: 'CloudTrail trail read access',
        complianceRequirement: 'Least privilege IAM access for CloudTrail read operations'
      });

      // S3 read access for log files
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:ListBucket'
          ],
          resources: [
            `arn:aws:s3:::${targetData.s3BucketName}`,
            `arn:aws:s3:::${targetData.s3BucketName}/*`
          ]
        }),
        description: 'S3 bucket read access for CloudTrail logs',
        complianceRequirement: 'Least privilege IAM access for reading CloudTrail log files'
      });
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'cloudtrail:CreateTrail',
            'cloudtrail:UpdateTrail',
            'cloudtrail:DeleteTrail',
            'cloudtrail:StartLogging',
            'cloudtrail:StopLogging',
            'cloudtrail:PutEventSelectors',
            'cloudtrail:PutInsightSelectors'
          ],
          resources: [targetData.trailArn]
        }),
        description: 'CloudTrail trail write access',
        complianceRequirement: 'Least privilege IAM access for CloudTrail write operations'
      });

      // S3 write access for log delivery
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            's3:PutObject',
            's3:GetBucketAcl'
          ],
          resources: [
            `arn:aws:s3:::${targetData.s3BucketName}/*`,
            `arn:aws:s3:::${targetData.s3BucketName}`
          ]
        }),
        description: 'S3 bucket write access for CloudTrail log delivery',
        complianceRequirement: 'Least privilege IAM access for CloudTrail log delivery'
      });
    }

    // CloudWatch Logs integration (if enabled)
    if (targetData.cloudWatchLogsLogGroupArn) {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'logs:DescribeLogGroups',
              'logs:DescribeLogStreams',
              'logs:GetLogEvents'
            ],
            resources: [targetData.cloudWatchLogsLogGroupArn]
          }),
          description: 'CloudWatch Logs read access for CloudTrail logs',
          complianceRequirement: 'Least privilege IAM access for reading CloudTrail logs from CloudWatch'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'logs:CreateLogDelivery',
              'logs:PutLogEvents',
              'logs:CreateLogGroup',
              'logs:CreateLogStream'
            ],
            resources: [targetData.cloudWatchLogsLogGroupArn]
          }),
          description: 'CloudWatch Logs write access for CloudTrail log delivery',
          complianceRequirement: 'Least privilege IAM access for CloudTrail CloudWatch Logs integration'
        });
      }
    }

    // CloudTrail Lake access (if enabled)
    if (targetData.lakeEventDataStoreArn) {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'cloudtrail:GetEventDataStore',
              'cloudtrail:ListEventDataStores',
              'cloudtrail:StartQuery',
              'cloudtrail:GetQueryResults'
            ],
            resources: [targetData.lakeEventDataStoreArn]
          }),
          description: 'CloudTrail Lake read access',
          complianceRequirement: 'Least privilege IAM access for CloudTrail Lake queries'
        });
      }
    }

    // KMS encryption (if enabled)
    if (targetData.kmsKeyId) {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'kms:Decrypt',
              'kms:DescribeKey'
            ],
            resources: [targetData.kmsKeyId]
          }),
          description: 'KMS decrypt access for CloudTrail log encryption',
          complianceRequirement: 'Least privilege IAM access for decrypting CloudTrail logs'
        });
      }

      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'kms:Encrypt',
              'kms:GenerateDataKey',
              'kms:CreateGrant'
            ],
            resources: [targetData.kmsKeyId]
          }),
          description: 'KMS encrypt access for CloudTrail log encryption',
          complianceRequirement: 'Least privilege IAM access for encrypting CloudTrail logs'
        });
      }
    }

    // Log file validation/integrity check support
    if (targetData.logFileValidationEnabled || options?.enableLogFileValidation) {
      if (access === 'read' || access === 'readwrite') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'cloudtrail:GetTrailStatus',
              'cloudtrail:ValidateLogs'
            ],
            resources: [targetData.trailArn]
          }),
          description: 'CloudTrail log file validation access',
          complianceRequirement: 'Least privilege IAM access for log file validation'
        });
      }
    }

    // Event selector management
    if (targetData.eventSelectors || options?.manageEventSelectors) {
      if (access === 'write' || access === 'readwrite' || access === 'admin') {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'cloudtrail:PutEventSelectors',
              'cloudtrail:GetEventSelectors',
              'cloudtrail:PutInsightSelectors',
              'cloudtrail:GetInsightSelectors'
            ],
            resources: [targetData.trailArn]
          }),
          description: 'CloudTrail event selector management access',
          complianceRequirement: 'Least privilege IAM access for event selector management'
        });
      }
    }

    // Gate admin access behind explicit option
    if (access === 'admin' && options?.requireFullAdminAccess) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['cloudtrail:*'],
          resources: ['*']
        }),
        description: 'CloudTrail admin access',
        complianceRequirement: 'Full CloudTrail access for admin operations (explicitly requested)'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }
}

