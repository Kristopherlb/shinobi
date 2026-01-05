/**
 * Lightsail Binder Strategy (Unified)
 * Handles virtual private server bindings for Amazon Lightsail with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * Lightsail Instance capability data structure
 * @property type - Capability type identifier
 * @property instanceArn - Instance ARN (required)
 * @property instanceName - Instance name (required)
 * @property state - Instance state (required)
 * @property bundleId - Instance bundle ID (required)
 * @property publicIpAddress - Public IP address (optional)
 * @property privateIpAddress - Private IP address (optional)
 * @property sshKeyName - SSH key name (optional)
 * @property networking - Networking configuration (optional)
 */
interface LightsailInstanceCapabilityData {
  type: 'lightsail:instance';
  instanceArn: string;
  instanceName: string;
  state: { name: string };
  bundleId: string;
  publicIpAddress?: string;
  privateIpAddress?: string;
  sshKeyName?: string;
  networking?: {
    ports?: Array<{
      fromPort: number;
      toPort: number;
      protocol: string;
    }>;
  };
}

/**
 * Lightsail Database capability data structure
 * @property type - Capability type identifier
 * @property databaseArn - Database ARN (required)
 * @property relationalDatabaseName - Database name (required)
 * @property relationalDatabaseBlueprintId - Database engine (required)
 * @property relationalDatabaseBundleId - Database bundle/version (required)
 * @property masterEndpoint - Master endpoint (required)
 * @property masterUsername - Master username (optional)
 * @property backupRetentionEnabled - Backup retention enabled (optional)
 * @property parameterApplyStatus - Parameter apply status (optional)
 * @property preferredMaintenanceWindow - Maintenance window (optional)
 */
interface LightsailDatabaseCapabilityData {
  type: 'lightsail:database';
  databaseArn: string;
  relationalDatabaseName: string;
  relationalDatabaseBlueprintId: string;
  relationalDatabaseBundleId: string;
  masterEndpoint: {
    address: string;
    port: number;
  };
  masterUsername?: string;
  backupRetentionEnabled?: boolean;
  parameterApplyStatus?: string;
  preferredMaintenanceWindow?: string;
}

/**
 * Lightsail Load Balancer capability data structure
 * @property type - Capability type identifier
 * @property loadBalancerArn - Load balancer ARN (required)
 * @property loadBalancerName - Load balancer name (required)
 * @property dnsName - DNS name (required)
 * @property state - Load balancer state (required)
 * @property healthCheck - Health check configuration (optional)
 * @property tlsCertificateSummaries - TLS certificate summaries (optional)
 */
interface LightsailLoadBalancerCapabilityData {
  type: 'lightsail:load-balancer';
  loadBalancerArn: string;
  loadBalancerName: string;
  dnsName: string;
  state: { name: string };
  healthCheck?: {
    path: string;
    intervalSeconds: number;
    timeoutSeconds: number;
    healthyThresholdCount: number;
  };
  tlsCertificateSummaries?: Array<{
    name: string;
  }>;
}

/**
 * Lightsail Container Service capability data structure
 * @property type - Capability type identifier
 * @property containerServiceArn - Container service ARN (required)
 * @property containerServiceName - Container service name (required)
 * @property state - Container service state (required)
 * @property url - Container service URL (required)
 * @property power - Container service power (required)
 * @property scale - Container service scale (required)
 * @property containerImages - Container images (optional)
 */
interface LightsailContainerServiceCapabilityData {
  type: 'lightsail:container-service';
  containerServiceArn: string;
  containerServiceName: string;
  state: { name: string };
  url: string;
  power: string;
  scale: number;
  containerImages?: Array<{
    image: string;
    ecrRepositoryArn: string;
  }>;
}

/**
 * Lightsail Static IP capability data structure
 * @property type - Capability type identifier
 * @property staticIpArn - Static IP ARN (required)
 * @property staticIpName - Static IP name (required)
 * @property ipAddress - IP address (required)
 * @property attachedTo - Resource attached to (optional)
 * @property isAttached - Whether static IP is attached (required)
 */
