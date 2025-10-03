/**
 * ECS Fargate Binder Strategy
 * Handles container orchestration bindings for ECS Fargate services
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
export declare class EcsFargateBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToCluster;
    private bindToService;
    private bindToTaskDefinition;
    private configureSecureNetworkAccess;
}
//# sourceMappingURL=ecs-fargate-binder-strategy.d.ts.map