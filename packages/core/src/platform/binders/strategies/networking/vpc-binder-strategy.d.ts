/**
 * VPC Binder Strategy
 * Handles Virtual Private Cloud bindings for Amazon VPC
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
export declare class VpcBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToNetwork;
    private bindToSubnet;
    private bindToSecurityGroup;
    private bindToRouteTable;
    private bindToNatGateway;
    private configureSecureNetworkAccess;
}
//# sourceMappingURL=vpc-binder-strategy.d.ts.map