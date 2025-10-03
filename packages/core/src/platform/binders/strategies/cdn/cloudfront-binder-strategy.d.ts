/**
 * CloudFront Binder Strategy
 * Handles content delivery network bindings for Amazon CloudFront
 */
import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';
export declare class CloudFrontBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToDistribution;
    private bindToOrigin;
    private bindToCachePolicy;
    private configureSecureDistributionAccess;
}
//# sourceMappingURL=cloudfront-binder-strategy.d.ts.map