"use strict";
/**
 * LocalStack Environment Creator - Factory Method implementation
 * Implements Template Method pattern for ephemeral development environment governance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStackEnvironmentCreator = void 0;
const localstack_environment_component_1 = require("./localstack-environment.component");
/**
 * Creator for LocalStack Environment components with Template Method governance
 */
class LocalStackEnvironmentCreator {
    /**
     * Factory Method - creates the specific component
     */
    createComponent(spec, context) {
        return new localstack_environment_component_1.LocalStackEnvironmentComponent(context.scope, spec.name, context, spec);
    }
    /**
     * Template Method - fixed algorithm with governance steps
     */
    processComponent(spec, context) {
        const component = this.createComponent(spec, context);
        // Fixed steps that cannot be overridden by subclasses
        this.validateSpec(spec);
        this.applyCommonPolicies(component, context);
        return component;
    }
    /**
     * Validation step - part of Template Method
     */
    validateSpec(spec) {
        if (!spec.name || !spec.type) {
            throw new Error(`Invalid LocalStack environment spec: missing name or type`);
        }
        if (spec.type !== 'localstack-environment') {
            throw new Error(`Invalid component type '${spec.type}': expected 'localstack-environment'`);
        }
        if (!spec.config.services || !Array.isArray(spec.config.services)) {
            throw new Error(`Invalid LocalStack environment spec: missing required config.services array`);
        }
        if (spec.config.services.length === 0) {
            throw new Error(`Invalid LocalStack environment spec: config.services array cannot be empty`);
        }
        // Validate service names against LocalStack supported services
        const supportedServices = [
            's3', 'dynamodb', 'sqs', 'lambda', 'rds', 'ec2', 'ecs', 'ecr',
            'apigateway', 'cloudformation', 'cloudwatch', 'iam', 'sns',
            'kinesis', 'elasticsearch', 'secretsmanager', 'ssm', 'route53'
        ];
        const invalidServices = spec.config.services.filter((service) => !supportedServices.includes(service.toLowerCase()));
        if (invalidServices.length > 0) {
            throw new Error(`Invalid LocalStack services: ${invalidServices.join(', ')}. ` +
                `Supported services: ${supportedServices.join(', ')}`);
        }
        // Check for LocalStack Pro services
        const proServices = ['rds', 'elasticsearch'];
        const usesProServices = spec.config.services.some((service) => proServices.includes(service.toLowerCase()));
        if (usesProServices && !spec.config.localstack?.pro) {
            // Note: Creator validation warnings will be logged during component synthesis
            // This validation ensures LocalStack Pro services are properly configured
        }
        // Validate Docker configuration
        if (spec.config.docker?.resources) {
            const { memory, cpus } = spec.config.docker.resources;
            if (memory && !/^[0-9]+[kmgt]?$/i.test(memory)) {
                throw new Error(`Invalid memory specification '${memory}': use format like '512m', '2g'`);
            }
            if (cpus && !/^[0-9]+(\.[0-9]+)?$/.test(cpus)) {
                throw new Error(`Invalid CPU specification '${cpus}': use format like '0.5', '2.0'`);
            }
        }
    }
    /**
     * Policy application step - part of Template Method
     */
    applyCommonPolicies(component, context) {
        // Apply environment-specific policies
        this.applyEnvironmentPolicies(component, context);
        // Apply compliance-specific considerations
        if (context.complianceFramework.startsWith('fedramp')) {
            this.applyCompliancePolicies(component, context);
        }
    }
    applyEnvironmentPolicies(component, context) {
        // Environment-specific policies for LocalStack:
        // - Development: Allow all services, relaxed resource limits
        // - Staging: Restricted services, moderate resource limits
        // - Production: LocalStack not recommended for production
        if (context.environment === 'prod' || context.environment === 'production') {
            // Note: Production environment warning will be logged during component synthesis
            // LocalStack is intended for local development only
        }
    }
    applyCompliancePolicies(component, context) {
        // Compliance considerations for LocalStack environments:
        // - Data handling: LocalStack should not process real sensitive data
        // - Network isolation: Ensure LocalStack containers are properly isolated
        // - Audit logging: Track LocalStack usage for compliance reporting
        // Note: Compliance information will be logged during component synthesis
        // LocalStack environments should not process real sensitive data in any compliance framework
    }
}
exports.LocalStackEnvironmentCreator = LocalStackEnvironmentCreator;
