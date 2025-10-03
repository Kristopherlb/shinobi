/**
 * Cache Binder Strategy
 * Handles binding between compute components and cache components (ElastiCache Redis, etc.)
 */

import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { EnhancedBinderStrategy } from '../enhanced-binder-strategy.js';
import {
  EnhancedBindingContext,
  EnhancedBindingResult,
  IamPolicy,
  SecurityGroupRule,
  ComplianceAction
} from '../bindings.js';

/**
 * Cache binder strategy for ElastiCache Redis connections
 */
export class CacheBinderStrategy extends EnhancedBinderStrategy {

  getStrategyName(): string {
    return 'CacheBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    // Handle any compute component binding to cache capabilities
    const computeTypes = ['lambda-api', 'ecs-service', 'ec2-instance', 'fargate-service'];
    const cacheCapabilities = ['cache:redis', 'cache:elasticache-redis', 'cache:memcached'];

    return computeTypes.includes(sourceType) && cacheCapabilities.includes(targetCapability);
  }

  async bind(context: EnhancedBindingContext): Promise<EnhancedBindingResult> {
    this.validateBindingContext(context);

    const capability = context.targetCapabilityData;
    const access = context.directive.access;

    // Generate environment variables
    const environmentVariables = this.generateEnvironmentVariables(context);

    // Create IAM policies for cache access
    const iamPolicies = this.createCacheIamPolicies(context, capability, access);

    // Create security group rules for network access
    const securityGroupRules = this.createCacheSecurityGroupRules(context, capability);

    // Apply compliance restrictions
    const { policies, rules, actions } = this.applyComplianceRestrictions(
      context,
      iamPolicies,
      securityGroupRules
    );

    return {
      environmentVariables,
      iamPolicies: policies,
      securityGroupRules: rules,
      complianceActions: actions,
      metadata: {
        networkConfig: this.createCacheNetworkConfig(context, capability),
        sourceType: context.source.getType(),
        targetType: context.target.getType(),
        bindingType: 'cache'
      }
    };
  }

