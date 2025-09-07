"use strict";
/**
 * RDS Postgres Creator - Factory Method implementation
 * Implements Template Method pattern for enterprise governance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RdsPostgresCreator = void 0;
const rds_postgres_component_1 = require("./rds-postgres.component");
/**
 * Creator for RDS Postgres components with Template Method governance
 */
class RdsPostgresCreator {
    /**
     * Factory Method - creates the specific component
     */
    createComponent(spec, context) {
        return new rds_postgres_component_1.RdsPostgresComponent(spec, context);
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
            throw new Error(`Invalid RDS Postgres spec: missing name or type`);
        }
        if (!spec.config.dbName) {
            throw new Error(`Invalid RDS Postgres spec: missing required config.dbName`);
        }
        // Validate database name format
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(spec.config.dbName)) {
            throw new Error(`Invalid database name '${spec.config.dbName}': must start with letter and contain only alphanumeric characters and underscores`);
        }
        // FedRAMP-specific validations
        if (spec.policy?.complianceFramework?.startsWith('fedramp')) {
            if (!spec.config.encrypted) {
                throw new Error('FedRAMP compliance requires database encryption to be enabled');
            }
            if (spec.config.backupRetention && spec.config.backupRetention < 30) {
                throw new Error('FedRAMP compliance requires minimum 30 days backup retention');
            }
        }
    }
    /**
     * Policy application step - part of Template Method
     */
    applyCommonPolicies(component, context) {
        // Apply mandatory tagging
        this.applyMandatoryTags(component, context);
        // Apply compliance-specific policies
        if (context.complianceFramework.startsWith('fedramp')) {
            this.applyFedRAMPPolicies(component, context);
        }
        // Apply environment-specific policies
        this.applyEnvironmentPolicies(component, context);
    }
    applyMandatoryTags(component, context) {
        // Mandatory tags are applied at the CDK construct level during synthesis
        // This ensures every RDS instance gets consistent tagging
    }
    applyFedRAMPPolicies(component, context) {
        // FedRAMP-specific policies like:
        // - Mandatory encryption
        // - Enhanced monitoring
        // - Backup retention requirements
        // - Network isolation requirements
    }
    applyEnvironmentPolicies(component, context) {
        // Environment-specific policies like:
        // - Production deletion protection
        // - Development cost optimization
        // - Staging performance configuration
    }
}
exports.RdsPostgresCreator = RdsPostgresCreator;
//# sourceMappingURL=rds-postgres.creator.js.map