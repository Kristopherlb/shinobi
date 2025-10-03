/**
 * Comprehensive Binder Registry
 * Registry for all AWS service binder strategies
 */
import { IBinderStrategy } from '../strategies/binder-strategy.ts';
export declare class ComprehensiveBinderRegistry {
    private strategies;
    constructor();
    private registerAllStrategies;
    register(serviceType: string, strategy: IBinderStrategy): void;
    get(serviceType: string): IBinderStrategy | undefined;
    getSupportedCapabilities(serviceType: string): string[];
    getAllServiceTypes(): string[];
    getServicesByCategory(): Record<string, string[]>;
    validateBinding(serviceType: string, capability: string): boolean;
    getBindingRecommendations(serviceType: string): string[];
}
//# sourceMappingURL=comprehensive-binder-registry.d.ts.map