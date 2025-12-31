/**
 * CloudFront Binder Strategy
 * Handles content delivery network bindings for Amazon CloudFront
 */
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
export declare class CloudFrontBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToDistribution;
    private bindToOrigin;
    private bindToCachePolicy;
    private configureSecureDistributionAccess;
}
//# sourceMappingURL=cloudfront-binder-strategy.d.ts.map