/**
 * Glue Job Component
 *
 * AWS Glue Job for serverless ETL data processing workflows.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for Glue Job component
 */
export interface GlueJobConfig {
    /** Job name (optional, will be auto-generated) */
    jobName?: string;
    /** Job description */
    description?: string;
    /** Glue version */
    glueVersion?: string;
    /** Job type */
    jobType?: 'glueetl' | 'gluestreaming' | 'pythonshell' | 'glueray';
    /** IAM role ARN for the job */
    roleArn?: string;
    /** Script location */
    scriptLocation: string;
    /** Command configuration */
    command?: {
        /** Python version */
        pythonVersion?: string;
        /** Script arguments */
        scriptArguments?: Record<string, string>;
    };
    /** Connection names */
    connections?: string[];
    /** Max concurrent runs */
    maxConcurrentRuns?: number;
    /** Max retries */
    maxRetries?: number;
    /** Timeout in minutes */
    timeout?: number;
    /** Notification property */
    notificationProperty?: {
        /** Notify delay after in minutes */
        notifyDelayAfter?: number;
    };
    /** Execution property */
    executionProperty?: {
        /** Maximum parallel capacity units */
        maxConcurrentRuns?: number;
    };
    /** Worker configuration */
    workerConfiguration?: {
        /** Worker type */
        workerType?: 'Standard' | 'G.1X' | 'G.2X' | 'G.4X' | 'G.8X' | 'Z.2X';
        /** Number of workers */
        numberOfWorkers?: number;
    };
    /** Security configuration */
    securityConfiguration?: string;
    /** Default arguments */
    defaultArguments?: Record<string, string>;
    /** Non-overridable arguments */
    nonOverridableArguments?: Record<string, string>;
    /** Tags for the job */
    tags?: Record<string, string>;
}
/**
 * Configuration schema for Glue Job component
 */
export declare const GLUE_JOB_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    properties: {
        jobName: {
            type: string;
            description: string;
            pattern: string;
            maxLength: number;
        };
        description: {
            type: string;
            description: string;
            maxLength: number;
        };
        glueVersion: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        jobType: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        roleArn: {
            type: string;
            description: string;
        };
        scriptLocation: {
            type: string;
            description: string;
        };
        command: {
            type: string;
            description: string;
            properties: {
                pythonVersion: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                scriptArguments: {
                    type: string;
                    description: string;
                    additionalProperties: {
                        type: string;
                    };
                    default: {};
                };
            };
            additionalProperties: boolean;
        };
        connections: {
            type: string;
            description: string;
            items: {
                type: string;
            };
            maxItems: number;
        };
        maxConcurrentRuns: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        maxRetries: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        timeout: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        notificationProperty: {
            type: string;
            description: string;
            properties: {
                notifyDelayAfter: {
                    type: string;
                    description: string;
                    minimum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
        };
        executionProperty: {
            type: string;
            description: string;
            properties: {
                maxConcurrentRuns: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
        };
        workerConfiguration: {
            type: string;
            description: string;
            properties: {
                workerType: {
                    type: string;
                    description: string;
                    enum: string[];
                    default: string;
                };
                numberOfWorkers: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            additionalProperties: boolean;
            default: {
                workerType: string;
                numberOfWorkers: number;
            };
        };
        securityConfiguration: {
            type: string;
            description: string;
        };
        defaultArguments: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
            };
            default: {};
        };
        nonOverridableArguments: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
            };
            default: {};
        };
        tags: {
            type: string;
            description: string;
            additionalProperties: {
                type: string;
            };
            default: {};
        };
    };
    additionalProperties: boolean;
    required: string[];
    defaults: {
        glueVersion: string;
        jobType: string;
        maxConcurrentRuns: number;
        maxRetries: number;
        timeout: number;
        workerConfiguration: {
            workerType: string;
            numberOfWorkers: number;
        };
        defaultArguments: {};
        nonOverridableArguments: {};
        tags: {};
    };
};
/**
 * Configuration builder for Glue Job component
 */
export declare class GlueJobConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    build(): Promise<GlueJobConfig>;
    buildSync(): GlueJobConfig;
    private mergeConfigs;
    private getPlatformDefaults;
    private getComplianceFrameworkDefaults;
    private getDefaultMaxConcurrentRuns;
    private getDefaultMaxRetries;
    private getDefaultTimeout;
    private getDefaultWorkerConfiguration;
    private getDefaultArguments;
}
/**
 * Glue Job Component implementing Component API Contract v1.0
 */
export declare class GlueJobComponent extends Component {
    private glueJob?;
    private executionRole?;
    private securityConfiguration?;
    private kmsKey?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    synth(): void;
    getCapabilities(): ComponentCapabilities;
    getType(): string;
    private createKmsKeyIfNeeded;
    private createSecurityConfigurationIfNeeded;
    private createExecutionRoleIfNeeded;
    private createGlueJob;
    private buildJobTags;
    private getBaseManagedPolicies;
    private buildInlinePolicies;
    private buildJobName;
    private getKeyRemovalPolicy;
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    private buildJobCapability;
    private configureObservabilityForJob;
}
