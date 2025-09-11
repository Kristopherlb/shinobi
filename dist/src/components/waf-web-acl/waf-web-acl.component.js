"use strict";
/**
 * WAF Web ACL Component implementing Platform Component API Contract v1.1
 *
 * AWS WAF Web Application Firewall with comprehensive security rules and compliance hardening.
 * Provides protection against common web exploits, OWASP Top 10, and compliance-specific threats.
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
exports.WafWebAclComponent = void 0;
const component_1 = require("../../../src/platform/contracts/component");
const waf_web_acl_builder_1 = require("./waf-web-acl.builder");
// AWS CDK imports
const wafv2 = __importStar(require("aws-cdk-lib/aws-wafv2"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cdk = __importStar(require("aws-cdk-lib"));
/**
 * WAF Web ACL Component
 *
 * Extends BaseComponent and implements the Platform Component API Contract.
 */
class WafWebAclComponent extends component_1.BaseComponent {
    /** Final resolved configuration */
    config;
    /** Main WAF Web ACL construct */
    webAcl;
    /** CloudWatch Log Group for WAF logs */
    logGroup;
    /** WAF logging configuration */
    loggingConfiguration;
    /**
     * Constructor
     */
    constructor(scope, spec, context) {
        super(scope, spec.name, context, spec);
    }
    /**
     * Component type identifier
     */
    getType() {
        return 'waf-web-acl';
    }
    /**
     * Main synthesis method following Platform Component API Contract
     */
    synth() {
        // Step 1: Build configuration using ConfigBuilder
        const configBuilder = new waf_web_acl_builder_1.WafWebAclConfigBuilder(this.context, this.spec);
        this.config = configBuilder.buildSync();
        // Step 2: Get logger from BaseComponent
        const logger = this.getLogger();
        logger.info('Starting WAF Web ACL synthesis', {
            context: {
                componentName: this.spec.name,
                componentType: this.getType(),
                scope: this.config.scope,
                defaultAction: this.config.defaultAction
            }
        });
        // Step 3: Create AWS resources
        this.createLogGroup();
        this.createWebAcl();
        this.createLoggingConfiguration();
        this.createMonitoringAlarms();
        // Step 4: Apply standard tags
        this.applyResourceTags();
        // Step 5: Register constructs
        this.registerConstructs();
        // Step 6: Register capabilities
        this.registerCapabilities();
        logger.info('WAF Web ACL synthesis completed', {
            context: {
                componentName: this.spec.name,
                webAclId: this.webAcl.attrId
            }
        });
    }
    /**
     * Creates CloudWatch log group if logging is enabled
     */
    createLogGroup() {
        if (!this.config.logging?.enabled)
            return;
        this.logGroup = new logs.LogGroup(this, 'WafLogGroup', {
            logGroupName: `/aws/wafv2/${this.spec.name}`,
            retention: this.getLogRetentionDays(),
            removalPolicy: this.getRemovalPolicy()
        });
    }
    /**
     * Creates the main WAF Web ACL with rules
     */
    createWebAcl() {
        const rules = [];
        // Add managed rule groups
        if (this.config.managedRuleGroups) {
            this.config.managedRuleGroups.forEach(group => {
                rules.push({
                    name: group.name,
                    priority: group.priority,
                    overrideAction: {
                        [group.overrideAction || 'none']: {}
                    },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: group.vendorName,
                            name: group.name,
                            excludedRules: group.excludedRules?.map(ruleName => ({ name: ruleName }))
                        }
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: this.config.monitoring?.alarms?.sampledRequestsEnabled ?? true,
                        cloudWatchMetricsEnabled: this.config.monitoring?.enabled ?? true,
                        metricName: `${group.name}Metric`
                    }
                });
            });
        }
        // Add custom rules
        if (this.config.customRules) {
            this.config.customRules.forEach(rule => {
                rules.push({
                    name: rule.name,
                    priority: rule.priority,
                    action: {
                        [rule.action]: {}
                    },
                    statement: this.buildCustomRuleStatement(rule.statement),
                    visibilityConfig: {
                        sampledRequestsEnabled: this.config.monitoring?.alarms?.sampledRequestsEnabled ?? true,
                        cloudWatchMetricsEnabled: this.config.monitoring?.enabled ?? true,
                        metricName: `${rule.name}Metric`
                    }
                });
            });
        }
        // Create the Web ACL
        this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
            name: this.config.name || this.spec.name,
            description: this.config.description || `WAF Web ACL for ${this.spec.name}`,
            scope: this.config.scope || 'REGIONAL',
            defaultAction: {
                [this.config.defaultAction || 'allow']: {}
            },
            rules: rules,
            visibilityConfig: {
                sampledRequestsEnabled: this.config.monitoring?.alarms?.sampledRequestsEnabled ?? true,
                cloudWatchMetricsEnabled: this.config.monitoring?.enabled ?? true,
                metricName: `${this.spec.name}WebAcl`
            }
        });
    }
    /**
     * Creates WAF logging configuration
     */
    createLoggingConfiguration() {
        if (!this.config.logging?.enabled || !this.webAcl || !this.logGroup)
            return;
        this.loggingConfiguration = new wafv2.CfnLoggingConfiguration(this, 'LoggingConfig', {
            resourceArn: this.webAcl.attrArn,
            logDestinationConfigs: [this.logGroup.logGroupArn],
            redactedFields: this.config.logging.redactedFields?.map(field => ({
                [field.type.replace('-', '')]: field.name ? { name: field.name } : {}
            }))
        });
    }
    /**
     * Creates CloudWatch monitoring alarms
     */
    createMonitoringAlarms() {
        if (!this.config.monitoring?.enabled || !this.webAcl)
            return;
        const alarmConfig = this.config.monitoring.alarms;
        if (!alarmConfig)
            return;
        // Blocked requests alarm
        if (alarmConfig.blockedRequestsThreshold) {
            new cloudwatch.Alarm(this, 'BlockedRequestsAlarm', {
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/WAFV2',
                    metricName: 'BlockedRequests',
                    dimensionsMap: {
                        WebACL: this.webAcl.name || this.spec.name,
                        Region: this.context.region || 'us-east-1'
                    }
                }),
                threshold: alarmConfig.blockedRequestsThreshold,
                evaluationPeriods: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                alarmDescription: `High number of blocked requests in WAF ${this.spec.name}`
            });
        }
    }
    /**
     * Applies standard tags to all resources
     */
    applyResourceTags() {
        const additionalTags = {
            'component-type': this.getType(),
            'waf-scope': this.config.scope || 'REGIONAL',
            'default-action': this.config.defaultAction || 'allow'
        };
        this.applyStandardTags(this.webAcl, additionalTags);
        if (this.logGroup) {
            this.applyStandardTags(this.logGroup, { 'log-type': 'waf-logs' });
        }
    }
    /**
     * Registers construct handles for patches.ts access
     */
    registerConstructs() {
        this.registerConstruct('main', this.webAcl);
        this.registerConstruct('webAcl', this.webAcl);
        if (this.logGroup) {
            this.registerConstruct('logGroup', this.logGroup);
        }
        if (this.loggingConfiguration) {
            this.registerConstruct('loggingConfiguration', this.loggingConfiguration);
        }
    }
    /**
     * Registers capabilities for component binding
     */
    registerCapabilities() {
        const capabilities = {};
        // Main WAF capability
        capabilities['security:waf-web-acl'] = {
            webAclId: this.webAcl.attrId,
            webAclArn: this.webAcl.attrArn,
            webAclName: this.webAcl.name,
            scope: this.config.scope
        };
        // Monitoring capability
        capabilities['monitoring:waf-web-acl'] = {
            metricsNamespace: 'AWS/WAFV2',
            webAclName: this.webAcl.name
        };
        // WAF-specific capability
        capabilities['waf:web-acl'] = {
            id: this.webAcl.attrId,
            arn: this.webAcl.attrArn,
            name: this.webAcl.name,
            scope: this.config.scope,
            defaultAction: this.config.defaultAction
        };
        // Protection capability
        capabilities['protection:web-application'] = {
            type: 'waf-web-acl',
            scope: this.config.scope,
            rulesCount: (this.config.managedRuleGroups?.length || 0) + (this.config.customRules?.length || 0),
            loggingEnabled: this.config.logging?.enabled || false
        };
        // Register all capabilities
        Object.entries(capabilities).forEach(([key, data]) => {
            this.registerCapability(key, data);
        });
    }
    /**
     * Returns the machine-readable capabilities of the component
     */
    getCapabilities() {
        return this.capabilities || {};
    }
    // Helper methods
    /**
     * Builds a custom rule statement based on configuration
     */
    buildCustomRuleStatement(statement) {
        switch (statement.type) {
            case 'geo-match':
                return {
                    geoMatchStatement: {
                        countryCodes: statement.countries || []
                    }
                };
            case 'rate-based':
                return {
                    rateBasedStatement: {
                        limit: statement.rateLimit || 2000,
                        aggregateKeyType: 'IP'
                    }
                };
            case 'ip-set':
                // For IP sets, we'd need to create an IP set resource first
                // This is a simplified implementation
                return {
                    ipSetReferenceStatement: {
                        arn: 'arn:aws:wafv2:region:account:regional/ipset/name/id' // Would be actual IP set ARN
                    }
                };
            default:
                throw new Error(`Unsupported custom rule statement type: ${statement.type}`);
        }
    }
    /**
     * Gets log retention days based on compliance framework
     */
    getLogRetentionDays() {
        switch (this.context.complianceFramework) {
            case 'fedramp-high':
                return 2555; // 7 years
            case 'fedramp-moderate':
                return 1095; // 3 years
            default:
                return 365; // 1 year
        }
    }
    /**
     * Gets removal policy based on compliance framework
     */
    getRemovalPolicy() {
        return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY;
    }
}
exports.WafWebAclComponent = WafWebAclComponent;
