/**
 * VPC Binder Strategy
 * Handles Virtual Private Cloud bindings for Amazon VPC
 */
// Compliance framework branching removed; use binding.options/config instead
export class VpcBinderStrategy {
    supportedCapabilities = ['vpc:network', 'vpc:subnet', 'vpc:security-group', 'vpc:route-table', 'vpc:nat-gateway'];
    async bind(sourceComponent, targetComponent, binding, context) {
        const { capability, access } = binding;
        switch (capability) {
            case 'vpc:network':
                await this.bindToNetwork(sourceComponent, targetComponent, binding, context);
                break;
            case 'vpc:subnet':
                await this.bindToSubnet(sourceComponent, targetComponent, binding, context);
                break;
            case 'vpc:security-group':
                await this.bindToSecurityGroup(sourceComponent, targetComponent, binding, context);
                break;
            case 'vpc:route-table':
                await this.bindToRouteTable(sourceComponent, targetComponent, binding, context);
                break;
            case 'vpc:nat-gateway':
                await this.bindToNatGateway(sourceComponent, targetComponent, binding, context);
                break;
            default:
                throw new Error(`Unsupported VPC capability: ${capability}`);
        }
    }
    async bindToNetwork(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant VPC access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'ec2:DescribeVpcs',
                    'ec2:DescribeVpcAttribute',
                    'ec2:DescribeVpcClassicLink',
                    'ec2:DescribeVpcClassicLinkDnsSupport'
                ],
                Resource: targetComponent.vpcArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'ec2:CreateVpc',
                    'ec2:ModifyVpcAttribute',
                    'ec2:DeleteVpc',
                    'ec2:AttachClassicLinkVpc',
                    'ec2:DetachClassicLinkVpc'
                ],
                Resource: targetComponent.vpcArn
            });
        }
        // Inject VPC environment variables
        sourceComponent.addEnvironment('VPC_ID', targetComponent.vpcId);
        sourceComponent.addEnvironment('VPC_ARN', targetComponent.vpcArn);
        sourceComponent.addEnvironment('VPC_CIDR_BLOCK', targetComponent.cidrBlock);
        sourceComponent.addEnvironment('VPC_STATE', targetComponent.state);
        sourceComponent.addEnvironment('VPC_DEFAULT', targetComponent.isDefault.toString());
        // Configure DNS settings
        if (targetComponent.enableDnsHostnames !== undefined) {
            sourceComponent.addEnvironment('VPC_DNS_HOSTNAMES', targetComponent.enableDnsHostnames.toString());
        }
        if (targetComponent.enableDnsSupport !== undefined) {
            sourceComponent.addEnvironment('VPC_DNS_SUPPORT', targetComponent.enableDnsSupport.toString());
        }
        // Configure secure networking when requested via options/config
        if (binding.options?.requireSecureAccess === true) {
            await this.configureSecureNetworkAccess(sourceComponent, targetComponent, context);
        }
    }
    async bindToSubnet(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant subnet access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'ec2:DescribeSubnets',
                    'ec2:DescribeSubnetAttribute'
                ],
                Resource: targetComponent.subnetArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'ec2:CreateSubnet',
                    'ec2:ModifySubnetAttribute',
                    'ec2:DeleteSubnet',
                    'ec2:AssociateSubnetCidrBlock',
                    'ec2:DisassociateSubnetCidrBlock'
                ],
                Resource: targetComponent.subnetArn
            });
        }
        // Inject subnet environment variables
        sourceComponent.addEnvironment('SUBNET_ID', targetComponent.subnetId);
        sourceComponent.addEnvironment('SUBNET_ARN', targetComponent.subnetArn);
        sourceComponent.addEnvironment('SUBNET_CIDR_BLOCK', targetComponent.cidrBlock);
        sourceComponent.addEnvironment('SUBNET_AVAILABILITY_ZONE', targetComponent.availabilityZone);
        sourceComponent.addEnvironment('SUBNET_STATE', targetComponent.state);
        sourceComponent.addEnvironment('SUBNET_VPC_ID', targetComponent.vpcId);
        // Configure subnet type
        sourceComponent.addEnvironment('SUBNET_TYPE', targetComponent.type || 'private');
        sourceComponent.addEnvironment('SUBNET_PUBLIC_IP_ON_LAUNCH', targetComponent.mapPublicIpOnLaunch?.toString() || 'false');
    }
    async bindToSecurityGroup(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant security group access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'ec2:DescribeSecurityGroups',
                    'ec2:DescribeSecurityGroupRules'
                ],
                Resource: targetComponent.securityGroupArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'ec2:CreateSecurityGroup',
                    'ec2:DeleteSecurityGroup',
                    'ec2:AuthorizeSecurityGroupIngress',
                    'ec2:RevokeSecurityGroupIngress',
                    'ec2:AuthorizeSecurityGroupEgress',
                    'ec2:RevokeSecurityGroupEgress'
                ],
                Resource: targetComponent.securityGroupArn
            });
        }
        // Inject security group environment variables
        sourceComponent.addEnvironment('SECURITY_GROUP_ID', targetComponent.securityGroupId);
        sourceComponent.addEnvironment('SECURITY_GROUP_ARN', targetComponent.securityGroupArn);
        sourceComponent.addEnvironment('SECURITY_GROUP_NAME', targetComponent.groupName);
        sourceComponent.addEnvironment('SECURITY_GROUP_DESCRIPTION', targetComponent.description);
        sourceComponent.addEnvironment('SECURITY_GROUP_VPC_ID', targetComponent.vpcId);
        // Configure security group rules
        if (targetComponent.securityGroupRules) {
            sourceComponent.addEnvironment('SECURITY_GROUP_INGRESS_RULES', JSON.stringify(targetComponent.securityGroupRules.filter((rule) => rule.isEgress === false)));
            sourceComponent.addEnvironment('SECURITY_GROUP_EGRESS_RULES', JSON.stringify(targetComponent.securityGroupRules.filter((rule) => rule.isEgress === true)));
        }
    }
    async bindToRouteTable(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant route table access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'ec2:DescribeRouteTables',
                    'ec2:DescribeRoutes'
                ],
                Resource: targetComponent.routeTableArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'ec2:CreateRouteTable',
                    'ec2:DeleteRouteTable',
                    'ec2:CreateRoute',
                    'ec2:DeleteRoute',
                    'ec2:ReplaceRoute',
                    'ec2:AssociateRouteTable',
                    'ec2:DisassociateRouteTable'
                ],
                Resource: targetComponent.routeTableArn
            });
        }
        // Inject route table environment variables
        sourceComponent.addEnvironment('ROUTE_TABLE_ID', targetComponent.routeTableId);
        sourceComponent.addEnvironment('ROUTE_TABLE_ARN', targetComponent.routeTableArn);
        sourceComponent.addEnvironment('ROUTE_TABLE_VPC_ID', targetComponent.vpcId);
        // Configure routes
        if (targetComponent.routes) {
            sourceComponent.addEnvironment('ROUTE_TABLE_ROUTES', JSON.stringify(targetComponent.routes));
        }
        // Configure associations
        if (targetComponent.associations) {
            sourceComponent.addEnvironment('ROUTE_TABLE_ASSOCIATIONS', JSON.stringify(targetComponent.associations));
        }
    }
    async bindToNatGateway(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant NAT Gateway access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'ec2:DescribeNatGateways'
                ],
                Resource: targetComponent.natGatewayArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'ec2:CreateNatGateway',
                    'ec2:DeleteNatGateway',
                    'ec2:AllocateAddress',
                    'ec2:ReleaseAddress'
                ],
                Resource: [
                    targetComponent.natGatewayArn,
                    `arn:aws:ec2:${context.region}:${context.accountId}:elastic-ip/*`
                ]
            });
        }
        // Inject NAT Gateway environment variables
        sourceComponent.addEnvironment('NAT_GATEWAY_ID', targetComponent.natGatewayId);
        sourceComponent.addEnvironment('NAT_GATEWAY_ARN', targetComponent.natGatewayArn);
        sourceComponent.addEnvironment('NAT_GATEWAY_STATE', targetComponent.state);
        sourceComponent.addEnvironment('NAT_GATEWAY_SUBNET_ID', targetComponent.subnetId);
        sourceComponent.addEnvironment('NAT_GATEWAY_PUBLIC_IP', targetComponent.natGatewayAddresses?.[0]?.publicIp);
        // Configure connectivity type
        sourceComponent.addEnvironment('NAT_GATEWAY_CONNECTIVITY_TYPE', targetComponent.connectivityType || 'public');
    }
    async configureSecureNetworkAccess(sourceComponent, targetComponent, context) {
        // Configure flow logs for network monitoring
        if (targetComponent.flowLogsEnabled) {
            sourceComponent.addEnvironment('VPC_FLOW_LOGS_ENABLED', 'true');
            // Grant CloudWatch Logs permissions for flow logs
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents'
                ],
                Resource: `arn:aws:logs:${context.region}:${context.accountId}:log-group:/aws/vpc/flowlogs:*`
            });
        }
        // Configure VPC endpoints when explicitly enabled
        if (targetComponent?.enableVpcEndpoints === true) {
            sourceComponent.addEnvironment('VPC_ENDPOINTS_ENABLED', 'true');
            const endpoints = targetComponent?.vpcEndpoints ?? [];
            if (endpoints.length > 0) {
                sourceComponent.addEnvironment('VPC_ENDPOINT_SERVICES', endpoints.join(','));
            }
        }
        // Configure network ACLs for additional security
        if (targetComponent.networkAcls) {
            sourceComponent.addEnvironment('VPC_NETWORK_ACLS', JSON.stringify(targetComponent.networkAcls));
        }
    }
}
//# sourceMappingURL=vpc-binder-strategy.js.map