/**
 * EventBridge Rule Cron Component implementing Component API Contract v1.0
 *
 * A managed cron-based scheduling rule for triggering Lambda functions and other targets.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../platform/contracts/src';
/**
 * Configuration interface for EventBridge Rule Cron component
 */
export interface EventBridgeRuleCronConfig {
    /** Rule name (optional, defaults to component name) */
    ruleName?: string;
    /** Cron schedule expression */
    schedule: string;
    /** Rule description */
    description?: string;
    /** EventBridge bus configuration */
    eventBus?: {
        busName?: string;
        busArn?: string;
    };
    /** Rule state */
    state?: 'enabled' | 'disabled';
    /** Input configuration for targets */
    input?: {
        inputType: 'constant' | 'transformer' | 'path';
        inputValue?: string;
        inputPath?: string;
        inputTransformer?: {
            inputPathsMap?: Record<string, string>;
            inputTemplate: string;
        };
    };
    /** Dead letter queue configuration */
    deadLetterQueue?: {
        enabled?: boolean;
        maxRetryAttempts?: number;
        retentionPeriod?: number;
    };
    /** Monitoring configuration */
    monitoring?: {
        enabled?: boolean;
        alarmOnFailure?: boolean;
        failureThreshold?: number;
        cloudWatchLogs?: {
            enabled?: boolean;
            logGroupName?: string;
            retentionInDays?: number;
        };
    };
    /** Tags for the rule */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for EventBridge Rule Cron component
 */
export declare const EVENTBRIDGE_RULE_CRON_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    required: string[];
    properties: {
        ruleName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        schedule: {
            type: string;
            description: string;
            pattern: string;
            examples: string[];
        };
        description: {
            type: string;
            description: string;
            maxLength: number;
        };
        eventBus: {
            type: string;
            description: string;
            properties: {
                busName: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                busArn: {
                    type: string;
                    description: string;
                    pattern: string;
                };
            };
        };
        state: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        input: {
            type: string;
            description: string;
            required: string[];
            properties: {
                inputType: {
                    type: string;
                    description: string;
                    enum: string[];
                };
                inputValue: {
                    type: string;
                    description: string;
                };
                inputPath: {
                    type: string;
                    description: string;
                };
                inputTransformer: {
                    type: string;
                    description: string;
                    required: string[];
                    properties: {
                        inputPathsMap: {
                            type: string;
                            description: string;
                            additionalProperties: {
                                type: string;
                            };
                        };
                        inputTemplate: {
                            type: string;
                            description: string;
                        };
                    };
                };
            };
        };
        deadLetterQueue: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                maxRetryAttempts: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                retentionPeriod: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
        };
        monitoring: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                alarmOnFailure: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                failureThreshold: {
                    type: string;
                    description: string;
                    minimum: number;
                    default: number;
                };
                cloudWatchLogs: {
                    type: string;
                    description: string;
                    properties: {
                        enabled: {
                            type: string;
                            description: string;
                            default: boolean;
                        };
                        logGroupName: {
                            type: string;
                            description: string;
                        };
                        retentionInDays: {
                            type: string;
                            description: string;
                            enum: number[];
                            default: number;
                        };
                    };
                };
            };
        };
    };
    additionalProperties: boolean;
};
/**
 * Configuration builder for EventBridge Rule Cron component
 */
export declare class EventBridgeRuleCronConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<EventBridgeRuleCronConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): EventBridgeRuleCronConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for EventBridge Rule Cron
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
}
/**
 * EventBridge Rule Cron Component implementing Component API Contract v1.0
 */
export declare class EventBridgeRuleCronComponent extends Component {
    private rule?;
    private eventBus?;
    private logGroup?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create EventBridge cron rule with compliance hardening
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
     * Get or create event bus
     */
    private getEventBus;
    /**
     * Create CloudWatch log group if logging is enabled
     */
    private createLogGroupIfNeeded;
    /**
     * Map retention days to CDK retention period
     */
    private mapRetentionPeriod;
    /**
     * Create EventBridge rule with cron schedule
     */
    private createEventBridgeRule;
    /**
     * Parse schedule expression into CDK Schedule
     */
    private parseScheduleExpression;
    /**
     * Extract field from cron expression
     */
    private extractCronField;
    /**
     * Add target to the EventBridge rule
     */
    addLambdaTarget(lambdaFunction: lambda.IFunction, targetInput?: any): void;
    /**
     * Create dead letter queue for failed events
     */
    private createDeadLetterQueue;
    /**
     * Build cron capability data shape
     */
    private buildCronCapability;
    /**
     * Build trigger capability data shape
     */
    private buildTriggerCapability;
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
     * Configure CloudWatch observability for EventBridge Rule
     */
    private configureObservabilityForEventBridge;
    /**
     * Check if this is a compliance framework
     */
    private isComplianceFramework;
}
