/**
 * Step Functions State Machine Component
 *
 * AWS Step Functions State Machine for serverless workflow orchestration.
 * Implements Platform Component API Contract v1.1 with BaseComponent pattern.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
/**
 * Step Functions State Machine Component implementing Component API Contract v1.1
 *
 * Extends BaseComponent and follows the 6-step synthesis pattern.
 */
export declare class StepFunctionsStateMachineComponent extends BaseComponent {
    private stateMachine?;
    private config?;
    private logger;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    synth(): void;
    getCapabilities(): ComponentCapabilities;
    getType(): string;
    private createStateMachine;
    private buildDefinition;
    private mapStateMachineType;
    private buildStateMachineName;
    private createExecutionRoleIfNeeded;
}
