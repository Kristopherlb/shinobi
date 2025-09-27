export interface PerformanceInsight {
  [key: string]: unknown;
}

export interface PerformanceContext {
  [key: string]: unknown;
}

export interface IPerformanceOptimizationService {
  analyze(context: PerformanceContext): PerformanceInsight;
}

export class PerformanceOptimizationService implements IPerformanceOptimizationService {
  analyze(_context: PerformanceContext): PerformanceInsight {
    return {};
  }
}

export const defaultPerformanceOptimizationService = new PerformanceOptimizationService();
