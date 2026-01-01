/**
 * CloudFront Binder Strategy (Unified)
 * Handles content delivery network bindings for Amazon CloudFront with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '../../../contracts/platform-binding-trigger-spec.js';
import type { IamPolicy } from '../../../contracts/bindings.js';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * CloudFront Distribution capability data structure
 * @property type - Capability type identifier
 * @property distributionArn - Distribution ARN (required)
 * @property distributionId - Distribution ID (required)
 * @property domainName - Distribution domain name (required)
 * @property status - Distribution status (required)
 * @property enabled - Whether distribution is enabled (required)
 * @property priceClass - Price class (required)
 * @property origins - Origin configurations (optional)
 * @property defaultCacheBehavior - Default cache behavior (optional)
 * @property viewerCertificate - Viewer certificate configuration (optional)
 * @property webACLId - WAF Web ACL ID (optional)
 * @property restrictions - Geo restrictions (optional)
 * @property logging - Logging configuration (optional)
 */
interface CloudFrontDistributionCapabilityData {
  type: 'cloudfront:distribution';
  distributionArn: string;
  distributionId: string;
  domainName: string;
  status: string;
  enabled: boolean;
  priceClass: string;
  origins?: Array<{
    id: string;
    domainName: string;
    originPath?: string;
    s3OriginConfig?: {
      originAccessIdentity?: string;
    };
    customOriginConfig?: {
      httpPort?: number;
      httpsPort?: number;
      originProtocolPolicy?: string;
    };
    customHeaders?: Array<{
      headerName: string;
      headerValue: string;
    }>;
  }>;
  defaultCacheBehavior?: {
    viewerProtocolPolicy?: string;
    allowedMethods?: string[];
    cachedMethods?: string[];
    cachePolicyId?: string;
    originRequestPolicyId?: string;
  };
  viewerCertificate?: {
    acmCertificateArn?: string;
    certificateSource?: string;
    sslSupportMethod?: string;
    minimumProtocolVersion?: string;
  };
  webACLId?: string;
  restrictions?: {
    geoRestriction?: {
      restrictionType: string;
      locations?: string[];
    };
  };
  logging?: {
    bucket: string;
    prefix: string;
  };
}

/**
 * CloudFront Origin capability data structure
 * @property type - Capability type identifier
 * @property originId - Origin ID (required)
 * @property domainName - Origin domain name (required)
 * @property originPath - Origin path (optional)
 * @property originRequestPolicyArn - Origin request policy ARN (optional)
 * @property customOriginConfig - Custom origin configuration (optional)
 * @property s3OriginConfig - S3 origin configuration (optional)
 * @property customHeaders - Custom headers (optional)
 */
interface CloudFrontOriginCapabilityData {
  type: 'cloudfront:origin';
  originId: string;
  domainName: string;
  originPath?: string;
  originRequestPolicyArn?: string;
  customOriginConfig?: {
    httpPort: number;
    httpsPort: number;
    originProtocolPolicy: string;
  };
  s3OriginConfig?: {
    originAccessIdentity: string;
  };
  customHeaders?: Array<{
    headerName: string;
    headerValue: string;
  }>;
}

/**
 * CloudFront Cache Policy capability data structure
 * @property type - Capability type identifier
 * @property cachePolicyId - Cache policy ID (required)
 * @property cachePolicyArn - Cache policy ARN (required)
 * @property name - Cache policy name (required)
 * @property comment - Cache policy comment (optional)
 * @property defaultTTL - Default TTL (optional)
 * @property maxTTL - Maximum TTL (optional)
 * @property minTTL - Minimum TTL (optional)
 * @property parametersInCacheKeyAndForwardedToOrigin - Cache key parameters (optional)
 */
interface CloudFrontCachePolicyCapabilityData {
  type: 'cloudfront:cache-policy';
  cachePolicyId: string;
  cachePolicyArn: string;
  name: string;
  comment?: string;
  defaultTTL?: number;
  maxTTL?: number;
  minTTL?: number;
  parametersInCacheKeyAndForwardedToOrigin?: {
    headersConfig?: {
      headerBehavior?: string;
      headers?: string[];
    };
    queryStringsConfig?: {
      queryStringBehavior?: string;
      queryStrings?: string[];
    };
    cookiesConfig?: {
      cookieBehavior?: string;
      cookies?: string[];
    };
  };
}

/**
 * CloudFront Function capability data structure
 * @property type - Capability type identifier
 * @property functionName - Function name (required)
 * @property functionArn - Function ARN (required)
 * @property functionCode - Function code (optional)
 * @property runtime - Function runtime (required)
 * @property comment - Function comment (optional)
 * @property stage - Function stage (required, e.g., 'DEVELOPMENT', 'LIVE')
 */
interface CloudFrontFunctionCapabilityData {
  type: 'cloudfront:function';
  functionName: string;
  functionArn: string;
  functionCode?: string;
  runtime: string;
  comment?: string;
  stage: string;
}

/**
 * CloudFront Lambda@Edge capability data structure
 * @property type - Capability type identifier
 * @property lambdaFunctionArn - Lambda function ARN (required)
 * @property eventType - Event type (required, e.g., 'viewer-request', 'origin-request', 'origin-response', 'viewer-response')
 * @property includeBody - Whether to include request body (optional)
 * @property lambdaFunctionQualifier - Lambda function version/alias (optional)
 */
