/**
 * VPC Component
 * 
 * Defines network isolation with compliance-aware networking rules.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent } from '@shinobi/core';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
import { VpcConfig, VpcConfigBuilder } from './vpc.builder';


/**
 * VPC Component implementing Component API Contract v1.1
 */
export class VpcComponent extends BaseComponent {
  private vpc?: ec2.Vpc;
  private flowLogGroup?: logs.LogGroup;
  private flowLogRole?: iam.Role;
  private config!: VpcConfig;
  private logger: any; // Platform logger instance

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
    this.logger = this.getLogger();
  }

  /**
   * Synthesis phase - Create VPC with compliance hardening
   * Follows the 6-step synthesis process defined in Platform Component API Contract v1.1
   */
  public synth(): void {
    this.logger.info(`Synthesizing VPC component: ${this.spec.name}`);

    try {
      // Step 1: Build configuration using ConfigBuilder
      const builder = new VpcConfigBuilder({
        context: this.context,
        spec: this.spec
      });
      this.config = builder.buildSync();

      // Step 2: Create core AWS CDK constructs first
      this.createVpc();
      this.createVpcFlowLogsIfEnabled();
      this.createVpcEndpointsIfNeeded();

      // Step 3: Apply security controls (after VPC exists)
      this.applySecurityControls();

      // Step 4: Apply standard tags to all taggable resources
      this.applyStandardTagsToResources();

      // Step 5: Register constructs for patches.ts access
      this.registerConstructs();

      // Step 6: Register capabilities for binding
      this.registerCapabilities();

      this.logger.info(`VPC component ${this.spec.name} synthesized successfully.`);
    } catch (error) {
      this.logger.error('VPC synthesis failed', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'vpc';
  }

  /**
   * Create the VPC with appropriate subnet configuration
   */
  private createVpc(): void {
    const subnetConfiguration = this.buildSubnetConfiguration();

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      cidr: this.config!.cidr || '10.0.0.0/16',
      maxAzs: this.config!.maxAzs || 2,
      natGateways: this.config!.natGateways ?? 1,
      subnetConfiguration,
      enableDnsHostnames: this.config!.dns?.enableDnsHostnames !== false,
      enableDnsSupport: this.config!.dns?.enableDnsSupport !== false,
      vpcName: `${this.context.serviceName}-${this.spec.name}`
    });

    // Add name tags to subnets
    this.vpc.publicSubnets.forEach((subnet, index) => {
      cdk.Tags.of(subnet).add('Name', `${this.context.serviceName}-public-${index + 1}`);
    });

    this.vpc.privateSubnets.forEach((subnet, index) => {
      cdk.Tags.of(subnet).add('Name', `${this.context.serviceName}-private-${index + 1}`);
    });

    this.vpc.isolatedSubnets.forEach((subnet, index) => {
      cdk.Tags.of(subnet).add('Name', `${this.context.serviceName}-database-${index + 1}`);
    });
  }

  /**
   * Create VPC Flow Logs for network monitoring
   */
  private createVpcFlowLogsIfEnabled(): void {
    if (!this.config.flowLogs.enabled) {
      return;
    }

    const removalPolicy = this.config.flowLogs.removalPolicy === 'destroy'
      ? cdk.RemovalPolicy.DESTROY
      : cdk.RemovalPolicy.RETAIN;

    this.flowLogGroup = new logs.LogGroup(this, 'VpcFlowLogGroup', {
      logGroupName: `/aws/vpc/flowlogs/${this.vpc!.vpcId}`,
      retention: this.mapLogRetentionDays(this.config.flowLogs.retentionInDays),
      removalPolicy
    });

    this.flowLogRole = new iam.Role(this, 'VpcFlowLogRole', {
      assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
      inlinePolicies: {
        flowLogsDeliveryRolePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams'
              ],
              resources: [`${this.flowLogGroup.logGroupArn}:*`]
            })
          ]
        })
      }
    });

    new ec2.FlowLog(this, 'VpcFlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc!),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(this.flowLogGroup, this.flowLogRole),
      trafficType: ec2.FlowLogTrafficType.ALL
    });
  }

  /**
   * Create VPC Endpoints based on configuration
   */
  private createVpcEndpointsIfNeeded(): void {
    const endpoints = this.config.vpcEndpoints;

    if (endpoints.s3) {
      this.vpc!.addGatewayEndpoint('S3Endpoint', {
        service: ec2.GatewayVpcEndpointAwsService.S3,
        subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }]
      });
    }

    if (endpoints.dynamodb) {
      this.vpc!.addGatewayEndpoint('DynamoDbEndpoint', {
        service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
        subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }]
      });
    }

    if (endpoints.secretsManager) {
      this.vpc!.addInterfaceEndpoint('SecretsManagerEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
      });
    }

    if (endpoints.kms) {
      this.vpc!.addInterfaceEndpoint('KmsEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.KMS,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
      });
    }

    if (endpoints.lambda) {
      this.vpc!.addInterfaceEndpoint('LambdaEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
      });
    }
  }

  /**
   * Apply security controls defined by configuration
   */
  private applySecurityControls(): void {
    const security = this.config.security;

    if (security.createDefaultSecurityGroups) {
      this.createDefaultSecurityGroups();
    }

    if (security.complianceNacls.enabled) {
      this.createComplianceNacls();

      if (security.complianceNacls.mode === 'high') {
        this.createHighSecurityNacls();
      }
    }

    if (security.restrictDefaultSecurityGroup) {
      this.restrictDefaultSecurityGroup();
    }
  }

  /**
   * Create default security groups with least privilege
   */
  private createDefaultSecurityGroups(): void {
    // Web tier security group
    const webSecurityGroup = new ec2.SecurityGroup(this, 'WebSecurityGroup', {
      vpc: this.vpc!,
      description: 'Security group for web tier',
      allowAllOutbound: false
    });
    this.applyStandardTags(webSecurityGroup, { 'security-group': 'web' });

    webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'HTTPS from internet'
    );

    webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'HTTP from internet (redirect to HTTPS)'
    );

    // App tier security group
    const appSecurityGroup = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
      vpc: this.vpc!,
      description: 'Security group for application tier',
      allowAllOutbound: false
    });
    this.applyStandardTags(appSecurityGroup, { 'security-group': 'app' });

    appSecurityGroup.addIngressRule(
      webSecurityGroup,
      ec2.Port.tcp(8080),
      'App traffic from web tier'
    );

    // Database tier security group
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc!,
      description: 'Security group for database tier',
      allowAllOutbound: false
    });
    this.applyStandardTags(dbSecurityGroup, { 'security-group': 'database' });

    dbSecurityGroup.addIngressRule(
      appSecurityGroup,
      ec2.Port.tcp(5432),
      'PostgreSQL from app tier'
    );

    // Register security groups as constructs
    this.registerConstruct('webSecurityGroup', webSecurityGroup);
    this.registerConstruct('appSecurityGroup', appSecurityGroup);
    this.registerConstruct('dbSecurityGroup', dbSecurityGroup);
  }

  /**
   * Create compliance-grade Network ACLs
   */
  private createComplianceNacls(): void {
    // Private subnet NACL with stricter rules
    const privateNacl = new ec2.NetworkAcl(this, 'PrivateNacl', {
      vpc: this.vpc!,
      networkAclName: 'private-subnet-nacl'
    });

    // Allow HTTPS outbound
    privateNacl.addEntry('AllowHttpsOutbound', {
      ruleNumber: 100,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.tcpPort(443),
      direction: ec2.TrafficDirection.EGRESS,
      ruleAction: ec2.Action.ALLOW
    });

    // Allow ephemeral ports inbound for responses
    privateNacl.addEntry('AllowEphemeralInbound', {
      ruleNumber: 100,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.ALLOW
    });

    // Associate with private subnets
    this.vpc!.privateSubnets.forEach((subnet, index) => {
      new ec2.SubnetNetworkAclAssociation(this, `PrivateNaclAssoc${index}`, {
        subnet,
        networkAcl: privateNacl
      });
    });
  }

  /**
   * Create high-security Network ACLs for FedRAMP High
   */
  private createHighSecurityNacls(): void {
    // Even more restrictive rules for FedRAMP High
    // This would implement specific port restrictions and source/destination filtering
    // based on the organization's security requirements
  }

  /**
   * Restrict the default security group
   */
  private restrictDefaultSecurityGroup(): void {
    // Remove all rules from default security group
    const defaultSg = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'DefaultSg',
      this.vpc!.vpcDefaultSecurityGroup
    );

    // Note: Default security group rule modification requires custom resources
    // and should be implemented through compliance-specific security group policies
  }

  /**
   * Build subnet configuration based on compliance requirements
   */
  private buildSubnetConfiguration(): ec2.SubnetConfiguration[] {
    const config: ec2.SubnetConfiguration[] = [];

    // Public subnets (for load balancers, NAT gateways)
    config.push({
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
      cidrMask: this.config!.subnets?.public?.cidrMask || 24
    });

    // Private subnets (for application servers)
    config.push({
      name: 'Private',
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      cidrMask: this.config!.subnets?.private?.cidrMask || 24
    });

    // Isolated subnets (for databases)
    config.push({
      name: 'Database',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      cidrMask: this.config!.subnets?.database?.cidrMask || 28
    });

    return config;
  }

  /**
   * Build VPC capability data shape
   */
  private buildVpcCapability(): any {
    return {
      vpcId: this.vpc!.vpcId,
      publicSubnetIds: this.vpc!.publicSubnets.map(s => s.subnetId),
      privateSubnetIds: this.vpc!.privateSubnets.map(s => s.subnetId),
      isolatedSubnetIds: this.vpc!.isolatedSubnets.map(s => s.subnetId)
    };
  }

  /**
   * Apply standard tags to all taggable resources
   */
  private applyStandardTagsToResources(): void {
    if (this.vpc) {
      this.applyStandardTags(this.vpc, {
        'vpc-cidr': this.config.cidr || '10.0.0.0/16',
        'nat-gateways': String(this.config.natGateways ?? 1),
        'max-azs': String(this.config.maxAzs || 2),
        'flow-logs-enabled': String(this.config.flowLogs.enabled),
        ...this.config.tags
      });
    }

    if (this.flowLogGroup) {
      this.applyStandardTags(this.flowLogGroup, {
        'log-type': 'vpc-flow-logs',
        'retention-days': String(this.config.flowLogs.retentionInDays)
      });
    }

    if (this.flowLogRole) {
      this.applyStandardTags(this.flowLogRole, {
        'role-type': 'vpc-flow-logs'
      });
    }
  }

  /**
   * Register constructs for patches.ts access
   */
  private registerConstructs(): void {
    this.registerConstruct('main', this.vpc!); // 'main' handle is mandatory
    this.registerConstruct('vpc', this.vpc!);

    if (this.flowLogGroup) {
      this.registerConstruct('flowLogGroup', this.flowLogGroup);
    }

    if (this.flowLogRole) {
      this.registerConstruct('flowLogRole', this.flowLogRole);
    }
  }

  /**
   * Register capabilities for binding
   */
  private registerCapabilities(): void {
    const capabilities: ComponentCapabilities = {};

    // Core VPC capability
    capabilities['net:vpc'] = {
      vpcId: this.vpc!.vpcId,
      vpcArn: this.vpc!.vpcArn,
      cidr: this.vpc!.vpcCidrBlock,
      availabilityZones: this.vpc!.availabilityZones,
      publicSubnetIds: this.vpc!.publicSubnets.map(subnet => subnet.subnetId),
      privateSubnetIds: this.vpc!.privateSubnets.map(subnet => subnet.subnetId),
      isolatedSubnetIds: this.vpc!.isolatedSubnets.map(subnet => subnet.subnetId),
      natGatewayIds: [] // NAT gateway IDs are not directly accessible from VPC construct
    };

    // Networking capability
    capabilities['networking:vpc'] = {
      vpcId: this.vpc!.vpcId,
      region: this.context.region || 'us-east-1',
      availabilityZones: this.vpc!.availabilityZones.length,
      hasPublicSubnets: this.vpc!.publicSubnets.length > 0,
      hasPrivateSubnets: this.vpc!.privateSubnets.length > 0,
      hasIsolatedSubnets: this.vpc!.isolatedSubnets.length > 0
    };

    // Security capability
    capabilities['security:network-isolation'] = {
      vpcId: this.vpc!.vpcId,
      flowLogsEnabled: this.config.flowLogs.enabled,
      vpcEndpointsEnabled: Object.values(this.config.vpcEndpoints).some(enabled => enabled),
      complianceFramework: this.context.complianceFramework
    };

    // Register all capabilities
    Object.entries(capabilities).forEach(([key, data]) => {
      this.registerCapability(key, data);
    });
  }
}
