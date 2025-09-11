import { Logger } from '../utils/logger';
import { ValidationOrchestrator } from '../services/validation-orchestrator';
import { FileDiscovery } from '../utils/file-discovery';
export interface ValidateOptions {
    file?: string;
}
export interface ValidateResult {
    success: boolean;
    exitCode: number;
    data?: {
        manifest: any;
        warnings: string[];
    };
    error?: string;
}
interface ValidateDependencies {
    pipeline: ValidationOrchestrator;
    fileDiscovery: FileDiscovery;
    logger: Logger;
}
export declare class ValidateCommand {
    private dependencies;
    constructor(dependencies: ValidateDependencies);
    execute(options: ValidateOptions): Promise<ValidateResult>;
}
export {};
