import inquirer from 'inquirer';
import { Logger } from '../utils/logger';
import { FileDiscovery } from '../utils/file-discovery';
import { TemplateEngine } from '../templates/template-engine';
export interface InitOptions {
    name?: string;
    owner?: string;
    framework?: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
    pattern?: string;
    force?: boolean;
}
export interface InitResult {
    success: boolean;
    exitCode: number;
    error?: string;
}
interface InitDependencies {
    templateEngine: TemplateEngine;
    fileDiscovery: FileDiscovery;
    logger: Logger;
    prompter: typeof inquirer;
}
export declare class InitCommand {
    private dependencies;
    private options?;
    constructor(dependencies: InitDependencies, options?: InitOptions | undefined);
    execute(options: InitOptions): Promise<InitResult>;
    /**
     * Perform pre-flight checks before initialization
     */
    private performPreflightChecks;
    /**
     * Check if current directory is empty or get user confirmation
     */
    private checkCurrentDirectory;
    /**
     * Check for required system dependencies
     */
    private checkSystemDependencies;
    /**
     * Dynamically discover available templates
     */
    private discoverTemplates;
    private gatherInputs;
}
export {};
