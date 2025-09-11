"use strict";
/**
 * Route 53 Record Component Creator Factory
 *
 * Factory class for creating Route53RecordComponent instances.
 * Implements the Platform Component Creator pattern.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route53RecordCreator = void 0;
const route53_record_component_1 = require("./route53-record.component");
/**
 * Factory for creating Route53RecordComponent instances
 */
class Route53RecordCreator {
    /**
     * Create a new Route53RecordComponent instance
     */
    createComponent(spec, context) {
        return new route53_record_component_1.Route53RecordComponent(context.scope, spec.name, context, spec);
    }
    /**
     * Process component (alias for createComponent)
     */
    processComponent(spec, context) {
        return this.createComponent(spec, context);
    }
    /**
     * Get the component type this creator handles
     */
    getComponentType() {
        return 'route53-record';
    }
    /**
     * Validate that the component spec is compatible with this creator
     */
    validateSpec(spec) {
        return spec.type === 'route53-record' &&
            spec.config &&
            typeof spec.config === 'object' &&
            spec.config.record &&
            typeof spec.config.record === 'object' &&
            spec.config.record.recordName &&
            typeof spec.config.record.recordName === 'string' &&
            spec.config.record.recordType &&
            typeof spec.config.record.recordType === 'string' &&
            spec.config.record.zoneName &&
            typeof spec.config.record.zoneName === 'string' &&
            spec.config.record.target &&
            (typeof spec.config.record.target === 'string' || Array.isArray(spec.config.record.target));
    }
}
exports.Route53RecordCreator = Route53RecordCreator;