interface LightsailStaticIpCapabilityData {
  type: 'lightsail:static-ip';
  staticIpArn: string;
  staticIpName: string;
  ipAddress: string;
  attachedTo?: string;
  isAttached: boolean;
}

/**
 * Lightsail Distribution capability data structure
 * @property type - Capability type identifier
 * @property distributionArn - Distribution ARN (required)
 * @property distributionName - Distribution name (required)
 * @property domainName - Distribution domain name (required)
 * @property status - Distribution status (required)
 * @property origin - Origin configuration (required)
 * @property defaultCacheBehavior - Default cache behavior (optional)
 * @property certificateName - SSL certificate name (optional)
 * @property isEnabled - Whether distribution is enabled (required)
 */
interface LightsailDistributionCapabilityData {
  type: 'lightsail:distribution';
  distributionArn: string;
  distributionName: string;
  domainName: string;
  status: string;
  origin: {
    name: string;
    region?: string;
    protocolPolicy?: string;
  };
  defaultCacheBehavior?: {
    behavior: string;
    cachePolicyId?: string;
  };
  certificateName?: string;
  isEnabled: boolean;
}

type LightsailCapabilityData =
  | LightsailInstanceCapabilityData
  | LightsailDatabaseCapabilityData
  | LightsailLoadBalancerCapabilityData
  | LightsailContainerServiceCapabilityData
  | LightsailStaticIpCapabilityData
  | LightsailDistributionCapabilityData;

