/**
 * Service Connect Binder Strategy (Unified)
 * Handles AWS ECS Service Connect bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '../../../contracts/platform-binding-trigger-spec.js';
import type { IamPolicy } from '../../../contracts/bindings.js';

/**
 * Service Connect capability data structure
 * @property type - Capability type identifier
 * @property serviceName - Service name
 * @property serviceArn - ECS service ARN (optional, for IAM policies)
 * @property clusterName - ECS cluster name (optional)
 * @property dnsName - Service Connect DNS name
 * @property port - Container port number (required)
 * @property portMappingName - Port mapping name for Service Connect (optional)
 * @property securityGroupId - Security group ID for the target service (required)
 * @property sgId - Alternative field name for securityGroupId (alias)
 * @property internalEndpoint - Internal HTTP endpoint URL (optional)
 * @property deploymentStrategy - Deployment strategy type (optional)
 * @property computeType - Compute type (EC2, Fargate) (optional)
 * @property mtlsEnabled - Whether mTLS is enabled for this service (optional, for compliance checks)
 *
 * @note FedRAMP Compliance: mTLS (mutual TLS) is required for service-to-service communication
 * in FedRAMP Moderate/High environments. mTLS must be configured at the Service Connect
 * service/mesh level (via ECS service configuration with TLS certificate authority ARN),
 * not at the binding level. Components should expose mtlsEnabled in capability data to
 * enable compliance validation.
 */
interface ServiceConnectCapabilityData {
  type: 'service:connect';
  serviceName: string;
  serviceArn?: string;
  clusterName?: string;
  dnsName: string;
  port: number;
  portMappingName?: string;
  securityGroupId?: string;
  sgId?: string;
  internalEndpoint?: string;
  deploymentStrategy?: string;
  computeType?: string;
  mtlsEnabled?: boolean; // Whether mTLS is enabled (for compliance validation)
}

