/**
 * Creator for SqsQueueNew Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 *
 * @author Platform Team
 * @category messaging
 * @service SQS
 */
import { Construct } from 'constructs';
import { ComponentSpec, ComponentContext, IComponentCreator } from '../../platform/contracts/component-interfaces';
import { SqsQueueNewComponent } from './sqs-queue-new.component';
/**
 * Creator class for SqsQueueNew component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export declare class SqsQueueNewCreator implements IComponentCreator {
    /**
     * Component type identifier
     */
    readonly componentType = "sqs-queue-new";
    /**
     * Component display name
     */
    readonly displayName = "Sqs Queue New";
    /**
     * Component description
     */
    readonly description = "SQS message queue with compliance hardening and DLQ support";
    /**
     * Component category for organization
     */
    readonly category = "messaging";
    /**
     * AWS service this component manages
     */
    readonly awsService = "SQS";
    /**
     * Component tags for discovery
     */
    readonly tags: string[];
    /**
     * JSON Schema for component configuration validation
     */
    readonly configSchema: any;
    /**
     * Factory method to create component instances
     */
    createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): SqsQueueNewComponent;
    /**
     * Validates component specification beyond JSON Schema validation
     */
    validateSpec(spec: ComponentSpec, context: ComponentContext): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Returns the capabilities this component provides when synthesized
     */
    getProvidedCapabilities(): string[];
    /**
     * Returns the capabilities this component requires from other components
     */
    getRequiredCapabilities(): string[];
    /**
     * Returns construct handles that will be registered by this component
     */
    getConstructHandles(): string[];
}
