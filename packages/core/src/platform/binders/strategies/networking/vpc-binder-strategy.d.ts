/**
 * VPC Binder Strategy
 * Handles Virtual Private Cloud bindings for Amazon VPC
 */
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
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