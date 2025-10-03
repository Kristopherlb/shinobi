import { ConfigBuilder, ConfigBuilderContext } from '@shinobi/core';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import COGNITO_USER_POOL_CONFIG_SCHEMA from './Config.schema.json' with { type: 'json' };

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
  enabled: true,
  signInSuccess: {
    enabled: true,
    threshold: 1,
    evaluationPeriods: 3,
    periodMinutes: 5
  },
  signInThrottle: {
    enabled: true,
    threshold: 20,
    evaluationPeriods: 2,
    periodMinutes: 5
  },
  signUpSuccess: {
    enabled: true,
    threshold: 1,
    evaluationPeriods: 3,
    periodMinutes: 5
  },
  signUpThrottle: {
    enabled: true,
    threshold: 10,
    evaluationPeriods: 2,
    periodMinutes: 5
  },
  riskHigh: {
    enabled: false,
    threshold: 1,
    evaluationPeriods: 1,
    periodMinutes: 5
  }
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
    const merged = monitoring ?? DEFAULT_MONITORING;

    return {
      enabled: merged.enabled ?? DEFAULT_MONITORING.enabled,
      signInSuccess: this.normaliseAlarm(merged.signInSuccess, DEFAULT_MONITORING.signInSuccess),
      signInThrottle: this.normaliseAlarm(merged.signInThrottle, DEFAULT_MONITORING.signInThrottle),
      signUpSuccess: this.normaliseAlarm(merged.signUpSuccess, DEFAULT_MONITORING.signUpSuccess),
      signUpThrottle: this.normaliseAlarm(merged.signUpThrottle, DEFAULT_MONITORING.signUpThrottle),
      riskHigh: this.normaliseAlarm(merged.riskHigh, DEFAULT_MONITORING.riskHigh)
    };
  }

  private normaliseAlarm(alarm: AlarmConfig | undefined, fallback: AlarmConfig): AlarmConfig {
    const source = alarm ?? fallback;

    return {
      enabled: source.enabled ?? fallback.enabled ?? DISABLED_ALARM.enabled,
      threshold: source.threshold ?? fallback.threshold,
      evaluationPeriods: source.evaluationPeriods ?? fallback.evaluationPeriods,
      periodMinutes: source.periodMinutes ?? fallback.periodMinutes
    };
  }
}

export { COGNITO_USER_POOL_CONFIG_SCHEMA };
