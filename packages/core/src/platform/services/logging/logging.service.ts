import { ComponentContext, ComponentSpec } from '../../contracts/component-interfaces';
import { GovernanceMetadata } from '../governance';

export interface LoggingContext {
  component: ComponentSpec;
  context: ComponentContext;
  governance: GovernanceMetadata;
}

export interface ILoggingService {
  getLogger(context: LoggingContext, loggerName?: string): any;
}

export class LoggingService implements ILoggingService {
  getLogger(loggingContext: LoggingContext, loggerName?: string): any {
    const { Logger } = require('@platform/logger');
    const { component, context, governance } = loggingContext;

    const name = loggerName || `${context.serviceName}.${component.name}`;
    const logger = Logger.getLogger(name);

    Logger.setGlobalContext({
      service: {
        name: context.serviceName,
        version: context.serviceLabels?.version || '1.0.0',
        instance: this.resolveServiceInstance(context)
      },
      environment: {
        name: context.environment,
        region: context.region,
        compliance: context.complianceFramework
      },
      context: {
        component: component.type,
        resource: component.name
      },
      security: {
        classification: governance.dataClassification,
        auditRequired: governance.auditLoggingRequired
      }
    });

    return logger;
  }

  private resolveServiceInstance(context: ComponentContext): string {
    return process.env.HOSTNAME
      || process.env.AWS_LAMBDA_FUNCTION_NAME
      || `${context.serviceName}-instance`;
  }
}

export const defaultLoggingService = new LoggingService();
