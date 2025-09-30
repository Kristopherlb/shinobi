import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import {
  BaseComponent,
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';

import {
  SsmParameterComponentConfig,
  SsmParameterComponentConfigBuilder,
  SsmParameterDataType,
  SsmParameterKind,
  SsmParameterTier
} from './ssm-parameter.builder';

export class SsmParameterComponent extends BaseComponent {
  private config?: SsmParameterComponentConfig;
  private parameter?: ssm.IParameter;
  private kmsKey?: kms.Key;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    const builder = new SsmParameterComponentConfigBuilder({
      context: this.context,
      spec: this.spec
    });

    this.config = builder.buildSync();

    this.logComponentEvent('config_resolved', 'Resolved SSM parameter configuration', {
      name: this.config.name,
      kind: this.config.kind,
      tier: this.config.tier
    });

    this.createKmsKeyIfNeeded();
    this.createParameter();
    this.registerResources();
    this.registerCapabilities();

    this.logComponentEvent('synthesis_complete', 'SSM parameter synthesis completed', {
      name: this.config.name,
      kind: this.config.kind,
      kmsKeyCreated: Boolean(this.kmsKey)
    });
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'ssm-parameter';
  }

  private createKmsKeyIfNeeded(): void {
    if (!this.config) {
      return;
    }

    const { customerManagedKey } = this.config.encryption;

    if (!customerManagedKey.enabled || customerManagedKey.kmsKeyArn) {
      return;
    }

    this.kmsKey = new kms.Key(this, 'ParameterEncryptionKey', {
      description: `Customer managed key for ${this.spec.name} SSM parameter`,
      enableKeyRotation: customerManagedKey.rotationEnabled,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
    });

    if (customerManagedKey.allowSsmService) {
      this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowSSMServiceUse',
        principals: [new iam.ServicePrincipal('ssm.amazonaws.com')],
        actions: ['kms:Decrypt', 'kms:GenerateDataKey*', 'kms:DescribeKey'],
        resources: ['*']
      }));
    }

    this.applyStandardTags(this.kmsKey, {
      'resource-type': 'ssm-parameter-encryption',
      'rotation-enabled': customerManagedKey.rotationEnabled.toString()
    });
  }

  private createParameter(): void {
    if (!this.config) {
      throw new Error('Configuration must be resolved before creating the parameter.');
    }

    const parameterOptions: ssm.ParameterOptions = {
      parameterName: this.config.name,
      description: this.config.description,
      allowedPattern: this.config.allowedPattern,
      tier: this.mapTier(this.config.tier)
    };

    switch (this.config.kind) {
      case 'stringList': {
        const props: ssm.StringListParameterProps = {
          ...parameterOptions,
          stringListValue: this.config.values
        };
        this.parameter = new ssm.StringListParameter(this, 'Parameter', props);
        break;
      }
      case 'secureString': {
        const props: ssm.StringParameterProps = {
          ...parameterOptions,
          stringValue: this.config.value ?? '',
          type: ssm.ParameterType.SECURE_STRING,
          dataType: this.mapDataType(this.config.dataType)
        };
        this.parameter = new ssm.StringParameter(this, 'Parameter', props);
        break;
      }
      case 'string':
      default: {
        const props: ssm.StringParameterProps = {
          ...parameterOptions,
          stringValue: this.config.value ?? '',
          dataType: this.mapDataType(this.config.dataType)
        };
        this.parameter = new ssm.StringParameter(this, 'Parameter', props);
        break;
      }
    }

    Object.entries(this.config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this.parameter!).add(key, value);
    });

    this.applyStandardTags(this.parameter!, {
      'ssm-kind': this.config.kind,
      'ssm-tier': this.config.tier,
      'customer-managed-key': (
        this.config.encryption.customerManagedKey.enabled ||
        Boolean(this.config.encryption.customerManagedKey.kmsKeyArn)
      ).toString()
    });
  }

  private registerResources(): void {
    if (!this.parameter) {
      return;
    }

    this.registerConstruct('main', this.parameter);
    this.registerConstruct('parameter', this.parameter);

    if (this.kmsKey) {
      this.registerConstruct('kmsKey', this.kmsKey);
    }
  }

  private registerCapabilities(): void {
    if (!this.parameter || !this.config) {
      return;
    }

    this.registerCapability('configuration:parameter', {
      name: this.config.name,
      arn: this.parameter.parameterArn,
      kind: this.config.kind,
      tier: this.config.tier,
      dataType: this.config.dataType,
      customerManagedKeyArn:
        this.config.encryption.customerManagedKey.kmsKeyArn ?? this.kmsKey?.keyArn ?? null
    });
  }

  private mapTier(tier: SsmParameterTier): ssm.ParameterTier {
    switch (tier) {
      case 'advanced':
        return ssm.ParameterTier.ADVANCED;
      case 'standard':
      default:
        return ssm.ParameterTier.STANDARD;
    }
  }

  private mapDataType(dataType: SsmParameterDataType): ssm.ParameterDataType {
    switch (dataType) {
      case 'aws:ec2:image':
        return ssm.ParameterDataType.AWS_EC2_IMAGE;
      case 'text':
      default:
        return ssm.ParameterDataType.TEXT;
    }
  }
}
