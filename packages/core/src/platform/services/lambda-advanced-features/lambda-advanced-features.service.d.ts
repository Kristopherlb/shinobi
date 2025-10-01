import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
/**
 * Dead Letter Queue configuration for Lambda functions
 */
export interface DeadLetterQueueConfig {
    enabled: boolean;
    maxReceiveCount?: number;
    retentionDays?: number;
    visibilityTimeoutSeconds?: number;
    queueName?: string;
}
/**
 * SQS Event Source configuration
 */
export interface SqsEventSourceConfig {
    enabled: boolean;
    queues: Array<{
        name: string;
        batchSize?: number;
        maximumBatchingWindowSeconds?: number;
        enabled?: boolean;
        queueArn?: string;
    }>;
}
/**
 * EventBridge Event Source configuration
 */
export interface EventBridgeEventSourceConfig {
    enabled: boolean;
    rules: Array<{
        name: string;
        eventPattern: events.EventPattern;
        enabled?: boolean;
    }>;
}
/**
 * Performance optimization configuration
 */
export interface PerformanceOptimizationConfig {
    provisionedConcurrency: {
        enabled: boolean;
        minCapacity: number;
        maxCapacity: number;
        autoScaling: {
            enabled: boolean;
            targetUtilization: number;
            scaleOutCooldown: number;
            scaleInCooldown: number;
        };
    };
    reservedConcurrency: {
        enabled: boolean;
        reservedConcurrencyLimit: number;
    };
    snapStart: {
        enabled: boolean;
        optimizationTier: 'OPTIMIZE_FOR_LATENCY' | 'OPTIMIZE_FOR_DURATION';
    };
}
/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeoutSeconds: number;
    monitoringEnabled: boolean;
}
/**
 * Security enhancements configuration
 */
export interface SecurityEnhancementConfig {
    vpc: {
        enabled: boolean;
        vpcId?: string;
        subnetIds: string[];
        securityGroupIds: string[];
    };
    encryption: {
        enabled: boolean;
        kmsKeyId?: string;
    };
    secretsManager: {
        enabled: boolean;
        secretArn?: string;
    };
}
/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
    enableDLQ: boolean;
    enableRetry: boolean;
    maxRetries: number;
    retryBackoff: boolean;
    logErrors: boolean;
}
/**
 * Lambda Advanced Features Service
 *
 * Platform-level service providing advanced Lambda features including:
 * - Dead Letter Queue (DLQ) configuration
 * - Event source integration (SQS, EventBridge)
 * - Performance optimizations (provisioned concurrency, reserved concurrency, SnapStart)
 * - Circuit breaker patterns
 * - Security enhancements
 * - Error handling patterns
 * - Comprehensive monitoring and alerting
 */
export declare class LambdaAdvancedFeaturesService {
    private scope;
    private lambdaFunction;
    private context;
    private componentType;
    private deadLetterQueue?;
    private eventSources;
    private performanceAlarms;
    private securityEnhancements;
    constructor(scope: Construct, lambdaFunction: lambda.Function, context: any, componentType: 'lambda-api' | 'lambda-worker');
    /**
     * Configure Dead Letter Queue for Lambda function
     */
    configureDeadLetterQueue(dlqConfig: DeadLetterQueueConfig): sqs.Queue | undefined;
    /**
     * Configure SQS event sources
     */
    configureSqsEventSources(sqsConfig: SqsEventSourceConfig): void;
    /**
     * Configure EventBridge event sources
     */
    configureEventBridgeEventSources(eventBridgeConfig: EventBridgeEventSourceConfig): void;
    /**
     * Configure performance optimizations
     */
    configurePerformanceOptimizations(perfConfig: PerformanceOptimizationConfig): void;
    /**
     * Configure circuit breaker pattern
     */
    configureCircuitBreaker(circuitBreakerConfig: CircuitBreakerConfig): void;
    /**
     * Configure security enhancements
     */
    configureSecurityEnhancements(securityConfig: SecurityEnhancementConfig): void;
    /**
     * Configure error handling patterns
     */
    configureErrorHandling(errorHandlingConfig: ErrorHandlingConfig): void;
    /**
     * Create DLQ monitoring alarms
     */
    private createDLQMonitoringAlarms;
    /**
     * Create SQS monitoring alarms
     */
    private createSqsMonitoringAlarms;
    /**
     * Create EventBridge monitoring alarms
     */
    private createEventBridgeMonitoringAlarms;
    /**
     * Create provisioned concurrency monitoring alarms
     */
    private createProvisionedConcurrencyMonitoringAlarms;
    /**
     * Create circuit breaker monitoring
     */
    private createCircuitBreakerMonitoring;
    /**
     * Get all created alarms for external monitoring setup
     */
    getPerformanceAlarms(): cloudwatch.Alarm[];
    /**
     * Get DLQ for external configuration
     */
    getDeadLetterQueue(): sqs.Queue | undefined;
    /**
     * Get event sources for external configuration
     */
    getEventSources(): lambda.EventSourceMapping[];
    /**
     * Get security enhancement policies
     */
    getSecurityEnhancementPolicies(): iam.PolicyStatement[];
    /**
     * Factory method for Lambda API components
     */
    static createForApi(scope: Construct, lambdaFunction: lambda.Function, context: any): LambdaAdvancedFeaturesService;
    /**
     * Factory method for Lambda Worker components
     */
    static createForWorker(scope: Construct, lambdaFunction: lambda.Function, context: any): LambdaAdvancedFeaturesService;
}
//# sourceMappingURL=lambda-advanced-features.service.d.ts.map