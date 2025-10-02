export interface CostInsight {
    [key: string]: unknown;
}
export interface CostManagementInput {
    [key: string]: unknown;
}
export interface ICostManagementService {
    evaluateCost(input: CostManagementInput): CostInsight;
}
export declare class CostManagementService implements ICostManagementService {
    evaluateCost(_input: CostManagementInput): CostInsight;
}
export declare const defaultCostManagementService: CostManagementService;
//# sourceMappingURL=cost-management.service.d.ts.map