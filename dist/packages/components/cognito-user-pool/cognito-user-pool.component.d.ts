/**
 * Cognito User Pool Component implementing Component API Contract v1.0
 *
 * A managed user directory service for authentication and authorization.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../platform/contracts/src';
/**
 * Configuration interface for Cognito User Pool component
 */
export interface CognitoUserPoolConfig {
    /** User pool name (optional, defaults to component name) */
    userPoolName?: string;
    /** Sign-in configuration */
    signIn?: {
        username?: boolean;
        email?: boolean;
        phone?: boolean;
        preferredUsername?: boolean;
    };
    /** User attributes configuration */
    standardAttributes?: {
        email?: {
            required?: boolean;
            mutable?: boolean;
        };
        phone?: {
            required?: boolean;
            mutable?: boolean;
        };
        givenName?: {
            required?: boolean;
            mutable?: boolean;
        };
        familyName?: {
            required?: boolean;
            mutable?: boolean;
        };
        address?: {
            required?: boolean;
            mutable?: boolean;
        };
        birthdate?: {
            required?: boolean;
            mutable?: boolean;
        };
        gender?: {
            required?: boolean;
            mutable?: boolean;
        };
    };
    /** Custom attributes */
    customAttributes?: Record<string, {
        type: 'string' | 'number' | 'datetime' | 'boolean';
        mutable?: boolean;
        minLength?: number;
        maxLength?: number;
    }>;
    /** Password policy */
    passwordPolicy?: {
        minLength?: number;
        requireLowercase?: boolean;
        requireUppercase?: boolean;
        requireDigits?: boolean;
        requireSymbols?: boolean;
        tempPasswordValidity?: number;
    };
    /** MFA configuration */
    mfa?: {
        mode: 'off' | 'optional' | 'required';
        enableSms?: boolean;
        enableTotp?: boolean;
        smsMessage?: string;
    };
    /** Account recovery configuration */
    accountRecovery?: {
        email?: boolean;
        phone?: boolean;
    };
    /** Email configuration */
    email?: {
        fromEmail?: string;
        fromName?: string;
        replyToEmail?: string;
        sesRegion?: string;
        sesVerifiedDomain?: string;
    };
    /** SMS configuration */
    sms?: {
        snsCallerArn?: string;
        externalId?: string;
    };
    /** Lambda triggers */
    triggers?: {
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
    };
    /** Device tracking */
    deviceTracking?: {
        challengeRequiredOnNewDevice?: boolean;
        deviceOnlyRememberedOnUserPrompt?: boolean;
    };
    /** Advanced security features */
    advancedSecurityMode?: 'off' | 'audit' | 'enforced';
    /** Deletion protection */
    deletionProtection?: boolean;
    /** User pool domain */
    domain?: {
        domainPrefix?: string;
        customDomain?: {
            domainName: string;
            certificateArn: string;
        };
    };
    /** App clients configuration */
    appClients?: Array<{
        clientName: string;
        generateSecret?: boolean;
        authFlows?: Array<'user-password' | 'admin-user-password' | 'custom' | 'user-srp' | 'allow-refresh-token'>;
        supportedIdentityProviders?: Array<'cognito' | 'google' | 'facebook' | 'amazon' | 'apple'>;
        callbackUrls?: string[];
        logoutUrls?: string[];
        oAuth?: {
            flows?: Array<'authorization-code' | 'implicit' | 'client-credentials'>;
            scopes?: Array<'phone' | 'email' | 'openid' | 'profile'>;
        };
        preventUserExistenceErrors?: boolean;
        enableTokenRevocation?: boolean;
        accessTokenValidity?: number;
        idTokenValidity?: number;
        refreshTokenValidity?: number;
    }>;
    /** Tags for the user pool */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for Cognito User Pool component
 */
export declare const COGNITO_USER_POOL_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        userPoolName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        signIn: {
            type: string;
            description: string;
            properties: {
                username: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                email: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                phone: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                preferredUsername: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
        };
        standardAttributes: {
            type: string;
            description: string;
            properties: {
                email: {
                    type: string;
                    properties: {
                        required: {
                            type: string;
                            default: boolean;
                        };
                        mutable: {
                            type: string;
                            default: boolean;
                        };
                    };
                };
                phone: {
                    type: string;
                    properties: {
                        required: {
                            type: string;
                            default: boolean;
                        };
                        mutable: {
                            type: string;
                            default: boolean;
                        };
                    };
                };
                givenName: {
                    type: string;
                    properties: {
                        required: {
                            type: string;
                            default: boolean;
                        };
                        mutable: {
                            type: string;
                            default: boolean;
                        };
                    };
                };
                familyName: {
                    type: string;
                    properties: {
                        required: {
                            type: string;
                            default: boolean;
                        };
                        mutable: {
                            type: string;
                            default: boolean;
                        };
                    };
                };
            };
        };
        passwordPolicy: {
            type: string;
            description: string;
            properties: {
                minLength: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                requireLowercase: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                requireUppercase: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                requireDigits: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                requireSymbols: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                tempPasswordValidity: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
        };
        mfa: {
            type: string;
            description: string;
            required: string[];
            properties: {
                mode: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                enableSms: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                enableTotp: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                smsMessage: {
                    type: string;
                    description: string;
                    default: string;
                };
            };
        };
        accountRecovery: {
            type: string;
            description: string;
            properties: {
                email: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                phone: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
        };
        customAttributes: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
                required: string[];
                properties: {
                    type: {
                        type: string;
                        enum: string[];
                    };
                    mutable: {
                        type: string;
                        default: boolean;
                    };
                    minLength: {
                        type: string;
                        minimum: number;
                    };
                    maxLength: {
                        type: string;
                        minimum: number;
                    };
                };
            };
        };
        email: {
            type: string;
            description: string;
            properties: {
                fromEmail: {
                    type: string;
                    description: string;
                };
                fromName: {
                    type: string;
                    description: string;
                };
                replyToEmail: {
                    type: string;
                    description: string;
                };
                sesRegion: {
                    type: string;
                    description: string;
                };
                sesVerifiedDomain: {
                    type: string;
                    description: string;
                };
            };
        };
        sms: {
            type: string;
            description: string;
            properties: {
                snsCallerArn: {
                    type: string;
                    description: string;
                };
                externalId: {
                    type: string;
                    description: string;
                };
            };
        };
        triggers: {
            type: string;
            description: string;
            properties: {
                preSignUp: {
                    type: string;
                    description: string;
                };
                postConfirmation: {
                    type: string;
                    description: string;
                };
                preAuthentication: {
                    type: string;
                    description: string;
                };
                postAuthentication: {
                    type: string;
                    description: string;
                };
                preTokenGeneration: {
                    type: string;
                    description: string;
                };
                userMigration: {
                    type: string;
                    description: string;
                };
                customMessage: {
                    type: string;
                    description: string;
                };
                defineAuthChallenge: {
                    type: string;
                    description: string;
                };
                createAuthChallenge: {
                    type: string;
                    description: string;
                };
                verifyAuthChallengeResponse: {
                    type: string;
                    description: string;
                };
            };
        };
        deviceTracking: {
            type: string;
            description: string;
            properties: {
                challengeRequiredOnNewDevice: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                deviceOnlyRememberedOnUserPrompt: {
                    type: string;
                    description: string;
                    default: boolean;
                };
            };
        };
        advancedSecurityMode: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        deletionProtection: {
            type: string;
            description: string;
            default: boolean;
        };
        domain: {
            type: string;
            description: string;
            properties: {
                domainPrefix: {
                    type: string;
                    description: string;
                    pattern: string;
                    minLength: number;
                    maxLength: number;
                };
                customDomain: {
                    type: string;
                    description: string;
                    required: string[];
                    properties: {
                        domainName: {
                            type: string;
                            description: string;
                        };
                        certificateArn: {
                            type: string;
                            description: string;
                        };
                    };
                };
            };
        };
        appClients: {
            type: string;
            description: string;
            items: {
                type: string;
                required: string[];
                properties: {
                    clientName: {
                        type: string;
                        description: string;
                    };
                    generateSecret: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    authFlows: {
                        type: string;
                        description: string;
                        items: {
                            type: string;
                            enum: string[];
                        };
                        default: string[];
                    };
                    preventUserExistenceErrors: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    enableTokenRevocation: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                };
            };
        };
    };
    additionalProperties: boolean;
};
/**
 * Configuration builder for Cognito User Pool component
 */
