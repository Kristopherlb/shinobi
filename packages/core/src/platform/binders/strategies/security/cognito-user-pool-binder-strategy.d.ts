import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
interface CognitoClientSummary {
    clientId: string;
    clientName?: string;
}
interface CognitoUserPoolCapability {
    userPoolId?: string;
    userPoolArn?: string;
    userPoolProviderName?: string;
    userPoolProviderUrl?: string;
    domainBaseUrl?: string;
    clients?: CognitoClientSummary[];
}
export declare class CognitoUserPoolBinderStrategy implements IBinderStrategy {
    readonly supportedCapabilities: string[];
    bind(sourceComponent: any, targetComponent: CognitoUserPoolCapability, binding: ComponentBinding, _context: BindingContext): Promise<void>;
    private ensureAccessArray;
    private validateAccess;
    private bindToUserPool;
    private bindToIdentityProvider;
    private selectClient;
    private applyAccessPolicies;
    private applyCustomEnvOverrides;
    private addEnvironment;
}
export {};
//# sourceMappingURL=cognito-user-pool-binder-strategy.d.ts.map