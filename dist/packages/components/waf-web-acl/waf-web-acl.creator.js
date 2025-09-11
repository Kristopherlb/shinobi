"use strict";
/**
 * Creator for WafWebAclComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WafWebAclCreator = void 0;
const waf_web_acl_component_1 = require("./waf-web-acl.component");
const waf_web_acl_builder_1 = require("./waf-web-acl.builder");
/**
 * Creator class for WafWebAclComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class WafWebAclCreator {
    /**
     * Component type identifier
     */
    componentType = 'waf-web-acl';
    /**
     * Component display name
     */
    displayName = 'WAF Web ACL';
    /**
     * Component description
     */
    description = 'AWS WAF Web Application Firewall with comprehensive security rules and compliance hardening';
    /**
     * Component category for organization
     */
    category = 'security';
    /**
     * AWS service this component manages
     */
    awsService = 'WAFV2';
    /**
     * Component tags for discovery
     */
    tags = [
        'waf-web-acl',
        'security',
        'aws',
        'wafv2',
        'web-application-firewall'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = waf_web_acl_builder_1.WAF_WEB_ACL_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new waf_web_acl_component_1.WafWebAclComponent(scope, spec, context);
    }
    /**
     * Validates component specification beyond JSON Schema validation
     */
    validateSpec(spec, context) {
        const errors = [];
        const config = spec.config;
        // Validate component name
        if (!spec.name || spec.name.length === 0) {
            errors.push('Component name is required');
        }
        else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
            errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
        }
        // WAF-specific validations
        if (config?.scope && !['REGIONAL', 'CLOUDFRONT'].includes(config.scope)) {
            errors.push('WAF scope must be either REGIONAL or CLOUDFRONT');
        }
        if (config?.defaultAction && !['allow', 'block'].includes(config.defaultAction)) {
            errors.push('WAF default action must be either allow or block');
        }
        // Validate managed rule groups
        if (config?.managedRuleGroups) {
            const priorities = config.managedRuleGroups.map(group => group.priority);
            const uniquePriorities = new Set(priorities);
            if (priorities.length !== uniquePriorities.size) {
                errors.push('WAF managed rule groups must have unique priorities');
            }
        }
        // Environment-specific validations
        if (context.environment === 'prod') {
            if (!config?.monitoring?.enabled) {
                errors.push('Monitoring must be enabled in production environment');
            }
            if (!config?.logging?.enabled) {
                errors.push('WAF logging must be enabled in production environment');
            }
            // Ensure basic security rules are present for production
            if (!config?.managedRuleGroups || config.managedRuleGroups.length === 0) {
                errors.push('At least one managed rule group must be configured in production');
            }
        }
        // Compliance framework validations
        if (context.complianceFramework === 'fedramp-moderate' || context.complianceFramework === 'fedramp-high') {
            if (!config?.logging?.enabled) {
                errors.push('WAF logging is mandatory for FedRAMP compliance');
            }
            if (config?.defaultAction === 'allow') {
                errors.push('FedRAMP compliance requires more restrictive default action (recommend block)');
            }
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Returns the capabilities this component provides when synthesized
     */
    getProvidedCapabilities() {
        return [
            'security:waf-web-acl',
            'monitoring:waf-web-acl',
            'waf:web-acl',
            'protection:web-application'
        ];
    }
    /**
     * Returns the capabilities this component requires from other components
     */
    getRequiredCapabilities() {
        return [
        // TODO: Define required capabilities
        ];
    }
    /**
     * Returns construct handles that will be registered by this component
     */
    getConstructHandles() {
        return [
            'main',
            'webAcl',
            'logGroup',
            'logDestination'
        ];
    }
}
exports.WafWebAclCreator = WafWebAclCreator;