interface CloudFrontLambdaEdgeCapabilityData {
  type: 'cloudfront:lambda-edge';
  lambdaFunctionArn: string;
  eventType: string;
  includeBody?: boolean;
  lambdaFunctionQualifier?: string;
}

/**
 * CloudFront Response Headers Policy capability data structure
 * @property type - Capability type identifier
 * @property responseHeadersPolicyId - Response headers policy ID (required)
 * @property responseHeadersPolicyArn - Response headers policy ARN (required)
 * @property name - Response headers policy name (required)
 * @property comment - Response headers policy comment (optional)
 * @property securityHeadersConfig - Security headers configuration (optional)
 * @property customHeadersConfig - Custom headers configuration (optional)
 * @property corsConfig - CORS configuration (optional)
 */
interface CloudFrontResponseHeadersPolicyCapabilityData {
  type: 'cloudfront:response-headers-policy';
  responseHeadersPolicyId: string;
  responseHeadersPolicyArn: string;
  name: string;
  comment?: string;
  securityHeadersConfig?: {
    strictTransportSecurity?: {
      accessControlMaxAgeSec: number;
      includeSubdomains: boolean;
      preload: boolean;
      override: boolean;
    };
    contentTypeOptions?: {
      override: boolean;
    };
    frameOptions?: {
      frameOption: string;
      override: boolean;
    };
    referrerPolicy?: {
      referrerPolicy: string;
      override: boolean;
    };
    xssProtection?: {
      modeBlock: boolean;
      protection: boolean;
      override: boolean;
    };
  };
  customHeadersConfig?: {
    items?: Array<{
      header: string;
      value: string;
      override: boolean;
    }>;
  };
  corsConfig?: {
    accessControlAllowCredentials: boolean;
    accessControlAllowHeaders?: {
      items?: string[];
    };
    accessControlAllowMethods?: {
      items?: string[];
    };
    accessControlAllowOrigins?: {
      items?: string[];
    };
    accessControlExposeHeaders?: {
      items?: string[];
    };
    accessControlMaxAgeSec?: number;
    originOverride: boolean;
  };
}

/**
 * CloudFront Field-Level Encryption capability data structure
 * @property type - Capability type identifier
 * @property fieldLevelEncryptionId - Field-level encryption ID (required)
 * @property fieldLevelEncryptionArn - Field-level encryption ARN (required)
 * @property comment - Field-level encryption comment (optional)
 * @property queryArgProfileConfig - Query argument profile configuration (optional)
 * @property contentTypeProfileConfig - Content type profile configuration (optional)
 */
interface CloudFrontFieldLevelEncryptionCapabilityData {
  type: 'cloudfront:field-level-encryption';
  fieldLevelEncryptionId: string;
  fieldLevelEncryptionArn: string;
  comment?: string;
  queryArgProfileConfig?: {
    forwardWhenQueryArgProfileIsUnknown: boolean;
    queryArgProfiles?: {
      items?: Array<{
        profileId: string;
        queryArg: string;
      }>;
    };
  };
  contentTypeProfileConfig?: {
    forwardWhenContentTypeIsUnknown: boolean;
    contentTypeProfiles?: {
      items?: Array<{
        profileId: string;
        contentType: string;
      }>;
    };
  };
}

type CloudFrontCapabilityData =
  | CloudFrontDistributionCapabilityData
  | CloudFrontOriginCapabilityData
  | CloudFrontCachePolicyCapabilityData
  | CloudFrontFunctionCapabilityData
  | CloudFrontLambdaEdgeCapabilityData
  | CloudFrontResponseHeadersPolicyCapabilityData
  | CloudFrontFieldLevelEncryptionCapabilityData;

