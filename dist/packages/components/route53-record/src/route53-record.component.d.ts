/**
 * Route 53 Record Component
 *
 * Declarative management of DNS records with reference resolution support.
 * Implements the Platform Component API Contract and provides dns:record capability.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../../src/platform/contracts/component';
import { ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';
/**
 * Route 53 Record Component
 *
 * Creates and manages DNS records with support for various record types,
 * routing policies, and reference resolution from other components.
 */
export declare class Route53RecordComponent extends BaseComponent {
    private readonly config;
    private record;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Apply platform services to the component
     */
    private _applyPlatformServices;
    /**
     * Lookup existing hosted zone - does not create new zones
     */
    private _lookupHostedZone;
    /**
     * Create the Route 53 record with all configured properties
     */
    private _createRoute53Record;
    /**
     * Create A record
     */
    private _createARecord;
    /**
     * Create AAAA record
     */
    private _createAAAARecord;
    /**
     * Create CNAME record
     */
    private _createCnameRecord;
    /**
     * Create MX record
     */
    private _createMxRecord;
    /**
     * Create TXT record
     */
    private _createTxtRecord;
    /**
     * Create NS record
     */
    private _createNsRecord;
    /**
     * Create SRV record
     */
    private _createSrvRecord;
    /**
     * Create generic record for unsupported types
     */
    private _createGenericRecord;
    /**
     * Get the Route 53 record construct for external access
     */
    getConstruct(handle: string): any;
    /**
     * Get component capabilities
     */
    getCapabilities(): Record<string, any>;
    /**
     * Get component outputs
     */
    getOutputs(): Record<string, any>;
    /**
     * Synthesize the component (required by BaseComponent)
     */
    synth(): void;
    /**
     * Configure observability for DNS health checks
     */
    private _configureObservabilityForDns;
    /**
     * Get component type (required by BaseComponent)
     */
    getType(): string;
}