export class LightsailBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'lightsail:instance',
    'lightsail:database',
    'lightsail:load-balancer',
    'lightsail:container-service',
    'lightsail:static-ip',
    'lightsail:distribution'
  ];

  getStrategyName(): string {
    return 'Lightsail Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'lightsail-instance',
        capability: 'lightsail:instance',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Lightsail instance for virtual private server access',
        examples: ['lambda-api -> lightsail:instance (read)', 'ci-cd -> lightsail:instance (write)']
      },
      {
        sourceType: '*',
        targetType: 'lightsail-database',
        capability: 'lightsail:database',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Lightsail database for managed database access',
        examples: ['lambda-api -> lightsail:database (read)', 'ci-cd -> lightsail:database (write)']
      },
      {
        sourceType: '*',
        targetType: 'lightsail-load-balancer',
        capability: 'lightsail:load-balancer',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Lightsail load balancer for load balancing access',
        examples: ['lambda-api -> lightsail:load-balancer (read)', 'ci-cd -> lightsail:load-balancer (write)']
      },
      {
        sourceType: '*',
        targetType: 'lightsail-container-service',
        capability: 'lightsail:container-service',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Lightsail container service for containerized applications',
        examples: ['lambda-api -> lightsail:container-service (read)', 'ci-cd -> lightsail:container-service (write)']
      },
      {
        sourceType: '*',
        targetType: 'lightsail-static-ip',
        capability: 'lightsail:static-ip',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Lightsail static IP for persistent IP address management',
        examples: ['lambda-api -> lightsail:static-ip (read)', 'ci-cd -> lightsail:static-ip (write)']
      },
      {
        sourceType: '*',
        targetType: 'lightsail-distribution',
        capability: 'lightsail:distribution',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Lightsail distribution for CDN and content delivery',
        examples: ['lambda-api -> lightsail:distribution (read)', 'ci-cd -> lightsail:distribution (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Lightsail binding');
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
      throw new Error(`Invalid access types for Lightsail binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for Lightsail binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method based on capability
    if (capability === 'lightsail:instance') {
      return await this.bindToInstance(context, targetCapabilityData, access);
    } else if (capability === 'lightsail:database') {
      return await this.bindToDatabase(context, targetCapabilityData, access);
    } else if (capability === 'lightsail:load-balancer') {
      return await this.bindToLoadBalancer(context, targetCapabilityData, access);
    } else if (capability === 'lightsail:container-service') {
      return await this.bindToContainerService(context, targetCapabilityData, access);
    } else if (capability === 'lightsail:static-ip') {
      return await this.bindToStaticIp(context, targetCapabilityData, access);
    } else if (capability === 'lightsail:distribution') {
      return await this.bindToDistribution(context, targetCapabilityData, access);
    } else {
      throw new Error(`Unsupported Lightsail capability: ${capability}`);
    }
  }

  /**
   * Bind to Lightsail instance
   */
  private async bindToInstance(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isLightsailInstanceCapabilityData(targetData)) {
      throw new Error('Invalid Lightsail instance capability data structure. Expected instanceArn, instanceName, state, and bundleId.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc: string) => this.getLightsailInstanceActionsForAccess(acc),
      'lightsail'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.instanceArn]
        }),
        description: `Lightsail instance ${primaryAccess} access`,
        complianceRequirement: `Lightsail instance ${primaryAccess} access policy`
      });
    }

    // Grant SSH key access for instance management
    if (targetData.sshKeyName) {
      const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
      const accountId = (context.target.context as any)?.accountId || '123456789012';
      
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'lightsail:GetKeyPair',
            'lightsail:GetKeyPairs'
          ],
          resources: [`arn:aws:lightsail:${region}:${accountId}:KeyPair/${targetData.sshKeyName}`]
        }),
        description: 'SSH key access for instance management',
        complianceRequirement: 'SSH key access for Lightsail instance'
      });
    }

    // Set environment variables
    environmentVariables['LIGHTSAIL_INSTANCE_NAME'] = targetData.instanceName;
    environmentVariables['LIGHTSAIL_INSTANCE_ARN'] = targetData.instanceArn;
    environmentVariables['LIGHTSAIL_INSTANCE_STATE'] = targetData.state.name;
    environmentVariables['LIGHTSAIL_INSTANCE_TYPE'] = targetData.bundleId;

    if (targetData.publicIpAddress) {
      environmentVariables['LIGHTSAIL_INSTANCE_IP'] = targetData.publicIpAddress;
    }

    if (targetData.privateIpAddress) {
      environmentVariables['LIGHTSAIL_INSTANCE_PRIVATE_IP'] = targetData.privateIpAddress;
    }

    // Configure networking
    if (targetData.networking?.ports) {
      environmentVariables['LIGHTSAIL_PORTS'] = JSON.stringify(targetData.networking.ports);
    }

    // Configure secure access if requested via options
    if (context.directive.options?.requireSecureAccess === true) {
      await this.configureSecureInstanceAccess(context, targetData, environmentVariables);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Lightsail database
   */
  private async bindToDatabase(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isLightsailDatabaseCapabilityData(targetData)) {
      throw new Error('Invalid Lightsail database capability data structure. Expected databaseArn, relationalDatabaseName, relationalDatabaseBlueprintId, relationalDatabaseBundleId, and masterEndpoint.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc: string) => this.getLightsailDatabaseActionsForAccess(acc),
      'lightsail'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.databaseArn]
        }),
        description: `Lightsail database ${primaryAccess} access`,
        complianceRequirement: `Lightsail database ${primaryAccess} access policy`
      });
    }

    // Grant master user password access
    if (targetData.masterUsername) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['lightsail:GetRelationalDatabaseMasterUserPassword'],
          resources: [targetData.databaseArn]
        }),
        description: 'Master user password access for database',
        complianceRequirement: 'Database authentication access'
      });
    }

    // Set environment variables
    environmentVariables['LIGHTSAIL_DATABASE_NAME'] = targetData.relationalDatabaseName;
    environmentVariables['LIGHTSAIL_DATABASE_ARN'] = targetData.databaseArn;
    environmentVariables['LIGHTSAIL_DATABASE_ENGINE'] = targetData.relationalDatabaseBlueprintId;
    environmentVariables['LIGHTSAIL_DATABASE_VERSION'] = targetData.relationalDatabaseBundleId;
    environmentVariables['LIGHTSAIL_DATABASE_ENDPOINT'] = targetData.masterEndpoint.address;
    environmentVariables['LIGHTSAIL_DATABASE_PORT'] = targetData.masterEndpoint.port.toString();

    if (targetData.masterUsername) {
      environmentVariables['LIGHTSAIL_DATABASE_USERNAME'] = targetData.masterUsername;
    }

    // Configure secure database access if requested via options
    if (context.directive.options?.requireSecureAccess === true) {
      await this.configureSecureDatabaseAccess(context, targetData, environmentVariables);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Lightsail load balancer
   */
  private async bindToLoadBalancer(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isLightsailLoadBalancerCapabilityData(targetData)) {
      throw new Error('Invalid Lightsail load balancer capability data structure. Expected loadBalancerArn, loadBalancerName, dnsName, and state.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc: string) => this.getLightsailLoadBalancerActionsForAccess(acc),
      'lightsail'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.loadBalancerArn]
        }),
        description: `Lightsail load balancer ${primaryAccess} access`,
        complianceRequirement: `Lightsail load balancer ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['LIGHTSAIL_LOAD_BALANCER_NAME'] = targetData.loadBalancerName;
    environmentVariables['LIGHTSAIL_LOAD_BALANCER_ARN'] = targetData.loadBalancerArn;
    environmentVariables['LIGHTSAIL_LOAD_BALANCER_DNS_NAME'] = targetData.dnsName;
    environmentVariables['LIGHTSAIL_LOAD_BALANCER_STATE'] = targetData.state.name;

    // Configure health check
    if (targetData.healthCheck) {
      environmentVariables['LIGHTSAIL_HEALTH_CHECK_PATH'] = targetData.healthCheck.path;
      environmentVariables['LIGHTSAIL_HEALTH_CHECK_INTERVAL'] = targetData.healthCheck.intervalSeconds.toString();
      environmentVariables['LIGHTSAIL_HEALTH_CHECK_TIMEOUT'] = targetData.healthCheck.timeoutSeconds.toString();
      environmentVariables['LIGHTSAIL_HEALTH_CHECK_THRESHOLD'] = targetData.healthCheck.healthyThresholdCount.toString();
    }

    // Configure SSL/TLS for secure access
    if (targetData.tlsCertificateSummaries && targetData.tlsCertificateSummaries.length > 0) {
      environmentVariables['LIGHTSAIL_TLS_CERTIFICATES'] = targetData.tlsCertificateSummaries
        .map(cert => cert.name)
        .join(',');
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Lightsail container service
   */
  private async bindToContainerService(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isLightsailContainerServiceCapabilityData(targetData)) {
      throw new Error('Invalid Lightsail container service capability data structure. Expected containerServiceArn, containerServiceName, state, url, power, and scale.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc: string) => this.getLightsailContainerServiceActionsForAccess(acc),
      'lightsail'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.containerServiceArn]
        }),
        description: `Lightsail container service ${primaryAccess} access`,
        complianceRequirement: `Lightsail container service ${primaryAccess} access policy`
      });
    }

    // Grant ECR access for container images
    if (targetData.containerImages && targetData.containerImages.length > 0) {
      const ecrArns = targetData.containerImages.map(img => img.ecrRepositoryArn);
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'ecr:GetAuthorizationToken',
            'ecr:BatchCheckLayerAvailability',
            'ecr:GetDownloadUrlForLayer',
            'ecr:BatchGetImage'
          ],
          resources: ecrArns
        }),
        description: 'ECR access permissions for container images',
        complianceRequirement: 'Container image access for Lightsail container service'
      });
    }

    // Set environment variables
    environmentVariables['LIGHTSAIL_CONTAINER_SERVICE_NAME'] = targetData.containerServiceName;
    environmentVariables['LIGHTSAIL_CONTAINER_SERVICE_ARN'] = targetData.containerServiceArn;
    environmentVariables['LIGHTSAIL_CONTAINER_SERVICE_STATE'] = targetData.state.name;
    environmentVariables['LIGHTSAIL_CONTAINER_SERVICE_URL'] = targetData.url;
    environmentVariables['LIGHTSAIL_POWER'] = targetData.power;
    environmentVariables['LIGHTSAIL_SCALE'] = targetData.scale.toString();

    // Configure container images
    if (targetData.containerImages && targetData.containerImages.length > 0) {
      environmentVariables['LIGHTSAIL_CONTAINER_IMAGES'] = targetData.containerImages
        .map(img => img.image)
        .join(',');
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Lightsail static IP
   */
  private async bindToStaticIp(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isLightsailStaticIpCapabilityData(targetData)) {
      throw new Error('Invalid Lightsail static IP capability data structure. Expected staticIpArn, staticIpName, ipAddress, and isAttached.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc: string) => this.getLightsailStaticIpActionsForAccess(acc),
      'lightsail'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.staticIpArn]
        }),
        description: `Lightsail static IP ${primaryAccess} access`,
        complianceRequirement: `Lightsail static IP ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['LIGHTSAIL_STATIC_IP_NAME'] = targetData.staticIpName;
    environmentVariables['LIGHTSAIL_STATIC_IP_ARN'] = targetData.staticIpArn;
    environmentVariables['LIGHTSAIL_STATIC_IP_ADDRESS'] = targetData.ipAddress;
    environmentVariables['LIGHTSAIL_STATIC_IP_ATTACHED'] = targetData.isAttached.toString();

    if (targetData.attachedTo) {
      environmentVariables['LIGHTSAIL_STATIC_IP_ATTACHED_TO'] = targetData.attachedTo;
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Lightsail distribution
   */
  private async bindToDistribution(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isLightsailDistributionCapabilityData(targetData)) {
      throw new Error('Invalid Lightsail distribution capability data structure. Expected distributionArn, distributionName, domainName, status, origin, and isEnabled.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc: string) => this.getLightsailDistributionActionsForAccess(acc),
      'lightsail'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.distributionArn]
        }),
        description: `Lightsail distribution ${primaryAccess} access`,
        complianceRequirement: `Lightsail distribution ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['LIGHTSAIL_DISTRIBUTION_NAME'] = targetData.distributionName;
    environmentVariables['LIGHTSAIL_DISTRIBUTION_ARN'] = targetData.distributionArn;
    environmentVariables['LIGHTSAIL_DISTRIBUTION_DOMAIN'] = targetData.domainName;
    environmentVariables['LIGHTSAIL_DISTRIBUTION_STATUS'] = targetData.status;
    environmentVariables['LIGHTSAIL_DISTRIBUTION_ENABLED'] = targetData.isEnabled.toString();
    environmentVariables['LIGHTSAIL_DISTRIBUTION_ORIGIN_NAME'] = targetData.origin.name;

    if (targetData.origin.region) {
      environmentVariables['LIGHTSAIL_DISTRIBUTION_ORIGIN_REGION'] = targetData.origin.region;
    }

    if (targetData.origin.protocolPolicy) {
      environmentVariables['LIGHTSAIL_DISTRIBUTION_ORIGIN_PROTOCOL'] = targetData.origin.protocolPolicy;
    }

    if (targetData.defaultCacheBehavior) {
      environmentVariables['LIGHTSAIL_DISTRIBUTION_CACHE_BEHAVIOR'] = targetData.defaultCacheBehavior.behavior;
      if (targetData.defaultCacheBehavior.cachePolicyId) {
        environmentVariables['LIGHTSAIL_DISTRIBUTION_CACHE_POLICY_ID'] = targetData.defaultCacheBehavior.cachePolicyId;
      }
    }

    if (targetData.certificateName) {
      environmentVariables['LIGHTSAIL_DISTRIBUTION_CERTIFICATE_NAME'] = targetData.certificateName;
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Configure secure instance access features
   */
  private async configureSecureInstanceAccess(
    context: BindingContext,
    targetData: LightsailInstanceCapabilityData,
    environmentVariables: Record<string, string>
  ): Promise<void> {
    // Configure secure SSH access
    if (targetData.sshKeyName) {
      environmentVariables['LIGHTSAIL_SSH_KEY_NAME'] = targetData.sshKeyName;
      environmentVariables['LIGHTSAIL_SSH_ACCESS_ENABLED'] = 'true';
    }

    // Configure firewall rules for secure access
    if (targetData.networking?.ports) {
      const securePorts = targetData.networking.ports.filter(port =>
        port.protocol === 'tcp' && (port.fromPort === 443 || port.fromPort === 22)
      );
      if (securePorts.length > 0) {
        environmentVariables['LIGHTSAIL_SECURE_PORTS'] = JSON.stringify(securePorts);
      }
    }

    // Configure monitoring and alerting
    environmentVariables['LIGHTSAIL_MONITORING_ENABLED'] = 'true';
  }

  /**
   * Configure secure database access features
   */
  private async configureSecureDatabaseAccess(
    context: BindingContext,
    targetData: LightsailDatabaseCapabilityData,
    environmentVariables: Record<string, string>
  ): Promise<void> {
    // Configure encrypted connections
    environmentVariables['LIGHTSAIL_DATABASE_SSL_ENABLED'] = 'true';

    // Configure backup retention for compliance
    if (targetData.backupRetentionEnabled) {
      environmentVariables['LIGHTSAIL_BACKUP_RETENTION_ENABLED'] = 'true';
      const retentionDays = context.directive.options?.backupRetentionDays;
      environmentVariables['LIGHTSAIL_BACKUP_RETENTION_DAYS'] = retentionDays ? String(retentionDays) : '7';
    }

    // Configure parameter groups for security
    if (targetData.parameterApplyStatus) {
      environmentVariables['LIGHTSAIL_PARAMETER_APPLY_STATUS'] = targetData.parameterApplyStatus;
    }

    // Configure maintenance window
    if (targetData.preferredMaintenanceWindow) {
      environmentVariables['LIGHTSAIL_MAINTENANCE_WINDOW'] = targetData.preferredMaintenanceWindow;
    }
  }

  /**
   * Get Lightsail instance IAM actions for access level
   */
  private getLightsailInstanceActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'lightsail:GetInstances',
          'lightsail:GetInstance',
          'lightsail:GetInstanceAccessDetails',
          'lightsail:GetInstancePortStates'
        ];
      case 'write':
      case 'readwrite':
        return [
          'lightsail:GetInstances',
          'lightsail:GetInstance',
          'lightsail:GetInstanceAccessDetails',
          'lightsail:GetInstancePortStates',
          'lightsail:CreateInstances',
          'lightsail:UpdateInstance',
          'lightsail:DeleteInstance',
          'lightsail:RebootInstance',
          'lightsail:StartInstance',
          'lightsail:StopInstance'
        ];
      default:
        return [];
    }
  }

  /**
   * Get Lightsail database IAM actions for access level
   */
  private getLightsailDatabaseActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'lightsail:GetRelationalDatabase',
          'lightsail:GetRelationalDatabases',
          'lightsail:GetRelationalDatabaseParameters',
          'lightsail:GetRelationalDatabaseSnapshots'
        ];
      case 'write':
      case 'readwrite':
        return [
          'lightsail:GetRelationalDatabase',
          'lightsail:GetRelationalDatabases',
          'lightsail:GetRelationalDatabaseParameters',
          'lightsail:GetRelationalDatabaseSnapshots',
          'lightsail:CreateRelationalDatabase',
          'lightsail:UpdateRelationalDatabase',
          'lightsail:DeleteRelationalDatabase',
          'lightsail:RebootRelationalDatabase',
          'lightsail:StartRelationalDatabase',
          'lightsail:StopRelationalDatabase'
        ];
      default:
        return [];
    }
  }

  /**
   * Get Lightsail load balancer IAM actions for access level
   */
  private getLightsailLoadBalancerActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'lightsail:GetLoadBalancer',
          'lightsail:GetLoadBalancers',
          'lightsail:GetLoadBalancerTlsCertificates'
        ];
      case 'write':
      case 'readwrite':
        return [
          'lightsail:GetLoadBalancer',
          'lightsail:GetLoadBalancers',
          'lightsail:GetLoadBalancerTlsCertificates',
          'lightsail:CreateLoadBalancer',
          'lightsail:UpdateLoadBalancer',
          'lightsail:DeleteLoadBalancer',
          'lightsail:AttachInstancesToLoadBalancer',
          'lightsail:DetachInstancesFromLoadBalancer'
        ];
      default:
        return [];
    }
  }

  /**
   * Get Lightsail container service IAM actions for access level
   */
  private getLightsailContainerServiceActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'lightsail:GetContainerServices',
          'lightsail:GetContainerService',
          'lightsail:GetContainerServiceDeployments'
        ];
      case 'write':
      case 'readwrite':
        return [
          'lightsail:GetContainerServices',
          'lightsail:GetContainerService',
          'lightsail:GetContainerServiceDeployments',
          'lightsail:CreateContainerService',
          'lightsail:UpdateContainerService',
          'lightsail:DeleteContainerService',
          'lightsail:CreateContainerServiceDeployment'
        ];
      default:
        return [];
    }
  }

  /**
   * Get Lightsail static IP IAM actions for access level
   */
  private getLightsailStaticIpActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'lightsail:GetStaticIps',
          'lightsail:GetStaticIp'
        ];
      case 'write':
      case 'readwrite':
        return [
          'lightsail:GetStaticIps',
          'lightsail:GetStaticIp',
          'lightsail:AllocateStaticIp',
          'lightsail:ReleaseStaticIp',
          'lightsail:AttachStaticIp',
          'lightsail:DetachStaticIp'
        ];
      default:
        return [];
    }
  }

  /**
   * Get Lightsail distribution IAM actions for access level
   */
  private getLightsailDistributionActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'lightsail:GetDistributions',
          'lightsail:GetDistribution',
          'lightsail:GetDistributionBundles'
        ];
      case 'write':
      case 'readwrite':
        return [
          'lightsail:GetDistributions',
          'lightsail:GetDistribution',
          'lightsail:GetDistributionBundles',
          'lightsail:CreateDistribution',
          'lightsail:UpdateDistribution',
          'lightsail:DeleteDistribution',
          'lightsail:UpdateDistributionBundle'
        ];
      default:
        return [];
    }
  }

  // Type guards

  private isLightsailInstanceCapabilityData(data: unknown): data is LightsailInstanceCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'lightsail:instance' &&
      typeof d.instanceArn === 'string' &&
      typeof d.instanceName === 'string' &&
      d.state && typeof (d.state as any).name === 'string' &&
      typeof d.bundleId === 'string'
    );
  }

  private isLightsailDatabaseCapabilityData(data: unknown): data is LightsailDatabaseCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'lightsail:database' &&
      typeof d.databaseArn === 'string' &&
      typeof d.relationalDatabaseName === 'string' &&
      typeof d.relationalDatabaseBlueprintId === 'string' &&
      typeof d.relationalDatabaseBundleId === 'string' &&
      d.masterEndpoint &&
      typeof (d.masterEndpoint as any).address === 'string' &&
      typeof (d.masterEndpoint as any).port === 'number'
    );
  }

  private isLightsailLoadBalancerCapabilityData(data: unknown): data is LightsailLoadBalancerCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'lightsail:load-balancer' &&
      typeof d.loadBalancerArn === 'string' &&
      typeof d.loadBalancerName === 'string' &&
      typeof d.dnsName === 'string' &&
      d.state && typeof (d.state as any).name === 'string'
    );
  }

  private isLightsailContainerServiceCapabilityData(data: unknown): data is LightsailContainerServiceCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'lightsail:container-service' &&
      typeof d.containerServiceArn === 'string' &&
      typeof d.containerServiceName === 'string' &&
      d.state && typeof (d.state as any).name === 'string' &&
      typeof d.url === 'string' &&
      typeof d.power === 'string' &&
      typeof d.scale === 'number'
    );
  }

  private isLightsailStaticIpCapabilityData(data: unknown): data is LightsailStaticIpCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'lightsail:static-ip' &&
      typeof d.staticIpArn === 'string' &&
      typeof d.staticIpName === 'string' &&
      typeof d.ipAddress === 'string' &&
      typeof d.isAttached === 'boolean'
    );
  }

  private isLightsailDistributionCapabilityData(data: unknown): data is LightsailDistributionCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Boolean(
      d.type === 'lightsail:distribution' &&
      typeof d.distributionArn === 'string' &&
      typeof d.distributionName === 'string' &&
      typeof d.domainName === 'string' &&
      typeof d.status === 'string' &&
      d.origin &&
      typeof (d.origin as any).name === 'string' &&
      typeof d.isEnabled === 'boolean'
    );
  }
}
