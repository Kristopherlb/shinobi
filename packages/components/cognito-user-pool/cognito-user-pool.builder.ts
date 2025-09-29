import {
  ConfigBuilder,
  ConfigBuilderContext,
  ComponentConfigSchema
} from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';

export type AdvancedSecurityMode = 'off' | 'audit' | 'enforced';
export type MfaMode = 'off' | 'optional' | 'required';
export type RemovalPolicyOption = 'retain' | 'destroy';
export type FeaturePlanOption = 'lite' | 'essentials' | 'plus';

export interface SignInAliasConfig {
  username: boolean;
  email: boolean;
  phone: boolean;
  preferredUsername: boolean;
}

export interface StandardAttributeConfig {
  required?: boolean;
  mutable?: boolean;
}

export interface StandardAttributesConfig {
  email?: StandardAttributeConfig;
  phone?: StandardAttributeConfig;
  givenName?: StandardAttributeConfig;
  familyName?: StandardAttributeConfig;
  address?: StandardAttributeConfig;
  birthdate?: StandardAttributeConfig;
  gender?: StandardAttributeConfig;
}

export interface CustomAttributeConfig {
  type: 'string' | 'number' | 'datetime' | 'boolean';
  mutable?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface PasswordPolicyConfig {
  minLength: number;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireDigits: boolean;
  requireSymbols: boolean;
  tempPasswordValidity: number;
}

export interface MfaConfig {
  mode: MfaMode;
  enableSms: boolean;
  enableTotp: boolean;
  smsMessage?: string;
}

export interface AccountRecoveryConfig {
  email: boolean;
  phone: boolean;
}

export interface EmailConfig {
  fromEmail?: string;
  fromName?: string;
  replyToEmail?: string;
  sesRegion?: string;
  sesVerifiedDomain?: string;
}

export interface SmsConfig {
  snsCallerArn?: string;
  externalId?: string;
}

export interface TriggerConfig {
  preSignUp?: string;
  postConfirmation?: string;
  preAuthentication?: string;
  postAuthentication?: string;
  preTokenGeneration?: string;
  userMigration?: string;
  customMessage?: string;
  defineAuthChallenge?: string;
  createAuthChallenge?: string;
  verifyAuthChallengeResponse?: string;
}

export interface DeviceTrackingConfig {
  challengeRequiredOnNewDevice: boolean;
  deviceOnlyRememberedOnUserPrompt: boolean;
}

export interface DomainConfig {
  domainPrefix?: string;
  customDomain?: {
    domainName: string;
    certificateArn: string;
  };
}

export interface OAuthConfig {
  flows?: string[];
  scopes?: string[];
  callbackUrls?: string[];
  logoutUrls?: string[];
}

export interface AppClientConfig {
  clientName: string;
  generateSecret?: boolean;
  authFlows?: string[];
  supportedIdentityProviders?: string[];
  oAuth?: OAuthConfig;
  preventUserExistenceErrors?: boolean;
  enableTokenRevocation?: boolean;
  accessTokenValidity?: number;
  idTokenValidity?: number;
  refreshTokenValidity?: number;
}

export interface AlarmConfig {
  enabled: boolean;
  threshold?: number;
  evaluationPeriods?: number;
  periodMinutes?: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  signInSuccess: AlarmConfig;
  signInThrottle: AlarmConfig;
  signUpSuccess: AlarmConfig;
  signUpThrottle: AlarmConfig;
  riskHigh: AlarmConfig;
}

export interface CognitoUserPoolConfig {
  userPoolName?: string;
  signIn: SignInAliasConfig;
  standardAttributes: StandardAttributesConfig;
  customAttributes?: Record<string, CustomAttributeConfig>;
  passwordPolicy: PasswordPolicyConfig;
  mfa: MfaConfig;
  accountRecovery: AccountRecoveryConfig;
  email?: EmailConfig;
  sms?: SmsConfig;
  triggers?: TriggerConfig;
  deviceTracking: DeviceTrackingConfig;
  advancedSecurityMode: AdvancedSecurityMode;
  featurePlan: FeaturePlanOption;
  deletionProtection: boolean;
  removalPolicy: RemovalPolicyOption;
  domain?: DomainConfig;
  appClients: AppClientConfig[];
  monitoring: MonitoringConfig;
  tags: Record<string, string>;
}

const BOOLEAN_PROPERTY = { type: 'boolean' };

const SIGN_IN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    username: BOOLEAN_PROPERTY,
    email: BOOLEAN_PROPERTY,
    phone: BOOLEAN_PROPERTY,
    preferredUsername: BOOLEAN_PROPERTY
  }
};