export declare class CognitoUserPoolConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<CognitoUserPoolConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): CognitoUserPoolConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for Cognito User Pool
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
}
/**
 * Cognito User Pool Component implementing Component API Contract v1.0
 */
export declare class CognitoUserPoolComponent extends Component {
    private userPool?;
    private userPoolClients;
    private userPoolDomain?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create Cognito User Pool with compliance hardening
     */
    synth(): void;
    /**
     * Get the capabilities this component provides
     */
    getCapabilities(): ComponentCapabilities;
    /**
     * Get the component type identifier
     */
    getType(): string;
    /**
     * Create Cognito User Pool
     */
    private createUserPool;
    /**
     * Build sign-in aliases configuration
     */
    private buildSignInAliases;
    /**
     * Build standard attributes configuration
     */
    private buildStandardAttributes;
    /**
     * Build custom attributes configuration
     */
    private buildCustomAttributes;
    /**
     * Build password policy configuration
     */
    private buildPasswordPolicy;
    /**
     * Map MFA mode string to CDK enum
     */
    private mapMfaMode;
    /**
     * Build MFA second factor configuration
     */
    private buildMfaSecondFactor;
    /**
     * Map account recovery configuration
     */
    private mapAccountRecovery;
    /**
     * Map advanced security mode
     */
    private mapAdvancedSecurityMode;
    /**
     * Build device tracking configuration
     */
    private buildDeviceTracking;
    /**
     * Build Lambda triggers configuration
     */
    private buildLambdaTriggers;
    /**
     * Build user verification configuration
     */
    private buildUserVerification;
    /**
     * Create app clients
     */
    private createAppClients;
    /**
     * Build authentication flows
     */
    private buildAuthFlows;
    /**
     * Build identity providers
     */
    private buildIdentityProviders;
    /**
     * Build OAuth flows
     */
    private buildOAuthFlows;
    /**
     * Build OAuth scopes
     */
    private buildOAuthScopes;
    /**
     * Create domain if configured
     */
    private createDomainIfNeeded;
    /**
     * Build user pool capability data shape
     */
    private buildUserPoolCapability;
    /**
     * Build identity provider capability data shape
     */
    private buildIdentityProviderCapability;
    /**
     * Apply compliance hardening based on framework
     */
    private applyComplianceHardening;
    /**
     * Apply FedRAMP High compliance hardening
     */
    private applyFedrampHighHardening;
    /**
     * Apply FedRAMP Moderate compliance hardening
     */
    private applyFedrampModerateHardening;
    /**
     * Apply commercial hardening
     */
    private applyCommercialHardening;
    /**
     * Configure OpenTelemetry Observability Standard - CloudWatch Alarms for Cognito User Pool
     */
    private configureObservabilityForUserPool;
    /**
     * Check if this is a compliance framework
     */
    private isComplianceFramework;
}
