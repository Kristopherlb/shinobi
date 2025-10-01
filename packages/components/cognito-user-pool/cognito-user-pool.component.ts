import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
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
  AlarmConfig,
  AppClientConfig,
  CognitoUserPoolComponentConfigBuilder,
  CognitoUserPoolConfig,
  StandardAttributeConfig
} from './cognito-user-pool.builder.js';

export class CognitoUserPoolComponent extends BaseComponent {
  private userPool?: cognito.UserPool;
  private userPoolClients: cognito.UserPoolClient[] = [];
  private userPoolDomain?: cognito.UserPoolDomain;
  private alarms: cloudwatch.Alarm[] = [];
  private config!: CognitoUserPoolConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Cognito User Pool synthesis');

    const builder = new CognitoUserPoolComponentConfigBuilder(this.context, this.spec);
    this.config = builder.buildSync();

    this.createUserPool();
    this.createAppClients();
    this.createDomainIfNeeded();
    this.configureMonitoring();

    this.registerConstruct('main', this.userPool!);
    this.registerConstruct('userPool', this.userPool!);
    this.userPoolClients.forEach((client, index) => this.registerConstruct(`client:${index}`, client));
    if (this.userPoolDomain) {
      this.registerConstruct('domain', this.userPoolDomain);
    }
    this.alarms.forEach(alarm => this.registerConstruct(`alarm:${alarm.node.id}`, alarm));

    this.registerCapability('auth:user-pool', this.buildUserPoolCapability());
    this.registerCapability('auth:identity-provider', this.buildIdentityProviderCapability());