const STANDARD_ATTRIBUTE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    required: BOOLEAN_PROPERTY,
    mutable: BOOLEAN_PROPERTY
  }
};

const STANDARD_ATTRIBUTES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    email: STANDARD_ATTRIBUTE_SCHEMA,
    phone: STANDARD_ATTRIBUTE_SCHEMA,
    givenName: STANDARD_ATTRIBUTE_SCHEMA,
    familyName: STANDARD_ATTRIBUTE_SCHEMA,
    address: STANDARD_ATTRIBUTE_SCHEMA,
    birthdate: STANDARD_ATTRIBUTE_SCHEMA,
    gender: STANDARD_ATTRIBUTE_SCHEMA
  }
};

const CUSTOM_ATTRIBUTE_SCHEMA = {
  type: 'object',
  additionalProperties: {
    type: 'object',
    required: ['type'],
    additionalProperties: false,
    properties: {
      type: { type: 'string', enum: ['string', 'number', 'datetime', 'boolean'] },
      mutable: BOOLEAN_PROPERTY,
      minLength: { type: 'number', minimum: 0 },
      maxLength: { type: 'number', minimum: 1 }
    }
  }
};

const PASSWORD_POLICY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    minLength: { type: 'number', minimum: 6 },
    requireLowercase: BOOLEAN_PROPERTY,
    requireUppercase: BOOLEAN_PROPERTY,
    requireDigits: BOOLEAN_PROPERTY,
    requireSymbols: BOOLEAN_PROPERTY,
    tempPasswordValidity: { type: 'number', minimum: 1 }
  }
};

const MFA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['mode'],
  properties: {
    mode: { type: 'string', enum: ['off', 'optional', 'required'] },
    enableSms: BOOLEAN_PROPERTY,
    enableTotp: BOOLEAN_PROPERTY,
    smsMessage: { type: 'string' }
  }
};

const ACCOUNT_RECOVERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    email: BOOLEAN_PROPERTY,
    phone: BOOLEAN_PROPERTY
  }
};

const EMAIL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fromEmail: { type: 'string' },
    fromName: { type: 'string' },
    replyToEmail: { type: 'string' },
    sesRegion: { type: 'string' },
    sesVerifiedDomain: { type: 'string' }
  }
};

const SMS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    snsCallerArn: { type: 'string' },
    externalId: { type: 'string' }
  }
};

const TRIGGERS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    preSignUp: { type: 'string' },
    postConfirmation: { type: 'string' },
    preAuthentication: { type: 'string' },
    postAuthentication: { type: 'string' },
    preTokenGeneration: { type: 'string' },
    userMigration: { type: 'string' },
    customMessage: { type: 'string' },
    defineAuthChallenge: { type: 'string' },
    createAuthChallenge: { type: 'string' },
    verifyAuthChallengeResponse: { type: 'string' }
  }
};

const DEVICE_TRACKING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    challengeRequiredOnNewDevice: BOOLEAN_PROPERTY,
    deviceOnlyRememberedOnUserPrompt: BOOLEAN_PROPERTY
  }
};

const DOMAIN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    domainPrefix: { type: 'string' },
    customDomain: {
      type: 'object',
      additionalProperties: false,
      required: ['domainName', 'certificateArn'],
      properties: {
        domainName: { type: 'string' },
        certificateArn: { type: 'string' }
      }
    }
  }
};

const OAUTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    flows: {
      type: 'array',
      items: { type: 'string', enum: ['authorization-code', 'implicit', 'client-credentials'] }
    },
    scopes: {
      type: 'array',
      items: { type: 'string', enum: ['openid', 'email', 'phone', 'profile'] }
    },
    callbackUrls: {
      type: 'array',
      items: { type: 'string' }
    },
    logoutUrls: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

const APP_CLIENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['clientName'],
  properties: {
    clientName: { type: 'string' },
    generateSecret: BOOLEAN_PROPERTY,
    authFlows: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['user-password', 'admin-user-password', 'custom', 'user-srp']
      }
    },
    supportedIdentityProviders: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['cognito', 'google', 'facebook', 'amazon', 'apple']
      }
    },
    oAuth: OAUTH_SCHEMA,
    preventUserExistenceErrors: BOOLEAN_PROPERTY,
    enableTokenRevocation: BOOLEAN_PROPERTY,
    accessTokenValidity: { type: 'number', minimum: 1 },
    idTokenValidity: { type: 'number', minimum: 1 },
    refreshTokenValidity: { type: 'number', minimum: 1 }
  }
};

