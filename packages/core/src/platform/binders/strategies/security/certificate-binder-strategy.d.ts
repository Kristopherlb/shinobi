/**
 * Certificate Binder Strategy
 * Handles ACM certificate bindings for AWS Certificate Manager
 */
import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
export declare class CertificateBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToCertificate;
    private bindToValidation;
    private bindToMonitoring;
    private configureSecureCertificateUsage;
    private configureValidationSettings;
    private configureMonitoringSettings;
}
//# sourceMappingURL=certificate-binder-strategy.d.ts.map