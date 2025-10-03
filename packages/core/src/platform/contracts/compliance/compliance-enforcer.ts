/**
 * Compliance Enforcer
 * Enforces framework-specific rules and validates binding compliance
 */

import {
  ComplianceFramework,
  EnhancedBindingContext,
  ComplianceAction,
  Capability,
  SgPeer
} from '../bindings.js';

/**
 * Compliance enforcer for framework-specific validation
 */
export class ComplianceEnforcer {

  /**
   * Enforce compliance rules for a binding context
   * @param context - Binding context to validate
   * @returns Array of compliance actions taken
   */
  async enforceCompliance(context: EnhancedBindingContext): Promise<ComplianceAction[]> {
    const actions: ComplianceAction[] = [];

    switch (context.complianceFramework) {
      case 'fedramp-high':
        actions.push(...await this.enforceFedRAMPHigh(context));
        break;
      case 'fedramp-moderate':
        actions.push(...await this.enforceFedRAMPModerate(context));
        break;
      case 'commercial':
        actions.push(...await this.enforceCommercial(context));
        break;
      default:
        throw new Error(`Unsupported compliance framework: ${context.complianceFramework}`);
    }

    return actions;
  }

  /**
   * Enforce FedRAMP High compliance rules
   */
  private async enforceFedRAMPHigh(context: EnhancedBindingContext): Promise<ComplianceAction[]> {
    const actions: ComplianceAction[] = [];

    // S3 must use VPC endpoints
    if (this.isStorageCapability(context.directive.capability)) {
      if (!this.hasVpcEndpoint(context, 's3')) {
        actions.push(this.createError(
          'HIGH-S3-001',
          'S3 must be accessed via VPC endpoint in FedRAMP High',
          context,
          'Configure VPC endpoint for S3 access'
        ));
      }
    }

    // TLS required for all connections
    if (!this.hasTlsRequired(context)) {
      actions.push(this.createError(
        'HIGH-NET-001',
        'TLS is required for all connections in FedRAMP High',
        context,
        'Enable TLS encryption for all network connections'
      ));
    }

    // Deny CIDR peers outside RFC1918
    const invalidCidrActions = this.validateCidrPeers(context, 'fedramp-high');
    actions.push(...invalidCidrActions);

    // FIPS endpoints required
    if (!this.hasFipsEndpoints(context)) {
      actions.push(this.createError(
        'HIGH-FIPS-001',
        'FIPS endpoints are required in FedRAMP High',
        context,
        'Use FIPS-compliant endpoints for all AWS services'
      ));
    }

    // Private connectivity required
    if (!this.hasPrivateConnectivity(context)) {
      actions.push(this.createError(
        'HIGH-NET-002',
        'Private connectivity is required in FedRAMP High',
        context,
        'Use private subnets and VPC endpoints for all connections'
      ));
    }

    // VPC endpoints required for SSM, Secrets, KMS
    const requiredVpcEndpoints = ['ssm', 'secretsmanager', 'kms'];
    for (const service of requiredVpcEndpoints) {
      if (!this.hasVpcEndpoint(context, service)) {
        actions.push(this.createError(
          `HIGH-VPC-${service.toUpperCase()}-001`,
          `${service.toUpperCase()} must use VPC endpoint in FedRAMP High`,
          context,
          `Configure VPC endpoint for ${service}`
        ));
      }
    }

    // Log retention >= 400 days
    if (!this.hasMinimumLogRetention(context, 400)) {
      actions.push(this.createError(
        'HIGH-LOG-001',
        'Log retention must be at least 400 days in FedRAMP High',
        context,
        'Configure CloudWatch log retention to 400 days or more'
      ));
    }

    return actions;
  }

  /**
   * Enforce FedRAMP Moderate compliance rules
   */
  private async enforceFedRAMPModerate(context: EnhancedBindingContext): Promise<ComplianceAction[]> {
    const actions: ComplianceAction[] = [];

    // TLS required
    if (!this.hasTlsRequired(context)) {
      actions.push(this.createError(
        'MOD-NET-001',
        'TLS is required for all connections in FedRAMP Moderate',
        context,
        'Enable TLS encryption for all network connections'
      ));
    }

    // Encryption at rest required
    if (!this.hasEncryptionAtRest(context)) {
      actions.push(this.createError(
        'MOD-ENC-001',
        'Encryption at rest is required in FedRAMP Moderate',
        context,
        'Enable encryption at rest for all data storage'
      ));
    }

    // Private connectivity preferred (warning, not error)
    if (!this.hasPrivateConnectivity(context)) {
      actions.push(this.createWarning(
        'MOD-NET-002',
        'Private connectivity is recommended in FedRAMP Moderate',
        context,
        'Consider using private subnets and VPC endpoints'
      ));
    }

    // CIDR validation (stricter than commercial)
    const invalidCidrActions = this.validateCidrPeers(context, 'fedramp-moderate');
    actions.push(...invalidCidrActions);

    // Log retention >= 90 days
    if (!this.hasMinimumLogRetention(context, 90)) {
      actions.push(this.createError(
        'MOD-LOG-001',
        'Log retention must be at least 90 days in FedRAMP Moderate',
        context,
        'Configure CloudWatch log retention to 90 days or more'
      ));
    }

    return actions;
  }

