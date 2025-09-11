"use strict";
/**
 * Cognito User Pool Component implementing Component API Contract v1.0
 *
 * A managed user directory service for authentication and authorization.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitoUserPoolComponent = exports.CognitoUserPoolConfigBuilder = exports.COGNITO_USER_POOL_CONFIG_SCHEMA = void 0;
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
const src_1 = require("../../../platform/contracts/src");
/**
 * Configuration schema for Cognito User Pool component
 */
exports.COGNITO_USER_POOL_CONFIG_SCHEMA = {
    type: 'object',
    title: 'Cognito User Pool Configuration',
    description: 'Configuration for creating a Cognito User Pool',
    properties: {
        userPoolName: {
            type: 'string',
            description: 'Name of the user pool',
            pattern: '^[a-zA-Z0-9_.-]+$',
            minLength: 1,
            maxLength: 128
        },
        signIn: {
            type: 'object',
            description: 'Sign-in configuration',
            properties: {
                username: {
                    type: 'boolean',
                    description: 'Allow sign-in with username',
                    default: true
                },
                email: {
                    type: 'boolean',
                    description: 'Allow sign-in with email',
                    default: false
                },
                phone: {
                    type: 'boolean',
                    description: 'Allow sign-in with phone number',
                    default: false
                },
                preferredUsername: {
                    type: 'boolean',
                    description: 'Allow sign-in with preferred username',
                    default: false
                }
            }
        },
        standardAttributes: {
            type: 'object',
            description: 'Standard user attributes configuration',
            properties: {
                email: {
                    type: 'object',
                    properties: {
                        required: { type: 'boolean', default: false },
                        mutable: { type: 'boolean', default: true }
                    }
                },
                phone: {
                    type: 'object',
                    properties: {
                        required: { type: 'boolean', default: false },
                        mutable: { type: 'boolean', default: true }
                    }
                },
                givenName: {
                    type: 'object',
                    properties: {
                        required: { type: 'boolean', default: false },
                        mutable: { type: 'boolean', default: true }
                    }
                },
                familyName: {
                    type: 'object',
                    properties: {
                        required: { type: 'boolean', default: false },
                        mutable: { type: 'boolean', default: true }
                    }
                }
            }
        },
        passwordPolicy: {
            type: 'object',
            description: 'Password policy configuration',
            properties: {
                minLength: {
                    type: 'number',
                    description: 'Minimum password length',
                    minimum: 6,
                    maximum: 99,
                    default: 8
                },
                requireLowercase: {
                    type: 'boolean',
                    description: 'Require lowercase letters',
                    default: true
                },
                requireUppercase: {
                    type: 'boolean',
                    description: 'Require uppercase letters',
                    default: true
                },
                requireDigits: {
                    type: 'boolean',
                    description: 'Require numeric digits',
                    default: true
                },
                requireSymbols: {
                    type: 'boolean',
                    description: 'Require symbols',
                    default: true
                },
                tempPasswordValidity: {
                    type: 'number',
                    description: 'Temporary password validity in days',
                    minimum: 1,
                    maximum: 365,
                    default: 7
                }
            }
        },
        mfa: {
            type: 'object',
            description: 'Multi-factor authentication configuration',
            required: ['mode'],
            properties: {
                mode: {
                    type: 'string',
                    description: 'MFA mode',
                    enum: ['off', 'optional', 'required'],
                    default: 'optional'
                },
                enableSms: {
                    type: 'boolean',
                    description: 'Enable SMS MFA',
                    default: true
                },
                enableTotp: {
                    type: 'boolean',
                    description: 'Enable TOTP MFA',
                    default: true
                },
                smsMessage: {
                    type: 'string',
                    description: 'SMS message template',
                    default: 'Your verification code is {####}'
                }
            }
        },
        accountRecovery: {
            type: 'object',
            description: 'Account recovery configuration',
            properties: {
                email: {
                    type: 'boolean',
                    description: 'Enable email recovery',
                    default: true
                },
                phone: {
                    type: 'boolean',
                    description: 'Enable phone recovery',
                    default: false
                }
            }
        },
        customAttributes: {
            type: 'object',
            description: 'Custom user attributes',
            additionalProperties: {
                type: 'object',
                required: ['type'],
                properties: {
                    type: {
                        type: 'string',
                        enum: ['string', 'number', 'datetime', 'boolean']
                    },
                    mutable: {
                        type: 'boolean',
                        default: true
                    },
                    minLength: {
                        type: 'number',
                        minimum: 0
                    },
                    maxLength: {
                        type: 'number',
                        minimum: 1
                    }
                }
            }
        },
        email: {
            type: 'object',
            description: 'Email configuration',
            properties: {
                fromEmail: {
                    type: 'string',
                    description: 'From email address'
                },
                fromName: {
                    type: 'string',
                    description: 'From name'
                },
                replyToEmail: {
                    type: 'string',
                    description: 'Reply-to email address'
                },
                sesRegion: {
                    type: 'string',
                    description: 'SES region'
                },
                sesVerifiedDomain: {
                    type: 'string',
                    description: 'SES verified domain'
                }
            }
        },
        sms: {
            type: 'object',
            description: 'SMS configuration',
            properties: {
                snsCallerArn: {
                    type: 'string',
                    description: 'SNS caller ARN for SMS'
                },
                externalId: {
                    type: 'string',
                    description: 'External ID for SMS role'
                }
            }
        },
        triggers: {
            type: 'object',
            description: 'Lambda trigger configuration',
            properties: {
                preSignUp: {
                    type: 'string',
                    description: 'Pre sign-up Lambda function ARN'
                },
                postConfirmation: {
                    type: 'string',
                    description: 'Post confirmation Lambda function ARN'
                },
                preAuthentication: {
                    type: 'string',
                    description: 'Pre authentication Lambda function ARN'
                },
                postAuthentication: {
                    type: 'string',
                    description: 'Post authentication Lambda function ARN'
                },
                preTokenGeneration: {
                    type: 'string',
                    description: 'Pre token generation Lambda function ARN'
                },
                userMigration: {
                    type: 'string',
                    description: 'User migration Lambda function ARN'
                },
                customMessage: {
                    type: 'string',
                    description: 'Custom message Lambda function ARN'
                },
                defineAuthChallenge: {
                    type: 'string',
                    description: 'Define auth challenge Lambda function ARN'
                },
                createAuthChallenge: {
                    type: 'string',
                    description: 'Create auth challenge Lambda function ARN'
                },
                verifyAuthChallengeResponse: {
                    type: 'string',
                    description: 'Verify auth challenge response Lambda function ARN'
                }
            }
        },
        deviceTracking: {
            type: 'object',
            description: 'Device tracking configuration',
            properties: {
                challengeRequiredOnNewDevice: {
                    type: 'boolean',
                    description: 'Require challenge on new device',
                    default: false
                },
                deviceOnlyRememberedOnUserPrompt: {
                    type: 'boolean',
                    description: 'Device only remembered on user prompt',
                    default: true
                }
            }
        },
        advancedSecurityMode: {
            type: 'string',
            description: 'Advanced security features mode',
            enum: ['off', 'audit', 'enforced'],
            default: 'audit'
        },
        deletionProtection: {
            type: 'boolean',
            description: 'Enable deletion protection',
            default: false
        },
        domain: {
            type: 'object',
            description: 'User pool domain configuration',
            properties: {
                domainPrefix: {
                    type: 'string',
                    description: 'Domain prefix for Cognito domain',
                    pattern: '^[a-z0-9-]+$',
                    minLength: 1,
                    maxLength: 63
                },
                customDomain: {
                    type: 'object',
                    description: 'Custom domain configuration',
                    required: ['domainName', 'certificateArn'],
                    properties: {
                        domainName: {
                            type: 'string',
                            description: 'Custom domain name'
                        },
                        certificateArn: {
                            type: 'string',
                            description: 'ACM certificate ARN'
                        }
                    }
                }
            }
        },
        appClients: {
            type: 'array',
            description: 'App client configurations',
            items: {
                type: 'object',
                required: ['clientName'],
                properties: {
                    clientName: {
                        type: 'string',
                        description: 'Name of the app client'
                    },
                    generateSecret: {
                        type: 'boolean',
                        description: 'Generate client secret',
                        default: false
                    },
                    authFlows: {
                        type: 'array',
                        description: 'Enabled authentication flows',
                        items: {
                            type: 'string',
                            enum: ['user-password', 'admin-user-password', 'custom', 'user-srp', 'allow-refresh-token']
                        },
                        default: ['user-srp', 'allow-refresh-token']
                    },
                    preventUserExistenceErrors: {
                        type: 'boolean',
                        description: 'Prevent user existence errors',
                        default: true
                    },
                    enableTokenRevocation: {
                        type: 'boolean',
                        description: 'Enable token revocation',
                        default: true
                    }
                }
            }
        }
    },
    additionalProperties: false
};
/**
 * Configuration builder for Cognito User Pool component
 */
