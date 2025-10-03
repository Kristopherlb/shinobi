import { ComponentContext, ComponentSpec } from '../../contracts/component-interfaces.ts';
import { ObservabilityConfig, ObservabilityOptions } from '../../contracts/component.ts';
import { GovernanceMetadata } from '../governance/index.ts';
export interface ObservabilityBuildInput {
    context: ComponentContext;
    spec: ComponentSpec;
    policy?: Record<string, any>;
    options?: ObservabilityOptions;
    governance: GovernanceMetadata;
}
export interface IObservabilityService {
    buildConfig(input: ObservabilityBuildInput): ObservabilityConfig;
    buildEnvironmentVariables(config: ObservabilityConfig, governance: GovernanceMetadata): Record<string, string>;
}
export declare class ObservabilityService implements IObservabilityService {
    buildConfig(input: ObservabilityBuildInput): ObservabilityConfig;
    buildEnvironmentVariables(config: ObservabilityConfig, governance: GovernanceMetadata): Record<string, string>;
    private getTracesSampler;
    private buildDefaultCollectorEndpoint;
    private coalesce;
    private coerceNumber;
    private coerceBoolean;
}
export declare const defaultObservabilityService: ObservabilityService;
//# sourceMappingURL=observability.service.d.ts.map