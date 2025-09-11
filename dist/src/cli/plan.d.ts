import { Logger } from '../utils/logger';
import { ValidationOrchestrator } from '../services/validation-orchestrator';
import { FileDiscovery } from '../utils/file-discovery';
export interface PlanOptions {
    file?: string;
    env?: string;
}
export interface PlanResult {
    success: boolean;
    exitCode: number;
    data?: {
        resolvedManifest: any;
        warnings: string[];
        synthesisResult?: any;
    };
    error?: string;
}
interface PlanDependencies {
    pipeline: ValidationOrchestrator;
    fileDiscovery: FileDiscovery;
    logger: Logger;
}
export declare class PlanCommand {
    private dependencies;
    constructor(dependencies: PlanDependencies);
    execute(options: PlanOptions): Promise<PlanResult>;
}
export {};