  /**
   * Enforce Commercial compliance rules (best practices)
   */
  private async enforceCommercial(context: EnhancedBindingContext): Promise<ComplianceAction[]> {
    const actions: ComplianceAction[] = [];

    // TLS recommended
    if (!this.hasTlsRequired(context)) {
      actions.push(this.createWarning(
        'COM-NET-001',
        'TLS encryption is recommended for all connections',
        context,
        'Consider enabling TLS encryption for better security'
      ));
    }

    // Encryption at rest recommended
    if (!this.hasEncryptionAtRest(context)) {
      actions.push(this.createWarning(
        'COM-ENC-001',
        'Encryption at rest is recommended',
        context,
        'Consider enabling encryption at rest for data protection'
      ));
    }

    // Basic CIDR validation
    const invalidCidrActions = this.validateCidrPeers(context, 'commercial');
    actions.push(...invalidCidrActions);

    return actions;
  }

  /**
   * Check if capability is a storage capability
   */
  private isStorageCapability(capability: Capability): boolean {
    return capability.startsWith('storage:') || capability.startsWith('bucket:');
  }

  /**
   * Check if VPC endpoint is configured for service
   */
  private hasVpcEndpoint(context: EnhancedBindingContext, service: string): boolean {
    const options = context.options || {};
    const vpcEndpoints = options.vpcEndpoints as Record<string, boolean> || {};
    return vpcEndpoints[service] === true;
  }

  /**
   * Check if TLS is required
   */
  private hasTlsRequired(context: EnhancedBindingContext): boolean {
    const options = context.options || {};
    return options.tlsRequired === true;
  }

  /**
   * Check if FIPS endpoints are used
   */
  private hasFipsEndpoints(context: EnhancedBindingContext): boolean {
    const options = context.options || {};
    return options.fipsEndpoints === true;
  }

  /**
   * Check if private connectivity is configured
   */
  private hasPrivateConnectivity(context: EnhancedBindingContext): boolean {
    const options = context.options || {};
    return options.privateConnectivity === true;
  }

  /**
   * Check if encryption at rest is enabled
   */
  private hasEncryptionAtRest(context: EnhancedBindingContext): boolean {
    const capabilityData = context.targetCapabilityData as any;
    return capabilityData?.encryption?.enabled === true ||
      capabilityData?.encryption?.atRest === true;
  }

  /**
   * Check if minimum log retention is configured
   */
  private hasMinimumLogRetention(context: EnhancedBindingContext, minDays: number): boolean {
    const options = context.options || {};
    const retentionDays = options.logRetentionDays as number || 0;
    return retentionDays >= minDays;
  }

  /**
   * Validate CIDR peers based on framework requirements
   */
  private validateCidrPeers(context: EnhancedBindingContext, framework: ComplianceFramework): ComplianceAction[] {
    const actions: ComplianceAction[] = [];

    // Extract security group rules from context (if available)
    const sgRules = this.extractSecurityGroupRules(context);

    for (const rule of sgRules) {
      if (rule.peer.kind === 'cidr') {
        const cidr = rule.peer.cidr;

        if (framework === 'fedramp-high' && !this.isRfc1918Cidr(cidr)) {
          actions.push(this.createError(
            'HIGH-NET-003',
            `CIDR ${cidr} is not RFC1918 private in FedRAMP High`,
            context,
            'Use only RFC1918 private CIDR blocks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)'
          ));
        } else if (framework === 'fedramp-moderate' && !this.isPrivateCidr(cidr)) {
          actions.push(this.createError(
            'MOD-NET-003',
            `CIDR ${cidr} should be private in FedRAMP Moderate`,
            context,
            'Use private CIDR blocks or security group references'
          ));
        } else if (framework === 'commercial' && this.isPublicCidr(cidr)) {
          actions.push(this.createWarning(
            'COM-NET-002',
            `Public CIDR ${cidr} should be reviewed for security`,
            context,
            'Consider using private CIDR blocks for better security'
          ));
        }
      }
    }

    return actions;
  }

  /**
   * Extract security group rules from context (placeholder implementation)
   */
  private extractSecurityGroupRules(context: EnhancedBindingContext): Array<{ peer: SgPeer }> {
    // This would extract from the binding context or options
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Check if CIDR is RFC1918 private
   */
  private isRfc1918Cidr(cidr: string): boolean {
    const rfc1918Blocks = [
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16'
    ];

    // Simple check - in real implementation, use proper CIDR library
    return rfc1918Blocks.some(block => cidr.startsWith(block.split('/')[0]));
  }

  /**
   * Check if CIDR is private (RFC1918 or other private ranges)
   */
  private isPrivateCidr(cidr: string): boolean {
    return this.isRfc1918Cidr(cidr) || cidr.includes('10.') || cidr.includes('192.168.') || cidr.includes('172.');
  }

  /**
   * Check if CIDR is public
   */
  private isPublicCidr(cidr: string): boolean {
    return !this.isPrivateCidr(cidr);
  }

  /**
   * Create error compliance action
   */
  private createError(
    ruleId: string,
    message: string,
    context: EnhancedBindingContext,
    remediation?: string
  ): ComplianceAction {
    return {
      ruleId,
      severity: 'error',
      message,
      framework: context.complianceFramework,
      remediation,
      metadata: {
        source: context.source.getName(),
        target: context.target.getName(),
        capability: context.directive.capability,
        environment: context.environment
      }
    };
  }

  /**
   * Create warning compliance action
   */
  private createWarning(
    ruleId: string,
    message: string,
    context: EnhancedBindingContext,
    remediation?: string
  ): ComplianceAction {
    return {
      ruleId,
      severity: 'warning',
      message,
      framework: context.complianceFramework,
      remediation,
      metadata: {
        source: context.source.getName(),
        target: context.target.getName(),
        capability: context.directive.capability,
        environment: context.environment
      }
    };
  }
}
