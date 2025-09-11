/**
 * RDS PostgreSQL Component
 *
 * A managed PostgreSQL relational database with comprehensive compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Configuration interface for RDS PostgreSQL component
 */
export interface RdsPostgresConfig {
    /** Database name (required) */
    dbName: string;
    /** Master username */
    username?: string;
    /** Instance class */
    instanceClass?: string;
    /** Allocated storage in GB */
    allocatedStorage?: number;
    /** Max allocated storage for auto-scaling */
    maxAllocatedStorage?: number;
    /** Multi-AZ deployment */
    multiAz?: boolean;
    /** Backup retention period in days */
    backupRetentionDays?: number;
    /** Backup window */
    backupWindow?: string;
    /** Maintenance window */
    maintenanceWindow?: string;
    /** Enable encryption at rest */
    encryptionEnabled?: boolean;
    /** KMS key ARN for encryption */
    kmsKeyArn?: string;
    /** VPC configuration */
    vpc?: {
        vpcId?: string;
        subnetIds?: string[];
        securityGroupIds?: string[];
    };
    /** Performance Insights configuration */
    performanceInsights?: {
        enabled?: boolean;
        retentionPeriod?: number;
    };
    /** Enhanced Monitoring */
    enhancedMonitoring?: {
        enabled?: boolean;
        interval?: number;
    };
}
/**
 * Configuration schema for RDS PostgreSQL component
 */
export declare const RDS_POSTGRES_CONFIG_SCHEMA: {
    type: string;
    title: string;
    description: string;
    required: string[];
    properties: {
        dbName: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
        };
        username: {
            type: string;
            description: string;
            pattern: string;
            minLength: number;
            maxLength: number;
            default: string;
        };
        instanceClass: {
            type: string;
            description: string;
            enum: string[];
            default: string;
        };
        allocatedStorage: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        maxAllocatedStorage: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
        };
        multiAz: {
            type: string;
            description: string;
            default: boolean;
        };
        backupRetentionDays: {
            type: string;
            description: string;
            minimum: number;
            maximum: number;
            default: number;
        };
        backupWindow: {
            type: string;
            description: string;
            pattern: string;
        };
        maintenanceWindow: {
            type: string;
            description: string;
            pattern: string;
        };
        encryptionEnabled: {
            type: string;
            description: string;
            default: boolean;
        };
        kmsKeyArn: {
            type: string;
            description: string;
            pattern: string;
        };
        vpc: {
            type: string;
            description: string;
            properties: {
                vpcId: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                subnetIds: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        pattern: string;
                    };
                    minItems: number;
                    maxItems: number;
                };
                securityGroupIds: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        pattern: string;
                    };
                    maxItems: number;
                };
            };
            additionalProperties: boolean;
        };
        performanceInsights: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                retentionPeriod: {
                    type: string;
                    description: string;
                    enum: number[];
                    default: number;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                retentionPeriod: number;
            };
        };
        enhancedMonitoring: {
            type: string;
            description: string;
            properties: {
                enabled: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                interval: {
                    type: string;
                    description: string;
                    enum: number[];
                    default: number;
                };
            };
            additionalProperties: boolean;
            default: {
                enabled: boolean;
                interval: number;
            };
        };
    };
    additionalProperties: boolean;
    defaults: {
        username: string;
        instanceClass: string;
        allocatedStorage: number;
        backupRetentionDays: number;
        multiAz: boolean;
        encryptionEnabled: boolean;
        performanceInsights: {
            enabled: boolean;
            retentionPeriod: number;
        };
        enhancedMonitoring: {
            enabled: boolean;
            interval: number;
        };
    };
};
/**
 * Configuration builder for RDS PostgreSQL component
 */
export declare class RdsPostgresConfigBuilder {
    private context;
    private spec;
    constructor(context: ComponentContext, spec: ComponentSpec);
    /**
     * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
     */
    build(): Promise<RdsPostgresConfig>;
    /**
     * Synchronous version of build for use in synth() method
     */
    buildSync(): RdsPostgresConfig;
    /**
     * Simple merge utility for combining configuration objects
     */
    private mergeConfigs;
    /**
     * Get platform-wide defaults for RDS PostgreSQL
     */
    private getPlatformDefaults;
    /**
     * Get compliance framework specific defaults
     */
    private getComplianceFrameworkDefaults;
    /**
     * Get default instance class based on compliance framework
     */
    private getDefaultInstanceClass;
    /**
     * Get compliance-specific instance class
     */
    private getComplianceInstanceClass;
    /**
     * Get default allocated storage based on compliance framework
     */
    private getDefaultAllocatedStorage;
    /**
     * Get default backup retention days
     */
    private getDefaultBackupRetentionDays;
    /**
     * Get default Multi-AZ setting
     */
    private getDefaultMultiAz;
    /**
     * Get default encryption setting
     */
    private getDefaultEncryptionEnabled;
    /**
     * Get default Performance Insights enabled setting
     */
    private getDefaultPerformanceInsightsEnabled;
    /**
     * Get default Performance Insights retention
     */
    private getDefaultPerformanceInsightsRetention;
    /**
     * Get default Enhanced Monitoring enabled setting
     */
    private getDefaultEnhancedMonitoringEnabled;
    /**
     * Get default Enhanced Monitoring interval
     */
    private getDefaultEnhancedMonitoringInterval;
}
/**
 * RDS PostgreSQL Component implementing Component API Contract v1.0
 */
export declare class RdsPostgresComponent extends Component {
    private database?;
    private secret?;
    private securityGroup?;
    private kmsKey?;
    private parameterGroup?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create RDS PostgreSQL database with compliance hardening
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
     * Create KMS key for encryption if required by compliance framework
     */
    private createKmsKeyIfNeeded;
    /**
     * Create database secret with generated password
     */
    private createDatabaseSecret;
    /**
     * Create parameter group for STIG compliance in FedRAMP High
     */
    private createParameterGroupIfNeeded;
    /**
     * Create security group for database access
     */
    private createSecurityGroup;
    /**
     * Create the RDS database instance
     */
    private createDatabaseInstance;
    /**
     * Apply compliance-specific hardening
     */
    private applyComplianceHardening;
    private applyCommercialHardening;
    private applyFedrampModerateHardening;
    private applyFedrampHighHardening;
    /**
     * Build database capability data shape
     */
    private buildDatabaseCapability;
    /**
     * Helper methods for compliance decisions
     */
    private shouldUseCustomerManagedKey;
    private shouldEnableEncryption;
    private shouldEnableMultiAz;
    private shouldEnableRdsPerformanceInsights;
    private isComplianceFramework;
    private getBackupRetentionDays;
    private getEnhancedMonitoringInterval;
    private getPerformanceInsightsRetention;
    /**
     * Configure OpenTelemetry observability for database monitoring according to Platform Observability Standard
     */
    private configureObservabilityForDatabase;
    /**
     * Get Performance Insights retention period based on compliance framework
     */
    private getPerformanceInsightsRetentionDays;
    /**
     * Get enhanced monitoring interval based on compliance requirements
     */
    private getDatabaseMonitoringInterval;
    /**
     * Configure CloudWatch observability for RDS PostgreSQL
     */
    private configureObservabilityForRds;
}
