import { ComponentContext, ComponentSpec } from '../../contracts/component-interfaces.ts';
export interface GovernanceMetadata {
    dataClassification: string;
    backupRequired: boolean;
    monitoringLevel: string;
    auditLoggingRequired: boolean;
    logRetentionDays: number;
}
export interface GovernanceInput {
    context: ComponentContext;
    spec: ComponentSpec;
    policy?: Record<string, any>;
    tags?: Record<string, string>;
    serviceLabels?: Record<string, string>;
    logging?: ComponentContext['logging'];
    observability?: ComponentContext['observability'];
}
export interface IGovernanceService {
    resolveGovernance(input: GovernanceInput): GovernanceMetadata;
}
export declare class GovernanceService implements IGovernanceService {
    resolveGovernance(input: GovernanceInput): GovernanceMetadata;
    private resolveString;
    private resolveBoolean;
    private resolveNumber;
}
export declare const defaultGovernanceService: GovernanceService;
//# sourceMappingURL=governance.service.d.ts.map