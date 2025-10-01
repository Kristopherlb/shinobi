/**
 * Component API Contract Specification v1.0
 *
 * This file defines the core Component abstract class and interfaces that
 * all components in the platform must implement. This contract ensures that
 * every component is a predictable, secure, and composable building block.
 */
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { defaultTaggingService } from '../services/tagging-service/tagging.service.js';
import { defaultObservabilityService } from '../services/observability/index.js';
import { defaultLoggingService } from '../services/logging/index.js';
import { defaultGovernanceService } from '../services/governance/index.js';
import { defaultComplianceService } from '../services/compliance/index.js';
import { defaultSecurityService } from '../services/security/index.js';
import { defaultSecurityOperationsService } from '../services/security-operations/index.js';
import { defaultCostManagementService } from '../services/cost-management/index.js';
import { defaultBackupRecoveryService } from '../services/backup-recovery/index.js';
import { defaultPerformanceOptimizationService } from '../services/performance/index.js';
import { defaultFeatureFlagService } from '../services/feature-flags/index.js';
/**
 * Abstract base class that all platform components MUST extend - The Implementation Helper
 *
 * This rich class implements IComponent and provides shared functionality for:
 * - Predictable: Standard lifecycle methods (synth, getCapabilities)
 * - Secure: Standard tagging, logging, and observability integration
 * - Composable: Standard binding interface through capabilities
 *
 * Implements Interface Segregation Principle by providing concrete implementations
 * of common component functionality while maintaining the lean IComponent contract.
 */
