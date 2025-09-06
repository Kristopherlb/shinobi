export interface ValidateOptions {
    file?: string;
}
export declare class ValidateCommand {
    private pipeline;
    constructor();
    execute(options: ValidateOptions): Promise<void>;
}
