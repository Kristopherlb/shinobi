export interface CostInsight {
  [key: string]: unknown;
}

export interface CostManagementInput {
  [key: string]: unknown;
}

export interface ICostManagementService {
  evaluateCost(input: CostManagementInput): CostInsight;
}

export class CostManagementService implements ICostManagementService {
  evaluateCost(_input: CostManagementInput): CostInsight {
    return {};
  }
}

export const defaultCostManagementService = new CostManagementService();
