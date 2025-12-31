/**
 * Service Connect Binder Strategy
 * Governs bindings to service:connect capabilities by configuring
 * least-privilege security group rules and optional environment exports.
 */
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
export declare class ServiceConnectBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, _context: BindingContext): Promise<void>;
    private resolveSecurityGroup;
    private sanitiseIdSuffix;
}
//# sourceMappingURL=service-connect-binder-strategy.d.ts.map