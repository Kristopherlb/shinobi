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
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  ConfigBuilder,
  ComponentConfigSchema,
  NetVpcCapability
} from '../../contracts';

/**
 * Configuration interface for VPC component
 */
export interface VpcConfig {
  /** CIDR block for the VPC */
  cidr?: string;
  
  /** Maximum number of Availability Zones */
  maxAzs?: number;
  
  /** Enable NAT gateways for private subnets */
  natGateways?: number;
  
  /** Enable VPC Flow Logs */
  flowLogsEnabled?: boolean;
  
  /** Subnet configuration */
  subnets?: {
    /** Public subnet configuration */
    public?: {
      cidrMask?: number;
      name?: string;
    };
    /** Private subnet configuration */
    private?: {
      cidrMask?: number;
      name?: string;
    };
    /** Database subnet configuration */
    database?: {
      cidrMask?: number;
      name?: string;
    };
  };
  
  /** VPC Endpoints configuration */
  vpcEndpoints?: {
    s3?: boolean;
    dynamodb?: boolean;
    secretsManager?: boolean;
    kms?: boolean;
  };
  
  /** DNS configuration */
  dns?: {
    enableDnsHostnames?: boolean;
    enableDnsSupport?: boolean;
  };
}

/**
 * Configuration schema for VPC component
 */
export const VPC_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  title: 'VPC Configuration',
  description: 'Configuration for creating a Virtual Private Cloud',
  properties: {
    cidr: {
      type: 'string',
      description: 'CIDR block for the VPC',
      pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$',
      default: '10.0.0.0/16'
    },
    maxAzs: {
      type: 'number',
      description: 'Maximum number of Availability Zones',
      minimum: 2,
      maximum: 6,
      default: 2
    },
    natGateways: {
      type: 'number',
      description: 'Number of NAT gateways',
      minimum: 0,
      maximum: 6,
      default: 1
    },
    flowLogsEnabled: {
      type: 'boolean',
      description: 'Enable VPC Flow Logs',
      default: true
    }
  },
  additionalProperties: false,
  defaults: {
    cidr: '10.0.0.0/16',
    maxAzs: 2,
    natGateways: 1,
    flowLogsEnabled: true
  }
};

/**
 * VPC Component implementing Component API Contract v1.0
 */
export class VpcComponent extends Component {
  private vpc?: ec2.Vpc;
  private flowLogGroup?: logs.LogGroup;
  private flowLogRole?: iam.Role;
  private config?: VpcConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create VPC with compliance hardening
   */
  public synth(): void {
    // Build configuration
    this.config = this.buildConfigSync();
    
    // Create VPC
    this.createVpc();
    
    // Create VPC Flow Logs
    this.createVpcFlowLogsIfEnabled();
    
    // Create VPC Endpoints for compliance frameworks
    this.createVpcEndpointsIfNeeded();
    
    // Apply compliance hardening
    this.applyComplianceHardening();
    
    // Register constructs
    this.registerConstruct('vpc', this.vpc!);
    if (this.flowLogGroup) {
      this.registerConstruct('flowLogGroup', this.flowLogGroup);
    }
    if (this.flowLogRole) {
      this.registerConstruct('flowLogRole', this.flowLogRole);
    }
    
    // Register capabilities
    this.registerCapability('net:vpc', this.buildVpcCapability());
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
    if (this.config!.flowLogsEnabled !== false) {
      // Create log group for VPC Flow Logs
      this.flowLogGroup = new logs.LogGroup(this, 'VpcFlowLogGroup', {
        logGroupName: `/aws/vpc/flowlogs/${this.vpc!.vpcId}`,
        retention: this.getFlowLogRetention(),
        removalPolicy: this.isComplianceFramework() ? 
          cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
      });

      // Create IAM role for Flow Logs
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

      // Create VPC Flow Log
      new ec2.FlowLog(this, 'VpcFlowLog', {
        resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc!),
        destination: ec2.FlowLogDestination.toCloudWatchLogs(this.flowLogGroup, this.flowLogRole),
        trafficType: ec2.FlowLogTrafficType.ALL
      });
    }
  }

  /**
   * Create VPC Endpoints for compliance frameworks
   */
  private createVpcEndpointsIfNeeded(): void {
    if (this.isComplianceFramework()) {
      // S3 Gateway Endpoint (no cost)
      this.vpc!.addGatewayEndpoint('S3Endpoint', {
        service: ec2.GatewayVpcEndpointAwsService.S3,
        subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }]
      });

      // DynamoDB Gateway Endpoint (no cost)
      this.vpc!.addGatewayEndpoint('DynamoDbEndpoint', {
        service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
        subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }]
      });

      // Interface endpoints for FedRAMP deployments
      if (this.context.complianceFramework === 'fedramp-high') {
        // Secrets Manager endpoint
        this.vpc!.addInterfaceEndpoint('SecretsManagerEndpoint', {
          service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
          privateDnsEnabled: true,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
        });

        // KMS endpoint
        this.vpc!.addInterfaceEndpoint('KmsEndpoint', {
          service: ec2.InterfaceVpcEndpointAwsService.KMS,
          privateDnsEnabled: true,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
        });

        // Lambda endpoint
        this.vpc!.addInterfaceEndpoint('LambdaEndpoint', {
          service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
          privateDnsEnabled: true,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
        });
      }
    }
  }

  /**
   * Apply compliance-specific hardening
   */
  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }

  private applyCommercialHardening(): void {
    // Basic security group rules
    this.createDefaultSecurityGroups();
  }

  private applyFedrampModerateHardening(): void {
    // Apply commercial hardening
    this.applyCommercialHardening();

    // Create stricter NACLs
    this.createComplianceNacls();
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Additional high-security NACLs
    this.createHighSecurityNacls();

    // Remove default security group rules
    this.restrictDefaultSecurityGroup();
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
      cidr: ec2.AcmeCertificate.fromString('0.0.0.0/0'),
      traffic: ec2.AclTraffic.tcpPort(443),
      direction: ec2.TrafficDirection.EGRESS,
      ruleAction: ec2.Action.ALLOW
    });

    // Allow ephemeral ports inbound for responses
    privateNacl.addEntry('AllowEphemeralInbound', {
      ruleNumber: 100,
      cidr: ec2.AcmeCertificate.fromString('0.0.0.0/0'),
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

    // Add explicit deny rules (this is a placeholder - actual implementation would
    // require custom resources to modify the default security group)
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
  private buildVpcCapability(): NetVpcCapability {
    return {
      vpcId: this.vpc!.vpcId,
      publicSubnetIds: this.vpc!.publicSubnets.map(s => s.subnetId),
      privateSubnetIds: this.vpc!.privateSubnets.map(s => s.subnetId)
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private isComplianceFramework(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getFlowLogRetention(): logs.RetentionDays {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
        return logs.RetentionDays.THREE_MONTHS;
      case 'fedramp-high':
        return logs.RetentionDays.ONE_YEAR;
      default:
        return logs.RetentionDays.ONE_MONTH;
    }
  }

  /**
   * Simplified config building for demo purposes
   */
  private buildConfigSync(): VpcConfig {
    const config: VpcConfig = {
      cidr: this.spec.config?.cidr || '10.0.0.0/16',
      maxAzs: this.spec.config?.maxAzs || 2,
      natGateways: this.spec.config?.natGateways ?? 1,
      flowLogsEnabled: this.spec.config?.flowLogsEnabled !== false,
      subnets: this.spec.config?.subnets || {},
      vpcEndpoints: this.spec.config?.vpcEndpoints || {},
      dns: this.spec.config?.dns || {}
    };

    return config;
  }
}