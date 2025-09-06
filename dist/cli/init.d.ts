export interface InitOptions {
    name?: string;
    owner?: string;
    framework?: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
    pattern?: 'empty' | 'lambda-api-with-db' | 'worker-with-queue';
}
export declare class InitCommand {
    private templateEngine;
    constructor();
    execute(options: InitOptions): Promise<void>;
    private gatherInputs;
}
