/**
 * IAM Role Component
 *
 * Declarative management of custom IAM roles with inline policies and managed policies.
 * Implements the Platform Component API Contract and provides iam:assumeRole capability.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../../src/platform/contracts/component';
import { ComponentContext, ComponentSpec } from '../../../../src/platform/contracts/component-interfaces';
/**
 * IAM Role Component
 *
 * Creates and manages custom IAM roles with configurable inline policies,
 * managed policies, and compliance-aware defaults.
 */
export declare class IamRoleComponent extends BaseComponent {
    private readonly config;
    private role;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Create the IAM role with all configured policies and settings
     */
    private createIamRole;
    /**
     * Create the principal that can assume this role
     */
    private createPrincipal;
    /**
     * Create inline policies from configuration
     */
    private createInlinePolicies;
    /**
     * Apply compliance settings to the role
     */
    private applyComplianceSettings;
    /**
     * Configure observability for IAM role
     */
    private _configureObservabilityForIamRole;
    /**
     * Get the IAM role construct for external access
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
