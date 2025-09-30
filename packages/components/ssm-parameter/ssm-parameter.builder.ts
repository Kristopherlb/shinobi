import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';

export type SsmParameterKind = 'string' | 'stringList' | 'secureString';
export type SsmParameterTier = 'standard' | 'advanced';
export type SsmParameterDataType = 'text' | 'aws:ec2:image';

export interface CustomerManagedKeyConfig {
  enabled: boolean;
  kmsKeyArn?: string;
  rotationEnabled: boolean;
  allowSsmService: boolean;
}

export interface SsmParameterEncryptionConfig {
  customerManagedKey: CustomerManagedKeyConfig;
}

export interface SsmParameterComponentConfig {
  name: string;
  description?: string;
  kind: SsmParameterKind;
  value?: string;
  values: string[];
  allowedPattern?: string;
  tier: SsmParameterTier;
  dataType: SsmParameterDataType;
  encryption: SsmParameterEncryptionConfig;
  tags: Record<string, string>;
}

const CUSTOMER_MANAGED_KEY_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    kmsKeyArn: { type: 'string' },
    rotationEnabled: { type: 'boolean' },
    allowSsmService: { type: 'boolean' }
  },
  required: ['enabled']
};

const ENCRYPTION_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    customerManagedKey: CUSTOMER_MANAGED_KEY_SCHEMA
  },
  required: ['customerManagedKey']
};

export const SSM_PARAMETER_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 2048 },
    parameterName: { type: 'string', minLength: 1, maxLength: 2048 },
    description: { type: 'string', maxLength: 1024 },
    kind: { type: 'string', enum: ['string', 'stringList', 'secureString'] },
    value: { type: 'string', maxLength: 4096 },
    values: {
      type: 'array',
      items: { type: 'string', maxLength: 4096 }
    },
    allowedPattern: { type: 'string' },
    tier: { type: 'string', enum: ['standard', 'advanced'] },
    dataType: { type: 'string', enum: ['text', 'aws:ec2:image'] },
    encryption: ENCRYPTION_SCHEMA,
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  },
  required: ['name']
};

const DEFAULT_CONFIG: SsmParameterComponentConfig = {
  name: '',
  description: undefined,
  kind: 'string',
  value: '',
  values: [],
  allowedPattern: undefined,
  tier: 'standard',
  dataType: 'text',
  encryption: {
    customerManagedKey: {
      enabled: false,
      kmsKeyArn: undefined,
      rotationEnabled: false,
      allowSsmService: true
    }
  },
  tags: {}
};

export class SsmParameterComponentConfigBuilder extends ConfigBuilder<SsmParameterComponentConfig> {
  constructor(builderContext: ConfigBuilderContext) {
    super(builderContext, SSM_PARAMETER_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<SsmParameterComponentConfig> {
    return DEFAULT_CONFIG;
  }

  public buildSync(): SsmParameterComponentConfig {
    const resolved = super.buildSync() as Partial<SsmParameterComponentConfig> & { parameterName?: string };
    return this.normalise(resolved);
  }

  public getSchema(): ComponentConfigSchema {
    return SSM_PARAMETER_CONFIG_SCHEMA;
  }

  private normalise(config: Partial<SsmParameterComponentConfig> & { parameterName?: string }): SsmParameterComponentConfig {
    const legacyName = config.parameterName;
    const configuredName = config.name && config.name.trim().length > 0 ? config.name : undefined;
    const name = this.normaliseName(configuredName ?? legacyName);

    const kind = (config.kind ?? DEFAULT_CONFIG.kind) as SsmParameterKind;
    const tier = (config.tier ?? (kind === 'secureString' ? 'advanced' : DEFAULT_CONFIG.tier)) as SsmParameterTier;
    const dataType = (config.dataType ?? DEFAULT_CONFIG.dataType) as SsmParameterDataType;

    const value = config.value ?? DEFAULT_CONFIG.value;
    const values = this.normaliseValues(kind, config.values ?? [], config.value);

    const allowedPattern = config.allowedPattern?.trim() || undefined;

    const encryption = this.normaliseEncryption(config.encryption, kind);

    const tags = {
      ...DEFAULT_CONFIG.tags,
      ...(config.tags ?? {})
    };

    return {
      name,
      description: config.description?.trim() || undefined,
      kind,
      value,
      values,
      allowedPattern,
      tier,
      dataType,
      encryption,
      tags
    };
  }

  private normaliseName(nameInput?: string): string {
    const fallback = `/${this.builderContext.context.serviceName}/${this.builderContext.spec.name}`;
    const raw = (nameInput ?? fallback).trim();
    return raw.length === 0 ? fallback : raw;
  }

  private normaliseValues(kind: SsmParameterKind, values: string[], legacyValue?: string): string[] {
    if (kind !== 'stringList') {
      return [];
    }

    const list = [...values];

    if ((!list || list.length === 0) && legacyValue) {
      legacyValue.split(',').forEach((entry) => list.push(entry));
    }

    return Array.from(new Set(list.map((entry) => entry.trim()).filter((entry) => entry.length > 0)));
  }

  private normaliseEncryption(
    encryption: Partial<SsmParameterEncryptionConfig> | undefined,
    kind: SsmParameterKind
  ): SsmParameterEncryptionConfig {
    const defaults = DEFAULT_CONFIG.encryption.customerManagedKey;
    const customerManaged = encryption?.customerManagedKey ?? {};

    const enabled =
      customerManaged.enabled ??
      (customerManaged.kmsKeyArn ? true : undefined) ??
      defaults.enabled;

    return {
      customerManagedKey: {
        enabled,
        kmsKeyArn: customerManaged.kmsKeyArn,
        rotationEnabled: customerManaged.rotationEnabled ?? defaults.rotationEnabled,
        allowSsmService: customerManaged.allowSsmService ?? defaults.allowSsmService
      }
    };
  }
}
