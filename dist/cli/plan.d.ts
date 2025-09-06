export interface PlanOptions {
    file?: string;
    env?: string;
}
export declare class PlanCommand {
    private pipeline;
    constructor();
    execute(options: PlanOptions): Promise<void>;
}
