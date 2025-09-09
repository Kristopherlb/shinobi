import { Logger } from './utils/logger';
import { FileDiscovery } from './utils/file-discovery';
export interface DeployOptions {
    file?: string;
    env?: string;
    target?: string;
}
export interface DeployResult {
    success: boolean;
    exitCode: number;
    data?: {
        resolvedManifest: any;
        warnings: string[];
        synthesisResult?: any;
        deploymentOutputs?: any;
    };
    error?: string;
}
interface DeployDependencies {
    fileDiscovery: FileDiscovery;
    logger: Logger;
}
export declare class DeployCommand {
    private dependencies;
    constructor(dependencies: DeployDependencies);
    execute(options: DeployOptions): Promise<DeployResult>;
    private deployInfrastructure;
    private generateCdkApp;
    private generateConstructCode;
    private generatePackageJson;
    private toPascalCase;
}
export {};