  /**
   * Create IAM policies for cache access
   */
  private createCacheIamPolicies(
    context: EnhancedBindingContext,
    capability: any,
    access: string
  ): IamPolicy[] {
    const policies: IamPolicy[] = [];

    // ElastiCache doesn't use IAM for data access (uses network security)
    // But we need IAM for cluster metadata and management
    const metadataPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'elasticache:DescribeCacheClusters',
        'elasticache:DescribeReplicationGroups',
        'elasticache:ListTagsForResource'
      ],
      resources: [
        capability.resources?.arn || '*'
      ],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        }
      }
    });

    policies.push({
      statement: metadataPolicy,
      description: `ElastiCache metadata access for ${context.source.getType()} -> ${context.target.getType()}`,
      complianceRequirement: 'elasticache_metadata'
    });

    // CloudWatch metrics access for monitoring
    const monitoringPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:ListMetrics',
        'cloudwatch:GetMetricData'
      ],
      resources: ['*'],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        }
      }
    });

    policies.push({
      statement: monitoringPolicy,
      description: `ElastiCache monitoring access for ${context.source.getType()}`,
      complianceRequirement: 'elasticache_monitoring'
    });

    // Secrets Manager access if AUTH is enabled
    if (capability.auth?.enabled && capability.secrets?.authToken) {
      const authPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret'
        ],
        resources: [capability.secrets.authToken],
        conditions: {
          'StringEquals': {
            'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
          }
        }
      });

      policies.push({
        statement: authPolicy,
        description: `ElastiCache AUTH token access for ${context.source.getType()}`,
        complianceRequirement: 'elasticache_auth'
      });
    }

    return policies;
  }

  /**
   * Create security group rules for cache access
   */
  private createCacheSecurityGroupRules(
    context: EnhancedBindingContext,
    capability: any
  ): SecurityGroupRule[] {
    const rules: SecurityGroupRule[] = [];

    // Get cache port from capability
    const cachePort = capability.endpoints?.port || this.getDefaultPortForCache(capability.type);

    if (capability.securityGroups && capability.securityGroups.length > 0) {
      capability.securityGroups.forEach((sgId: string) => {
        rules.push({
          type: 'ingress',
          peer: { kind: 'cidr', cidr: '0.0.0.0/0' }, // Will be restricted by compliance
          port: {
            from: cachePort,
            to: cachePort,
            protocol: 'tcp'
          },
          description: `Allow cache access from ${context.source.getType()} to ${context.target.getType()}`
        });
      });
    }

    // If source component has security groups, create egress rules
    const sourceSecurityGroups = this.getSourceSecurityGroups(context.source);
    if (sourceSecurityGroups.length > 0) {
      sourceSecurityGroups.forEach(sourceSgId => {
        rules.push({
          type: 'egress',
          peer: { kind: 'cidr', cidr: '0.0.0.0/0' }, // Will be restricted by compliance
          port: {
            from: cachePort,
            to: cachePort,
            protocol: 'tcp'
          },
          description: `Allow outbound cache access from ${context.source.getType()} to ${context.target.getType()}`
        });
      });
    }

    return rules;
  }

  /**
   * Get default port for cache type
   */
  private getDefaultPortForCache(cacheType: string): number {
    switch (cacheType) {
      case 'cache:redis':
      case 'cache:elasticache-redis':
        return 6379;
      case 'cache:memcached':
        return 11211;
      default:
        return 6379; // Default to Redis
    }
  }

  /**
   * Get source component security groups
   */
  private getSourceSecurityGroups(source: any): string[] {
    // This would be implemented based on how components expose their security groups
    // For now, return empty array as this depends on component implementation
    return [];
  }

  /**
   * Create cache network configuration
   */
  private createCacheNetworkConfig(context: EnhancedBindingContext, capability: any): any {
    return {
      vpc: capability.vpc ? {
        id: capability.vpc.id,
        subnets: capability.vpc.subnets || []
      } : undefined,
      dns: capability.endpoints?.host ? {
        hostname: capability.endpoints.host,
        records: [{
          type: 'CNAME' as const,
          name: `${context.target.getType()}.${context.environment}.local`,
          value: capability.endpoints.host,
          ttl: 300
        }]
      } : undefined
    };
  }

  /**
   * Override environment variable generation for cache-specific mappings
   */
  protected generateEnvironmentVariables(
    context: EnhancedBindingContext,
    customMappings?: Record<string, string>
  ): Record<string, string> {
    const envVars: Record<string, string> = {};
    const capability = context.targetCapabilityData as any; // Type assertion for cache-specific data

    // Cache-specific default mappings
    const defaultMappings: Record<string, string> = {
      host: `${context.target.getType().toUpperCase().replace('-', '_')}_CACHE_HOST`,
      port: `${context.target.getType().toUpperCase().replace('-', '_')}_CACHE_PORT`,
      authToken: `${context.target.getType().toUpperCase().replace('-', '_')}_CACHE_AUTH_TOKEN`,
      clusterEndpoint: `${context.target.getType().toUpperCase().replace('-', '_')}_CACHE_CLUSTER_ENDPOINT`,
      readEndpoint: `${context.target.getType().toUpperCase().replace('-', '_')}_CACHE_READ_ENDPOINT`,
      writeEndpoint: `${context.target.getType().toUpperCase().replace('-', '_')}_CACHE_WRITE_ENDPOINT`
    };

    // Apply custom mappings or use defaults
    const mappings = customMappings || context.directive.env || defaultMappings;

    // Map capability data to environment variables
    if (capability.endpoints?.host && mappings.host) {
      envVars[mappings.host] = capability.endpoints.host;
    }
    if (capability.endpoints?.port && mappings.port) {
      envVars[mappings.port] = capability.endpoints.port.toString();
    }
    if (capability.secrets?.authToken && mappings.authToken) {
      envVars[mappings.authToken] = capability.secrets.authToken;
    }

    // Redis cluster endpoints
    if (capability.cluster?.clusterEndpoint && mappings.clusterEndpoint) {
      envVars[mappings.clusterEndpoint] = capability.cluster.clusterEndpoint;
    }
    if (capability.cluster?.readEndpoint && mappings.readEndpoint) {
      envVars[mappings.readEndpoint] = capability.cluster.readEndpoint;
    }
    if (capability.cluster?.writeEndpoint && mappings.writeEndpoint) {
      envVars[mappings.writeEndpoint] = capability.cluster.writeEndpoint;
    }

    // Generate Redis connection URL
    if (capability.endpoints?.host && capability.endpoints?.port) {
      let redisUrl = `redis://`;

      // Add authentication if enabled and token is available
      if (capability.auth?.enabled && capability.secrets?.authToken) {
        redisUrl += `:${capability.secrets.authToken}@`;
      }

      redisUrl += `${capability.endpoints.host}:${capability.endpoints.port}`;
      envVars[`${context.target.getType().toUpperCase().replace('-', '_')}_REDIS_URL`] = redisUrl;
    }

    return envVars;
  }

  /**
   * Override compliance restrictions for cache-specific requirements
   */
  protected applyComplianceRestrictions(
    context: EnhancedBindingContext,
    policies: IamPolicy[],
    securityGroupRules: SecurityGroupRule[]
  ): { policies: IamPolicy[]; rules: SecurityGroupRule[]; actions: ComplianceAction[] } {
    // Base implementation - just return the inputs with empty actions
    const result = {
      policies,
      rules: securityGroupRules,
      actions: [] as ComplianceAction[]
    };

    // Add cache-specific compliance actions
    if (context.complianceFramework === 'fedramp-high' || context.complianceFramework === 'fedramp-moderate') {
      result.actions.push({
        ruleId: 'cache_encryption_transit',
        severity: 'error',
        message: 'FedRAMP: Cache encryption in transit required',
        framework: context.complianceFramework,
        remediation: 'Enable TLS encryption for cache connections',
        metadata: {
          requirement: 'cache_encryption_transit',
          protocol: 'TLS'
        }
      });

      result.actions.push({
        ruleId: 'cache_auth',
        severity: 'error',
        message: 'FedRAMP: Cache AUTH required',
        framework: context.complianceFramework,
        remediation: 'Enable Redis AUTH for cache access',
        metadata: {
          requirement: 'cache_auth',
          authType: 'redis_auth'
        }
      });

      // Restrict security group rules to specific CIDRs for FedRAMP
      if (context.complianceFramework === 'fedramp-high') {
        result.rules = result.rules.map(rule => {
          if (rule.peer.kind === 'cidr' && rule.peer.cidr === '0.0.0.0/0') {
            throw new Error(`FedRAMP High compliance: Cannot allow cache access from 0.0.0.0/0. Component: ${context.source.getType()}`);
          }
          return rule;
        });
      }
    }

    return result;
  }
}
