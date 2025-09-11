/**
 * Security Group Import Component
 * 
 * Declarative import of existing security groups via SSM parameters.
 * Implements the Platform Component API Contract and provides security-group:import capability.
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { BaseComponent } from '../../../../src/platform/contracts/component';
import { ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';
import { SecurityGroupImportConfig, SecurityGroupImportConfigBuilder } from './security-group-import.builder';

/**
 * Security Group Import Component
 * 
 * Imports existing security groups by looking up their IDs from SSM parameters.
 * This is a "read-only" component that does not create new resources.
 */
export class SecurityGroupImportComponent extends BaseComponent {
  private readonly config: SecurityGroupImportConfig;
  private readonly securityGroup: ec2.ISecurityGroup;
  private readonly ssmParameter: ssm.IStringParameter;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);

    // Build configuration using the 5-layer precedence chain
    const configBuilder = new SecurityGroupImportConfigBuilder({ context, spec });
    this.config = configBuilder.buildSync();

    // Import the SSM parameter
    this.ssmParameter = this.importSsmParameter();

    // Import the security group
    this.securityGroup = this.importSecurityGroup();

    // Apply standard tags (for documentation purposes)
    this.applyStandardTags(this.securityGroup);
  }

  /**
   * Import the SSM parameter containing the security group ID
   */
  private importSsmParameter(): ssm.IStringParameter {
    const parameterName = this.config.securityGroup.ssmParameterName;
    
    // Import the SSM parameter
    const parameter = ssm.StringParameter.fromStringParameterName(
      this,
      'SecurityGroupParameter',
      parameterName
    );

    return parameter;
  }

  /**
   * Import the security group using the ID from the SSM parameter
   */
  private importSecurityGroup(): ec2.ISecurityGroup {
    const { securityGroup } = this.config;

    // Import the security group by ID from SSM parameter
    const importedSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'ImportedSecurityGroup',
      this.ssmParameter.stringValue,
      {
        allowAllOutbound: false, // Conservative default
        mutable: false // Read-only import
      }
    );

    // Add validation if configured
    if (this.config.validation?.validateExistence) {
      this.addValidation(importedSecurityGroup);
    }

    return importedSecurityGroup;
  }

  /**
   * Add validation for the imported security group
   */
  private addValidation(securityGroup: ec2.ISecurityGroup): void {
    const { validation, securityGroup: sgConfig } = this.config;

    if (!validation?.validateExistence) return;

    // Create a custom resource to validate the security group exists
    const validator = new cdk.CustomResource(this, 'SecurityGroupValidator', {
      serviceToken: this.createValidationLambda(),
      properties: {
        SecurityGroupId: securityGroup.securityGroupId,
        VpcId: sgConfig.vpcId,
        ValidateVpc: validation.validateVpc || false,
        Timeout: validation.validationTimeout || 30
      }
    });

    // Ensure the security group is created before validation
    securityGroup.node.addDependency(validator);
  }

  /**
   * Create a Lambda function for security group validation
   */
  private createValidationLambda(): string {
    // In a real implementation, this would create a Lambda function
    // For now, we'll use a placeholder that would be provided by the platform
    return `arn:aws:lambda:${this.context.region}:${this.context.accountId}:function:security-group-validator`;
  }

  /**
   * Get the security group construct for external access
   */
  public getConstruct(handle: string): any {
    switch (handle) {
      case 'securityGroup':
        return this.securityGroup;
      case 'ssmParameter':
        return this.ssmParameter;
      default:
        throw new Error(`Unknown construct handle: ${handle}`);
    }
  }

  /**
   * Get component capabilities
   */
  public getCapabilities(): Record<string, any> {
    return {
      'security-group:import': {
        securityGroupId: this.securityGroup.securityGroupId,
        ssmParameterName: this.config.securityGroup.ssmParameterName,
        vpcId: this.config.securityGroup.vpcId,
        region: this.config.securityGroup.region || this.context.region,
        accountId: this.config.securityGroup.accountId || this.context.accountId
      }
    };
  }

  /**
   * Get component outputs
   */
  public getOutputs(): Record<string, any> {
    return {
      securityGroupId: this.securityGroup.securityGroupId,
      vpcId: this.config.securityGroup.vpcId,
      ssmParameterName: this.config.securityGroup.ssmParameterName,
      ssmParameterValue: this.ssmParameter.stringValue
    };
  }

  /**
   * Synthesize the component (required by BaseComponent)
   */
  public synth(): void {
    // Component is already synthesized in constructor
    // This method is required by the abstract base class
  }

  /**
   * Get component type (required by BaseComponent)
   */
  public getType(): string {
    return 'security-group-import';
  }
}
