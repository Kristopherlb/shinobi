/**
 * EventBridge Rule Pattern Component implementing Component API Contract v1.0
 *
 * A managed event pattern-based rule for reacting to specific events happening across an AWS account.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../platform/contracts/src';
/**
 * Configuration interface for EventBridge Rule Pattern component
 */
export interface EventBridgeRulePatternConfig {
    /** Rule name (optional, defaults to component name) */
    ruleName?: string;
    /** Event pattern for filtering events */
    eventPattern: {
        /** Source of the event */
        source?: string[];
        /** Detail type of the event */
        detailType?: string[];
        /** Account ID filter */
        account?: string[];
        /** Region filter */
        region?: string[];
        /** Event detail content filters */
        detail?: Record<string, any>;
        /** Resources filter */
        resources?: string[];
        /** Time filter */
        time?: {
            /** Numeric range for timestamp */
            numeric?: Array<{
                operator: string;
                value: number;
            }>;
        };
    };
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
 * JSON Schema for EventBridge Rule Pattern configuration
 */
export declare const EVENTBRIDGE_RULE_PATTERN_CONFIG_SCHEMA: {
    type: string;
    properties: {
        ruleName: {
            type: string;
            pattern: string;
            maxLength: number;
        };
        eventPattern: {
            type: string;
            properties: {
                source: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                detailType: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                account: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                region: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                detail: {
                    type: string;
                };
                resources: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                time: {
                    type: string;
                    properties: {
                        numeric: {
                            type: string;
                            items: {
                                type: string;
                                properties: {
                                    operator: {
                                        type: string;
                                    };
                                    value: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                        };
                    };
                };
            };
            required: string[];
        };
        description: {
            type: string;
        };
        eventBus: {
            type: string;
            properties: {
                busName: {
                    type: string;
                };
                busArn: {
                    type: string;
                };
            };
        };
        state: {
            type: string;
            enum: string[];
        };
        input: {
            type: string;
            properties: {
                inputType: {
                    type: string;
                    enum: string[];
                };
                inputValue: {
                    type: string;
                };
                inputPath: {
                    type: string;
                };
                inputTransformer: {
                    type: string;
                    properties: {
                        inputPathsMap: {
                            type: string;
                            additionalProperties: {
                                type: string;
                            };
                        };
                        inputTemplate: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
            required: string[];
        };
        deadLetterQueue: {
            type: string;
            properties: {
                enabled: {
                    type: string;
                };
                maxRetryAttempts: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
                retentionPeriod: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
            };
        };
        monitoring: {
            type: string;
            properties: {
                enabled: {
                    type: string;
                };
                alarmOnFailure: {
                    type: string;
                };
                failureThreshold: {
                    type: string;
                    minimum: number;
                };
                cloudWatchLogs: {
                    type: string;
                    properties: {
                        enabled: {
                            type: string;
                        };
                        logGroupName: {
                            type: string;
                        };
                        retentionInDays: {
                            type: string;
                            enum: number[];
                        };
                    };
                };
            };
        };
        tags: {
            type: string;
            additionalProperties: {
                type: string;
            };
        };
    };
    required: string[];
    additionalProperties: boolean;
};
/**
 * ConfigBuilder for EventBridge Rule Pattern component
 */
export declare class EventBridgeRulePatternConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Asynchronous build method - delegates to synchronous implementation
     */
    build(): Promise<EventBridgeRulePatternConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): EventBridgeRulePatternConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults with intelligent configuration
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework-specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default failure threshold based on compliance framework
     */
    private getDefaultFailureThreshold;
    /**
     * Get default log retention based on compliance framework
     */
    private getDefaultLogRetention;
    /**
     * Determine if dead letter queue should be enabled by default
     */
    private shouldEnableDeadLetterQueue;
    /**
     * Get default retry attempts based on compliance framework
     */
    private getDefaultRetryAttempts;
    /**
     * Get default dead letter queue retention period
     */
    private getDefaultDlqRetention;
}
/**
 * EventBridge Rule Pattern Component implementing Component API Contract v1.0
 */
export declare class EventBridgeRulePatternComponent extends Component {
    private rule?;
    private deadLetterQueue?;
    private logGroup?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create EventBridge rule with event pattern filtering
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
     * Validate event pattern for production compliance
     */
    private validateEventPatternForCompliance;
    /**
     * Create dead letter queue if enabled in config
     */
    private createDeadLetterQueueIfNeeded;
    /**
     * Create CloudWatch log group if enabled
     */
    private createCloudWatchLogGroupIfNeeded;
    /**
     * Create EventBridge rule with event pattern
     */
    private createEventBridgeRule;
    /**
     * Configure CloudWatch observability for EventBridge rule
     */
    private configureObservabilityForEventBridge;
    /**
     * Configure comprehensive CloudWatch alarms for EventBridge rule monitoring
     */
    private configureEventBridgeAlarms;
    /**
     * Apply compliance hardening based on framework
     */
    private applyComplianceHardening;
    /**
     * Build EventBridge capability descriptor
     */
    private buildEventBridgeCapability;
    /**
     * Get log retention period based on compliance framework
     */
    private getLogRetention;
    /**
     * Build CDK-compatible event pattern from config
     */
    private buildCdkEventPattern;
}
//# sourceMappingURL=eventbridge-rule-pattern.component.d.ts.map