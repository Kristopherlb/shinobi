export interface ComplianceInput {
    [key: string]: unknown;
}
export interface ComplianceEvaluation {
    [key: string]: unknown;
}
export interface IComplianceService {
    evaluate(input: ComplianceInput): ComplianceEvaluation;
}
export declare class ComplianceService implements IComplianceService {
    evaluate(_input: ComplianceInput): ComplianceEvaluation;
}
export declare const defaultComplianceService: ComplianceService;
//# sourceMappingURL=compliance.service.d.ts.map