class CognitoUserPoolConfigBuilder {
    context;
    spec;
    constructor(context, spec) {
        this.context = context;
        this.spec = spec;
    }
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    async build() {
        return this.buildSync();
    }
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync() {
        // Start with platform defaults
        const platformDefaults = this.getPlatformDefaults();
        // Apply compliance framework defaults
        const complianceDefaults = this.getComplianceFrameworkDefaults();
        // Merge user configuration from spec
        const userConfig = this.spec.config || {};
        // Merge configurations (user config takes precedence)
        const mergedConfig = this.mergeConfigs(this.mergeConfigs(platformDefaults, complianceDefaults), userConfig);
        return mergedConfig;
    }
    /**
     * Simple merge utility for combining configuration objects
     */
    mergeConfigs(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeConfigs(result[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
    /**
     * Get platform-wide defaults for Cognito User Pool
     */
    getPlatformDefaults() {
        return {
            signIn: {
                username: true,
                email: false,
                phone: false,
                preferredUsername: false
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
                tempPasswordValidity: 7
            },
            mfa: {
                mode: 'optional',
                enableSms: true,
                enableTotp: true,
                smsMessage: 'Your verification code is {####}'
            },
            accountRecovery: {
                email: true,
                phone: false
            },
            advancedSecurityMode: 'audit',
            deletionProtection: false,
            deviceTracking: {
                challengeRequiredOnNewDevice: false,
                deviceOnlyRememberedOnUserPrompt: true
            }
        };
    }
    /**
     * Get compliance framework specific defaults
     */
    getComplianceFrameworkDefaults() {
        const framework = this.context.complianceFramework;
        switch (framework) {
            case 'fedramp-moderate':
                return {
                    mfa: {
                        mode: 'required', // MFA required for compliance
                        enableSms: true,
                        enableTotp: true
                    },
                    passwordPolicy: {
                        minLength: 12, // Stronger password requirements
                        requireLowercase: true,
                        requireUppercase: true,
                        requireDigits: true,
                        requireSymbols: true,
                        tempPasswordValidity: 1 // Shorter validity for temp passwords
                    },
                    advancedSecurityMode: 'enforced', // Advanced security required
                    deletionProtection: true, // Prevent accidental deletion
                    deviceTracking: {
                        challengeRequiredOnNewDevice: true,
                        deviceOnlyRememberedOnUserPrompt: true
                    }
                };
            case 'fedramp-high':
                return {
                    mfa: {
                        mode: 'required', // MFA mandatory for high compliance
                        enableSms: false, // SMS less secure than TOTP
                        enableTotp: true
                    },
                    passwordPolicy: {
                        minLength: 14, // Very strong password requirements
                        requireLowercase: true,
                        requireUppercase: true,
                        requireDigits: true,
                        requireSymbols: true,
                        tempPasswordValidity: 1 // Minimal validity for temp passwords
                    },
                    advancedSecurityMode: 'enforced', // Advanced security mandatory
                    deletionProtection: true, // Mandatory protection
                    deviceTracking: {
                        challengeRequiredOnNewDevice: true,
                        deviceOnlyRememberedOnUserPrompt: false // Always remember for tracking
                    }
                };
            default: // commercial
                return {
                    mfa: {
                        mode: 'optional', // Cost optimization
                        enableSms: true,
                        enableTotp: false
                    },
                    passwordPolicy: {
                        minLength: 8, // Standard requirements
                        requireSymbols: false // Reduced complexity
                    },
                    advancedSecurityMode: 'audit', // Basic security
                    deletionProtection: false
                };
        }
    }
}
exports.CognitoUserPoolConfigBuilder = CognitoUserPoolConfigBuilder;
/**
 * Cognito User Pool Component implementing Component API Contract v1.0
 */
class CognitoUserPoolComponent extends src_1.Component {
    userPool;
    userPoolClients = [];
    userPoolDomain;
    config;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
    }
    /**
     * Synthesis phase - Create Cognito User Pool with compliance hardening
     */
    synth() {
        this.logComponentEvent('synthesis_start', 'Starting Cognito User Pool synthesis');
        try {
            // Build configuration using ConfigBuilder
            const configBuilder = new CognitoUserPoolConfigBuilder(this.context, this.spec);
            this.config = configBuilder.buildSync();
            // Create Cognito User Pool
            this.createUserPool();
            // Create app clients
            this.createAppClients();
            // Create domain if configured
            this.createDomainIfNeeded();
            // Configure observability (OpenTelemetry Standard)
            this.configureObservabilityForUserPool();
            // Apply compliance hardening
            this.applyComplianceHardening();
            // Register constructs
            this.registerConstruct('userPool', this.userPool);
            this.userPoolClients.forEach((client, index) => {
                this.registerConstruct(`client${index}`, client);
            });
            if (this.userPoolDomain) {
                this.registerConstruct('domain', this.userPoolDomain);
            }
            // Register capabilities
            this.registerCapability('auth:user-pool', this.buildUserPoolCapability());
            this.registerCapability('auth:identity-provider', this.buildIdentityProviderCapability());
            this.logComponentEvent('synthesis_complete', 'Cognito User Pool synthesis completed successfully');
        }
        catch (error) {
            this.logError(error, 'Cognito User Pool synthesis');
            throw error;
        }
    }
    /**
     * Get the capabilities this component provides
     */
    getCapabilities() {
        this.validateSynthesized();
        return this.capabilities;
    }
    /**
     * Get the component type identifier
     */
    getType() {
        return 'cognito-user-pool';
    }
    /**
     * Create Cognito User Pool
     */
    createUserPool() {
        const userPoolName = this.config.userPoolName || `${this.context.serviceName}-${this.spec.name}`;
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName,
            signInAliases: this.buildSignInAliases(),
            standardAttributes: this.buildStandardAttributes(),
            customAttributes: this.buildCustomAttributes(),
            passwordPolicy: this.buildPasswordPolicy(),
            mfa: this.mapMfaMode(this.config.mfa?.mode || 'optional'),
            mfaSecondFactor: this.buildMfaSecondFactor(),
            accountRecovery: this.mapAccountRecovery(),
            advancedSecurityMode: this.mapAdvancedSecurityMode(),
            deletionProtection: this.config.deletionProtection,
            deviceTracking: this.buildDeviceTracking(),
            lambdaTriggers: this.buildLambdaTriggers(),
            userVerification: this.buildUserVerification(),
            removalPolicy: this.isComplianceFramework() ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
        });
        // Apply standard tags
        this.applyStandardTags(this.userPool, {
            'resource-type': 'cognito-user-pool',
            'mfa-mode': this.config.mfa?.mode || 'optional',
            'advanced-security': this.config.advancedSecurityMode || 'audit',
            ...this.config.tags
        });
        this.logResourceCreation('cognito-user-pool', userPoolName);
    }
    /**
     * Build sign-in aliases configuration
     */
    buildSignInAliases() {
        const signInConfig = this.config.signIn || {};
        return {
            username: signInConfig.username,
            email: signInConfig.email,
            phone: signInConfig.phone,
            preferredUsername: signInConfig.preferredUsername
        };
    }
    /**
     * Build standard attributes configuration
     */
    buildStandardAttributes() {
        const attrs = this.config.standardAttributes || {};
        return {
            email: attrs.email ? {
                required: attrs.email.required || false,
                mutable: attrs.email.mutable !== false
            } : undefined,
            phoneNumber: attrs.phone ? {
                required: attrs.phone.required || false,
                mutable: attrs.phone.mutable !== false
            } : undefined,
            givenName: attrs.givenName ? {
                required: attrs.givenName.required || false,
                mutable: attrs.givenName.mutable !== false
            } : undefined,
            familyName: attrs.familyName ? {
                required: attrs.familyName.required || false,
                mutable: attrs.familyName.mutable !== false
            } : undefined,
            address: attrs.address ? {
                required: attrs.address.required || false,
                mutable: attrs.address.mutable !== false
            } : undefined,
            birthdate: attrs.birthdate ? {
                required: attrs.birthdate.required || false,
                mutable: attrs.birthdate.mutable !== false
            } : undefined,
            gender: attrs.gender ? {
                required: attrs.gender.required || false,
                mutable: attrs.gender.mutable !== false
            } : undefined
        };
    }
    /**
     * Build custom attributes configuration
     */
    buildCustomAttributes() {
        const customAttrs = this.config.customAttributes;
        if (!customAttrs)
            return undefined;
        const result = {};
        for (const [name, config] of Object.entries(customAttrs)) {
            switch (config.type) {
                case 'string':
                    result[name] = new cognito.StringAttribute({
                        minLen: config.minLength,
                        maxLen: config.maxLength,
                        mutable: config.mutable !== false
                    });
                    break;
                case 'number':
                    result[name] = new cognito.NumberAttribute({
                        mutable: config.mutable !== false
                    });
                    break;
                case 'datetime':
                    result[name] = new cognito.DateTimeAttribute({
                        mutable: config.mutable !== false
                    });
                    break;
                case 'boolean':
                    result[name] = new cognito.BooleanAttribute({
                        mutable: config.mutable !== false
                    });
                    break;
            }
        }
        return result;
    }
    /**
     * Build password policy configuration
     */
    buildPasswordPolicy() {
        const policy = this.config.passwordPolicy || {};
        return {
            minLength: policy.minLength || 8,
            requireLowercase: policy.requireLowercase !== false,
            requireUppercase: policy.requireUppercase !== false,
            requireDigits: policy.requireDigits !== false,
            requireSymbols: policy.requireSymbols || false,
            tempPasswordValidity: policy.tempPasswordValidity ? cdk.Duration.days(policy.tempPasswordValidity) : undefined
        };
    }
    /**
     * Map MFA mode string to CDK enum
     */
    mapMfaMode(mode) {
        switch (mode) {
            case 'required':
                return cognito.Mfa.REQUIRED;
            case 'optional':
                return cognito.Mfa.OPTIONAL;
            case 'off':
            default:
                return cognito.Mfa.OFF;
        }
    }
    /**
     * Build MFA second factor configuration
     */
    buildMfaSecondFactor() {
        const mfaConfig = this.config.mfa || { enableSms: true, enableTotp: true };
        return {
            sms: mfaConfig.enableSms !== false,
            otp: mfaConfig.enableTotp !== false
        };
    }
    /**
     * Map account recovery configuration
     */
    mapAccountRecovery() {
        const recovery = this.config.accountRecovery || {};
        if (recovery.email && recovery.phone) {
            return cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA;
        }
        else if (recovery.email) {
            return cognito.AccountRecovery.EMAIL_ONLY;
        }
        else if (recovery.phone) {
            return cognito.AccountRecovery.PHONE_ONLY_WITHOUT_MFA;
        }
        else {
            return cognito.AccountRecovery.EMAIL_ONLY;
        }
    }
    /**
     * Map advanced security mode
     */
    mapAdvancedSecurityMode() {
        const mode = this.config.advancedSecurityMode || 'audit';
        switch (mode) {
            case 'enforced':
                return cognito.AdvancedSecurityMode.ENFORCED;
            case 'audit':
                return cognito.AdvancedSecurityMode.AUDIT;
            case 'off':
            default:
                return cognito.AdvancedSecurityMode.OFF;
        }
    }
    /**
     * Build device tracking configuration
     */
    buildDeviceTracking() {
        const tracking = this.config.deviceTracking || {};
        return {
            challengeRequiredOnNewDevice: tracking.challengeRequiredOnNewDevice || false,
            deviceOnlyRememberedOnUserPrompt: tracking.deviceOnlyRememberedOnUserPrompt !== false
        };
    }
    /**
     * Build Lambda triggers configuration
     */
    buildLambdaTriggers() {
        const triggers = this.config.triggers;
        if (!triggers)
            return undefined;
        const lambdaTriggers = {};
        return {
            preSignUp: triggers.preSignUp ? lambda.Function.fromFunctionArn(this, 'PreSignUpTrigger', triggers.preSignUp) : undefined,
            postConfirmation: triggers.postConfirmation ? lambda.Function.fromFunctionArn(this, 'PostConfirmationTrigger', triggers.postConfirmation) : undefined,
            preAuthentication: triggers.preAuthentication ? lambda.Function.fromFunctionArn(this, 'PreAuthenticationTrigger', triggers.preAuthentication) : undefined,
            postAuthentication: triggers.postAuthentication ? lambda.Function.fromFunctionArn(this, 'PostAuthenticationTrigger', triggers.postAuthentication) : undefined,
            preTokenGeneration: triggers.preTokenGeneration ? lambda.Function.fromFunctionArn(this, 'PreTokenGenerationTrigger', triggers.preTokenGeneration) : undefined,
            userMigration: triggers.userMigration ? lambda.Function.fromFunctionArn(this, 'UserMigrationTrigger', triggers.userMigration) : undefined,
            customMessage: triggers.customMessage ? lambda.Function.fromFunctionArn(this, 'CustomMessageTrigger', triggers.customMessage) : undefined,
            defineAuthChallenge: triggers.defineAuthChallenge ? lambda.Function.fromFunctionArn(this, 'DefineAuthChallengeTrigger', triggers.defineAuthChallenge) : undefined,
            createAuthChallenge: triggers.createAuthChallenge ? lambda.Function.fromFunctionArn(this, 'CreateAuthChallengeTrigger', triggers.createAuthChallenge) : undefined,
            verifyAuthChallengeResponse: triggers.verifyAuthChallengeResponse ? lambda.Function.fromFunctionArn(this, 'VerifyAuthChallengeResponseTrigger', triggers.verifyAuthChallengeResponse) : undefined
        };
    }
    /**
     * Build user verification configuration
     */
    buildUserVerification() {
        return {
            emailSubject: 'Verify your email for our application',
            emailBody: 'Your verification code is {####}',
            emailStyle: cognito.VerificationEmailStyle.CODE,
            smsMessage: this.config.mfa?.smsMessage || 'Your verification code is {####}'
        };
    }
    /**
     * Create app clients
     */
    createAppClients() {
        const appClients = this.config.appClients || [];
        for (const clientConfig of appClients) {
            const client = this.userPool.addClient(clientConfig.clientName, {
                generateSecret: clientConfig.generateSecret || false,
                authFlows: this.buildAuthFlows(clientConfig.authFlows),
                supportedIdentityProviders: this.buildIdentityProviders(clientConfig.supportedIdentityProviders),
                oAuth: clientConfig.oAuth ? {
                    flows: this.buildOAuthFlows(clientConfig.oAuth.flows),
                    scopes: this.buildOAuthScopes(clientConfig.oAuth.scopes),
                    callbackUrls: clientConfig.callbackUrls,
                    logoutUrls: clientConfig.logoutUrls
                } : undefined,
                preventUserExistenceErrors: clientConfig.preventUserExistenceErrors !== false,
                enableTokenRevocation: clientConfig.enableTokenRevocation !== false,
                accessTokenValidity: clientConfig.accessTokenValidity ? cdk.Duration.minutes(clientConfig.accessTokenValidity) : undefined,
                idTokenValidity: clientConfig.idTokenValidity ? cdk.Duration.minutes(clientConfig.idTokenValidity) : undefined,
                refreshTokenValidity: clientConfig.refreshTokenValidity ? cdk.Duration.days(clientConfig.refreshTokenValidity) : undefined
            });
            this.userPoolClients.push(client);
            this.logResourceCreation('user-pool-client', clientConfig.clientName);
        }
    }
    /**
     * Build authentication flows
     */
    buildAuthFlows(authFlows) {
        if (!authFlows) {
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
    /**
     * Build identity providers
     */
    buildIdentityProviders(providers) {
        if (!providers) {
            return [cognito.UserPoolClientIdentityProvider.COGNITO];
        }
        const result = [];
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
        return result;
    }
    /**
     * Build OAuth flows
     */
    buildOAuthFlows(flows) {
        if (!flows) {
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
    /**
     * Build OAuth scopes
     */
    buildOAuthScopes(scopes) {
        if (!scopes) {
            return [cognito.OAuthScope.OPENID];
        }
        const result = [];
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
        return result;
    }
    /**
     * Create domain if configured
     */
    createDomainIfNeeded() {
        const domainConfig = this.config.domain;
        if (!domainConfig)
            return;
        if (domainConfig.customDomain) {
            this.userPoolDomain = this.userPool.addDomain('Domain', {
                customDomain: {
                    domainName: domainConfig.customDomain.domainName,
                    certificate: acm.Certificate.fromCertificateArn(this, 'DomainCert', domainConfig.customDomain.certificateArn)
                }
            });
        }
        else if (domainConfig.domainPrefix) {
            this.userPoolDomain = this.userPool.addDomain('Domain', {
                cognitoDomain: {
                    domainPrefix: domainConfig.domainPrefix
                }
            });
        }
        if (this.userPoolDomain) {
            this.logResourceCreation('user-pool-domain', domainConfig.customDomain?.domainName || domainConfig.domainPrefix);
        }
    }
    /**
     * Build user pool capability data shape
     */
    buildUserPoolCapability() {
        return {
            userPoolId: this.userPool.userPoolId,
            userPoolArn: this.userPool.userPoolArn,
            userPoolProviderName: this.userPool.userPoolProviderName,
            userPoolProviderUrl: this.userPool.userPoolProviderUrl,
            clients: this.userPoolClients.map(client => ({
                clientId: client.userPoolClientId,
                clientName: client.userPoolClientName
            })),
            domainBaseUrl: this.userPoolDomain?.baseUrl()
        };
    }
    /**
     * Build identity provider capability data shape
     */
    buildIdentityProviderCapability() {
        return {
            userPoolId: this.userPool.userPoolId,
            userPoolArn: this.userPool.userPoolArn,
            providerName: this.userPool.userPoolProviderName,
            providerUrl: this.userPool.userPoolProviderUrl
        };
    }
    /**
     * Apply compliance hardening based on framework
     */
    applyComplianceHardening() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                this.applyFedrampHighHardening();
                break;
            case 'fedramp-moderate':
                this.applyFedrampModerateHardening();
                break;
            default:
                this.applyCommercialHardening();
                break;
        }
    }
    /**
     * Apply FedRAMP High compliance hardening
     */
    applyFedrampHighHardening() {
        this.logComplianceEvent('fedramp_high_hardening_applied', 'Applied FedRAMP High hardening to Cognito User Pool', {
            mfaMode: this.config.mfa?.mode,
            advancedSecurityMode: this.config.advancedSecurityMode,
            passwordMinLength: this.config.passwordPolicy?.minLength,
            deletionProtection: this.config.deletionProtection
        });
    }
    /**
     * Apply FedRAMP Moderate compliance hardening
     */
    applyFedrampModerateHardening() {
        this.logComplianceEvent('fedramp_moderate_hardening_applied', 'Applied FedRAMP Moderate hardening to Cognito User Pool', {
            mfaMode: this.config.mfa?.mode,
            advancedSecurityMode: this.config.advancedSecurityMode,
            passwordMinLength: this.config.passwordPolicy?.minLength
        });
    }
    /**
     * Apply commercial hardening
     */
    applyCommercialHardening() {
        this.logComponentEvent('commercial_hardening_applied', 'Applied commercial security hardening to Cognito User Pool');
    }
    /**
     * Configure OpenTelemetry Observability Standard - CloudWatch Alarms for Cognito User Pool
     */
    configureObservabilityForUserPool() {
        // Cognito metrics are only available when advanced security mode is enabled
        if (this.config.advancedSecurityMode === 'off') {
            return;
        }
        const userPoolId = this.userPool.userPoolId;
        // 1. Sign In Success Rate Alarm
        new cloudwatch.Alarm(this, 'SignInSuccessAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-signin-success-rate`,
            alarmDescription: 'Cognito User Pool sign-in success rate alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Cognito',
                metricName: 'SignInSuccesses',
                dimensionsMap: {
                    UserPool: userPoolId,
                    UserPoolClient: 'ALL_USER_POOL_CLIENTS'
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 1,
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.BREACHING
        });
        // 2. Sign In Throttles Alarm
        new cloudwatch.Alarm(this, 'SignInThrottleAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-signin-throttles`,
            alarmDescription: 'Cognito User Pool sign-in throttles alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Cognito',
                metricName: 'SignInThrottles',
                dimensionsMap: {
                    UserPool: userPoolId,
                    UserPoolClient: 'ALL_USER_POOL_CLIENTS'
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 10,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 3. Sign Up Success Rate Alarm
        new cloudwatch.Alarm(this, 'SignUpSuccessAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-signup-success-rate`,
            alarmDescription: 'Cognito User Pool sign-up success rate alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Cognito',
                metricName: 'SignUpSuccesses',
                dimensionsMap: {
                    UserPool: userPoolId,
                    UserPoolClient: 'ALL_USER_POOL_CLIENTS'
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 1,
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 4. Sign Up Throttles Alarm
        new cloudwatch.Alarm(this, 'SignUpThrottleAlarm', {
            alarmName: `${this.context.serviceName}-${this.spec.name}-signup-throttles`,
            alarmDescription: 'Cognito User Pool sign-up throttles alarm',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Cognito',
                metricName: 'SignUpThrottles',
                dimensionsMap: {
                    UserPool: userPoolId,
                    UserPoolClient: 'ALL_USER_POOL_CLIENTS'
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5)
            }),
            threshold: 5,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
        });
        // 5. High Risk Events Alarm (only when advanced security is enforced)
        if (this.config.advancedSecurityMode === 'enforced') {
            new cloudwatch.Alarm(this, 'RiskLevelHighAlarm', {
                alarmName: `${this.context.serviceName}-${this.spec.name}-risk-level-high`,
                alarmDescription: 'Cognito User Pool high risk events alarm',
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/Cognito',
                    metricName: 'RiskLevelHigh',
                    dimensionsMap: {
                        UserPool: userPoolId,
                        UserPoolClient: 'ALL_USER_POOL_CLIENTS'
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5)
                }),
                threshold: 1,
                evaluationPeriods: 1,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
            });
        }
        this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to Cognito User Pool', {
            alarmsCreated: this.config.advancedSecurityMode === 'enforced' ? 5 : 4,
            advancedSecurityMode: this.config.advancedSecurityMode,
            userPoolId: userPoolId
        });
    }
    /**
     * Check if this is a compliance framework
     */
    isComplianceFramework() {
        return this.context.complianceFramework !== 'commercial';
    }
}
exports.CognitoUserPoolComponent = CognitoUserPoolComponent;