const ALARM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: BOOLEAN_PROPERTY,
    threshold: { type: 'number' },
    evaluationPeriods: { type: 'number', minimum: 1 },
    periodMinutes: { type: 'number', minimum: 1 }
  }
};

const MONITORING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: BOOLEAN_PROPERTY,
    signInSuccess: ALARM_SCHEMA,
    signInThrottle: ALARM_SCHEMA,
    signUpSuccess: ALARM_SCHEMA,
    signUpThrottle: ALARM_SCHEMA,
    riskHigh: ALARM_SCHEMA
  }
};

const COGNITO_USER_POOL_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    userPoolName: { type: 'string' },
    signIn: SIGN_IN_SCHEMA,
    standardAttributes: STANDARD_ATTRIBUTES_SCHEMA,
    customAttributes: CUSTOM_ATTRIBUTE_SCHEMA,
    passwordPolicy: PASSWORD_POLICY_SCHEMA,
    mfa: MFA_SCHEMA,
    accountRecovery: ACCOUNT_RECOVERY_SCHEMA,
    email: EMAIL_SCHEMA,
    sms: SMS_SCHEMA,
    triggers: TRIGGERS_SCHEMA,
    deviceTracking: DEVICE_TRACKING_SCHEMA,
    advancedSecurityMode: { type: 'string', enum: ['off', 'audit', 'enforced'] },
    featurePlan: { type: 'string', enum: ['lite', 'essentials', 'plus'] },
    deletionProtection: BOOLEAN_PROPERTY,
    removalPolicy: { type: 'string', enum: ['retain', 'destroy'] },
    domain: DOMAIN_SCHEMA,
    appClients: {
      type: 'array',
      items: APP_CLIENT_SCHEMA
    },
    monitoring: MONITORING_SCHEMA,
    tags: { type: 'object', additionalProperties: { type: 'string' } }
  }
};

const DEFAULT_SIGN_IN: SignInAliasConfig = {
  username: true,
  email: false,
  phone: false,
  preferredUsername: false
};

const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireDigits: true,
  requireSymbols: false,
  tempPasswordValidity: 7
};

const DEFAULT_MFA: MfaConfig = {
  mode: 'optional',
  enableSms: true,
  enableTotp: true,
  smsMessage: 'Your verification code is {####}'
};

const DEFAULT_ACCOUNT_RECOVERY: AccountRecoveryConfig = {
  email: true,
  phone: false
};

const DEFAULT_DEVICE_TRACKING: DeviceTrackingConfig = {
  challengeRequiredOnNewDevice: false,
  deviceOnlyRememberedOnUserPrompt: true
};

const DISABLED_ALARM: AlarmConfig = {
  enabled: false
};

const DEFAULT_MONITORING: MonitoringConfig = {
  enabled: false,
  signInSuccess: { ...DISABLED_ALARM },
  signInThrottle: { ...DISABLED_ALARM },
  signUpSuccess: { ...DISABLED_ALARM },
  signUpThrottle: { ...DISABLED_ALARM },
  riskHigh: { ...DISABLED_ALARM }
};

