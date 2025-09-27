export interface FeatureFlagContext {
  [key: string]: unknown;
}

export interface FeatureFlagEvaluation {
  [key: string]: unknown;
}

export interface IFeatureFlagService {
  evaluateFlags(context: FeatureFlagContext): FeatureFlagEvaluation;
}

export class FeatureFlagService implements IFeatureFlagService {
  evaluateFlags(_context: FeatureFlagContext): FeatureFlagEvaluation {
    return {};
  }
}

export const defaultFeatureFlagService = new FeatureFlagService();
