/**
 * Security Group Import Component
 *
 * Declarative import of existing security groups via SSM parameters.
 * Implements the Platform Component API Contract and provides security-group:import capability.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../../src/platform/contracts/component';
import { ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';
/**
 * Security Group Import Component
 *
 * Imports existing security groups by looking up their IDs from SSM parameters.
 * This is a "read-only" component that does not create new resources.
 */
export declare class SecurityGroupImportComponent extends BaseComponent {
    private readonly config;
    private readonly securityGroup;
    private readonly ssmParameter;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Import the SSM parameter containing the security group ID
     */
    private importSsmParameter;
    /**
     * Import the security group using the ID from the SSM parameter
     */
    private importSecurityGroup;
    /**
     * Add validation for the imported security group
     */
    private addValidation;
    /**
     * Create a Lambda function for security group validation
     */
    private createValidationLambda;
    /**
     * Get the security group construct for external access
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
     * Get component type (required by BaseComponent)
     */
    getType(): string;
}
