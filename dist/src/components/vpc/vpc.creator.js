"use strict";
/**
 * Creator for VPC Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VpcCreator = void 0;
const vpc_component_1 = require("./vpc.component");
const vpc_builder_1 = require("./vpc.builder");
/**
 * Creator class for VPC component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
class VpcCreator {
    /**
     * Component type identifier
     */
    componentType = 'vpc';
    /**
     * Component display name
     */
    displayName = 'VPC';
    /**
     * Component description
     */
    description = 'AWS Virtual Private Cloud (VPC) component for network isolation with compliance-aware configurations.';
    /**
     * Component category for organization
     */
    category = 'networking';
    /**
     * AWS service this component manages
     */
    awsService = 'EC2';
    /**
     * Component tags for discovery
     */
    tags = [
        'vpc',
        'networking',
        'aws',
        'ec2',
        'virtual-private-cloud',
        'subnets',
        'nat-gateways',
        'flow-logs'
    ];
    /**
     * JSON Schema for component configuration validation
     */
    configSchema = vpc_builder_1.VPC_CONFIG_SCHEMA;
    /**
     * Factory method to create component instances
     */
    createComponent(scope, spec, context) {
        return new vpc_component_1.VpcComponent(scope, spec.name, context, spec);
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
        // VPC-specific validations
        if (config?.cidr && !this.isValidCidr(config.cidr)) {
            errors.push('Invalid CIDR block format');
        }
        if (config?.maxAzs && (config.maxAzs < 2 || config.maxAzs > 6)) {
            errors.push('maxAzs must be between 2 and 6');
        }
        if (config?.natGateways && config.natGateways < 0) {
            errors.push('natGateways cannot be negative');
        }
        if (config?.flowLogRetentionDays && !this.isValidLogRetention(config.flowLogRetentionDays)) {
            errors.push('Invalid flow log retention period');
        }
        // Environment-specific validations
        if (context.environment === 'prod') {
            if (!config?.monitoring?.enabled) {
                errors.push('Monitoring must be enabled in production environment');
            }
            // TODO: Add production-specific validations
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
            'net:vpc',
            'networking:vpc',
            'security:network-isolation'
        ];
    }
    /**
     * Returns the capabilities this component requires from other components
     */
    getRequiredCapabilities() {
        return [
        // VPC component has no required capabilities - it provides fundamental networking
        ];
    }
    /**
     * Returns construct handles that will be registered by this component
     */
    getConstructHandles() {
        return [
            'main',
            'vpc',
            'flowLogGroup',
            'flowLogRole'
        ];
    }
    /**
     * Validates CIDR block format
     */
    isValidCidr(cidr) {
        const cidrRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}\/[0-9]{1,2}$/;
        if (!cidrRegex.test(cidr))
            return false;
        const [ip, prefix] = cidr.split('/');
        const prefixNum = parseInt(prefix, 10);
        // Validate prefix length
        if (prefixNum < 16 || prefixNum > 28)
            return false;
        // Validate IP octets
        const octets = ip.split('.').map(Number);
        return octets.every(octet => octet >= 0 && octet <= 255);
    }
    /**
     * Validates log retention days
     */
    isValidLogRetention(days) {
        const validRetentionDays = [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653];
        return validRetentionDays.includes(days);
    }
}
exports.VpcCreator = VpcCreator;
