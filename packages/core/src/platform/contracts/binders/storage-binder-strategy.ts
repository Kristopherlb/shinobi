/**
 * Storage Binder Strategy
 * Handles binding between compute components and storage components (S3, etc.)
 */

import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { EnhancedBinderStrategy } from '../enhanced-binder-strategy.js';
import {
  EnhancedBindingContext,
  EnhancedBindingResult,
  IamPolicy,
  SecurityGroupRule,
  ComplianceAction,
  StorageCapability,
  Capability
} from '../bindings.js';

/**
 * Storage binder strategy for S3 bucket connections
 */
export class StorageBinderStrategy extends EnhancedBinderStrategy {

  getStrategyName(): string {
    return 'StorageBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    // Handle any compute component binding to storage capabilities
    const computeTypes = ['lambda-api', 'ecs-service', 'ec2-instance', 'fargate-service'];
    const storageCapabilities = ['storage:s3', 'storage:s3-bucket', 'bucket:s3'];

    return computeTypes.includes(sourceType) && storageCapabilities.includes(targetCapability);
  }

  async bind(context: EnhancedBindingContext): Promise<EnhancedBindingResult> {
    this.validateBindingContext(context);

    const capability = context.targetCapabilityData;
    const access = context.directive.access;

    // Generate environment variables
    const environmentVariables = this.generateEnvironmentVariables(context);

    // Create IAM policies for S3 access
    const iamPolicies = this.createS3IamPolicies(context, capability, access);

    // S3 doesn't require security group rules (HTTP/HTTPS access)
    const securityGroupRules: SecurityGroupRule[] = [];

    // Apply compliance restrictions
    const { policies, rules, actions } = this.applyComplianceRestrictions(
      context,
      iamPolicies,
      securityGroupRules
    );

    return Promise.resolve(this.createBindingResult(
      environmentVariables,
      policies,
      rules,
      actions,
      {
        networkConfig: this.createS3NetworkConfig(context, capability)
      }
    ));
  }

