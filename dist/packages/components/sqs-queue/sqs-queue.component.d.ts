/**
 * SqsQueueNew Component implementing Platform Component API Contract v1.1
 *
 * SQS message queue with compliance hardening and DLQ support
 *
 * @author Platform Team
 * @category messaging
 * @service SQS
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../platform/contracts/component-interfaces';
/**
 * SqsQueueNew Component
 *
 * Extends BaseComponent and implements the Platform Component API Contract.
 * Provides SQS message queue with compliance hardening and DLQ support functionality with:
 * - Production-ready defaults
 * - Compliance framework support (Commercial, FedRAMP)
 * - Integrated monitoring and observability
 * - Security-first configuration
 */
export declare class SqsQueueNewComponent extends BaseComponent {
    /** Final resolved configuration */
    private config;
    /** Main construct */
    private mainConstruct;
    /**
     * Constructor
     */
    constructor(scope: Construct, spec: ComponentSpec, context: ComponentContext);
    /**
     * Component type identifier
     */
    getType(): string;
    /**
     * Main synthesis method
     *
     * Follows the exact sequence defined in the Platform Component API Contract:
     * 1. Build configuration using ConfigBuilder
     * 2. Call BaseComponent helper methods
     * 3. Instantiate CDK constructs
     * 4. Apply standard tags
     * 5. Register constructs
     * 6. Register capabilities
     */
    synth(): void;
    /**
     * Creates the main construct and all related resources
     * TODO: Implement actual CDK construct creation
     */
    private createMainConstruct;
    /**
     * Applies compliance-specific hardening based on the framework
     */
    private applyComplianceHardening;
    /**
     * Applies standard tags to all resources
     */
    private applyStandardTags;
    /**
     * Registers construct handles for patches.ts access
     */
    private registerConstructs;
    /**
     * Registers capabilities for component binding
     */
    private registerCapabilities;
    /**
     * Returns the machine-readable capabilities of the component
     */
    getCapabilities(): ComponentCapabilities;
}
