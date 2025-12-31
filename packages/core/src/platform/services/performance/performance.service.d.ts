export interface PerformanceInsight {
    [key: string]: unknown;
}
export interface PerformanceContext {
    [key: string]: unknown;
}
export interface IPerformanceOptimizationService {
    analyze(context: PerformanceContext): PerformanceInsight;
}
export declare class PerformanceOptimizationService implements IPerformanceOptimizationService {
    analyze(_context: PerformanceContext): PerformanceInsight;
}
export declare const defaultPerformanceOptimizationService: PerformanceOptimizationService;
//# sourceMappingURL=performance.service.d.ts.map