export class CloudFrontBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'cloudfront:distribution',
    'cloudfront:origin',
    'cloudfront:cache-policy',
    'cloudfront:function',
    'cloudfront:lambda-edge',
    'cloudfront:response-headers-policy',
    'cloudfront:field-level-encryption'
  ];

  getStrategyName(): string {
    return 'CloudFront Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'cloudfront-distribution',
        capability: 'cloudfront:distribution',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to CloudFront distribution for CDN access',
        examples: ['lambda-api -> cloudfront:distribution (read)', 'ci-cd -> cloudfront:distribution (write)']
      },
      {
        sourceType: '*',
        targetType: 'cloudfront-origin',
        capability: 'cloudfront:origin',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to CloudFront origin for origin access',
        examples: ['lambda-api -> cloudfront:origin (read)', 'ci-cd -> cloudfront:origin (write)']
      },
      {
        sourceType: '*',
        targetType: 'cloudfront-cache-policy',
        capability: 'cloudfront:cache-policy',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to CloudFront cache policy for cache configuration',
        examples: ['lambda-api -> cloudfront:cache-policy (read)', 'ci-cd -> cloudfront:cache-policy (write)']
      },
      {
        sourceType: '*',
        targetType: 'cloudfront-function',
        capability: 'cloudfront:function',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to CloudFront Function for edge computing',
        examples: ['lambda-api -> cloudfront:function (read)', 'ci-cd -> cloudfront:function (write)']
      },
      {
        sourceType: '*',
        targetType: 'cloudfront-lambda-edge',
        capability: 'cloudfront:lambda-edge',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Lambda@Edge for advanced edge computing',
        examples: ['lambda-api -> cloudfront:lambda-edge (read)', 'ci-cd -> cloudfront:lambda-edge (write)']
      },
      {
        sourceType: '*',
        targetType: 'cloudfront-response-headers-policy',
        capability: 'cloudfront:response-headers-policy',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to CloudFront response headers policy for security headers and CORS',
        examples: ['lambda-api -> cloudfront:response-headers-policy (read)', 'ci-cd -> cloudfront:response-headers-policy (write)']
      },
      {
        sourceType: '*',
        targetType: 'cloudfront-field-level-encryption',
        capability: 'cloudfront:field-level-encryption',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to CloudFront field-level encryption for sensitive data protection',
        examples: ['lambda-api -> cloudfront:field-level-encryption (read)', 'ci-cd -> cloudfront:field-level-encryption (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for CloudFront binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'readwrite'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for CloudFront binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for CloudFront binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method based on capability
    if (capability === 'cloudfront:distribution') {
      return await this.bindToDistribution(context, targetCapabilityData, access);
    } else if (capability === 'cloudfront:origin') {
      return await this.bindToOrigin(context, targetCapabilityData, access);
    } else if (capability === 'cloudfront:cache-policy') {
      return await this.bindToCachePolicy(context, targetCapabilityData, access);
    } else if (capability === 'cloudfront:function') {
      return await this.bindToFunction(context, targetCapabilityData, access);
    } else if (capability === 'cloudfront:lambda-edge') {
      return await this.bindToLambdaEdge(context, targetCapabilityData, access);
    } else if (capability === 'cloudfront:response-headers-policy') {
      return await this.bindToResponseHeadersPolicy(context, targetCapabilityData, access);
    } else if (capability === 'cloudfront:field-level-encryption') {
      return await this.bindToFieldLevelEncryption(context, targetCapabilityData, access);
    } else {
      throw new Error(`Unsupported CloudFront capability: ${capability}`);
    }
  }

  /**
   * Bind to CloudFront distribution
   */
  private async bindToDistribution(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isCloudFrontDistributionCapabilityData(targetData)) {
      throw new Error('Invalid CloudFront distribution capability data structure. Expected distributionArn, distributionId, domainName, status, enabled, and priceClass.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Create IAM policies based on access level
    const actions = this.getCloudFrontDistributionActionsForAccess(primaryAccess);
    if (actions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: actions,
          resources: [targetData.distributionArn]
        }),
        description: `CloudFront distribution ${primaryAccess} access`,
        complianceRequirement: `CloudFront distribution ${primaryAccess} access policy`
      });
    }

    // Grant invalidation permissions if write access
    if (primaryAccess === 'write' || primaryAccess === 'readwrite') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'cloudfront:CreateInvalidation',
            'cloudfront:GetInvalidation',
            'cloudfront:ListInvalidations'
          ],
          resources: [targetData.distributionArn]
        }),
        description: 'CloudFront invalidation permissions',
        complianceRequirement: 'CloudFront cache invalidation for content updates'
      });
    }

    // Grant S3 access for S3 origins
    if (targetData.origins) {
      for (const origin of targetData.origins) {
        if (origin.s3OriginConfig?.originAccessIdentity) {
          const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
          const accountId = (context.target.context as any)?.accountId || '123456789012';
          
          // Extract bucket name from domain name (S3 bucket domain format)
          const bucketName = origin.domainName.replace('.s3.amazonaws.com', '').replace('.s3-website-', '').split('.')[0];
          
          iamPolicies.push({
            statement: new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetObject'],
              resources: [`arn:aws:s3:::${bucketName}/*`]
            }),
            description: `S3 origin access for CloudFront origin ${origin.id}`,
            complianceRequirement: 'S3 bucket access for CloudFront origin'
          });
        }
      }
    }

    // Set environment variables
    environmentVariables['CLOUDFRONT_DISTRIBUTION_ID'] = targetData.distributionId;
    environmentVariables['CLOUDFRONT_DISTRIBUTION_ARN'] = targetData.distributionArn;
    environmentVariables['CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME'] = targetData.domainName;
    environmentVariables['CLOUDFRONT_DISTRIBUTION_STATUS'] = targetData.status;
    environmentVariables['CLOUDFRONT_DISTRIBUTION_ENABLED'] = targetData.enabled.toString();
    environmentVariables['CLOUDFRONT_DISTRIBUTION_PRICE_CLASS'] = targetData.priceClass;

    // Configure origins
    if (targetData.origins && targetData.origins.length > 0) {
      environmentVariables['CLOUDFRONT_ORIGINS'] = JSON.stringify(targetData.origins);
    }

    // Configure default cache behavior
    if (targetData.defaultCacheBehavior) {
      environmentVariables['CLOUDFRONT_DEFAULT_CACHE_BEHAVIOR'] = JSON.stringify(targetData.defaultCacheBehavior);
    }

    // Configure secure access if requested via options
    if (context.directive.options?.requireSecureDistributionAccess === true) {
      await this.configureSecureDistributionAccess(context, targetData, environmentVariables, iamPolicies);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to CloudFront origin
   */
  private async bindToOrigin(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isCloudFrontOriginCapabilityData(targetData)) {
      throw new Error('Invalid CloudFront origin capability data structure. Expected originId and domainName.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Create IAM policies based on access level
    const actions = this.getCloudFrontOriginActionsForAccess(primaryAccess);
    if (actions.length > 0 && targetData.originRequestPolicyArn) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: actions,
          resources: [targetData.originRequestPolicyArn]
        }),
        description: `CloudFront origin ${primaryAccess} access`,
        complianceRequirement: `CloudFront origin ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['CLOUDFRONT_ORIGIN_ID'] = targetData.originId;
    environmentVariables['CLOUDFRONT_ORIGIN_DOMAIN_NAME'] = targetData.domainName;
    environmentVariables['CLOUDFRONT_ORIGIN_PATH'] = targetData.originPath || '/';

    // Configure custom origin configuration
    if (targetData.customOriginConfig) {
      environmentVariables['CLOUDFRONT_ORIGIN_HTTP_PORT'] = targetData.customOriginConfig.httpPort.toString();
      environmentVariables['CLOUDFRONT_ORIGIN_HTTPS_PORT'] = targetData.customOriginConfig.httpsPort.toString();
      environmentVariables['CLOUDFRONT_ORIGIN_PROTOCOL_POLICY'] = targetData.customOriginConfig.originProtocolPolicy;
    }

    // Configure S3 origin configuration
    if (targetData.s3OriginConfig) {
      environmentVariables['CLOUDFRONT_ORIGIN_ACCESS_IDENTITY'] = targetData.s3OriginConfig.originAccessIdentity;
    }

    // Configure custom headers
    if (targetData.customHeaders && targetData.customHeaders.length > 0) {
      environmentVariables['CLOUDFRONT_ORIGIN_CUSTOM_HEADERS'] = JSON.stringify(targetData.customHeaders);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to CloudFront cache policy
   */
  private async bindToCachePolicy(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isCloudFrontCachePolicyCapabilityData(targetData)) {
      throw new Error('Invalid CloudFront cache policy capability data structure. Expected cachePolicyId, cachePolicyArn, and name.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Create IAM policies based on access level
    const actions = this.getCloudFrontCachePolicyActionsForAccess(primaryAccess);
    if (actions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: actions,
          resources: [targetData.cachePolicyArn]
        }),
        description: `CloudFront cache policy ${primaryAccess} access`,
        complianceRequirement: `CloudFront cache policy ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['CLOUDFRONT_CACHE_POLICY_ID'] = targetData.cachePolicyId;
    environmentVariables['CLOUDFRONT_CACHE_POLICY_ARN'] = targetData.cachePolicyArn;
    environmentVariables['CLOUDFRONT_CACHE_POLICY_NAME'] = targetData.name;

    if (targetData.comment) {
      environmentVariables['CLOUDFRONT_CACHE_POLICY_COMMENT'] = targetData.comment;
    }

    // Configure TTL settings
    if (targetData.defaultTTL !== undefined) {
      environmentVariables['CLOUDFRONT_CACHE_DEFAULT_TTL'] = targetData.defaultTTL.toString();
    }

    if (targetData.maxTTL !== undefined) {
      environmentVariables['CLOUDFRONT_CACHE_MAX_TTL'] = targetData.maxTTL.toString();
    }

    if (targetData.minTTL !== undefined) {
      environmentVariables['CLOUDFRONT_CACHE_MIN_TTL'] = targetData.minTTL.toString();
    }

    // Configure cache key parameters
    if (targetData.parametersInCacheKeyAndForwardedToOrigin) {
      const params = targetData.parametersInCacheKeyAndForwardedToOrigin;
      if (params.headersConfig) {
        environmentVariables['CLOUDFRONT_CACHE_HEADERS'] = JSON.stringify(params.headersConfig);
      }
      if (params.queryStringsConfig) {
        environmentVariables['CLOUDFRONT_CACHE_QUERY_STRINGS'] = JSON.stringify(params.queryStringsConfig);
      }
      if (params.cookiesConfig) {
        environmentVariables['CLOUDFRONT_CACHE_COOKIES'] = JSON.stringify(params.cookiesConfig);
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to CloudFront Function
   */
  private async bindToFunction(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isCloudFrontFunctionCapabilityData(targetData)) {
      throw new Error('Invalid CloudFront Function capability data structure. Expected functionName, functionArn, runtime, and stage.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Create IAM policies based on access level
    const actions = this.getCloudFrontFunctionActionsForAccess(primaryAccess);
    if (actions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: actions,
          resources: [targetData.functionArn]
        }),
        description: `CloudFront Function ${primaryAccess} access`,
        complianceRequirement: `CloudFront Function ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['CLOUDFRONT_FUNCTION_NAME'] = targetData.functionName;
    environmentVariables['CLOUDFRONT_FUNCTION_ARN'] = targetData.functionArn;
    environmentVariables['CLOUDFRONT_FUNCTION_RUNTIME'] = targetData.runtime;
    environmentVariables['CLOUDFRONT_FUNCTION_STAGE'] = targetData.stage;

    if (targetData.comment) {
      environmentVariables['CLOUDFRONT_FUNCTION_COMMENT'] = targetData.comment;
    }

    // Note: Function code is not exposed as env var for security reasons
    // It should be managed through CloudFront API or infrastructure as code

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Lambda@Edge
   */
  private async bindToLambdaEdge(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isCloudFrontLambdaEdgeCapabilityData(targetData)) {
      throw new Error('Invalid CloudFront Lambda@Edge capability data structure. Expected lambdaFunctionArn and eventType.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Create IAM policies for Lambda@Edge
    // Lambda@Edge requires permissions on the Lambda function, not CloudFront
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';
    
    // Extract function name from ARN (format: arn:aws:lambda:region:account:function:name:qualifier)
    const functionNameMatch = targetData.lambdaFunctionArn.match(/function:([^:]+)/);
    const functionName = functionNameMatch ? functionNameMatch[1] : targetData.lambdaFunctionArn.split(':').pop() || 'unknown';
    
    const lambdaActions = this.getLambdaEdgeActionsForAccess(primaryAccess);
    if (lambdaActions.length > 0) {
      // Lambda@Edge functions must be in us-east-1
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: lambdaActions,
          resources: [
            `arn:aws:lambda:us-east-1:${accountId}:function:${functionName}`,
            `arn:aws:lambda:us-east-1:${accountId}:function:${functionName}:*`
          ]
        }),
        description: `Lambda@Edge ${primaryAccess} access`,
        complianceRequirement: `Lambda@Edge function ${primaryAccess} access policy`
      });
    }

    // Grant CloudFront permissions to invoke Lambda@Edge
    if (primaryAccess === 'write' || primaryAccess === 'readwrite') {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'lambda:GetFunction',
            'lambda:EnableReplication',
            'lambda:GetFunctionConfiguration'
          ],
          resources: [targetData.lambdaFunctionArn]
        }),
        description: 'CloudFront Lambda@Edge invocation permissions',
        complianceRequirement: 'Lambda@Edge function association for CloudFront'
      });
    }

    // Set environment variables
    environmentVariables['CLOUDFRONT_LAMBDA_EDGE_FUNCTION_ARN'] = targetData.lambdaFunctionArn;
    environmentVariables['CLOUDFRONT_LAMBDA_EDGE_EVENT_TYPE'] = targetData.eventType;
    environmentVariables['CLOUDFRONT_LAMBDA_EDGE_INCLUDE_BODY'] = (targetData.includeBody ?? false).toString();

    if (targetData.lambdaFunctionQualifier) {
      environmentVariables['CLOUDFRONT_LAMBDA_EDGE_FUNCTION_QUALIFIER'] = targetData.lambdaFunctionQualifier;
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to CloudFront Response Headers Policy
   */
  private async bindToResponseHeadersPolicy(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isCloudFrontResponseHeadersPolicyCapabilityData(targetData)) {
      throw new Error('Invalid CloudFront response headers policy capability data structure. Expected responseHeadersPolicyId, responseHeadersPolicyArn, and name.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Create IAM policies based on access level
    const actions = this.getCloudFrontResponseHeadersPolicyActionsForAccess(primaryAccess);
    if (actions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: actions,
          resources: [targetData.responseHeadersPolicyArn]
        }),
        description: `CloudFront response headers policy ${primaryAccess} access`,
        complianceRequirement: `CloudFront response headers policy ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['CLOUDFRONT_RESPONSE_HEADERS_POLICY_ID'] = targetData.responseHeadersPolicyId;
    environmentVariables['CLOUDFRONT_RESPONSE_HEADERS_POLICY_ARN'] = targetData.responseHeadersPolicyArn;
    environmentVariables['CLOUDFRONT_RESPONSE_HEADERS_POLICY_NAME'] = targetData.name;

    if (targetData.comment) {
      environmentVariables['CLOUDFRONT_RESPONSE_HEADERS_POLICY_COMMENT'] = targetData.comment;
    }

    // Configure security headers
    if (targetData.securityHeadersConfig) {
      const secHeaders = targetData.securityHeadersConfig;
      if (secHeaders.strictTransportSecurity) {
        environmentVariables['CLOUDFRONT_SECURITY_HSTS_ENABLED'] = 'true';
        environmentVariables['CLOUDFRONT_SECURITY_HSTS_MAX_AGE'] = secHeaders.strictTransportSecurity.accessControlMaxAgeSec.toString();
        environmentVariables['CLOUDFRONT_SECURITY_HSTS_INCLUDE_SUBDOMAINS'] = secHeaders.strictTransportSecurity.includeSubdomains.toString();
        environmentVariables['CLOUDFRONT_SECURITY_HSTS_PRELOAD'] = secHeaders.strictTransportSecurity.preload.toString();
      }
      if (secHeaders.contentTypeOptions) {
        environmentVariables['CLOUDFRONT_SECURITY_CONTENT_TYPE_OPTIONS_ENABLED'] = 'true';
      }
      if (secHeaders.frameOptions) {
        environmentVariables['CLOUDFRONT_SECURITY_FRAME_OPTIONS'] = secHeaders.frameOptions.frameOption;
      }
      if (secHeaders.referrerPolicy) {
        environmentVariables['CLOUDFRONT_SECURITY_REFERRER_POLICY'] = secHeaders.referrerPolicy.referrerPolicy;
      }
      if (secHeaders.xssProtection) {
        environmentVariables['CLOUDFRONT_SECURITY_XSS_PROTECTION_ENABLED'] = 'true';
        environmentVariables['CLOUDFRONT_SECURITY_XSS_PROTECTION_MODE_BLOCK'] = secHeaders.xssProtection.modeBlock.toString();
      }
    }

    // Configure custom headers
    if (targetData.customHeadersConfig?.items && targetData.customHeadersConfig.items.length > 0) {
      environmentVariables['CLOUDFRONT_CUSTOM_HEADERS'] = JSON.stringify(targetData.customHeadersConfig.items);
    }

    // Configure CORS
    if (targetData.corsConfig) {
      environmentVariables['CLOUDFRONT_CORS_ENABLED'] = 'true';
      environmentVariables['CLOUDFRONT_CORS_ALLOW_CREDENTIALS'] = targetData.corsConfig.accessControlAllowCredentials.toString();
      if (targetData.corsConfig.accessControlAllowHeaders?.items) {
        environmentVariables['CLOUDFRONT_CORS_ALLOW_HEADERS'] = targetData.corsConfig.accessControlAllowHeaders.items.join(',');
      }
      if (targetData.corsConfig.accessControlAllowMethods?.items) {
        environmentVariables['CLOUDFRONT_CORS_ALLOW_METHODS'] = targetData.corsConfig.accessControlAllowMethods.items.join(',');
      }
      if (targetData.corsConfig.accessControlAllowOrigins?.items) {
        environmentVariables['CLOUDFRONT_CORS_ALLOW_ORIGINS'] = targetData.corsConfig.accessControlAllowOrigins.items.join(',');
      }
      if (targetData.corsConfig.accessControlExposeHeaders?.items) {
        environmentVariables['CLOUDFRONT_CORS_EXPOSE_HEADERS'] = targetData.corsConfig.accessControlExposeHeaders.items.join(',');
      }
      if (targetData.corsConfig.accessControlMaxAgeSec !== undefined) {
        environmentVariables['CLOUDFRONT_CORS_MAX_AGE'] = targetData.corsConfig.accessControlMaxAgeSec.toString();
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to CloudFront Field-Level Encryption
   */
  private async bindToFieldLevelEncryption(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isCloudFrontFieldLevelEncryptionCapabilityData(targetData)) {
      throw new Error('Invalid CloudFront field-level encryption capability data structure. Expected fieldLevelEncryptionId and fieldLevelEncryptionArn.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Create IAM policies based on access level
    const actions = this.getCloudFrontFieldLevelEncryptionActionsForAccess(primaryAccess);
    if (actions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: actions,
          resources: [targetData.fieldLevelEncryptionArn]
        }),
        description: `CloudFront field-level encryption ${primaryAccess} access`,
        complianceRequirement: `CloudFront field-level encryption ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['CLOUDFRONT_FIELD_LEVEL_ENCRYPTION_ID'] = targetData.fieldLevelEncryptionId;
    environmentVariables['CLOUDFRONT_FIELD_LEVEL_ENCRYPTION_ARN'] = targetData.fieldLevelEncryptionArn;

    if (targetData.comment) {
      environmentVariables['CLOUDFRONT_FIELD_LEVEL_ENCRYPTION_COMMENT'] = targetData.comment;
    }

    // Configure query argument profile
    if (targetData.queryArgProfileConfig) {
      environmentVariables['CLOUDFRONT_FLE_QUERY_ARG_FORWARD_UNKNOWN'] = targetData.queryArgProfileConfig.forwardWhenQueryArgProfileIsUnknown.toString();
      if (targetData.queryArgProfileConfig.queryArgProfiles?.items && targetData.queryArgProfileConfig.queryArgProfiles.items.length > 0) {
        environmentVariables['CLOUDFRONT_FLE_QUERY_ARG_PROFILES'] = JSON.stringify(targetData.queryArgProfileConfig.queryArgProfiles.items);
      }
    }

    // Configure content type profile
    if (targetData.contentTypeProfileConfig) {
      environmentVariables['CLOUDFRONT_FLE_CONTENT_TYPE_FORWARD_UNKNOWN'] = targetData.contentTypeProfileConfig.forwardWhenContentTypeIsUnknown.toString();
      if (targetData.contentTypeProfileConfig.contentTypeProfiles?.items && targetData.contentTypeProfileConfig.contentTypeProfiles.items.length > 0) {
        environmentVariables['CLOUDFRONT_FLE_CONTENT_TYPE_PROFILES'] = JSON.stringify(targetData.contentTypeProfileConfig.contentTypeProfiles.items);
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Configure secure distribution access features
   */
  private async configureSecureDistributionAccess(
    context: BindingContext,
    targetData: CloudFrontDistributionCapabilityData,
    environmentVariables: Record<string, string>,
    iamPolicies: IamPolicy[]
  ): Promise<void> {
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';

    // Configure HTTPS only
    environmentVariables['CLOUDFRONT_HTTPS_ONLY_ENABLED'] = 'true';
    environmentVariables['CLOUDFRONT_VIEWER_PROTOCOL_POLICY'] = 'redirect-to-https';

    // Configure SSL certificate
    if (targetData.viewerCertificate?.acmCertificateArn) {
      environmentVariables['CLOUDFRONT_SSL_CERTIFICATE_ARN'] = targetData.viewerCertificate.acmCertificateArn;
      environmentVariables['CLOUDFRONT_SSL_CERTIFICATE_SOURCE'] = targetData.viewerCertificate.certificateSource || 'acm';
      
      if (targetData.viewerCertificate.sslSupportMethod) {
        environmentVariables['CLOUDFRONT_SSL_SUPPORT_METHOD'] = targetData.viewerCertificate.sslSupportMethod;
      }
      
      if (targetData.viewerCertificate.minimumProtocolVersion) {
        environmentVariables['CLOUDFRONT_MINIMUM_PROTOCOL_VERSION'] = targetData.viewerCertificate.minimumProtocolVersion;
      }

      // Grant ACM permissions
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['acm:DescribeCertificate'],
          resources: [targetData.viewerCertificate.acmCertificateArn]
        }),
        description: 'ACM certificate access permissions for HTTPS',
        complianceRequirement: 'SSL/TLS certificate management'
      });
    }

    // Configure WAF
    if (targetData.webACLId) {
      environmentVariables['CLOUDFRONT_WAF_WEB_ACL_ID'] = targetData.webACLId;

      // Grant WAF permissions
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['wafv2:GetWebACL'],
          resources: [targetData.webACLId]
        }),
        description: 'WAF Web ACL access permissions',
        complianceRequirement: 'Web application firewall protection'
      });
    }

    // Configure geo restrictions
    if (targetData.restrictions?.geoRestriction) {
      environmentVariables['CLOUDFRONT_GEO_RESTRICTION_ENABLED'] = 'true';
      environmentVariables['CLOUDFRONT_GEO_RESTRICTION_TYPE'] = targetData.restrictions.geoRestriction.restrictionType;

      if (targetData.restrictions.geoRestriction.locations && targetData.restrictions.geoRestriction.locations.length > 0) {
        environmentVariables['CLOUDFRONT_GEO_RESTRICTION_LOCATIONS'] = targetData.restrictions.geoRestriction.locations.join(',');
      }
    }

    // Configure logging
    if (targetData.logging) {
      environmentVariables['CLOUDFRONT_ACCESS_LOGGING_ENABLED'] = 'true';
      environmentVariables['CLOUDFRONT_LOG_BUCKET'] = targetData.logging.bucket;
      environmentVariables['CLOUDFRONT_LOG_PREFIX'] = targetData.logging.prefix;

      // Grant S3 permissions for logging
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:PutObject'],
          resources: [`arn:aws:s3:::${targetData.logging.bucket}/${targetData.logging.prefix}*`]
        }),
        description: 'S3 access permissions for CloudFront logging',
        complianceRequirement: 'CloudFront access logging'
      });
    }

    // Configure real-time metrics
    environmentVariables['CLOUDFRONT_REAL_TIME_METRICS_ENABLED'] = 'true';

    // Grant CloudWatch permissions
    iamPolicies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'cloudwatch:PutMetricData',
          'cloudwatch:GetMetricStatistics'
        ],
        resources: ['*']
      }),
      description: 'CloudWatch permissions for CloudFront metrics',
      complianceRequirement: 'CloudFront monitoring and metrics'
    });
  }

  /**
   * Get CloudFront distribution IAM actions for access level
   */
  private getCloudFrontDistributionActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'cloudfront:GetDistribution',
          'cloudfront:GetDistributionConfig',
          'cloudfront:ListDistributions'
        ];
      case 'write':
      case 'readwrite':
        return [
          'cloudfront:GetDistribution',
          'cloudfront:GetDistributionConfig',
          'cloudfront:ListDistributions',
          'cloudfront:CreateDistribution',
          'cloudfront:UpdateDistribution',
          'cloudfront:DeleteDistribution'
        ];
      default:
        return [];
    }
  }

  /**
   * Get CloudFront origin IAM actions for access level
   */
  private getCloudFrontOriginActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'cloudfront:GetOriginRequestPolicy',
          'cloudfront:ListOriginRequestPolicies'
        ];
      case 'write':
      case 'readwrite':
        return [
          'cloudfront:GetOriginRequestPolicy',
          'cloudfront:ListOriginRequestPolicies',
          'cloudfront:CreateOriginRequestPolicy',
          'cloudfront:UpdateOriginRequestPolicy',
          'cloudfront:DeleteOriginRequestPolicy'
        ];
      default:
        return [];
    }
  }

  /**
   * Get CloudFront cache policy IAM actions for access level
   */
  private getCloudFrontCachePolicyActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'cloudfront:GetCachePolicy',
          'cloudfront:ListCachePolicies'
        ];
      case 'write':
      case 'readwrite':
        return [
          'cloudfront:GetCachePolicy',
          'cloudfront:ListCachePolicies',
          'cloudfront:CreateCachePolicy',
          'cloudfront:UpdateCachePolicy',
          'cloudfront:DeleteCachePolicy'
        ];
      default:
        return [];
    }
  }

  /**
   * Get CloudFront Function IAM actions for access level
   */
  private getCloudFrontFunctionActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'cloudfront:GetFunction',
          'cloudfront:ListFunctions',
          'cloudfront:DescribeFunction'
        ];
      case 'write':
      case 'readwrite':
        return [
          'cloudfront:GetFunction',
          'cloudfront:ListFunctions',
          'cloudfront:DescribeFunction',
          'cloudfront:CreateFunction',
          'cloudfront:UpdateFunction',
          'cloudfront:DeleteFunction',
          'cloudfront:PublishFunction',
          'cloudfront:TestFunction'
        ];
      default:
        return [];
    }
  }

  /**
   * Get Lambda@Edge IAM actions for access level
   */
  private getLambdaEdgeActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'lambda:GetFunction',
          'lambda:GetFunctionConfiguration',
          'lambda:ListVersionsByFunction',
          'lambda:ListAliases'
        ];
      case 'write':
      case 'readwrite':
        return [
          'lambda:GetFunction',
          'lambda:GetFunctionConfiguration',
          'lambda:ListVersionsByFunction',
          'lambda:ListAliases',
          'lambda:UpdateFunctionCode',
          'lambda:UpdateFunctionConfiguration',
          'lambda:PublishVersion',
          'lambda:CreateAlias',
          'lambda:UpdateAlias',
          'lambda:DeleteFunction'
        ];
      default:
        return [];
    }
  }

  /**
   * Get CloudFront Response Headers Policy IAM actions for access level
   */
  private getCloudFrontResponseHeadersPolicyActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'cloudfront:GetResponseHeadersPolicy',
          'cloudfront:ListResponseHeadersPolicies'
        ];
      case 'write':
      case 'readwrite':
        return [
          'cloudfront:GetResponseHeadersPolicy',
          'cloudfront:ListResponseHeadersPolicies',
          'cloudfront:CreateResponseHeadersPolicy',
          'cloudfront:UpdateResponseHeadersPolicy',
          'cloudfront:DeleteResponseHeadersPolicy'
        ];
      default:
        return [];
    }
  }

  /**
   * Get CloudFront Field-Level Encryption IAM actions for access level
   */
  private getCloudFrontFieldLevelEncryptionActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'cloudfront:GetFieldLevelEncryption',
          'cloudfront:GetFieldLevelEncryptionConfig',
          'cloudfront:ListFieldLevelEncryptionConfigs'
        ];
      case 'write':
      case 'readwrite':
        return [
          'cloudfront:GetFieldLevelEncryption',
          'cloudfront:GetFieldLevelEncryptionConfig',
          'cloudfront:ListFieldLevelEncryptionConfigs',
          'cloudfront:CreateFieldLevelEncryptionConfig',
          'cloudfront:UpdateFieldLevelEncryptionConfig',
          'cloudfront:DeleteFieldLevelEncryptionConfig'
        ];
      default:
        return [];
    }
  }

  // Type guards

  private isCloudFrontDistributionCapabilityData(data: unknown): data is CloudFrontDistributionCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'cloudfront:distribution' &&
      typeof d.distributionArn === 'string' &&
      typeof d.distributionId === 'string' &&
      typeof d.domainName === 'string' &&
      typeof d.status === 'string' &&
      typeof d.enabled === 'boolean' &&
      typeof d.priceClass === 'string'
    );
  }

  private isCloudFrontOriginCapabilityData(data: unknown): data is CloudFrontOriginCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'cloudfront:origin' &&
      typeof d.originId === 'string' &&
      typeof d.domainName === 'string'
    );
  }

  private isCloudFrontCachePolicyCapabilityData(data: unknown): data is CloudFrontCachePolicyCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'cloudfront:cache-policy' &&
      typeof d.cachePolicyId === 'string' &&
      typeof d.cachePolicyArn === 'string' &&
      typeof d.name === 'string'
    );
  }

  private isCloudFrontFunctionCapabilityData(data: unknown): data is CloudFrontFunctionCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'cloudfront:function' &&
      typeof d.functionName === 'string' &&
      typeof d.functionArn === 'string' &&
      typeof d.runtime === 'string' &&
      typeof d.stage === 'string'
    );
  }

  private isCloudFrontLambdaEdgeCapabilityData(data: unknown): data is CloudFrontLambdaEdgeCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'cloudfront:lambda-edge' &&
      typeof d.lambdaFunctionArn === 'string' &&
      typeof d.eventType === 'string'
    );
  }

  private isCloudFrontResponseHeadersPolicyCapabilityData(data: unknown): data is CloudFrontResponseHeadersPolicyCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'cloudfront:response-headers-policy' &&
      typeof d.responseHeadersPolicyId === 'string' &&
      typeof d.responseHeadersPolicyArn === 'string' &&
      typeof d.name === 'string'
    );
  }

  private isCloudFrontFieldLevelEncryptionCapabilityData(data: unknown): data is CloudFrontFieldLevelEncryptionCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'cloudfront:field-level-encryption' &&
      typeof d.fieldLevelEncryptionId === 'string' &&
      typeof d.fieldLevelEncryptionArn === 'string'
    );
  }
}
