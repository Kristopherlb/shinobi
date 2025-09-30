export interface ComplianceInput {
  [key: string]: unknown;
}

export interface ComplianceEvaluation {
  [key: string]: unknown;
}

export interface IComplianceService {
  evaluate(input: ComplianceInput): ComplianceEvaluation;
}

export class ComplianceService implements IComplianceService {
  evaluate(_input: ComplianceInput): ComplianceEvaluation {
    return {};
  }
}

export const defaultComplianceService = new ComplianceService();