export class CognitoUserPoolComponentConfigBuilder extends ConfigBuilder<CognitoUserPoolConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, COGNITO_USER_POOL_CONFIG_SCHEMA);
  }

  protected getHardcodedFallbacks(): Partial<CognitoUserPoolConfig> {
    return {
      signIn: DEFAULT_SIGN_IN,
      standardAttributes: {},
      passwordPolicy: DEFAULT_PASSWORD_POLICY,
      mfa: DEFAULT_MFA,
      accountRecovery: DEFAULT_ACCOUNT_RECOVERY,
      deviceTracking: DEFAULT_DEVICE_TRACKING,
      advancedSecurityMode: 'audit',
      featurePlan: 'plus',
      deletionProtection: false,
      removalPolicy: 'destroy',
      appClients: [],
      monitoring: DEFAULT_MONITORING,
      tags: {}
    };
  }

  public buildSync(): CognitoUserPoolConfig {
    const resolved = super.buildSync() as Partial<CognitoUserPoolConfig>;
    return this.normaliseConfig(resolved);
  }

  private normaliseConfig(config: Partial<CognitoUserPoolConfig>): CognitoUserPoolConfig {
    const signIn = { ...DEFAULT_SIGN_IN, ...(config.signIn ?? {}) };
    if (!signIn.username && !signIn.email && !signIn.phone && !signIn.preferredUsername) {
      throw new Error('At least one sign-in alias must be enabled for a Cognito user pool.');
    }
    const standardAttributes = this.cloneStandardAttributes(config.standardAttributes);
    const passwordPolicy = { ...DEFAULT_PASSWORD_POLICY, ...(config.passwordPolicy ?? {}) };
    const mfa = { ...DEFAULT_MFA, ...(config.mfa ?? {}) };
    const accountRecovery = { ...DEFAULT_ACCOUNT_RECOVERY, ...(config.accountRecovery ?? {}) };
    const deviceTracking = { ...DEFAULT_DEVICE_TRACKING, ...(config.deviceTracking ?? {}) };
    const monitoring = this.normaliseMonitoring(config.monitoring);

    return {
      userPoolName: config.userPoolName,
      signIn,
      standardAttributes,
      customAttributes: config.customAttributes,
      passwordPolicy,
      mfa,
      accountRecovery,
      email: config.email,
      sms: config.sms,
      triggers: config.triggers,
      deviceTracking,
      advancedSecurityMode: config.advancedSecurityMode ?? 'audit',
      featurePlan: config.featurePlan ?? 'plus',
      deletionProtection: config.deletionProtection ?? false,
      removalPolicy: config.removalPolicy ?? 'destroy',
      domain: config.domain,
      appClients: this.normaliseAppClients(config.appClients),
      monitoring,
      tags: config.tags ?? {}
    };
  }

  private cloneStandardAttributes(attrs?: StandardAttributesConfig): StandardAttributesConfig {
    if (!attrs) {
      return {};
    }

    const clone: StandardAttributesConfig = {};
    for (const [key, value] of Object.entries(attrs)) {
      clone[key as keyof StandardAttributesConfig] = value ? { ...value } : undefined;
    }

    return clone;
  }

  private normaliseAppClients(appClients?: AppClientConfig[]): AppClientConfig[] {
    if (!appClients || appClients.length === 0) {
      return [];
    }

    return appClients.map(client => ({
      clientName: client.clientName,
      generateSecret: client.generateSecret ?? false,
      authFlows: client.authFlows ?? ['user-srp'],
      supportedIdentityProviders: client.supportedIdentityProviders ?? ['cognito'],
      oAuth: client.oAuth,
      preventUserExistenceErrors: client.preventUserExistenceErrors ?? true,
      enableTokenRevocation: client.enableTokenRevocation ?? true,
      accessTokenValidity: client.accessTokenValidity,
      idTokenValidity: client.idTokenValidity,
      refreshTokenValidity: client.refreshTokenValidity
    }));
  }

  private normaliseMonitoring(monitoring?: MonitoringConfig): MonitoringConfig {
    if (!monitoring) {
      return {
        enabled: DEFAULT_MONITORING.enabled,
        signInSuccess: this.normaliseAlarm(DEFAULT_MONITORING.signInSuccess),
        signInThrottle: this.normaliseAlarm(DEFAULT_MONITORING.signInThrottle),
        signUpSuccess: this.normaliseAlarm(DEFAULT_MONITORING.signUpSuccess),
        signUpThrottle: this.normaliseAlarm(DEFAULT_MONITORING.signUpThrottle),
        riskHigh: this.normaliseAlarm(DEFAULT_MONITORING.riskHigh)
      };
    }

    return {
      enabled: monitoring.enabled ?? false,
      signInSuccess: this.normaliseAlarm(monitoring.signInSuccess),
      signInThrottle: this.normaliseAlarm(monitoring.signInThrottle),
      signUpSuccess: this.normaliseAlarm(monitoring.signUpSuccess),
      signUpThrottle: this.normaliseAlarm(monitoring.signUpThrottle),
      riskHigh: this.normaliseAlarm(monitoring.riskHigh)
    };
  }

  private normaliseAlarm(alarm?: AlarmConfig): AlarmConfig {
    if (!alarm) {
      return { ...DISABLED_ALARM };
    }

    return {
      enabled: alarm.enabled ?? false,
      threshold: alarm.threshold,
      evaluationPeriods: alarm.evaluationPeriods,
      periodMinutes: alarm.periodMinutes
    };
  }
}

export { COGNITO_USER_POOL_CONFIG_SCHEMA };
