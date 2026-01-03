/**
 * Ec2BinderStrategy (Unified)
 * Handles compute:ec2 bindings with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
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

    // Determine IAM actions based on access level
    let actions: string[] = [];
    
    if (access === 'read' || access === 'readwrite' || access === 'admin') {
      // Read access: Describe instances and related resources
      actions.push(
        'ec2:DescribeInstances',
        'ec2:DescribeInstanceStatus',
        'ec2:DescribeInstanceAttribute',
        'ec2:DescribeImages',
        'ec2:DescribeSnapshots',
        'ec2:DescribeVolumes',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DescribeSecurityGroups',
        'ec2:DescribeTags'
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
      actions.push(
        'ec2:TerminateInstances',
        'ec2:AttachVolume',
        'ec2:DetachVolume',
        'ec2:ModifyInstanceAttribute',
        'ec2:ResetInstanceAttribute',
        'ec2:AssignPrivateIpAddresses',
        'ec2:UnassignPrivateIpAddresses'
      );
    }

    // Create IAM policy
    if (actions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [...new Set(actions)], // Remove duplicates
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

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [],
    };
  }
}

