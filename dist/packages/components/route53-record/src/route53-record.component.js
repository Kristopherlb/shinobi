"use strict";
/**
 * Route 53 Record Component
 *
 * Declarative management of DNS records with reference resolution support.
 * Implements the Platform Component API Contract and provides dns:record capability.
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
exports.Route53RecordComponent = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const component_1 = require("../../../../src/platform/contracts/component");
const route53_record_builder_1 = require("./route53-record.builder");
// Platform services will be injected by the platform
// import { Logger } from '../../../../src/platform/services/logger';
// import { ObservabilityService } from '../../../../src/platform/services/observability.service';
// import { TaggingService } from '../../../../src/platform/services/tagging.service';
/**
 * Route 53 Record Component
 *
 * Creates and manages DNS records with support for various record types,
 * routing policies, and reference resolution from other components.
 */
class Route53RecordComponent extends component_1.BaseComponent {
    config;
    record;
    constructor(scope, id, context, spec) {
        super(scope, id, context, spec);
        // Build configuration only - no synthesis in constructor
        const configBuilder = new route53_record_builder_1.Route53RecordConfigBuilder({ context, spec });
        this.config = configBuilder.buildSync();
        // Initialize record as undefined - will be created in synth()
        this.record = undefined;
    }
    /**
     * Apply platform services to the component
     */
    _applyPlatformServices() {
        // Platform services will be applied by the platform's service injector
        // This method is a placeholder for future platform service integration
    }
    /**
     * Lookup existing hosted zone - does not create new zones
     */
    _lookupHostedZone() {
        const zoneName = this.config.record.zoneName;
        try {
            const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
                domainName: zoneName
            });
            return hostedZone;
        }
        catch (error) {
            throw new Error(`Hosted zone '${zoneName}' does not exist. ` +
                `Please create the hosted zone first using a dedicated route53-hosted-zone component ` +
                `before creating DNS records in it.`);
        }
    }
    /**
     * Create the Route 53 record with all configured properties
     */
    _createRoute53Record(hostedZone) {
        const { record } = this.config;
        // Target is already resolved by ResolverEngine - no custom resolution needed
        const target = record.target;
        // Create record based on type
        let dnsRecord;
        switch (record.recordType) {
            case 'A':
                dnsRecord = this._createARecord(hostedZone, target);
                break;
            case 'AAAA':
                dnsRecord = this._createAAAARecord(hostedZone, target);
                break;
            case 'CNAME':
                dnsRecord = this._createCnameRecord(hostedZone, target);
                break;
            case 'MX':
                dnsRecord = this._createMxRecord(hostedZone, target);
                break;
            case 'TXT':
                dnsRecord = this._createTxtRecord(hostedZone, target);
                break;
            case 'NS':
                dnsRecord = this._createNsRecord(hostedZone, target);
                break;
            case 'SRV':
                dnsRecord = this._createSrvRecord(hostedZone, target);
                break;
            default:
                dnsRecord = this._createGenericRecord(hostedZone, target);
                break;
        }
        return dnsRecord;
    }
    /**
     * Create A record
     */
    _createARecord(hostedZone, target) {
        const targets = Array.isArray(target) ? target : [target];
        return new route53.ARecord(this, 'ARecord', {
            zone: hostedZone,
            recordName: this.config.record.recordName,
            target: route53.RecordTarget.fromValues(...targets),
            ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
            comment: this.config.record.comment
        });
    }
    /**
     * Create AAAA record
     */
    _createAAAARecord(hostedZone, target) {
        const targets = Array.isArray(target) ? target : [target];
        return new route53.AaaaRecord(this, 'AAAARecord', {
            zone: hostedZone,
            recordName: this.config.record.recordName,
            target: route53.RecordTarget.fromValues(...targets),
            ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
            comment: this.config.record.comment
        });
    }
    /**
     * Create CNAME record
     */
    _createCnameRecord(hostedZone, target) {
        const targetValue = Array.isArray(target) ? target[0] : target;
        return new route53.CnameRecord(this, 'CnameRecord', {
            zone: hostedZone,
            recordName: this.config.record.recordName,
            domainName: targetValue,
            ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
            comment: this.config.record.comment
        });
    }
    /**
     * Create MX record
     */
    _createMxRecord(hostedZone, target) {
        const targets = Array.isArray(target) ? target : [target];
        const mxValues = targets.map(t => {
            const [priority, exchange] = t.split(' ');
            return { priority: parseInt(priority), hostName: exchange };
        });
        return new route53.MxRecord(this, 'MxRecord', {
            zone: hostedZone,
            recordName: this.config.record.recordName,
            values: mxValues,
            ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
            comment: this.config.record.comment
        });
    }
    /**
     * Create TXT record
     */
    _createTxtRecord(hostedZone, target) {
        const targets = Array.isArray(target) ? target : [target];
        return new route53.TxtRecord(this, 'TxtRecord', {
            zone: hostedZone,
            recordName: this.config.record.recordName,
            values: targets,
            ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
            comment: this.config.record.comment
        });
    }
    /**
     * Create NS record
     */
    _createNsRecord(hostedZone, target) {
        const targets = Array.isArray(target) ? target : [target];
        return new route53.NsRecord(this, 'NsRecord', {
            zone: hostedZone,
            recordName: this.config.record.recordName,
            values: targets,
            ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
            comment: this.config.record.comment
        });
    }
    /**
     * Create SRV record
     */
    _createSrvRecord(hostedZone, target) {
        const targets = Array.isArray(target) ? target : [target];
        const srvValues = targets.map(t => {
            const [priority, weight, port, target] = t.split(' ');
            return {
                priority: parseInt(priority),
                weight: parseInt(weight),
                port: parseInt(port),
                hostName: target
            };
        });
        return new route53.SrvRecord(this, 'SrvRecord', {
            zone: hostedZone,
            recordName: this.config.record.recordName,
            values: srvValues,
            ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
            comment: this.config.record.comment
        });
    }
    /**
     * Create generic record for unsupported types
     */
    _createGenericRecord(hostedZone, target) {
        const targets = Array.isArray(target) ? target : [target];
        return new route53.RecordSet(this, 'GenericRecord', {
            zone: hostedZone,
            recordName: this.config.record.recordName,
            recordType: route53.RecordType[this.config.record.recordType],
            target: route53.RecordTarget.fromValues(...targets),
            ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
            comment: this.config.record.comment
        });
    }
    /**
     * Get the Route 53 record construct for external access
     */
    getConstruct(handle) {
        switch (handle) {
            case 'main':
            case 'record':
                return this.record;
            default:
                throw new Error(`Unknown construct handle: ${handle}`);
        }
    }
    /**
     * Get component capabilities
     */
    getCapabilities() {
        return {
            'dns:record': {
                recordName: this.config.record.recordName,
                recordType: this.config.record.recordType,
                zoneName: this.config.record.zoneName,
                target: this.config.record.target,
                ttl: this.config.record.ttl || 300
            }
        };
    }
    /**
     * Get component outputs
     */
    getOutputs() {
        return {
            recordName: this.config.record.recordName,
            recordType: this.config.record.recordType,
            zoneName: this.config.record.zoneName,
            target: this.config.record.target,
            ttl: this.config.record.ttl || 300
        };
    }
    /**
     * Synthesize the component (required by BaseComponent)
     */
    synth() {
        try {
            // Step 1: Lookup hosted zone (does not create)
            const hostedZone = this._lookupHostedZone();
            // Step 2: Create the Route 53 record
            this.record = this._createRoute53Record(hostedZone);
            // Step 3: Apply platform services
            this._applyPlatformServices();
            // Step 4: Register constructs for patches.ts access
            this.registerConstruct('main', this.record);
            this.registerConstruct('record', this.record);
            // Step 5: Register capabilities for component binding
            this.registerCapability('dns:record', {
                recordName: this.config.record.recordName,
                recordType: this.config.record.recordType,
                zoneName: this.config.record.zoneName,
                target: this.config.record.target
            });
            // Step 6: Configure observability for health checks
            this._configureObservabilityForDns();
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Configure observability for DNS health checks
     */
    _configureObservabilityForDns() {
        // Only create health check alarms if evaluateTargetHealth is enabled
        if (this.config.record.evaluateTargetHealth) {
            // Create CloudWatch alarm for health check status
            // Note: This would be implemented with actual CloudWatch alarm creation
            // For now, this is a placeholder for future observability integration
        }
    }
    /**
     * Get component type (required by BaseComponent)
     */
    getType() {
        return 'route53-record';
    }
}
exports.Route53RecordComponent = Route53RecordComponent;