    this.logComponentEvent('synthesis_complete', 'Cognito User Pool synthesis completed', {
      userPoolId: this.userPool!.userPoolId,
      advancedSecurityMode: this.config.advancedSecurityMode
    });
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'cognito-user-pool';
  }

  private createUserPool(): void {
    const removalPolicy = this.config.removalPolicy === 'retain'
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

    const userPoolName = this.config.userPoolName ?? `${this.context.serviceName}-${this.spec.name}`;

    const emailConfiguration = this.buildEmailConfiguration();
    const smsConfiguration = this.buildSmsConfiguration();

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName,
      signInAliases: this.buildSignInAliases(),
      standardAttributes: this.buildStandardAttributes(),
      customAttributes: this.buildCustomAttributes(),
      passwordPolicy: this.buildPasswordPolicy(),
      mfa: this.mapMfaMode(this.config.mfa.mode),
      mfaSecondFactor: this.buildMfaSecondFactor(),
      accountRecovery: this.mapAccountRecovery(),
      advancedSecurityMode: this.mapAdvancedSecurityMode(),
      deletionProtection: this.config.deletionProtection,
      deviceTracking: this.buildDeviceTracking(),
      lambdaTriggers: this.buildLambdaTriggers(),
      userVerification: this.buildUserVerification(),
      removalPolicy,
      email: emailConfiguration,
      smsRole: smsConfiguration?.smsRole,
      smsRoleExternalId: smsConfiguration?.smsRoleExternalId,
      featurePlan: this.mapFeaturePlan()
    });

    this.applyStandardTags(this.userPool, {
      'resource-type': 'cognito-user-pool',
      'mfa-mode': this.config.mfa.mode,
      'advanced-security': this.config.advancedSecurityMode,
      ...this.config.tags
    });

    this.logResourceCreation('cognito-user-pool', userPoolName);
  }

  private createAppClients(): void {
    for (const client of this.config.appClients) {
      const created = this.userPool!.addClient(client.clientName, {
        userPoolClientName: client.clientName,
        generateSecret: client.generateSecret ?? false,
        authFlows: this.buildAuthFlows(client.authFlows),
        supportedIdentityProviders: this.buildIdentityProviders(client.supportedIdentityProviders),
        oAuth: client.oAuth ? {
          flows: this.buildOAuthFlows(client.oAuth.flows),
          scopes: this.buildOAuthScopes(client.oAuth.scopes),
          callbackUrls: client.oAuth.callbackUrls,
          logoutUrls: client.oAuth.logoutUrls
        } : undefined,
        preventUserExistenceErrors: client.preventUserExistenceErrors ?? true,
        enableTokenRevocation: client.enableTokenRevocation ?? true,
        accessTokenValidity: client.accessTokenValidity
          ? cdk.Duration.minutes(client.accessTokenValidity)
          : undefined,
        idTokenValidity: client.idTokenValidity
          ? cdk.Duration.minutes(client.idTokenValidity)
          : undefined,
        refreshTokenValidity: client.refreshTokenValidity
          ? cdk.Duration.days(client.refreshTokenValidity)
          : undefined
      });

      this.userPoolClients.push(created);
      this.logResourceCreation('cognito-app-client', client.clientName);
    }
  }

  private createDomainIfNeeded(): void {
    const domain = this.config.domain;
    if (!domain) return;

    if (domain.customDomain) {
      this.userPoolDomain = this.userPool!.addDomain('CustomDomain', {
        customDomain: {
          domainName: domain.customDomain.domainName,
          certificate: acm.Certificate.fromCertificateArn(
            this,
            'CustomDomainCert',
            domain.customDomain.certificateArn
          )
        }
      });
    } else if (domain.domainPrefix) {
      this.userPoolDomain = this.userPool!.addDomain('CognitoDomain', {
        cognitoDomain: { domainPrefix: domain.domainPrefix }
      });
    }

    if (this.userPoolDomain) {
      this.logResourceCreation('cognito-user-pool-domain', domain.customDomain?.domainName ?? domain.domainPrefix!);
    }
  }

  private configureMonitoring(): void {
    if (!this.config.monitoring.enabled || this.config.advancedSecurityMode === 'off') {
      return;
    }

    const userPoolId = this.userPool!.userPoolId;
    this.createAlarm('SignInSuccessAlarm', this.config.monitoring.signInSuccess, {
      metricName: 'SignInSuccesses',
      defaultThreshold: 1,
      defaultEvaluation: 3,
      defaultPeriod: 5,
      comparison: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissing: cloudwatch.TreatMissingData.BREACHING,
      description: 'Cognito sign-in success rate below threshold',
      tag: 'signin-success'
    }, userPoolId);

    this.createAlarm('SignInThrottleAlarm', this.config.monitoring.signInThrottle, {
      metricName: 'SignInThrottles',
      defaultThreshold: 10,
      defaultEvaluation: 2,
      defaultPeriod: 5,
      comparison: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissing: cloudwatch.TreatMissingData.NOT_BREACHING,
      description: 'Cognito sign-in throttles exceeded threshold',
      tag: 'signin-throttle'
    }, userPoolId);

    this.createAlarm('SignUpSuccessAlarm', this.config.monitoring.signUpSuccess, {
      metricName: 'SignUpSuccesses',
      defaultThreshold: 1,
      defaultEvaluation: 3,
      defaultPeriod: 5,
      comparison: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissing: cloudwatch.TreatMissingData.NOT_BREACHING,
      description: 'Cognito sign-up success rate below threshold',
      tag: 'signup-success'
    }, userPoolId);

    this.createAlarm('SignUpThrottleAlarm', this.config.monitoring.signUpThrottle, {
      metricName: 'SignUpThrottles',
      defaultThreshold: 5,
      defaultEvaluation: 2,
      defaultPeriod: 5,
      comparison: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissing: cloudwatch.TreatMissingData.NOT_BREACHING,
      description: 'Cognito sign-up throttles exceeded threshold',
      tag: 'signup-throttle'
    }, userPoolId);

    if (this.config.monitoring.riskHigh.enabled) {
      this.createAlarm('RiskHighAlarm', this.config.monitoring.riskHigh, {
        metricName: 'RiskLevelHigh',
        defaultThreshold: 1,
        defaultEvaluation: 1,
        defaultPeriod: 5,
        comparison: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissing: cloudwatch.TreatMissingData.NOT_BREACHING,
        description: 'Cognito high-risk events detected',
        tag: 'risk-high'
      }, userPoolId);
    }
  }

  private createAlarm(
    id: string,
    alarmConfig: AlarmConfig,
    defaults: {
      metricName: string;
      defaultThreshold: number;
      defaultEvaluation: number;
      defaultPeriod: number;
      comparison: cloudwatch.ComparisonOperator;
      treatMissing: cloudwatch.TreatMissingData;
      description: string;
      tag: string;
    },
    userPoolId: string
  ): void {
    if (!alarmConfig.enabled) {
      return;
    }

    const alarm = new cloudwatch.Alarm(this, id, {
      alarmName: `${this.context.serviceName}-${this.spec.name}-${defaults.tag}`,
      alarmDescription: defaults.description,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Cognito',
        metricName: defaults.metricName,
        dimensionsMap: {
          UserPool: userPoolId,
          UserPoolClient: 'ALL_USER_POOL_CLIENTS'
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(alarmConfig.periodMinutes ?? defaults.defaultPeriod)
      }),
      threshold: alarmConfig.threshold ?? defaults.defaultThreshold,
      evaluationPeriods: alarmConfig.evaluationPeriods ?? defaults.defaultEvaluation,
      comparisonOperator: defaults.comparison,
      treatMissingData: defaults.treatMissing
    });

    this.applyStandardTags(alarm, {
      'alarm-type': defaults.tag
    });

    this.alarms.push(alarm);
  }

  private buildSignInAliases(): cognito.SignInAliases {
    return {
      username: this.config.signIn.username,
      email: this.config.signIn.email,
      phone: this.config.signIn.phone,
      preferredUsername: this.config.signIn.preferredUsername
    };
  }

  private buildStandardAttributes(): cognito.StandardAttributes {
    const attrs = this.config.standardAttributes;

    const mapAttr = (attr?: StandardAttributeConfig): cognito.StandardAttribute | undefined => {
      if (!attr) return undefined;
      return {
        required: attr.required ?? false,
        mutable: attr.mutable ?? true
      };
    };

    return {
      email: mapAttr(attrs.email),
      phoneNumber: mapAttr(attrs.phone),
      givenName: mapAttr(attrs.givenName),
      familyName: mapAttr(attrs.familyName),
      address: mapAttr(attrs.address),
      birthdate: mapAttr(attrs.birthdate),
      gender: mapAttr(attrs.gender)
    };
  }

  private buildCustomAttributes(): Record<string, cognito.ICustomAttribute> | undefined {
    if (!this.config.customAttributes) {
      return undefined;
    }

    const result: Record<string, cognito.ICustomAttribute> = {};

    for (const [name, attribute] of Object.entries(this.config.customAttributes)) {
      switch (attribute.type) {
        case 'string':
          result[name] = new cognito.StringAttribute({
            minLen: attribute.minLength,
            maxLen: attribute.maxLength,
            mutable: attribute.mutable ?? true
          });
          break;
        case 'number':
          result[name] = new cognito.NumberAttribute({ mutable: attribute.mutable ?? true });
          break;
        case 'datetime':
          result[name] = new cognito.DateTimeAttribute({ mutable: attribute.mutable ?? true });
          break;
        case 'boolean':
          result[name] = new cognito.BooleanAttribute({ mutable: attribute.mutable ?? true });
          break;
      }
    }

    return result;
  }

  private buildPasswordPolicy(): cognito.PasswordPolicy {
    return {
      minLength: this.config.passwordPolicy.minLength,
      requireLowercase: this.config.passwordPolicy.requireLowercase,
      requireUppercase: this.config.passwordPolicy.requireUppercase,
      requireDigits: this.config.passwordPolicy.requireDigits,
      requireSymbols: this.config.passwordPolicy.requireSymbols,
      tempPasswordValidity: cdk.Duration.days(this.config.passwordPolicy.tempPasswordValidity)
    };
  }

  private mapMfaMode(mode: string): cognito.Mfa {
    switch (mode) {
      case 'required':
        return cognito.Mfa.REQUIRED;
      case 'off':
        return cognito.Mfa.OFF;
      case 'optional':
      default:
        return cognito.Mfa.OPTIONAL;
    }
  }

  private buildMfaSecondFactor(): cognito.MfaSecondFactor {
    return {
      sms: this.config.mfa.enableSms,
      otp: this.config.mfa.enableTotp
    };
  }

  private mapAccountRecovery(): cognito.AccountRecovery {
    const recovery = this.config.accountRecovery;

    if (recovery.email && recovery.phone) {
      return cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA;
    }

    if (recovery.phone) {
      return cognito.AccountRecovery.PHONE_ONLY_WITHOUT_MFA;
    }

    if (recovery.email) {
      return cognito.AccountRecovery.EMAIL_ONLY;
    }

    return cognito.AccountRecovery.EMAIL_ONLY;
  }

  private mapAdvancedSecurityMode(): cognito.AdvancedSecurityMode {
    switch (this.config.advancedSecurityMode) {
      case 'enforced':
        return cognito.AdvancedSecurityMode.ENFORCED;
      case 'off':
        return cognito.AdvancedSecurityMode.OFF;
      case 'audit':
      default:
        return cognito.AdvancedSecurityMode.AUDIT;
    }
  }

  private mapFeaturePlan(): cognito.FeaturePlan {
    switch (this.config.featurePlan) {
      case 'lite':
        return cognito.FeaturePlan.LITE;
      case 'essentials':
        return cognito.FeaturePlan.ESSENTIALS;
      case 'plus':
      default:
        return cognito.FeaturePlan.PLUS;
    }
  }

  private buildDeviceTracking(): cognito.DeviceTracking {
    return {
      challengeRequiredOnNewDevice: this.config.deviceTracking.challengeRequiredOnNewDevice,
      deviceOnlyRememberedOnUserPrompt: this.config.deviceTracking.deviceOnlyRememberedOnUserPrompt
    };
  }

  private buildLambdaTriggers(): cognito.UserPoolTriggers | undefined {
    const triggers = this.config.triggers;
    if (!triggers) {
      return undefined;
    }

    const fromArn = (id: string, arn?: string) => arn
      ? lambda.Function.fromFunctionArn(this, id, arn)
      : undefined;

    return {
      preSignUp: fromArn('PreSignUpTrigger', triggers.preSignUp),
      postConfirmation: fromArn('PostConfirmationTrigger', triggers.postConfirmation),
      preAuthentication: fromArn('PreAuthenticationTrigger', triggers.preAuthentication),
      postAuthentication: fromArn('PostAuthenticationTrigger', triggers.postAuthentication),
      preTokenGeneration: fromArn('PreTokenGenerationTrigger', triggers.preTokenGeneration),
      userMigration: fromArn('UserMigrationTrigger', triggers.userMigration),
      customMessage: fromArn('CustomMessageTrigger', triggers.customMessage),
      defineAuthChallenge: fromArn('DefineAuthChallengeTrigger', triggers.defineAuthChallenge),
      createAuthChallenge: fromArn('CreateAuthChallengeTrigger', triggers.createAuthChallenge),
      verifyAuthChallengeResponse: fromArn('VerifyAuthChallengeTrigger', triggers.verifyAuthChallengeResponse)
    };
  }

  private buildUserVerification(): cognito.UserVerificationConfig {
    return {
      emailSubject: 'Verify your email for our application',
      emailBody: 'Your verification code is {####}',
      emailStyle: cognito.VerificationEmailStyle.CODE,
      smsMessage: this.config.mfa.smsMessage ?? 'Your verification code is {####}'
    };
  }

  private buildEmailConfiguration(): cognito.UserPoolEmail | undefined {
    const email = this.config.email;
    if (!email || !email.fromEmail) {
      return undefined;
    }

    return cognito.UserPoolEmail.withSES({
      fromEmail: email.fromEmail,
      fromName: email.fromName,
      replyToEmail: email.replyToEmail,
      sesRegion: email.sesRegion,
      sesVerifiedDomain: email.sesVerifiedDomain
    });
  }

  private buildSmsConfiguration(): { smsRole: iam.IRole; smsRoleExternalId?: string } | undefined {
    const sms = this.config.sms;
    if (!sms?.snsCallerArn) {
      return undefined;
    }

    return {
      smsRole: iam.Role.fromRoleArn(this, 'SmsRole', sms.snsCallerArn),
      smsRoleExternalId: sms.externalId
    };
  }

  private buildAuthFlows(authFlows?: string[]): cognito.AuthFlow {
    if (!authFlows || authFlows.length === 0) {
      return {
        userSrp: true,
        adminUserPassword: false,
        custom: false,
        userPassword: false
      };
    }

    return {
      userSrp: authFlows.includes('user-srp'),
      adminUserPassword: authFlows.includes('admin-user-password'),
      custom: authFlows.includes('custom'),
      userPassword: authFlows.includes('user-password')
    };
  }

  private buildIdentityProviders(providers?: string[]): cognito.UserPoolClientIdentityProvider[] {
    if (!providers || providers.length === 0) {
      return [cognito.UserPoolClientIdentityProvider.COGNITO];
    }

    const result: cognito.UserPoolClientIdentityProvider[] = [];

    for (const provider of providers) {
      switch (provider) {
        case 'cognito':
          result.push(cognito.UserPoolClientIdentityProvider.COGNITO);
          break;
        case 'google':
          result.push(cognito.UserPoolClientIdentityProvider.GOOGLE);
          break;
        case 'facebook':
          result.push(cognito.UserPoolClientIdentityProvider.FACEBOOK);
          break;
        case 'amazon':
          result.push(cognito.UserPoolClientIdentityProvider.AMAZON);
          break;
        case 'apple':
          result.push(cognito.UserPoolClientIdentityProvider.APPLE);
          break;
      }
    }

    return result.length > 0 ? result : [cognito.UserPoolClientIdentityProvider.COGNITO];
  }

  private buildOAuthFlows(flows?: string[]): cognito.OAuthFlows {
    if (!flows || flows.length === 0) {
      return {
        authorizationCodeGrant: true,
        implicitCodeGrant: false,
        clientCredentials: false
      };
    }

    return {
      authorizationCodeGrant: flows.includes('authorization-code'),
      implicitCodeGrant: flows.includes('implicit'),
      clientCredentials: flows.includes('client-credentials')
    };
  }

  private buildOAuthScopes(scopes?: string[]): cognito.OAuthScope[] {
    if (!scopes || scopes.length === 0) {
      return [cognito.OAuthScope.OPENID];
    }

    const result: cognito.OAuthScope[] = [];

    for (const scope of scopes) {
      switch (scope) {
        case 'openid':
          result.push(cognito.OAuthScope.OPENID);
          break;
        case 'email':
          result.push(cognito.OAuthScope.EMAIL);
          break;
        case 'phone':
          result.push(cognito.OAuthScope.PHONE);
          break;
        case 'profile':
          result.push(cognito.OAuthScope.PROFILE);
          break;
      }
    }

    return result.length > 0 ? result : [cognito.OAuthScope.OPENID];
  }

  private buildUserPoolCapability(): Record<string, any> {
    return {
      userPoolId: this.userPool!.userPoolId,
      userPoolArn: this.userPool!.userPoolArn,
      userPoolProviderName: this.userPool!.userPoolProviderName,
      userPoolProviderUrl: this.userPool!.userPoolProviderUrl,
      clients: this.userPoolClients.map(client => ({
        clientId: client.userPoolClientId,
        clientName: client.userPoolClientName
      })),
      domainBaseUrl: this.userPoolDomain?.baseUrl()
    };
  }

  private buildIdentityProviderCapability(): Record<string, any> {
    return {
      userPoolId: this.userPool!.userPoolId,
      userPoolArn: this.userPool!.userPoolArn,
      providerName: this.userPool!.userPoolProviderName,
      providerUrl: this.userPool!.userPoolProviderUrl
    };
  }
}