  /**
   * Create IAM policies for S3 access
   */
  private createS3IamPolicies(
    context: EnhancedBindingContext,
    capability: any,
    access: string
  ): IamPolicy[] {
    const policies: IamPolicy[] = [];
    const bucketArn = capability.resources?.arn || capability.resources?.bucketArn;

    if (!bucketArn) {
      throw new Error(`S3 bucket ARN not found in capability data for ${context.target.getName()}`);
    }

    // Base S3 access policy with least-privilege principle
    const s3Actions = this.getS3ActionsForAccess(access);

    const basePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: s3Actions,
      resources: [
        bucketArn,
        `${bucketArn}/*` // Allow access to objects within the bucket
      ],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        },
        'Bool': {
          'aws:SecureTransport': 'true' // Require HTTPS
        }
      }
    });

    policies.push({
      statement: basePolicy,
      description: `S3 ${access} access for ${context.source.getName()} -> ${context.target.getName()}`,
      complianceRequirement: 's3_access'
    });

    // Additional S3 permissions based on access level
    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      // Multipart upload permissions for large files
      const multipartPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:AbortMultipartUpload',
          's3:ListMultipartUploadParts'
        ],
        resources: [`${bucketArn}/*`],
        conditions: {
          'StringEquals': {
            'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
          },
          'Bool': {
            'aws:SecureTransport': 'true'
          }
        }
      });

      policies.push({
        statement: multipartPolicy,
        description: `S3 multipart upload access for ${context.source.getName()}`,
        complianceRequirement: 's3_multipart'
      });
    }

    // S3 bucket metadata access
    const metadataPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetBucketLocation',
        's3:ListBucket'
      ],
      resources: [bucketArn],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        },
        'Bool': {
          'aws:SecureTransport': 'true'
        }
      }
    });

    policies.push({
      statement: metadataPolicy,
      description: `S3 bucket metadata access for ${context.source.getName()}`,
      complianceRequirement: 's3_metadata'
    });

    // KMS permissions if bucket is encrypted
    if (capability.encryption?.kmsKeyId) {
      const kmsPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey',
          'kms:DescribeKey'
        ],
        resources: [capability.encryption.kmsKeyId],
        conditions: {
          'StringEquals': {
            'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
          }
        }
      });

      policies.push({
        statement: kmsPolicy,
        description: `KMS access for S3 bucket encryption in ${context.target.getName()}`,
        complianceRequirement: 'kms_s3_encryption'
      });
    }

    return policies;
  }

  /**
   * Get S3 actions based on access level
   */
  private getS3ActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:GetObjectAcl',
          's3:GetObjectVersionAcl'
        ];
      case 'write':
        return [
          's3:PutObject',
          's3:PutObjectAcl',
          's3:DeleteObject',
          's3:DeleteObjectVersion'
        ];
      case 'readwrite':
        return [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:GetObjectAcl',
          's3:GetObjectVersionAcl',
          's3:PutObject',
          's3:PutObjectAcl',
          's3:DeleteObject',
          's3:DeleteObjectVersion'
        ];
      case 'admin':
        return [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:GetObjectAcl',
          's3:GetObjectVersionAcl',
          's3:PutObject',
          's3:PutObjectAcl',
          's3:DeleteObject',
          's3:DeleteObjectVersion',
          's3:PutBucketAcl',
          's3:GetBucketAcl',
          's3:PutBucketPolicy',
          's3:GetBucketPolicy',
          's3:DeleteBucketPolicy'
        ];
      default:
        throw new Error(`Unsupported S3 access level: ${access}`);
    }
  }

  /**
   * Create S3 network configuration
   */
  private createS3NetworkConfig(context: EnhancedBindingContext, capability: any): any {
    return {
      vpc: capability.vpcEndpoint ? {
        endpoint: capability.vpcEndpoint,
        type: 's3'
      } : undefined,
      dns: capability.endpoints?.host ? {
        hostname: capability.endpoints.host,
        records: [{
          type: 'CNAME' as const,
          name: `${context.target.getName()}.${context.environment}.local`,
          value: capability.endpoints.host,
          ttl: 300
        }]
      } : undefined
    };
  }

  /**
   * Override environment variable generation for S3-specific mappings
   */
  protected generateEnvironmentVariables(
    context: EnhancedBindingContext,
    customMappings?: Record<string, string>
  ): Record<string, string> {
    const envVars: Record<string, string> = {};
    const capability = context.targetCapabilityData as any; // TODO: Add proper S3CapabilityData type

    // S3-specific default mappings
    const defaultMappings: Record<string, string> = {
      bucketName: `${context.target.getName().toUpperCase()}_BUCKET_NAME`,
      bucketArn: `${context.target.getName().toUpperCase()}_BUCKET_ARN`,
      region: `${context.target.getName().toUpperCase()}_BUCKET_REGION`,
      endpoint: `${context.target.getName().toUpperCase()}_BUCKET_ENDPOINT`,
      kmsKeyId: `${context.target.getName().toUpperCase()}_KMS_KEY_ID`
    };

    // Apply custom mappings or use defaults
    const mappings = customMappings || context.directive.env || defaultMappings;

    // Map capability data to environment variables
    if (capability.resources?.name && mappings.bucketName) {
      envVars[mappings.bucketName] = capability.resources.name;
    }
    if (capability.resources?.arn && mappings.bucketArn) {
      envVars[mappings.bucketArn] = capability.resources.arn;
    }
    if (capability.region && mappings.region) {
      envVars[mappings.region] = capability.region;
    }
    if (capability.endpoints?.host && mappings.endpoint) {
      envVars[mappings.endpoint] = capability.endpoints.host;
    }
    if (capability.encryption?.kmsKeyId && mappings.kmsKeyId) {
      envVars[mappings.kmsKeyId] = capability.encryption.kmsKeyId;
    }

    // Generate S3 URLs
    if (capability.resources?.name && capability.region) {
      const s3Url = `https://s3.${capability.region}.amazonaws.com/${capability.resources.name}`;
      envVars[`${context.target.getName().toUpperCase()}_S3_URL`] = s3Url;
    }

    return envVars;
  }

  /**
   * Override compliance restrictions for S3-specific requirements
   */
  protected applyComplianceRestrictions(
    context: EnhancedBindingContext,
    policies: IamPolicy[],
    securityGroupRules: SecurityGroupRule[]
  ): { policies: IamPolicy[]; rules: SecurityGroupRule[]; actions: ComplianceAction[] } {
    // Apply compliance restrictions
    const result = {
      policies,
      rules: securityGroupRules,
      actions: [] as ComplianceAction[]
    };

    // Add S3-specific compliance actions
    if (context.complianceFramework === 'fedramp-high' || context.complianceFramework === 'fedramp-moderate') {
      result.actions.push({
        ruleId: 'SC-7(3)',
        severity: 'warning',
        message: 'FedRAMP: VPC endpoint required for S3 access',
        framework: context.complianceFramework,
        remediation: 'Configure VPC endpoint for S3 access',
        metadata: {
          requirement: 'vpc_endpoint_s3',
          service: 's3'
        }
      });

      result.actions.push({
        ruleId: 'AU-2',
        severity: 'warning',
        message: 'FedRAMP: S3 access logging required',
        framework: context.complianceFramework,
        remediation: 'Enable S3 access logging with appropriate retention period',
        metadata: {
          requirement: 's3_access_logging',
          retention: context.complianceFramework === 'fedramp-high' ? '365_days' : '90_days'
        }
      });
    }

    return result;
  }
}
