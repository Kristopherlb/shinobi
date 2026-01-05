/**
 * Ec2BinderStrategy (Unified)
 * Handles compute:ec2 bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class Ec2BinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['compute:ec2'];

  getStrategyName(): string {
    return 'Ec2BinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: '*',
        capability: 'compute:ec2',
        supportedAccess: ['read', 'write', 'admin'],
        description: 'Bind to EC2 instances for read-only access, instance control (start/stop/reboot), or full administrative access',
        examples: ['lambda-monitoring -> compute:ec2 (read)', 'lambda-automation -> compute:ec2 (write)', 'lambda-admin -> compute:ec2 (admin)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for compute:ec2 binding');
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

    return await this.bindToEc2(context, targetCapabilityData);
  }

  /**
   * Bind to compute:ec2
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (Ec2CapabilityData):
   *   - type: 'compute:ec2'
   *   - resources (required): { instanceId: string, arn?: string }
   *   - instanceType (optional): string - Instance type (e.g., 't3.micro')
   *   - state (optional): string - Instance state (e.g., 'running', 'stopped')
   *   - vpcId (optional): string - VPC ID
   *   - subnetId (optional): string - Subnet ID
   *   - availabilityZone (optional): string - AZ
   *   - privateIpAddress (optional): string - Private IP address
   *   - publicIpAddress (optional): string - Public IP address
   *   - volumeIds (optional): string[] - Attached EBS volume IDs
   *   - networkInterfaceIds (optional): string[] - Network interface IDs
   *   - iamInstanceProfileArn (optional): string - IAM instance profile ARN
   *   - iamInstanceProfileName (optional): string - IAM instance profile name
   *   - iamRoleName (optional): string - IAM role name
   *   - userData (optional): string - User data (base64 encoded)
   * @returns Enhanced binding result (without compliance block)
   */
  private async bindToEc2(
    context: BindingContext,
    targetData: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.resources?.instanceId) {
      throw new Error('Target component missing required resources.instanceId property for EC2 binding');
    }

    const { directive } = context;
    const { access } = directive;

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};
    const instanceId = targetData.resources.instanceId;
    const instanceArn = targetData.resources.arn || `arn:aws:ec2:*:*:instance/${instanceId}`;

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc: string) => this.getEc2ActionsForAccess(acc),
      'ec2'
    );

    // Create IAM policy
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [instanceArn]
        }),
        description: `EC2 instance ${access} access`,
        complianceRequirement: `Least privilege IAM access for EC2 instance ${access} operations`
      });
    }

    // Set environment variables
    environmentVariables['EC2_INSTANCE_ID'] = instanceId;
    if (targetData.resources.arn) {
      environmentVariables['EC2_INSTANCE_ARN'] = targetData.resources.arn;
    }
    
    if (targetData.instanceType) {
      environmentVariables['EC2_INSTANCE_TYPE'] = targetData.instanceType;
    }
    
    if (targetData.state) {
      environmentVariables['EC2_INSTANCE_STATE'] = targetData.state;
    }
    
    if (targetData.vpcId) {
      environmentVariables['EC2_VPC_ID'] = targetData.vpcId;
    }
    
    if (targetData.subnetId) {
      environmentVariables['EC2_SUBNET_ID'] = targetData.subnetId;
    }
    
    if (targetData.availabilityZone) {
      environmentVariables['EC2_AVAILABILITY_ZONE'] = targetData.availabilityZone;
    }
    
    if (targetData.privateIpAddress) {
      environmentVariables['EC2_PRIVATE_IP_ADDRESS'] = targetData.privateIpAddress;
    }
    
    if (targetData.publicIpAddress) {
      environmentVariables['EC2_PUBLIC_IP_ADDRESS'] = targetData.publicIpAddress;
    }
    
    // EBS volume attachments
    if (targetData.volumeIds && Array.isArray(targetData.volumeIds)) {
      environmentVariables['EC2_VOLUME_IDS'] = targetData.volumeIds.join(',');
      environmentVariables['EC2_VOLUME_COUNT'] = targetData.volumeIds.length.toString();
    }
    
    // Network interface attachments
    if (targetData.networkInterfaceIds && Array.isArray(targetData.networkInterfaceIds)) {
      environmentVariables['EC2_NETWORK_INTERFACE_IDS'] = targetData.networkInterfaceIds.join(',');
      environmentVariables['EC2_NETWORK_INTERFACE_COUNT'] = targetData.networkInterfaceIds.length.toString();
    }
    
    // Instance profile (IAM role)
    if (targetData.iamInstanceProfileArn) {
      environmentVariables['EC2_IAM_INSTANCE_PROFILE_ARN'] = targetData.iamInstanceProfileArn;
    }
    if (targetData.iamInstanceProfileName) {
      environmentVariables['EC2_IAM_INSTANCE_PROFILE_NAME'] = targetData.iamInstanceProfileName;
    }
    if (targetData.iamRoleName) {
      environmentVariables['EC2_IAM_ROLE_NAME'] = targetData.iamRoleName;
    }
    
    // User data (base64 encoded, applications should decode)
    if (targetData.userData) {
      environmentVariables['EC2_USER_DATA'] = targetData.userData;
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [],
    };
  }

  /**
   * Get EC2 actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getEc2ActionsForAccess(access: string): string[] {
    const actions: string[] = [];
    
    if (access === 'read' || access === 'readwrite' || access === 'admin') {
      // Read access: Describe instances and related resources
      actions.push(
        'ec2:DescribeInstances',
        'ec2:DescribeInstanceStatus',
        'ec2:DescribeInstanceAttribute',
        'ec2:DescribeImages',
        'ec2:DescribeSnapshots',
        'ec2:DescribeVolumes',
        'ec2:DescribeVolumeAttachments',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DescribeNetworkInterfaceAttribute',
        'ec2:DescribeSecurityGroups',
        'ec2:DescribeTags',
        'ec2:DescribeIamInstanceProfileAssociations',
        'iam:GetInstanceProfile',
        'iam:GetRole'
      );
    }

    if (access === 'write' || access === 'readwrite' || access === 'admin') {
      // Write access: Control instance lifecycle
      actions.push(
        'ec2:StartInstances',
        'ec2:StopInstances',
        'ec2:RebootInstances',
        'ec2:CreateTags',
        'ec2:ModifyInstanceAttribute'
      );
    }

    if (access === 'admin') {
      // Admin access: Full control including termination
      // TODO: Consider gating TerminateInstances behind an option for safety
      actions.push(
        'ec2:TerminateInstances',
        'ec2:AttachVolume',
        'ec2:DetachVolume',
        'ec2:AttachNetworkInterface',
        'ec2:DetachNetworkInterface',
        'ec2:ModifyInstanceAttribute',
        'ec2:ResetInstanceAttribute',
        'ec2:AssignPrivateIpAddresses',
        'ec2:UnassignPrivateIpAddresses',
        'ec2:AssociateIamInstanceProfile',
        'ec2:DisassociateIamInstanceProfile',
        'ec2:ReplaceIamInstanceProfileAssociation',
        'ssm:StartSession',
        'ssm:SendCommand'
      );
    }

    return [...new Set(actions)]; // Remove duplicates
  }
}

