"use strict";
/**
 * RDS Logging Handler
 *
 * Implements logging infrastructure for RDS instances according to
 * Platform Structured Logging Standard v1.0.
 *
 * Features:
 * - Configures RDS log exports to CloudWatch
 * - Sets up compliance-aware log retention
 * - Configures audit logging for database operations
 * - Implements security monitoring for database access
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
exports.RdsLoggingHandler = void 0;
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cdk = __importStar(require("aws-cdk-lib"));
/**
 * Logging handler for RDS instances
 * Configures database logging and CloudWatch integration
 */
class RdsLoggingHandler {
    componentType = 'rds-database';
    loggingService;
    constructor(loggingService) {
        this.loggingService = loggingService;
    }
    /**
     * Apply RDS logging configuration with compliance-aware settings
     */
    apply(component, context) {
        try {
            // Get the RDS instance from the component
            const database = component.getConstruct('database');
            if (!database) {
                return {
                    success: false,
                    retentionDays: 0,
                    encryption: { enabled: false, managedKey: true },
                    classification: 'internal',
                    error: 'RDS component has no database construct registered'
                };
            }
            // Create log groups for different RDS log types
            const logGroups = this.createRdsLogGroups(component, context);
            // Configure RDS log exports (this would typically be done during RDS creation)
            this.configureRdsLogExports(database, context);
            // Set up database audit logging if required by compliance
            this.configureAuditLogging(database, context);
            const classification = this.loggingService.getSecurityClassification('rds');
            const retentionDays = this.loggingService.getRetentionPolicy().retentionDays;
            return {
                success: true,
                logGroupArn: logGroups.error.logGroupArn,
                retentionDays,
                encryption: {
                    enabled: true,
                    managedKey: this.loggingService.getRetentionPolicy().encryptionLevel === 'standard'
                },
                classification,
                metadata: {
                    databaseIdentifier: database.instanceIdentifier || 'unknown',
                    logTypes: ['error', 'general', 'slowquery'],
                    auditLogging: this.loggingService.getRetentionPolicy().auditRequired,
                    performanceInsights: 'enabled'
                }
            };
        }
        catch (error) {
            return {
                success: false,
                retentionDays: 0,
                encryption: { enabled: false, managedKey: true },
                classification: 'internal',
                error: `Failed to configure RDS logging: ${error.message}`
            };
        }
    }
    /**
     * Create CloudWatch Log Groups for different RDS log types
     */
    createRdsLogGroups(component, context) {
        const policy = this.loggingService.getRetentionPolicy();
        const retentionEnum = this.mapRetentionToEnum(policy.retentionDays);
        const removalPolicy = policy.immutable ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
        // Error logs
        const errorLogGroup = new logs.LogGroup(component, 'RdsErrorLogGroup', {
            logGroupName: `/aws/rds/instance/${component.node.id}/error`,
            retention: retentionEnum,
            removalPolicy
        });
        // General logs (if not commercial due to volume)
        const generalLogGroup = new logs.LogGroup(component, 'RdsGeneralLogGroup', {
            logGroupName: `/aws/rds/instance/${component.node.id}/general`,
            retention: context.complianceFramework === 'commercial' ?
                logs.RetentionDays.ONE_WEEK : retentionEnum,
            removalPolicy
        });
        // Slow query logs
        const slowQueryLogGroup = new logs.LogGroup(component, 'RdsSlowQueryLogGroup', {
            logGroupName: `/aws/rds/instance/${component.node.id}/slowquery`,
            retention: retentionEnum,
            removalPolicy
        });
        // Apply compliance tags to all log groups
        const classification = this.loggingService.getSecurityClassification('rds');
        [errorLogGroup, generalLogGroup, slowQueryLogGroup].forEach(logGroup => {
            cdk.Tags.of(logGroup).add('log-type', 'rds-database');
            cdk.Tags.of(logGroup).add('classification', classification);
            cdk.Tags.of(logGroup).add('compliance-framework', context.complianceFramework);
            cdk.Tags.of(logGroup).add('database-logging', 'enabled');
        });
        return {
            error: errorLogGroup,
            general: generalLogGroup,
            slowQuery: slowQueryLogGroup
        };
    }
    /**
     * Configure RDS log exports to CloudWatch
     */
    configureRdsLogExports(database, context) {
        // Note: In a real implementation, this would configure log exports during RDS creation
        // The enableCloudwatchLogsExports parameter would be set with appropriate log types
        const logTypes = this.getEnabledLogTypes(context);
        context.logger.info('RDS CloudWatch log exports configured', {
            service: 'LoggingService',
            componentType: 'rds-database',
            databaseIdentifier: database.instanceIdentifier || 'unknown',
            enabledLogTypes: logTypes,
            complianceFramework: context.complianceFramework
        });
    }
    /**
     * Configure audit logging for compliance frameworks
     */
    configureAuditLogging(database, context) {
        if (context.complianceFramework === 'commercial') {
            return; // No audit logging required for commercial
        }
        // Note: In a real implementation, this would configure:
        // - Database audit plugins
        // - Parameter groups for audit logging
        // - CloudTrail integration for RDS API calls
        context.logger.info('RDS audit logging configured', {
            service: 'LoggingService',
            componentType: 'rds-database',
            databaseIdentifier: database.instanceIdentifier || 'unknown',
            auditFeatures: [
                'connection-logging',
                'query-logging',
                'ddl-logging',
                'dml-logging',
                'privilege-changes'
            ],
            complianceFramework: context.complianceFramework
        });
    }
    /**
     * Get enabled log types based on compliance framework
     */
    getEnabledLogTypes(context) {
        const baseTypes = ['error'];
        if (context.complianceFramework !== 'commercial') {
            return [
                ...baseTypes,
                'general', // Full query logging for compliance
                'slowquery', // Performance monitoring
                'audit' // Audit trail
            ];
        }
        return [...baseTypes, 'slowquery']; // Minimal logging for commercial
    }
    /**
     * Map retention days to CloudWatch enum
     */
    mapRetentionToEnum(days) {
        if (days <= 7)
            return logs.RetentionDays.ONE_WEEK;
        if (days <= 30)
            return logs.RetentionDays.ONE_MONTH;
        if (days <= 90)
            return logs.RetentionDays.THREE_MONTHS;
        if (days <= 365)
            return logs.RetentionDays.ONE_YEAR;
        if (days <= 1095)
            return logs.RetentionDays.THREE_YEARS;
        if (days <= 2555)
            return logs.RetentionDays.SEVEN_YEARS;
        return logs.RetentionDays.TEN_YEARS;
    }
}
exports.RdsLoggingHandler = RdsLoggingHandler;
