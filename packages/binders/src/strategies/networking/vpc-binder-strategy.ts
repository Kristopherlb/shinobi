/**
 * VPC Binder Strategy (Unified)
 * Handles Virtual Private Cloud bindings for Amazon VPC with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy, SecurityGroupRule } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * VPC Network capability data structure
 * @property type - Capability type identifier
 * @property vpcId - VPC identifier
 * @property vpcArn - VPC ARN
 * @property cidrBlock - VPC CIDR block
 * @property state - VPC state (e.g., 'available')
 * @property isDefault - Whether this is the default VPC
 * @property enableDnsHostnames - Whether DNS hostnames are enabled
 * @property enableDnsSupport - Whether DNS support is enabled
 * @property flowLogsEnabled - Whether VPC Flow Logs are enabled
 * @property vpcEndpoints - List of VPC endpoint service names (optional)
 * @property networkAcls - Network ACL configuration (optional)
 */
interface VpcNetworkCapabilityData {
  type: 'vpc:network' | 'net:vpc' | 'networking:vpc';
  vpcId: string;
  vpcArn: string;
  cidrBlock: string;
  state: string;
  isDefault: boolean;
  enableDnsHostnames?: boolean;
  enableDnsSupport?: boolean;
  flowLogsEnabled?: boolean;
  vpcEndpoints?: string[];
  networkAcls?: unknown[];
}

/**
 * VPC Subnet capability data structure
 * @property type - Capability type identifier
 * @property subnetId - Subnet identifier
 * @property subnetArn - Subnet ARN
 * @property cidrBlock - Subnet CIDR block
 * @property availabilityZone - Availability zone
 * @property state - Subnet state (e.g., 'available')
 * @property vpcId - VPC identifier
 * @property subnetType - Subnet type ('public', 'private', 'isolated')
 * @property mapPublicIpOnLaunch - Whether to map public IP on launch
 */
interface VpcSubnetCapabilityData {
  type: 'vpc:subnet';
  subnetId: string;
  subnetArn: string;
  cidrBlock: string;
  availabilityZone: string;
  state: string;
  vpcId: string;
  subnetType?: 'public' | 'private' | 'isolated';
  mapPublicIpOnLaunch?: boolean;
}

/**
 * VPC Security Group capability data structure
 * @property type - Capability type identifier
 * @property securityGroupId - Security group identifier
 * @property securityGroupArn - Security group ARN
 * @property groupName - Security group name
 * @property description - Security group description
 * @property vpcId - VPC identifier
 * @property securityGroupRules - Security group rules (optional)
 */
interface VpcSecurityGroupCapabilityData {
  type: 'vpc:security-group';
  securityGroupId: string;
  securityGroupArn: string;
  groupName: string;
  description: string;
  vpcId: string;
  securityGroupRules?: Array<{
    isEgress: boolean;
    [key: string]: unknown;
  }>;
}

/**
 * VPC Route Table capability data structure
 * @property type - Capability type identifier
 * @property routeTableId - Route table identifier
 * @property routeTableArn - Route table ARN
 * @property vpcId - VPC identifier
 * @property routes - Route configuration (optional)
 * @property associations - Route table associations (optional)
 */
interface VpcRouteTableCapabilityData {
  type: 'vpc:route-table';
  routeTableId: string;
  routeTableArn: string;
  vpcId: string;
  routes?: unknown[];
  associations?: unknown[];
}

/**
 * VPC NAT Gateway capability data structure
 * @property type - Capability type identifier
 * @property natGatewayId - NAT Gateway identifier
 * @property natGatewayArn - NAT Gateway ARN
 * @property state - NAT Gateway state (e.g., 'available')
 * @property subnetId - Subnet identifier
 * @property natGatewayAddresses - NAT Gateway addresses (optional)
 * @property connectivityType - Connectivity type ('public' or 'private')
 */
interface VpcNatGatewayCapabilityData {
  type: 'vpc:nat-gateway';
  natGatewayId: string;
  natGatewayArn: string;
  state: string;
  subnetId: string;
  natGatewayAddresses?: Array<{ publicIp?: string }>;
  connectivityType?: 'public' | 'private';
}

/**
 * VPC Network ACL capability data structure
 * @property type - Capability type identifier
 * @property networkAclId - Network ACL identifier
 * @property networkAclArn - Network ACL ARN
 * @property vpcId - VPC identifier
 * @property isDefault - Whether this is the default network ACL
 * @property entries - Network ACL entries (optional)
 */
interface VpcNetworkAclCapabilityData {
  type: 'vpc:nacl';
  networkAclId: string;
  networkAclArn: string;
  vpcId: string;
  isDefault: boolean;
  entries?: Array<{
    ruleNumber: number;
    protocol: string;
    ruleAction: 'allow' | 'deny';
    cidrBlock?: string;
    ipv6CidrBlock?: string;
    icmpTypeCode?: { code?: number; type?: number };
    portRange?: { from?: number; to?: number };
    egress: boolean;
  }>;
}

/**
 * VPC Peering connection capability data structure
 * @property type - Capability type identifier
 * @property peeringConnectionId - VPC Peering connection identifier
 * @property peeringConnectionArn - VPC Peering connection ARN
 * @property vpcId - Local VPC identifier
 * @property peerVpcId - Peer VPC identifier
 * @property status - Peering connection status (e.g., 'active')
 * @property accepterVpcInfo - Accepter VPC information (optional)
 * @property requesterVpcInfo - Requester VPC information (optional)
 */
interface VpcPeeringCapabilityData {
  type: 'vpc:peering';
  peeringConnectionId: string;
  peeringConnectionArn: string;
  vpcId: string;
  peerVpcId: string;
  status: string;
  accepterVpcInfo?: {
    vpcId: string;
    cidrBlock: string;
    region: string;
  };
  requesterVpcInfo?: {
    vpcId: string;
    cidrBlock: string;
    region: string;
  };
}

