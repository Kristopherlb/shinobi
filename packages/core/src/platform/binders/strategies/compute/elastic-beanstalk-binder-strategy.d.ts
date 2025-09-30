/**
 * Elastic Beanstalk Binder Strategy
 * Handles application deployment platform bindings for AWS Elastic Beanstalk
 */
import { IBinderStrategy } from '../binder-strategy';
import { BindingContext } from '../../binding-context';
import { ComponentBinding } from '../../component-binding';
export declare class ElasticBeanstalkBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: any, binding: ComponentBinding, context: BindingContext): Promise<void>;
    private bindToApplication;
    private bindToEnvironment;
    private bindToVersion;
    private configureSecureEnvironment;
}
//# sourceMappingURL=elastic-beanstalk-binder-strategy.d.ts.map