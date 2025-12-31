/**
 * S3 Advanced Features Service
 *
 * Platform-level service providing advanced S3 capabilities including
 * security scanning, monitoring, compliance validation, and performance optimization.
 */
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { ComponentContext } from '../../contracts/component-interfaces.js';
export interface S3SecurityScanningConfig {
    enabled: boolean;
    scanOnUpload: boolean;
    scanOnDownload?: boolean;
    quarantineBucketArn?: string;
    notificationTopics?: string[];
}
export interface S3MonitoringConfig {
    enabled: boolean;
    dashboards: boolean;
    customMetrics: boolean;
    alerting: boolean;
    thresholds: {
        errorRate: number;
        requestLatency: number;
        dataTransfer: number;
    };
}
export interface S3ComplianceConfig {
    enabled: boolean;
    frameworks: string[];
    validationRules: string[];
    reporting: boolean;
}
export interface S3PerformanceConfig {
    enabled: boolean;
    transferAcceleration: boolean;
    intelligentTiering: boolean;
    cloudFrontIntegration?: {
        distributionArn?: string;
        cacheBehaviors?: Record<string, any>;
    };
}
export interface S3AdvancedFeaturesConfig {
    securityScanning?: S3SecurityScanningConfig;
    monitoring?: S3MonitoringConfig;
    compliance?: S3ComplianceConfig;
    performance?: S3PerformanceConfig;
}
export interface S3AdvancedFeaturesService {
    configureSecurityScanning(config: S3SecurityScanningConfig): void;
    configureMonitoring(config: S3MonitoringConfig): void;
    configureCompliance(config: S3ComplianceConfig): void;
    configurePerformance(config: S3PerformanceConfig): void;
    getSecurityScanningResources(): Construct[];
    getMonitoringResources(): (Construct | cloudwatch.Metric)[];
    getComplianceResources(): Construct[];
    getPerformanceResources(): Construct[];
}
export declare class S3AdvancedFeaturesServiceImpl implements S3AdvancedFeaturesService {
    private scope;
    private context;
    private bucket;
    private securityScanningResources;
    private monitoringResources;
    private complianceResources;
    private performanceResources;
    constructor(scope: Construct, context: ComponentContext, bucket: s3.Bucket);
    /**
     * Configures security scanning capabilities for the S3 bucket
     */
    configureSecurityScanning(config: S3SecurityScanningConfig): void;
    /**
     * Configures monitoring and observability for the S3 bucket
     */
    configureMonitoring(config: S3MonitoringConfig): void;
    /**
     * Configures compliance validation and reporting
     */
    configureCompliance(config: S3ComplianceConfig): void;
    /**
     * Configures performance optimization features
     */
    configurePerformance(config: S3PerformanceConfig): void;
    /**
     * Gets all security scanning resources
     */
    getSecurityScanningResources(): Construct[];
    /**
     * Gets all monitoring resources
     */
    getMonitoringResources(): (Construct | cloudwatch.Metric)[];
    /**
     * Gets all compliance resources
     */
    getComplianceResources(): Construct[];
    /**
     * Gets all performance resources
     */
    getPerformanceResources(): Construct[];
    private createClamAvFunction;
    private configureUploadScanning;
    private configureQuarantinePolicies;
    private createS3Dashboard;
    private createCustomMetrics;
    private createS3Alarms;
    private createComplianceValidator;
    private enableTransferAcceleration;
    private configureIntelligentTiering;
    private configureCloudFrontIntegration;
    private logEvent;
}
/**
 * Factory function to create S3 Advanced Features Service
 */
export declare function createS3AdvancedFeaturesService(scope: Construct, context: ComponentContext, bucket: s3.Bucket): S3AdvancedFeaturesService;
//# sourceMappingURL=s3-advanced-features.service.d.ts.map