export class BaseComponent extends Construct {
    /** The component's specification from the service manifest. */
    spec;
    /** The context of the service this component belongs to. */
    context;
    /** A map of handles to the real, synthesized CDK constructs. */
    constructs = new Map();
    /** A map of the capabilities this component provides after synthesis. */
    capabilities = {};
    /** Services injected for cross-cutting platform concerns */
    taggingService;
    observabilityService;
    loggingService;
    governanceService;
    complianceService;
    securityService;
    costManagementService;
    backupRecoveryService;
    performanceOptimizationService;
    featureFlagService;
    securityOperationsService;
    governanceMetadataCache;
    /**
     * Constructor for all platform components.
     *
     * @param scope The CDK scope (typically the service stack)
     * @param id Unique identifier for this component instance
     * @param context Service-wide context including environment, compliance framework
     * @param spec Component specification from the service.yml manifest
     */
    constructor(scope, id, context, spec, services = {}) {
        super(scope, id);
        this.context = context;
        this.spec = spec;
        this.taggingService = services.taggingService ?? defaultTaggingService;
        this.observabilityService = services.observabilityService ?? defaultObservabilityService;
        this.loggingService = services.loggingService ?? defaultLoggingService;
        this.governanceService = services.governanceService ?? defaultGovernanceService;
        this.complianceService = services.complianceService ?? defaultComplianceService;
        this.securityService = services.securityService ?? defaultSecurityService;
        this.costManagementService = services.costManagementService ?? defaultCostManagementService;
        this.backupRecoveryService = services.backupRecoveryService ?? defaultBackupRecoveryService;
        this.performanceOptimizationService = services.performanceOptimizationService ?? defaultPerformanceOptimizationService;
        this.featureFlagService = services.featureFlagService ?? defaultFeatureFlagService;
        this.securityOperationsService = services.securityOperationsService ?? defaultSecurityOperationsService;
    }
    /**
     * Returns the component name.
     */
    getName() {
        return this.spec.name;
    }
    /**
     * Returns the component ID.
     */
    getId() {
        return this.node.id;
    }
    /**
     * Returns the service name this component belongs to.
     */
    getServiceName() {
        return this.context.serviceName;
    }
    /**
     * Convert a numeric retention value (in days) to the matching CloudWatch Logs enum.
     * Defaults to TEN_YEARS when the value exceeds the known thresholds.
     */
    mapLogRetentionDays(days) {
        if (days <= 1)
            return logs.RetentionDays.ONE_DAY;
        if (days <= 3)
            return logs.RetentionDays.THREE_DAYS;
        if (days <= 5)
            return logs.RetentionDays.FIVE_DAYS;
        if (days <= 7)
            return logs.RetentionDays.ONE_WEEK;
        if (days <= 14)
            return logs.RetentionDays.TWO_WEEKS;
        if (days <= 30)
            return logs.RetentionDays.ONE_MONTH;
        if (days <= 60)
            return logs.RetentionDays.TWO_MONTHS;
        if (days <= 90)
            return logs.RetentionDays.THREE_MONTHS;
        if (days <= 120)
            return logs.RetentionDays.FOUR_MONTHS;
        if (days <= 150)
            return logs.RetentionDays.FIVE_MONTHS;
        if (days <= 180)
            return logs.RetentionDays.SIX_MONTHS;
        if (days <= 365)
            return logs.RetentionDays.ONE_YEAR;
        if (days <= 400)
            return logs.RetentionDays.THIRTEEN_MONTHS;
        if (days <= 545)
            return logs.RetentionDays.EIGHTEEN_MONTHS;
        if (days <= 731)
            return logs.RetentionDays.TWO_YEARS;
        if (days <= 1827)
            return logs.RetentionDays.FIVE_YEARS;
        return logs.RetentionDays.TEN_YEARS;
    }
    /**
     * Returns the capability data for this component.
     */
    getCapabilityData() {
        return this.getCapabilities();
    }
    /**
     * Retrieves a handle to a synthesized CDK construct.
     *
     * This method provides controlled access to the underlying CDK constructs
     * for advanced use cases like patches or binding strategies that need
     * direct construct access.
     *
     * @param handle The key for the construct (e.g., 'main', 'database', 'securityGroup')
     * @returns The CDK construct or undefined if handle doesn't exist
     */
    getConstruct(handle) {
        return this.constructs.get(handle);
    }
    /**
     * Returns all construct handles available from this component.
     *
     * Useful for debugging, testing, and advanced binding scenarios.
     *
     * @returns Array of available construct handle names
     */
    getConstructHandles() {
        return Array.from(this.constructs.keys());
    }
    /**
     * Validates that the component has been properly synthesized.
     *
     * This method checks that:
     * - synth() has been called
     * - constructs map is populated
     * - capabilities map is populated
     *
     * @throws Error if component is not properly synthesized
     */
    validateSynthesized() {
        if (this.constructs.size === 0) {
            throw new Error(`Component ${this.node.id} has not been synthesized. Call synth() before accessing constructs.`);
        }
        if (Object.keys(this.capabilities).length === 0) {
            throw new Error(`Component ${this.node.id} provides no capabilities. Components must expose at least one capability.`);
        }
    }
    /**
     * Registers a CDK construct with a handle for later retrieval.
     *
     * This method should be called during synth() to register all
     * important constructs that may need to be accessed by binding
     * strategies or patches.
     *
     * @param handle Unique identifier for this construct
     * @param construct The CDK construct instance
     */
    registerConstruct(handle, construct) {
        if (this.constructs.has(handle)) {
            throw new Error(`Construct handle '${handle}' is already registered in component ${this.node.id}`);
        }
        this.constructs.set(handle, construct);
    }
    /**
     * Registers a capability that this component provides.
     *
     * This method should be called during synth() to register all
     * capabilities that other components can bind to.
     *
     * @param capabilityKey The capability key from Standard Capability Vocabulary
     * @param capabilityData The data shape for this capability
     */
    registerCapability(capabilityKey, capabilityData) {
        this.capabilities[capabilityKey] = capabilityData;
    }
    /**
     * Applies standard tags to any CDK construct that supports tagging.
     *
     * This method should be called for every taggable resource created by the component
     * to ensure compliance with the Platform Tagging Standard.
     *
     * @param resource The CDK construct to tag (must support Tags.of())
     * @param additionalTags Optional component-specific tags to add
     */
    applyStandardTags(resource, additionalTags) {
        const taggingContext = {
            serviceName: this.context.serviceName,
            serviceLabels: this.context.serviceLabels,
            componentName: this.spec.name,
            componentType: this.getType(),
            environment: this.context.environment,
            region: this.context.region,
            accountId: this.context.accountId,
            complianceFramework: this.context.complianceFramework,
            tags: this.context.tags,
            governance: this.governanceMetadata
        };
        this.taggingService.applyStandardTags(resource, taggingContext, additionalTags);
    }
    /**
     * Apply standardized OpenTelemetry observability configuration to any compute resource.
     *
     * This method implements the Platform OpenTelemetry Observability Standard v1.0 by automatically
     * configuring telemetry collection (traces, metrics, logs) based on compliance framework requirements.
     *
     * @param resource The AWS CDK construct to configure observability for
     * @param options Optional observability configuration overrides
     * @returns Environment variables for OpenTelemetry instrumentation
     */
    configureObservability(resource, options = {}) {
        const config = this.observabilityService.buildConfig({
            context: this.context,
            spec: this.spec,
            policy: this.spec.policy,
            options,
            governance: this.governanceMetadata
        });
        return this.observabilityService.buildEnvironmentVariables(config, this.governanceMetadata);
    }
    get governanceMetadata() {
        if (!this.governanceMetadataCache) {
            this.governanceMetadataCache = this.governanceService.resolveGovernance({
                context: this.context,
                spec: this.spec,
                policy: this.spec.policy,
                tags: this.context.tags,
                serviceLabels: this.context.serviceLabels,
                logging: this.context.logging,
                observability: this.context.observability
            });
        }
        return this.governanceMetadataCache;
    }
    /**
     * Get platform logger instance configured for this component.
     *
     * This method implements the Platform Structured Logging Standard v1.0 by providing
     * a pre-configured logger with automatic service context and trace correlation.
     *
     * @param loggerName Optional specific logger name, defaults to component name
     * @returns Platform logger instance with automatic context injection
     */
    getLogger(loggerName) {
        return this.loggingService.getLogger({
            component: this.spec,
            context: this.context,
            governance: this.governanceMetadata
        }, loggerName);
    }
    logComponentEvent(event, message, data) {
        const logger = this.getLogger();
        logger.info(message, {
            context: {
                action: 'component_lifecycle',
                resource: this.spec.name,
                component: this.getType(),
                operationId: `${event}_${this.spec.name}`
            },
            data: {
                event,
                componentName: this.spec.name,
                componentType: this.getType(),
                ...data
            },
            security: {
                classification: this.governanceMetadata.dataClassification,
                auditRequired: this.governanceMetadata.auditLoggingRequired
            }
        });
    }
    /**
     * Log compliance-related events with automatic security classification.
     */
    logComplianceEvent(event, message, data) {
        const logger = this.getLogger();
        logger.info(message, {
            context: {
                action: 'compliance_event',
                resource: this.spec.name,
                component: this.getType(),
                operationId: `compliance_${event}_${this.spec.name}`
            },
            data: {
                complianceFramework: this.context.complianceFramework,
                event,
                ...data
            },
            security: {
                classification: this.governanceMetadata.dataClassification,
                auditRequired: true,
                securityEvent: 'compliance_action'
            }
        });
    }
    /**
     * Log resource creation events with resource-specific context.
     */
    logResourceCreation(resourceType, resourceId, properties) {
        const logger = this.getLogger();
        logger.info(`${resourceType} created successfully`, {
            context: {
                action: 'resource_creation',
                resource: resourceType,
                component: this.getType(),
                operationId: `create_${resourceType}_${resourceId}`
            },
            data: {
                resourceType,
                resourceId,
                componentName: this.spec.name,
                properties: this.sanitizeResourceProperties(properties)
            },
            security: {
                classification: this.governanceMetadata.dataClassification,
                auditRequired: this.governanceMetadata.auditLoggingRequired
            }
        });
    }
    /**
     * Log error events with automatic error context and stack traces.
     */
    logError(error, context, additionalData) {
        const logger = this.getLogger();
        logger.error(`Error in ${context}`, error, {
            context: {
                action: 'error_event',
                resource: this.spec.name,
                component: this.getType(),
                operationId: `error_${this.spec.name}_${Date.now()}`
            },
            data: {
                errorContext: context,
                componentName: this.spec.name,
                componentType: this.getType(),
                ...additionalData
            },
            security: {
                classification: this.governanceMetadata.dataClassification,
                auditRequired: true,
                securityEvent: 'system_error'
            }
        });
    }
    /**
     * Log performance metrics for component operations.
     */
    logPerformanceMetric(operation, duration, additionalMetrics) {
        const logger = this.getLogger();
        logger.info(`Performance metric: ${operation}`, {
            context: {
                action: 'performance_measurement',
                resource: this.spec.name,
                component: this.getType(),
                operationId: `perf_${operation}_${this.spec.name}`
            },
            data: {
                operation,
                componentName: this.spec.name
            },
            performance: {
                duration,
                ...additionalMetrics
            },
            security: {
                classification: this.governanceMetadata.dataClassification,
                auditRequired: this.governanceMetadata.auditLoggingRequired
            }
        });
    }
    /**
     * Sanitize resource properties to remove sensitive information from logs.
     */
    sanitizeResourceProperties(properties) {
        if (properties === undefined || properties === null) {
            return {};
        }
        const securityPreferences = this.context.security ?? {};
        const patternInputs = securityPreferences.sensitivePatterns ?? [];
        const sensitivePatterns = patternInputs.map(pattern => {
            try {
                return new RegExp(pattern, 'i');
            }
            catch {
                return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            }
        });
        return this.securityService.sanitizeProperties(properties, {
            sensitiveKeys: securityPreferences.sensitiveKeys,
            sensitivePatterns,
            maskValue: securityPreferences.maskValue,
            maxDepth: securityPreferences.maxDepth
        });
    }
    /**
     * Get security group handle from this component for binding operations.
     * This is a standardized helper method for all binder strategies.
     *
     * @param role - Whether this component is the 'source' or 'target' in the binding
     * @returns The security group construct or throws error if not found
     */
    _getSecurityGroupHandle(role) {
        try {
            return this.securityService.getSecurityGroupHandle(this, role);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to resolve security group for ${role} component '${this.node.id}': ${message}`);
        }
    }
}
// Backwards compatibility export - maintains existing import patterns
export const Component = BaseComponent;
//# sourceMappingURL=component.js.map