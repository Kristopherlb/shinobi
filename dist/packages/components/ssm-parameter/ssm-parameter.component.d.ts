/**
 * SSM Parameter Component
 *
 * AWS Systems Manager Parameter Store for configuration management and application parameters.
 * Implements Platform Component API Contract v1.1 with BaseComponent extension.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
/**
 * SSM Parameter Component implementing Component API Contract v1.1
 */
export declare class SsmParameterComponent extends BaseComponent {
    private parameter?;
    private kmsKey?;
    private config?;
    private logger;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    synth(): void;
    getCapabilities(): ComponentCapabilities;
    getType(): string;
    private createKmsKeyIfNeeded;
    private createParameter;
    private translatePlatformAbstractions;
    private buildParameterCapability;
    private shouldUseCustomerManagedKey;
}