/**
 * Transit Gateway capability data structure
 * @property type - Capability type identifier
 * @property transitGatewayId - Transit Gateway identifier
 * @property transitGatewayArn - Transit Gateway ARN
 * @property state - Transit Gateway state (e.g., 'available')
 * @property amazonSideAsn - Amazon side ASN (optional)
 * @property associationDefaultRouteTableId - Default association route table ID (optional)
 * @property propagationDefaultRouteTableId - Default propagation route table ID (optional)
 */
interface TransitGatewayCapabilityData {
  type: 'tgw:transit-gateway';
  transitGatewayId: string;
  transitGatewayArn: string;
  state: string;
  amazonSideAsn?: number;
  associationDefaultRouteTableId?: string;
  propagationDefaultRouteTableId?: string;
}

/**
 * Network Firewall capability data structure
 * @property type - Capability type identifier
 * @property firewallName - Network Firewall name
 * @property firewallArn - Network Firewall ARN
 * @property firewallId - Network Firewall identifier
 * @property vpcId - VPC identifier
 * @property status - Firewall status (e.g., 'ready')
 * @property firewallPolicyArn - Firewall policy ARN (optional)
 */
interface NetworkFirewallCapabilityData {
  type: 'vpc:network-firewall';
  firewallName: string;
  firewallArn: string;
  firewallId: string;
  vpcId: string;
  status: string;
  firewallPolicyArn?: string;
}

/**
 * VPC Endpoint capability data structure
 * 
 * VPC Endpoints enable private access to AWS services without traversing the public internet.
 * This is critical for compliance (FedRAMP, HIPAA) and security (no internet egress required).
 * 
 * Endpoint Types:
 * - Gateway: S3 and DynamoDB only. Works via route tables (automatic route injection).
 * - Interface: Most AWS services (Lambda, KMS, Secrets Manager, etc.). Requires security groups.
 * - GatewayLoadBalancer: Advanced use cases with third-party security appliances.
 * 
 * Private Service Access Patterns:
 * - Gateway endpoints: Routes automatically added to associated route tables
 * - Interface endpoints: Require security group rules allowing HTTPS (443) from source SGs
 * - Private DNS: When enabled, service names resolve to private IPs (e.g., s3.amazonaws.com -> vpce-xxx.s3.us-east-1.vpce.amazonaws.com)
 * 
 * Security Considerations:
 * - Interface endpoints require security group ingress rules (use SecurityGroupRuleBinderStrategy)
 * - Gateway endpoints require route table associations (handled at component level)
 * - Private DNS must be enabled for seamless service resolution without code changes
 * - Endpoint policies can restrict access to specific resources (policyDocument field)
 * 
 * @property type - Capability type identifier
 * @property vpcEndpointId - VPC Endpoint identifier
 * @property vpcEndpointArn - VPC Endpoint ARN
 * @property vpcId - VPC identifier
 * @property serviceName - AWS service name (e.g., 'com.amazonaws.us-east-1.s3', 'com.amazonaws.us-east-1.secretsmanager')
 * @property endpointType - Endpoint type ('Gateway' | 'Interface' | 'GatewayLoadBalancer')
 * @property state - Endpoint state (e.g., 'available')
 * @property dnsEntries - DNS entries for the endpoint (optional, required for Interface endpoints with private DNS)
 * @property policyDocument - VPC endpoint policy document (optional, JSON policy string for resource-level access control)
 * @property privateDnsEnabled - Whether private DNS is enabled (optional, recommended for Interface endpoints)
 */
interface VpcEndpointCapabilityData {
  type: 'vpc:endpoint';
  vpcEndpointId: string;
  vpcEndpointArn: string;
  vpcId: string;
  serviceName: string;
  endpointType: 'Gateway' | 'Interface' | 'GatewayLoadBalancer';
  state: string;
  dnsEntries?: Array<{
    dnsName: string;
    hostedZoneId: string;
  }>;
  policyDocument?: string;
  privateDnsEnabled?: boolean;
}

type VpcCapabilityData =
  | VpcNetworkCapabilityData
  | VpcSubnetCapabilityData
  | VpcSecurityGroupCapabilityData
  | VpcRouteTableCapabilityData
  | VpcNatGatewayCapabilityData
  | VpcNetworkAclCapabilityData
  | VpcPeeringCapabilityData
  | TransitGatewayCapabilityData
  | NetworkFirewallCapabilityData
  | VpcEndpointCapabilityData;

