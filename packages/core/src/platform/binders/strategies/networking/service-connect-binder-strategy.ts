/**
 * Service Connect Binder Strategy
 * Governs bindings to service:connect capabilities by configuring
 * least-privilege security group rules and optional environment exports.
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';

export class ServiceConnectBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['service:connect'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    _context: BindingContext
  ): Promise<void> {
    if (!targetComponent?.getCapabilities || typeof targetComponent.getCapabilities !== 'function') {
      throw new Error('Target component does not expose capabilities for service:connect binding');
    }

    const capability = targetComponent.getCapabilities()['service:connect'];
    if (!capability) {
      throw new Error('Target component is missing the service:connect capability payload');
    }

    const securityGroupId: string | undefined = capability.sgId ?? capability.securityGroupId;
    if (!securityGroupId) {
      throw new Error('service:connect capability is missing sgId (security group identifier)');
    }

    const listenerPort: number | undefined = capability.port;
    if (typeof listenerPort !== 'number') {
      throw new Error('service:connect capability is missing the listener port');
    }

    const targetSecurityGroup = this.resolveSecurityGroup({
      component: targetComponent,
      idSuffix: this.sanitiseIdSuffix(capability.serviceName ?? capability.dnsName ?? 'service-connect-target'),
      explicitSecurityGroupId: securityGroupId,
      missingMessage: 'Target component must expose or declare a security group for service:connect bindings',
      allowImportFallback: true
    });

    const sourceSecurityGroup = this.resolveSecurityGroup({
      component: sourceComponent,
      idSuffix: this.sanitiseIdSuffix(`${capability.serviceName ?? 'service-connect'}-client`),
      explicitSecurityGroupId: binding.options?.sourceSecurityGroupId,
      missingMessage: 'Source component must expose a security group for service:connect bindings',
      allowImportFallback: false
    });

    if (!sourceSecurityGroup) {
      throw new Error('Source component must expose a security group for service:connect bindings');
    }

    if (!targetSecurityGroup) {
      throw new Error('Target component must expose or declare a security group for service:connect bindings');
    }

    targetSecurityGroup.addIngressRule(
      sourceSecurityGroup,
      ec2.Port.tcp(listenerPort),
      `Service Connect access from ${binding.from}`
    );

    const peer = ec2.Peer.securityGroupId(targetSecurityGroup.securityGroupId);
    sourceSecurityGroup.addEgressRule(
      peer,
      ec2.Port.tcp(listenerPort),
      `Service Connect egress to ${binding.to}`
    );

    if (binding.env && typeof sourceComponent?.addEnvironment === 'function') {
      Object.entries(binding.env).forEach(([envVar, capabilityKey]) => {
        const value = capability[capabilityKey];
        if (value !== undefined && value !== null) {
          sourceComponent.addEnvironment(envVar, String(value));
        }
      });
    }
  }

  private resolveSecurityGroup(params: {
    component: any;
    idSuffix: string;
    explicitSecurityGroupId?: string;
    missingMessage: string;
    allowImportFallback: boolean;
  }): ec2.ISecurityGroup | undefined {
    const { component, idSuffix, explicitSecurityGroupId, missingMessage, allowImportFallback } = params;

    const registered =
      typeof component?.getConstruct === 'function'
        ? (component.getConstruct('securityGroup') as ec2.ISecurityGroup | undefined)
        : undefined;

    if (registered) {
      return registered;
    }

    if (!allowImportFallback) {
      throw new Error(missingMessage);
    }

    if (!explicitSecurityGroupId) {
      throw new Error('Security group handle is required for service:connect binding');
    }

    return ec2.SecurityGroup.fromSecurityGroupId(
      component,
      `ServiceConnectImportedSecurityGroup-${idSuffix}`,
      explicitSecurityGroupId
    );
  }

  private sanitiseIdSuffix(input: string): string {
    return input.replace(/[^A-Za-z0-9-]/g, '-');
  }
}