export class ServiceConnectBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['service:connect'];

  getStrategyName(): string {
    return 'Service Connect Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'ecs-fargate-service',
        capability: 'service:connect',
        supportedAccess: ['read'],
        description: 'Bind to ECS Service Connect for service-to-service communication',
        examples: ['lambda-api -> service:connect (read)', 'ecs-task -> service:connect (read)']
      },
      {
        sourceType: '*',
        targetType: 'ecs-ec2-service',
        capability: 'service:connect',
        supportedAccess: ['read'],
        description: 'Bind to ECS Service Connect for service-to-service communication',
        examples: ['lambda-api -> service:connect (read)', 'ecs-task -> service:connect (read)']
      },
      {
        sourceType: '*',
        targetType: 'container-application',
        capability: 'service:connect',
        supportedAccess: ['read'],
        description: 'Bind to Service Connect for service-to-service communication via load balancer',
        examples: ['lambda-api -> service:connect (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Service Connect binding');
    }
    if (!source) {
      throw new Error('Source component is required for Service Connect binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[directive.capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${directive.capability}'`);
    }

    // Validate capability data structure
    if (!this.isServiceConnectCapabilityData(targetCapabilityData)) {
      throw new Error(`Invalid Service Connect capability data structure for capability '${directive.capability}'`);
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Get target security group ID (required)
    const targetSecurityGroupId = targetCapabilityData.securityGroupId || targetCapabilityData.sgId;
    if (!targetSecurityGroupId) {
      throw new Error('Service Connect capability is missing securityGroupId or sgId (security group identifier)');
    }

    // Validate port is present
    if (typeof targetCapabilityData.port !== 'number') {
      throw new Error('Service Connect capability is missing the listener port');
    }

    // Get source security group ID from directive options or source component capabilities
    let sourceSecurityGroupId: string | undefined = directive.options?.sourceSecurityGroupId;

    // Try to get source security group from source component capabilities if not in options
    if (!sourceSecurityGroupId) {
      const sourceCapabilities = source.getCapabilities();
      // Check for common security group capability patterns
      const securityGroupCapability = sourceCapabilities['security:security-group'] || 
                                     sourceCapabilities['vpc:security-group'] ||
                                     sourceCapabilities['net:security-group'];
      if (securityGroupCapability && typeof securityGroupCapability === 'object') {
        sourceSecurityGroupId = (securityGroupCapability as any).securityGroupId || 
                               (securityGroupCapability as any).sgId ||
                               (securityGroupCapability as any).id;
      }
    }

    // Note: Security group rules are not returned here because the SecurityGroupRule interface
    // doesn't specify which security group the rule applies to. Service Connect requires:
    // - Ingress rule on TARGET security group (allowing from source SG)
    // - Egress rule on SOURCE security group (allowing to target SG)
    // These rules must be applied via patches or by the resolver engine using the security
    // group IDs from target capability data and directive.options.sourceSecurityGroupId.
    // 
    // If sourceSecurityGroupId is available, the following rules should be applied:
    // - Target SG ingress: allow TCP port {port} from source SG {sourceSecurityGroupId}
    // - Source SG egress: allow TCP port {port} to target SG {targetSecurityGroupId}
    
    // If sourceSecurityGroupId is missing, only environment variables are set.
    // Security group rules must be configured separately (via patches or manual configuration).

    // Set environment variables from capability data
    environmentVariables['SERVICE_CONNECT_DNS_NAME'] = targetCapabilityData.dnsName;
    environmentVariables['SERVICE_CONNECT_PORT'] = targetCapabilityData.port.toString();
    environmentVariables['SERVICE_CONNECT_SERVICE_NAME'] = targetCapabilityData.serviceName;

    if (targetCapabilityData.serviceArn) {
      environmentVariables['SERVICE_CONNECT_SERVICE_ARN'] = targetCapabilityData.serviceArn;
    }

    if (targetCapabilityData.clusterName) {
      environmentVariables['SERVICE_CONNECT_CLUSTER_NAME'] = targetCapabilityData.clusterName;
    }

    if (targetCapabilityData.portMappingName) {
      environmentVariables['SERVICE_CONNECT_PORT_MAPPING_NAME'] = targetCapabilityData.portMappingName;
    }

    if (targetCapabilityData.internalEndpoint) {
      environmentVariables['SERVICE_CONNECT_INTERNAL_ENDPOINT'] = targetCapabilityData.internalEndpoint;
    }

    // Apply custom environment variable mappings from directive.env if present
    if (directive.env) {
      Object.entries(directive.env).forEach(([envVar, capabilityKey]) => {
        if (typeof capabilityKey === 'string') {
          const value = (targetCapabilityData as unknown as Record<string, unknown>)[capabilityKey];
          if (value !== undefined && value !== null) {
            environmentVariables[envVar] = String(value);
          }
        }
      });
    }

    // Optional: Add ECS describe permissions if service ARN is present (for service discovery/discovery)
    if (targetCapabilityData.serviceArn) {
      // Note: Service Connect primarily uses DNS and security groups, but ECS describe permissions
      // can be useful for service discovery. This is optional and can be enabled via options if needed.
      // For now, we don't add IAM policies by default to keep permissions minimal.
    }

    // FedRAMP Compliance Note: mTLS (mutual TLS) is required for service-to-service communication
    // in FedRAMP Moderate/High environments. mTLS configuration is set at the ECS Service Connect
    // service/mesh level (via serviceConnectConfiguration.services[].tls.issuerCertificateAuthority),
    // not at the binding level. Components should expose mtlsEnabled in their capability data
    // to enable compliance validation. The base class compliance evaluation will check for
    // encryption in transit requirements based on the compliance framework.
    //
    // If mtlsEnabled is false or undefined for FedRAMP frameworks, this should trigger a
    // compliance violation. This validation is handled by the base class's compliance evaluation.

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding (security group rules) handled separately or via patches
      // Required rules (if sourceSecurityGroupId is available):
      // - Target SG ({targetSecurityGroupId}) ingress: allow TCP {port} from source SG ({sourceSecurityGroupId})
      // - Source SG ({sourceSecurityGroupId}) egress: allow TCP {port} to target SG ({targetSecurityGroupId})
    };
  }

  /**
   * Type guard for Service Connect capability data
   */
  private isServiceConnectCapabilityData(data: unknown): data is ServiceConnectCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'service:connect' &&
      typeof d.serviceName === 'string' &&
      typeof d.dnsName === 'string' &&
      typeof d.port === 'number' &&
      (typeof d.securityGroupId === 'string' || typeof d.sgId === 'string')
    );
  }
}
