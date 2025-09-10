/**
 * SSM Parameter Component
 * 
 * AWS Systems Manager Parameter Store for configuration management and application parameters.
 * Implements Platform Component API Contract v1.1 with BaseComponent extension.
 */

import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent } from '../../platform/contracts/component';
import {
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '../../platform/contracts/component-interfaces';
import { SsmParameterConfig, SsmParameterConfigBuilder } from './ssm-parameter.builder';

/**
 * SSM Parameter Component implementing Component API Contract v1.1
 */
export class SsmParameterComponent extends BaseComponent {
  private parameter?: ssm.StringParameter | ssm.StringListParameter;
  private kmsKey?: kms.Key;
  private config?: SsmParameterConfig;
  private logger: any; // Platform logger instance

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
    this.logger = this.getLogger();
  }

  public synth(): void {
    this.logger.info('Starting SSM Parameter component synthesis', {
      componentName: this.spec.name,
      componentType: this.getType()
    });

    try {
      // Step 1: Build configuration using ConfigBuilder
      const configBuilder = new SsmParameterConfigBuilder({
        context: this.context,
        spec: this.spec
      });
      this.config = configBuilder.buildSync();
      
      // Step 2: Create helper resources (KMS key for SecureString if needed)
      this.createKmsKeyIfNeeded();
    
      // Step 3: Instantiate AWS CDK L2 constructs
      this.createParameter();
    
      // Step 4: Apply standard tags
      const { ssmType } = this.translatePlatformAbstractions();
      this.applyStandardTags(this.parameter!, {
        'platform-parameter-type': this.config.parameterType!,
        'sensitivity-level': this.config.sensitivityLevel!,
        'ssm-parameter-type': ssmType,
        'encryption-enabled': (ssmType === 'SecureString').toString()
      });

      if (this.kmsKey) {
        this.applyStandardTags(this.kmsKey, {
          'encryption-type': 'customer-managed',
          'key-rotation': (this.context.complianceFramework === 'fedramp-high').toString(),
          'resource-type': 'ssm-parameter-encryption'
        });
      }

      // Step 5: Register constructs for patches.ts access
      this.registerConstruct('main', this.parameter!);
      this.registerConstruct('parameter', this.parameter!);
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }
    
      // Step 6: Register capabilities for component binding
      this.registerCapability('configuration:parameter', this.buildParameterCapability());

      this.logger.info('SSM Parameter component synthesis completed successfully', {
        parameterName: this.config.parameterName,
        parameterType: this.config.parameterType,
        kmsKeyCreated: !!this.kmsKey
      });
      
    } catch (error) {
      this.logger.error('SSM Parameter component synthesis failed', error as Error, {
        componentName: this.spec.name,
        componentType: this.getType()
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'ssm-parameter';
  }

  private createKmsKeyIfNeeded(): void {
    const { ssmType } = this.translatePlatformAbstractions();
    if (ssmType === 'SecureString' && this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        description: `Encryption key for ${this.spec.name} SSM parameter`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });

      // Grant SSM service access to the key
      this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowSSMService',
        principals: [new iam.ServicePrincipal('ssm.amazonaws.com')],
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey*',
          'kms:DescribeKey'
        ],
        resources: ['*']
      }));

      this.logger.info('Customer-managed KMS key created for SecureString parameter', {
        keyId: this.kmsKey.keyId,
        keyRotationEnabled: this.context.complianceFramework === 'fedramp-high'
      });
    }
  }

  private createParameter(): void {
    // Translate platform abstractions to CDK properties
    const { ssmType, ssmTier, allowedPattern, dataType } = this.translatePlatformAbstractions();

    const baseProps = {
      parameterName: this.config!.parameterName,
      description: this.config!.description,
      tier: ssmTier,
      allowedPattern: allowedPattern,
      dataType: dataType
    };

    // Create parameter based on translated type
    switch (ssmType) {
      case 'String':
        this.parameter = new ssm.StringParameter(this, 'Parameter', {
          ...baseProps,
          stringValue: this.config!.value || ''
        });
        break;

      case 'StringList':
        this.parameter = new ssm.StringListParameter(this, 'Parameter', {
          ...baseProps,
          stringListValue: this.config!.value ? 
            this.config!.value.split(',') : []
        });
        break;

      case 'SecureString':
        const secureProps: any = {
          ...baseProps,
          stringValue: this.config!.value || '',
          type: ssm.ParameterType.SECURE_STRING
        };
        
        // Note: CDK's StringParameter doesn't support custom KMS keys for SecureString
        // The parameter will use AWS managed keys by default
        // Custom KMS keys for SecureString parameters require direct API calls
        
        this.parameter = new ssm.StringParameter(this, 'Parameter', secureProps);
        break;

      default:
        throw new Error(`Unsupported translated parameter type: ${ssmType}`);
    }

    // Apply additional user tags
    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.parameter!).add(key, value);
      });
    }
    
    this.logger.info('SSM Parameter created', {
      parameterName: this.config!.parameterName,
      platformParameterType: this.config!.parameterType,
      sensitivityLevel: this.config!.sensitivityLevel,
      translatedSsmType: ssmType,
      encryptionEnabled: ssmType === 'SecureString'
    });
  }

  private translatePlatformAbstractions(): {
    ssmType: 'String' | 'StringList' | 'SecureString';
    ssmTier: ssm.ParameterTier;
    allowedPattern?: string;
    dataType: ssm.ParameterDataType;
  } {
    // Translate parameterType and sensitivityLevel to SSM type
    let ssmType: 'String' | 'StringList' | 'SecureString' = 'String';
    let ssmTier: ssm.ParameterTier = ssm.ParameterTier.STANDARD;

    // Determine encryption based on sensitivity level and parameter type
    if (this.config!.sensitivityLevel === 'confidential' || 
        this.config!.parameterType === 'secret' ||
        this.config!.parameterType === 'connection-string') {
      ssmType = 'SecureString';
      ssmTier = ssm.ParameterTier.ADVANCED; // Advanced tier for secure strings in compliance environments
    }

    // Feature flags are typically string lists
    if (this.config!.parameterType === 'feature-flag') {
      ssmType = 'StringList';
    }

    // Translate validation patterns to allowed patterns
    let allowedPattern: string | undefined;
    switch (this.config!.validationPattern) {
      case 'url':
        allowedPattern = '^https?://[^\\s/$.?#].[^\\s]*$';
        break;
      case 'email':
        allowedPattern = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';
        break;
      case 'json':
        allowedPattern = '^\\{.*\\}$|^\\[.*\\]$';
        break;
      case 'base64':
        allowedPattern = '^[A-Za-z0-9+/]*={0,2}$';
        break;
      case 'custom':
        allowedPattern = this.config!.customValidationPattern;
        break;
    }

    return {
      ssmType,
      ssmTier,
      allowedPattern,
      dataType: ssm.ParameterDataType.TEXT
    };
  }

  private buildParameterCapability(): any {
    const { ssmType } = this.translatePlatformAbstractions();
    return {
      parameterName: this.config!.parameterName,
      parameterArn: this.parameter!.parameterArn,
      platformParameterType: this.config!.parameterType,
      sensitivityLevel: this.config!.sensitivityLevel,
      ssmParameterType: ssmType
    };
  }

  private shouldUseCustomerManagedKey(): boolean {
    // Don't create new key if one is already provided
    if (this.config!.encryption?.kmsKeyArn) {
      return false;
    }
    
    // Create customer-managed key for FedRAMP compliance frameworks
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }
}