export class VpcBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'vpc:network',
    'net:vpc',
    'networking:vpc',
    'vpc:subnet',
    'vpc:security-group',
    'vpc:route-table',
    'vpc:nat-gateway',
    'vpc:nacl',
    'vpc:peering',
    'tgw:transit-gateway',
    'vpc:network-firewall',
    'vpc:endpoint'
  ];

  getStrategyName(): string {
    return 'VPC Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'vpc',
        capability: 'vpc:network',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to VPC network for network access',
        examples: ['lambda -> vpc:network (read)']
      },
      {
        sourceType: '*',
        targetType: 'vpc',
        capability: 'net:vpc',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to VPC network (alias for vpc:network)',
        examples: ['ecs-task -> net:vpc (read)']
      },
      {
        sourceType: '*',
        targetType: 'vpc',
        capability: 'networking:vpc',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to VPC network (alias for vpc:network)',
        examples: ['ec2-instance -> networking:vpc (read)']
      },
      {
        sourceType: '*',
        targetType: 'vpc',
        capability: 'vpc:subnet',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to VPC subnet for subnet access',
        examples: ['lambda -> vpc:subnet (read)']
      },
      {
        sourceType: '*',
        targetType: 'vpc',
        capability: 'vpc:security-group',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to VPC security group for security group access',
        examples: ['ecs-task -> vpc:security-group (read)']
      },
      {
        sourceType: '*',
        targetType: 'vpc',
        capability: 'vpc:route-table',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to VPC route table for route table access',
        examples: ['ec2-instance -> vpc:route-table (read)']
      },
      {
        sourceType: '*',
        targetType: 'vpc',
        capability: 'vpc:nat-gateway',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to VPC NAT Gateway for NAT Gateway access',
        examples: ['ec2-instance -> vpc:nat-gateway (read)']
      },
      {
        sourceType: '*',
        targetType: 'vpc',
        capability: 'vpc:nacl',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to VPC Network ACL for stateless network filtering',
        examples: ['ec2-instance -> vpc:nacl (read)']
      },
      {
        sourceType: '*',
        targetType: 'vpc',
        capability: 'vpc:peering',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to VPC Peering connection for multi-VPC connectivity',
        examples: ['vpc -> vpc:peering (read)']
      },
      {
        sourceType: '*',
        targetType: 'transit-gateway',
        capability: 'tgw:transit-gateway',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to Transit Gateway for multi-VPC and multi-account connectivity',
        examples: ['vpc -> tgw:transit-gateway (read)']
      },
      {
        sourceType: '*',
        targetType: 'network-firewall',
        capability: 'vpc:network-firewall',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to Network Firewall for advanced threat protection',
        examples: ['vpc -> vpc:network-firewall (read)']
      },
      {
        sourceType: '*',
        targetType: 'vpc',
        capability: 'vpc:endpoint',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to VPC Endpoint for private AWS service access',
        examples: ['lambda-api -> vpc:endpoint (read)', 'ecs-task -> vpc:endpoint (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for VPC binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'readwrite', 'admin'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for VPC binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for VPC binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method based on capability
    if (capability === 'vpc:network' || capability === 'net:vpc' || capability === 'networking:vpc') {
      return this.bindToNetwork(context, targetCapabilityData, access);
    } else if (capability === 'vpc:subnet') {
      return this.bindToSubnet(context, targetCapabilityData, access);
    } else if (capability === 'vpc:security-group') {
      return this.bindToSecurityGroup(context, targetCapabilityData, access);
    } else if (capability === 'vpc:route-table') {
      return this.bindToRouteTable(context, targetCapabilityData, access);
    } else if (capability === 'vpc:nat-gateway') {
      return this.bindToNatGateway(context, targetCapabilityData, access);
    } else if (capability === 'vpc:nacl') {
      return this.bindToNetworkAcl(context, targetCapabilityData, access);
    } else if (capability === 'vpc:peering') {
      return this.bindToPeering(context, targetCapabilityData, access);
    } else if (capability === 'tgw:transit-gateway') {
      return this.bindToTransitGateway(context, targetCapabilityData, access);
    } else if (capability === 'vpc:network-firewall') {
      return this.bindToNetworkFirewall(context, targetCapabilityData, access);
    } else if (capability === 'vpc:endpoint') {
      return this.bindToVpcEndpoint(context, targetCapabilityData, access);
    } else {
        throw new Error(`Unsupported VPC capability: ${capability}`);
    }
  }

  /**
   * Bind to VPC network
   */
  private bindToNetwork(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Omit<EnhancedBindingResult, 'compliance'> {
    if (!this.isVpcNetworkCapabilityData(targetData)) {
      throw new Error('Invalid VPC network capability data structure');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getVpcNetworkActionsForAccess(acc),
      'ec2'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.vpcArn]
        }),
        description: `VPC network ${primaryAccess} access`,
        complianceRequirement: `VPC network ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['VPC_ID'] = targetData.vpcId;
    environmentVariables['VPC_ARN'] = targetData.vpcArn;
    environmentVariables['VPC_CIDR_BLOCK'] = targetData.cidrBlock;
    environmentVariables['VPC_STATE'] = targetData.state;
    environmentVariables['VPC_DEFAULT'] = targetData.isDefault.toString();

    if (targetData.enableDnsHostnames !== undefined) {
      environmentVariables['VPC_DNS_HOSTNAMES'] = targetData.enableDnsHostnames.toString();
    }

    if (targetData.enableDnsSupport !== undefined) {
      environmentVariables['VPC_DNS_SUPPORT'] = targetData.enableDnsSupport.toString();
    }

    // Configure secure networking when requested via options/config
    if (context.directive.options?.requireSecureAccess === true) {
      this.configureSecureNetworkAccess(environmentVariables, iamPolicies, targetData, context);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to VPC subnet
   */
  private bindToSubnet(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Omit<EnhancedBindingResult, 'compliance'> {
    if (!this.isVpcSubnetCapabilityData(targetData)) {
      throw new Error('Invalid VPC subnet capability data structure');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getVpcSubnetActionsForAccess(acc),
      'ec2'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.subnetArn]
        }),
        description: `VPC subnet ${primaryAccess} access`,
        complianceRequirement: `VPC subnet ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['SUBNET_ID'] = targetData.subnetId;
    environmentVariables['SUBNET_ARN'] = targetData.subnetArn;
    environmentVariables['SUBNET_CIDR_BLOCK'] = targetData.cidrBlock;
    environmentVariables['SUBNET_AVAILABILITY_ZONE'] = targetData.availabilityZone;
    environmentVariables['SUBNET_STATE'] = targetData.state;
    environmentVariables['SUBNET_VPC_ID'] = targetData.vpcId;
    environmentVariables['SUBNET_TYPE'] = targetData.subnetType || 'private';
    environmentVariables['SUBNET_PUBLIC_IP_ON_LAUNCH'] = (targetData.mapPublicIpOnLaunch?.toString() || 'false');

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to VPC security group
   */
  private bindToSecurityGroup(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Omit<EnhancedBindingResult, 'compliance'> {
    if (!this.isVpcSecurityGroupCapabilityData(targetData)) {
      throw new Error('Invalid VPC security group capability data structure');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getVpcSecurityGroupActionsForAccess(acc),
      'ec2'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.securityGroupArn]
        }),
        description: `VPC security group ${primaryAccess} access`,
        complianceRequirement: `VPC security group ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['SECURITY_GROUP_ID'] = targetData.securityGroupId;
    environmentVariables['SECURITY_GROUP_ARN'] = targetData.securityGroupArn;
    environmentVariables['SECURITY_GROUP_NAME'] = targetData.groupName;
    environmentVariables['SECURITY_GROUP_DESCRIPTION'] = targetData.description;
    environmentVariables['SECURITY_GROUP_VPC_ID'] = targetData.vpcId;

    // Configure security group rules
    if (targetData.securityGroupRules) {
      const ingressRules = targetData.securityGroupRules.filter(rule => !rule.isEgress);
      const egressRules = targetData.securityGroupRules.filter(rule => rule.isEgress);
      if (ingressRules.length > 0) {
        environmentVariables['SECURITY_GROUP_INGRESS_RULES'] = JSON.stringify(ingressRules);
      }
      if (egressRules.length > 0) {
        environmentVariables['SECURITY_GROUP_EGRESS_RULES'] = JSON.stringify(egressRules);
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to VPC route table
   */
  private bindToRouteTable(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Omit<EnhancedBindingResult, 'compliance'> {
    if (!this.isVpcRouteTableCapabilityData(targetData)) {
      throw new Error('Invalid VPC route table capability data structure');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getVpcRouteTableActionsForAccess(acc),
      'ec2'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.routeTableArn]
        }),
        description: `VPC route table ${primaryAccess} access`,
        complianceRequirement: `VPC route table ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['ROUTE_TABLE_ID'] = targetData.routeTableId;
    environmentVariables['ROUTE_TABLE_ARN'] = targetData.routeTableArn;
    environmentVariables['ROUTE_TABLE_VPC_ID'] = targetData.vpcId;

    if (targetData.routes) {
      environmentVariables['ROUTE_TABLE_ROUTES'] = JSON.stringify(targetData.routes);
    }

    if (targetData.associations) {
      environmentVariables['ROUTE_TABLE_ASSOCIATIONS'] = JSON.stringify(targetData.associations);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to VPC NAT Gateway
   */
  private bindToNatGateway(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Omit<EnhancedBindingResult, 'compliance'> {
    if (!this.isVpcNatGatewayCapabilityData(targetData)) {
      throw new Error('Invalid VPC NAT Gateway capability data structure');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getVpcNatGatewayActionsForAccess(acc),
      'ec2'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      const resources = [targetData.natGatewayArn];
      // For write access, also include elastic IP resources (wildcard since region/accountId not in context)
      if (primaryAccess === 'write' || primaryAccess === 'admin' || primaryAccess === 'readwrite') {
        // Use wildcard for elastic IPs - actual region/account will be resolved at deployment time
        resources.push('arn:aws:ec2:*:*:elastic-ip/*');
      }

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: resources
        }),
        description: `VPC NAT Gateway ${primaryAccess} access`,
        complianceRequirement: `VPC NAT Gateway ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['NAT_GATEWAY_ID'] = targetData.natGatewayId;
    environmentVariables['NAT_GATEWAY_ARN'] = targetData.natGatewayArn;
    environmentVariables['NAT_GATEWAY_STATE'] = targetData.state;
    environmentVariables['NAT_GATEWAY_SUBNET_ID'] = targetData.subnetId;
    environmentVariables['NAT_GATEWAY_CONNECTIVITY_TYPE'] = targetData.connectivityType || 'public';

    if (targetData.natGatewayAddresses && targetData.natGatewayAddresses.length > 0) {
      environmentVariables['NAT_GATEWAY_PUBLIC_IP'] = targetData.natGatewayAddresses[0].publicIp || '';
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to VPC Network ACL
   */
  private bindToNetworkAcl(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Omit<EnhancedBindingResult, 'compliance'> {
    if (!this.isVpcNetworkAclCapabilityData(targetData)) {
      throw new Error('Invalid VPC Network ACL capability data structure');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getVpcNetworkAclActionsForAccess(acc),
      'ec2'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.networkAclArn]
        }),
        description: `VPC Network ACL ${primaryAccess} access`,
        complianceRequirement: `VPC Network ACL ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['NETWORK_ACL_ID'] = targetData.networkAclId;
    environmentVariables['NETWORK_ACL_ARN'] = targetData.networkAclArn;
    environmentVariables['NETWORK_ACL_VPC_ID'] = targetData.vpcId;
    environmentVariables['NETWORK_ACL_IS_DEFAULT'] = targetData.isDefault.toString();

    if (targetData.entries && targetData.entries.length > 0) {
      environmentVariables['NETWORK_ACL_ENTRIES'] = JSON.stringify(targetData.entries);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to VPC Peering connection
   */
  private bindToPeering(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Omit<EnhancedBindingResult, 'compliance'> {
    if (!this.isVpcPeeringCapabilityData(targetData)) {
      throw new Error('Invalid VPC Peering capability data structure');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getVpcPeeringActionsForAccess(acc),
      'ec2'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.peeringConnectionArn]
        }),
        description: `VPC Peering ${primaryAccess} access`,
        complianceRequirement: `VPC Peering ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['VPC_PEERING_CONNECTION_ID'] = targetData.peeringConnectionId;
    environmentVariables['VPC_PEERING_CONNECTION_ARN'] = targetData.peeringConnectionArn;
    environmentVariables['VPC_PEERING_VPC_ID'] = targetData.vpcId;
    environmentVariables['VPC_PEERING_PEER_VPC_ID'] = targetData.peerVpcId;
    environmentVariables['VPC_PEERING_STATUS'] = targetData.status;

    if (targetData.accepterVpcInfo) {
      environmentVariables['VPC_PEERING_ACCEPTER_VPC_ID'] = targetData.accepterVpcInfo.vpcId;
      environmentVariables['VPC_PEERING_ACCEPTER_CIDR'] = targetData.accepterVpcInfo.cidrBlock;
      environmentVariables['VPC_PEERING_ACCEPTER_REGION'] = targetData.accepterVpcInfo.region;
    }

    if (targetData.requesterVpcInfo) {
      environmentVariables['VPC_PEERING_REQUESTER_VPC_ID'] = targetData.requesterVpcInfo.vpcId;
      environmentVariables['VPC_PEERING_REQUESTER_CIDR'] = targetData.requesterVpcInfo.cidrBlock;
      environmentVariables['VPC_PEERING_REQUESTER_REGION'] = targetData.requesterVpcInfo.region;
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Transit Gateway
   */
  private bindToTransitGateway(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Omit<EnhancedBindingResult, 'compliance'> {
    if (!this.isTransitGatewayCapabilityData(targetData)) {
      throw new Error('Invalid Transit Gateway capability data structure');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getTransitGatewayActionsForAccess(acc),
      'ec2'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.transitGatewayArn]
        }),
        description: `Transit Gateway ${primaryAccess} access`,
        complianceRequirement: `Transit Gateway ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['TRANSIT_GATEWAY_ID'] = targetData.transitGatewayId;
    environmentVariables['TRANSIT_GATEWAY_ARN'] = targetData.transitGatewayArn;
    environmentVariables['TRANSIT_GATEWAY_STATE'] = targetData.state;

    if (targetData.amazonSideAsn !== undefined) {
      environmentVariables['TRANSIT_GATEWAY_AMAZON_SIDE_ASN'] = targetData.amazonSideAsn.toString();
    }

    if (targetData.associationDefaultRouteTableId) {
      environmentVariables['TRANSIT_GATEWAY_ASSOCIATION_DEFAULT_ROUTE_TABLE_ID'] = targetData.associationDefaultRouteTableId;
    }

    if (targetData.propagationDefaultRouteTableId) {
      environmentVariables['TRANSIT_GATEWAY_PROPAGATION_DEFAULT_ROUTE_TABLE_ID'] = targetData.propagationDefaultRouteTableId;
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to VPC Endpoint for private AWS service access
   * 
   * This method generates IAM permissions and environment variables for accessing AWS services
   * via VPC endpoints without internet traversal. Critical for compliance and security.
   * 
   * For Interface endpoints, security group rules must be configured separately:
   * - Use SecurityGroupRuleBinderStrategy to generate ingress rules (allow HTTPS 443 from source SGs)
   * - Interface endpoints require explicit security group associations
   * 
   * For Gateway endpoints (S3, DynamoDB), route table associations are handled at component level.
   * 
   * @param context - Binding context with source, target, and directive
   * @param targetData - VPC Endpoint capability data
   * @param access - Access levels (read, write, readwrite, admin)
   * @returns Enhanced binding result with IAM policies and environment variables
   */
  private bindToVpcEndpoint(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Omit<EnhancedBindingResult, 'compliance'> {
    if (!this.isVpcEndpointCapabilityData(targetData)) {
      throw new Error('Invalid VPC Endpoint capability data structure');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getVpcEndpointActionsForAccess(acc),
      'ec2'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.vpcEndpointArn]
        }),
        description: `VPC Endpoint ${primaryAccess} access`,
        complianceRequirement: `VPC Endpoint ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['VPC_ENDPOINT_ID'] = targetData.vpcEndpointId;
    environmentVariables['VPC_ENDPOINT_ARN'] = targetData.vpcEndpointArn;
    environmentVariables['VPC_ENDPOINT_VPC_ID'] = targetData.vpcId;
    environmentVariables['VPC_ENDPOINT_SERVICE_NAME'] = targetData.serviceName;
    environmentVariables['VPC_ENDPOINT_TYPE'] = targetData.endpointType;
    environmentVariables['VPC_ENDPOINT_STATE'] = targetData.state;

    if (targetData.privateDnsEnabled !== undefined) {
      environmentVariables['VPC_ENDPOINT_PRIVATE_DNS_ENABLED'] = targetData.privateDnsEnabled.toString();
    }

    // Set DNS entries (first entry is typically the primary DNS name)
    if (targetData.dnsEntries && targetData.dnsEntries.length > 0) {
      environmentVariables['VPC_ENDPOINT_DNS_NAME'] = targetData.dnsEntries[0].dnsName;
      environmentVariables['VPC_ENDPOINT_HOSTED_ZONE_ID'] = targetData.dnsEntries[0].hostedZoneId;
      if (targetData.dnsEntries.length > 1) {
        environmentVariables['VPC_ENDPOINT_DNS_ENTRIES'] = JSON.stringify(targetData.dnsEntries);
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Network Firewall
   */
  private bindToNetworkFirewall(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Omit<EnhancedBindingResult, 'compliance'> {
    if (!this.isNetworkFirewallCapabilityData(targetData)) {
      throw new Error('Invalid Network Firewall capability data structure');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getNetworkFirewallActionsForAccess(acc),
      'network-firewall'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.firewallArn]
        }),
        description: `Network Firewall ${primaryAccess} access`,
        complianceRequirement: `Network Firewall ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['NETWORK_FIREWALL_NAME'] = targetData.firewallName;
    environmentVariables['NETWORK_FIREWALL_ARN'] = targetData.firewallArn;
    environmentVariables['NETWORK_FIREWALL_ID'] = targetData.firewallId;
    environmentVariables['NETWORK_FIREWALL_VPC_ID'] = targetData.vpcId;
    environmentVariables['NETWORK_FIREWALL_STATUS'] = targetData.status;

    if (targetData.firewallPolicyArn) {
      environmentVariables['NETWORK_FIREWALL_POLICY_ARN'] = targetData.firewallPolicyArn;
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Get EC2 actions for VPC network access level
   */
  private getVpcNetworkActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ec2:DescribeVpcs',
          'ec2:DescribeVpcAttribute',
          'ec2:DescribeVpcClassicLink',
          'ec2:DescribeVpcClassicLinkDnsSupport',
          'ec2:DescribeVpcEndpoints'
        ];
      case 'write':
      case 'readwrite':
        return [
          'ec2:DescribeVpcs',
          'ec2:DescribeVpcAttribute',
          'ec2:CreateVpc',
          'ec2:ModifyVpcAttribute',
          'ec2:DeleteVpc',
          'ec2:AttachClassicLinkVpc',
          'ec2:DetachClassicLinkVpc',
          'ec2:DescribeVpcEndpoints',
          'ec2:CreateVpcEndpoint',
          'ec2:ModifyVpcEndpoint',
          'ec2:DeleteVpcEndpoint'
        ];
      case 'admin':
        return [
          'ec2:DescribeVpcs',
          'ec2:DescribeVpcAttribute',
          'ec2:CreateVpc',
          'ec2:ModifyVpcAttribute',
          'ec2:DeleteVpc',
          'ec2:AttachClassicLinkVpc',
          'ec2:DetachClassicLinkVpc',
          'ec2:DescribeVpcEndpoints',
          'ec2:CreateVpcEndpoint',
          'ec2:ModifyVpcEndpoint',
          'ec2:DeleteVpcEndpoint',
          'ec2:CreateTags',
          'ec2:DeleteTags'
        ];
      default:
        return [];
    }
  }

  /**
   * Get EC2 actions for VPC subnet access level
   */
  private getVpcSubnetActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ec2:DescribeSubnets',
          'ec2:DescribeSubnetAttribute'
        ];
      case 'write':
      case 'readwrite':
        return [
          'ec2:DescribeSubnets',
          'ec2:DescribeSubnetAttribute',
          'ec2:CreateSubnet',
          'ec2:ModifySubnetAttribute',
          'ec2:DeleteSubnet',
          'ec2:AssociateSubnetCidrBlock',
          'ec2:DisassociateSubnetCidrBlock'
        ];
      case 'admin':
        return [
          'ec2:DescribeSubnets',
          'ec2:DescribeSubnetAttribute',
          'ec2:CreateSubnet',
          'ec2:ModifySubnetAttribute',
          'ec2:DeleteSubnet',
          'ec2:AssociateSubnetCidrBlock',
          'ec2:DisassociateSubnetCidrBlock',
          'ec2:CreateTags',
          'ec2:DeleteTags'
        ];
      default:
        return [];
    }
  }

  /**
   * Get EC2 actions for VPC security group access level
   */
  private getVpcSecurityGroupActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ec2:DescribeSecurityGroups',
          'ec2:DescribeSecurityGroupRules'
        ];
      case 'write':
      case 'readwrite':
        return [
          'ec2:DescribeSecurityGroups',
          'ec2:DescribeSecurityGroupRules',
          'ec2:CreateSecurityGroup',
          'ec2:DeleteSecurityGroup',
          'ec2:AuthorizeSecurityGroupIngress',
          'ec2:RevokeSecurityGroupIngress',
          'ec2:AuthorizeSecurityGroupEgress',
          'ec2:RevokeSecurityGroupEgress'
        ];
      case 'admin':
        return [
          'ec2:DescribeSecurityGroups',
          'ec2:DescribeSecurityGroupRules',
          'ec2:CreateSecurityGroup',
          'ec2:DeleteSecurityGroup',
          'ec2:AuthorizeSecurityGroupIngress',
          'ec2:RevokeSecurityGroupIngress',
          'ec2:AuthorizeSecurityGroupEgress',
          'ec2:RevokeSecurityGroupEgress',
          'ec2:CreateTags',
          'ec2:DeleteTags'
        ];
      default:
        return [];
    }
  }

  /**
   * Get EC2 actions for VPC route table access level
   */
  private getVpcRouteTableActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ec2:DescribeRouteTables',
          'ec2:DescribeRoutes'
        ];
      case 'write':
      case 'readwrite':
        return [
          'ec2:DescribeRouteTables',
          'ec2:DescribeRoutes',
          'ec2:CreateRouteTable',
          'ec2:DeleteRouteTable',
          'ec2:CreateRoute',
          'ec2:DeleteRoute',
          'ec2:ReplaceRoute',
          'ec2:AssociateRouteTable',
          'ec2:DisassociateRouteTable'
        ];
      case 'admin':
        return [
          'ec2:DescribeRouteTables',
          'ec2:DescribeRoutes',
          'ec2:CreateRouteTable',
          'ec2:DeleteRouteTable',
          'ec2:CreateRoute',
          'ec2:DeleteRoute',
          'ec2:ReplaceRoute',
          'ec2:AssociateRouteTable',
          'ec2:DisassociateRouteTable',
          'ec2:CreateTags',
          'ec2:DeleteTags'
        ];
      default:
        return [];
    }
  }

  /**
   * Get EC2 actions for VPC NAT Gateway access level
   */
  private getVpcNatGatewayActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ec2:DescribeNatGateways'
        ];
      case 'write':
      case 'readwrite':
        return [
          'ec2:DescribeNatGateways',
          'ec2:CreateNatGateway',
          'ec2:DeleteNatGateway',
          'ec2:AllocateAddress',
          'ec2:ReleaseAddress'
        ];
      case 'admin':
        return [
          'ec2:DescribeNatGateways',
          'ec2:CreateNatGateway',
          'ec2:DeleteNatGateway',
          'ec2:AllocateAddress',
          'ec2:ReleaseAddress',
          'ec2:CreateTags',
          'ec2:DeleteTags'
        ];
      default:
        return [];
    }
  }

  /**
   * Get EC2 actions for VPC Network ACL access level
   */
  private getVpcNetworkAclActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ec2:DescribeNetworkAcls',
          'ec2:DescribeNetworkAclAttributes'
        ];
      case 'write':
      case 'readwrite':
        return [
          'ec2:DescribeNetworkAcls',
          'ec2:DescribeNetworkAclAttributes',
          'ec2:CreateNetworkAcl',
          'ec2:DeleteNetworkAcl',
          'ec2:CreateNetworkAclEntry',
          'ec2:ReplaceNetworkAclEntry',
          'ec2:DeleteNetworkAclEntry',
          'ec2:ReplaceNetworkAclAssociation'
        ];
      case 'admin':
        return [
          'ec2:DescribeNetworkAcls',
          'ec2:DescribeNetworkAclAttributes',
          'ec2:CreateNetworkAcl',
          'ec2:DeleteNetworkAcl',
          'ec2:CreateNetworkAclEntry',
          'ec2:ReplaceNetworkAclEntry',
          'ec2:DeleteNetworkAclEntry',
          'ec2:ReplaceNetworkAclAssociation',
          'ec2:CreateTags',
          'ec2:DeleteTags'
        ];
      default:
        return [];
    }
  }

  /**
   * Get EC2 actions for VPC Peering access level
   */
  private getVpcPeeringActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ec2:DescribeVpcPeeringConnections',
          'ec2:DescribeVpcPeeringConnectionOptions'
        ];
      case 'write':
      case 'readwrite':
        return [
          'ec2:DescribeVpcPeeringConnections',
          'ec2:DescribeVpcPeeringConnectionOptions',
          'ec2:CreateVpcPeeringConnection',
          'ec2:AcceptVpcPeeringConnection',
          'ec2:RejectVpcPeeringConnection',
          'ec2:DeleteVpcPeeringConnection',
          'ec2:ModifyVpcPeeringConnectionOptions'
        ];
      case 'admin':
        return [
          'ec2:DescribeVpcPeeringConnections',
          'ec2:DescribeVpcPeeringConnectionOptions',
          'ec2:CreateVpcPeeringConnection',
          'ec2:AcceptVpcPeeringConnection',
          'ec2:RejectVpcPeeringConnection',
          'ec2:DeleteVpcPeeringConnection',
          'ec2:ModifyVpcPeeringConnectionOptions',
          'ec2:CreateTags',
          'ec2:DeleteTags'
        ];
      default:
        return [];
    }
  }

  /**
   * Get EC2 actions for VPC Endpoint access level
   */
  private getVpcEndpointActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ec2:DescribeVpcEndpoints',
          'ec2:DescribeVpcEndpointServices',
          'ec2:DescribePrefixLists'
        ];
      case 'write':
      case 'readwrite':
        return [
          'ec2:DescribeVpcEndpoints',
          'ec2:DescribeVpcEndpointServices',
          'ec2:DescribePrefixLists',
          'ec2:CreateVpcEndpoint',
          'ec2:ModifyVpcEndpoint',
          'ec2:DeleteVpcEndpoint'
        ];
      case 'admin':
        return [
          'ec2:DescribeVpcEndpoints',
          'ec2:DescribeVpcEndpointServices',
          'ec2:DescribePrefixLists',
          'ec2:CreateVpcEndpoint',
          'ec2:ModifyVpcEndpoint',
          'ec2:DeleteVpcEndpoint',
          'ec2:CreateTags',
          'ec2:DeleteTags'
        ];
      default:
        return [];
    }
  }

  /**
   * Get EC2 actions for Transit Gateway access level
   */
  private getTransitGatewayActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ec2:DescribeTransitGateways',
          'ec2:DescribeTransitGatewayAttachments',
          'ec2:DescribeTransitGatewayRouteTables',
          'ec2:DescribeTransitGatewayVpcAttachments',
          'ec2:SearchTransitGatewayRoutes'
        ];
      case 'write':
      case 'readwrite':
        return [
          'ec2:DescribeTransitGateways',
          'ec2:DescribeTransitGatewayAttachments',
          'ec2:DescribeTransitGatewayRouteTables',
          'ec2:DescribeTransitGatewayVpcAttachments',
          'ec2:SearchTransitGatewayRoutes',
          'ec2:CreateTransitGateway',
          'ec2:DeleteTransitGateway',
          'ec2:ModifyTransitGateway',
          'ec2:CreateTransitGatewayVpcAttachment',
          'ec2:DeleteTransitGatewayVpcAttachment',
          'ec2:ModifyTransitGatewayVpcAttachment',
          'ec2:AssociateTransitGatewayRouteTable',
          'ec2:DisassociateTransitGatewayRouteTable',
          'ec2:EnableTransitGatewayRouteTablePropagation',
          'ec2:DisableTransitGatewayRouteTablePropagation',
          'ec2:CreateTransitGatewayRoute',
          'ec2:DeleteTransitGatewayRoute'
        ];
      case 'admin':
        return [
          'ec2:DescribeTransitGateways',
          'ec2:DescribeTransitGatewayAttachments',
          'ec2:DescribeTransitGatewayRouteTables',
          'ec2:DescribeTransitGatewayVpcAttachments',
          'ec2:SearchTransitGatewayRoutes',
          'ec2:CreateTransitGateway',
          'ec2:DeleteTransitGateway',
          'ec2:ModifyTransitGateway',
          'ec2:CreateTransitGatewayVpcAttachment',
          'ec2:DeleteTransitGatewayVpcAttachment',
          'ec2:ModifyTransitGatewayVpcAttachment',
          'ec2:AssociateTransitGatewayRouteTable',
          'ec2:DisassociateTransitGatewayRouteTable',
          'ec2:EnableTransitGatewayRouteTablePropagation',
          'ec2:DisableTransitGatewayRouteTablePropagation',
          'ec2:CreateTransitGatewayRoute',
          'ec2:DeleteTransitGatewayRoute',
          'ec2:CreateTags',
          'ec2:DeleteTags'
        ];
      default:
        return [];
    }
  }

  /**
   * Get Network Firewall actions for access level
   */
  private getNetworkFirewallActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'network-firewall:DescribeFirewall',
          'network-firewall:DescribeFirewallStatus',
          'network-firewall:DescribeResourcePolicy',
          'network-firewall:ListFirewalls',
          'network-firewall:ListTagsForResource'
        ];
      case 'write':
      case 'readwrite':
        return [
          'network-firewall:DescribeFirewall',
          'network-firewall:DescribeFirewallStatus',
          'network-firewall:DescribeResourcePolicy',
          'network-firewall:ListFirewalls',
          'network-firewall:ListTagsForResource',
          'network-firewall:CreateFirewall',
          'network-firewall:DeleteFirewall',
          'network-firewall:UpdateFirewallDeleteProtection',
          'network-firewall:UpdateFirewallDescription',
          'network-firewall:AssociateFirewallPolicy',
          'network-firewall:DisassociateFirewallPolicy',
          'network-firewall:UpdateFirewallPolicy',
          'network-firewall:PutResourcePolicy',
          'network-firewall:DeleteResourcePolicy'
        ];
      case 'admin':
        return [
          'network-firewall:DescribeFirewall',
          'network-firewall:DescribeFirewallStatus',
          'network-firewall:DescribeResourcePolicy',
          'network-firewall:ListFirewalls',
          'network-firewall:ListTagsForResource',
          'network-firewall:CreateFirewall',
          'network-firewall:DeleteFirewall',
          'network-firewall:UpdateFirewallDeleteProtection',
          'network-firewall:UpdateFirewallDescription',
          'network-firewall:AssociateFirewallPolicy',
          'network-firewall:DisassociateFirewallPolicy',
          'network-firewall:UpdateFirewallPolicy',
          'network-firewall:PutResourcePolicy',
          'network-firewall:DeleteResourcePolicy',
          'network-firewall:TagResource',
          'network-firewall:UntagResource'
        ];
      default:
        return [];
    }
  }

  /**
   * Configure secure network access (flow logs, VPC endpoints, etc.)
   */
  private configureSecureNetworkAccess(
    environmentVariables: Record<string, string>,
    iamPolicies: IamPolicy[],
    targetData: VpcNetworkCapabilityData,
    context: BindingContext
  ): void {
    // Configure flow logs for network monitoring
    if (targetData.flowLogsEnabled) {
      environmentVariables['VPC_FLOW_LOGS_ENABLED'] = 'true';

      // Grant CloudWatch Logs permissions for flow logs (wildcard for region/account - resolved at deployment time)
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
          resources: ['arn:aws:logs:*:*:log-group:/aws/vpc/flowlogs:*']
        }),
        description: 'CloudWatch Logs permissions for VPC Flow Logs',
        complianceRequirement: 'VPC Flow Logs monitoring access'
      });
    }

    // Configure VPC endpoints when explicitly enabled
    if (targetData.vpcEndpoints && targetData.vpcEndpoints.length > 0) {
      environmentVariables['VPC_ENDPOINTS_ENABLED'] = 'true';
      environmentVariables['VPC_ENDPOINT_SERVICES'] = targetData.vpcEndpoints.join(',');
    }

    // Configure network ACLs for additional security
    if (targetData.networkAcls && targetData.networkAcls.length > 0) {
      environmentVariables['VPC_NETWORK_ACLS'] = JSON.stringify(targetData.networkAcls);
    }
  }

  // Type guards

  private isVpcNetworkCapabilityData(data: unknown): data is VpcNetworkCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      (d.type === 'vpc:network' || d.type === 'net:vpc' || d.type === 'networking:vpc') &&
      typeof d.vpcId === 'string' &&
      typeof d.vpcArn === 'string' &&
      typeof d.cidrBlock === 'string' &&
      typeof d.state === 'string' &&
      typeof d.isDefault === 'boolean'
    );
  }

  private isVpcSubnetCapabilityData(data: unknown): data is VpcSubnetCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'vpc:subnet' &&
      typeof d.subnetId === 'string' &&
      typeof d.subnetArn === 'string' &&
      typeof d.cidrBlock === 'string' &&
      typeof d.availabilityZone === 'string' &&
      typeof d.state === 'string' &&
      typeof d.vpcId === 'string'
    );
  }

  private isVpcSecurityGroupCapabilityData(data: unknown): data is VpcSecurityGroupCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'vpc:security-group' &&
      typeof d.securityGroupId === 'string' &&
      typeof d.securityGroupArn === 'string' &&
      typeof d.groupName === 'string' &&
      typeof d.description === 'string' &&
      typeof d.vpcId === 'string'
    );
  }

  private isVpcRouteTableCapabilityData(data: unknown): data is VpcRouteTableCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'vpc:route-table' &&
      typeof d.routeTableId === 'string' &&
      typeof d.routeTableArn === 'string' &&
      typeof d.vpcId === 'string'
    );
  }

  private isVpcNatGatewayCapabilityData(data: unknown): data is VpcNatGatewayCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'vpc:nat-gateway' &&
      typeof d.natGatewayId === 'string' &&
      typeof d.natGatewayArn === 'string' &&
      typeof d.state === 'string' &&
      typeof d.subnetId === 'string'
    );
  }

  private isVpcNetworkAclCapabilityData(data: unknown): data is VpcNetworkAclCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'vpc:nacl' &&
      typeof d.networkAclId === 'string' &&
      typeof d.networkAclArn === 'string' &&
      typeof d.vpcId === 'string' &&
      typeof d.isDefault === 'boolean'
    );
  }

  private isVpcPeeringCapabilityData(data: unknown): data is VpcPeeringCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'vpc:peering' &&
      typeof d.peeringConnectionId === 'string' &&
      typeof d.peeringConnectionArn === 'string' &&
      typeof d.vpcId === 'string' &&
      typeof d.peerVpcId === 'string' &&
      typeof d.status === 'string'
    );
  }

  private isTransitGatewayCapabilityData(data: unknown): data is TransitGatewayCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'tgw:transit-gateway' &&
      typeof d.transitGatewayId === 'string' &&
      typeof d.transitGatewayArn === 'string' &&
      typeof d.state === 'string'
    );
  }

  private isNetworkFirewallCapabilityData(data: unknown): data is NetworkFirewallCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'vpc:network-firewall' &&
      typeof d.firewallName === 'string' &&
      typeof d.firewallArn === 'string' &&
      typeof d.firewallId === 'string' &&
      typeof d.vpcId === 'string' &&
      typeof d.status === 'string'
    );
  }

  private isVpcEndpointCapabilityData(data: unknown): data is VpcEndpointCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'vpc:endpoint' &&
      typeof d.vpcEndpointId === 'string' &&
      typeof d.vpcEndpointArn === 'string' &&
      typeof d.vpcId === 'string' &&
      typeof d.serviceName === 'string' &&
      typeof d.endpointType === 'string' &&
      typeof d.state === 'string'
    );
  }
}
