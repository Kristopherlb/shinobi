import { ComponentContext, ComponentSpec } from '../../contracts/component-interfaces.js';
import { GovernanceMetadata } from '../governance/index.js';
export interface LoggingContext {
    component: ComponentSpec;
    context: ComponentContext;
    governance: GovernanceMetadata;
}
export interface ILoggingService {
    getLogger(context: LoggingContext, loggerName?: string): any;
}
export declare class LoggingService implements ILoggingService {
    getLogger(loggingContext: LoggingContext, loggerName?: string): any;
    private resolveClassification;
    private resolveRegion;
    private resolveServiceInstance;
}
export declare const defaultLoggingService: LoggingService;
//# sourceMappingURL=logging.service.d.ts.map