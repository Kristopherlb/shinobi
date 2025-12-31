import { Logger } from '@platform/logger';
export class LoggingService {
    getLogger(loggingContext, loggerName) {
        const { component, context, governance } = loggingContext;
        const name = loggerName || `${context.serviceName}.${component.name}`;
        const logger = Logger.getLogger(name);
        Logger.setGlobalContext({
            service: {
                name: context.serviceName,
                version: context.serviceLabels?.version ?? '1.0.0',
                instance: this.resolveServiceInstance(context)
            },
            environment: {
                name: context.environment,
                region: this.resolveRegion(context.region),
                compliance: context.complianceFramework
            },
            context: {
                component: component.type,
                resource: component.name
            },
            security: {
                classification: this.resolveClassification(governance.dataClassification),
                auditRequired: governance.auditLoggingRequired
            }
        });
        return logger;
    }
    resolveClassification(classification) {
        const normalized = classification?.toLowerCase();
        switch (normalized) {
            case 'public':
            case 'internal':
            case 'cui':
            case 'restricted':
                return normalized;
            default:
                return undefined;
        }
    }
    resolveRegion(region) {
        return region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'unknown';
    }
    resolveServiceInstance(context) {
        return process.env.HOSTNAME
            || process.env.AWS_LAMBDA_FUNCTION_NAME
            || `${context.serviceName}-instance`;
    }
}
export const defaultLoggingService = new LoggingService();
//# sourceMappingURL=logging.service.js.map