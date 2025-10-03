import { Logger } from '@platform/logger';
import { ComponentContext, ComponentSpec } from '../../contracts/component-interfaces.ts';
import { GovernanceMetadata } from '../governance/index.ts';

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

  private resolveClassification(classification: string): 'public' | 'internal' | 'cui' | 'restricted' | undefined {
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

  private resolveRegion(region?: string): string {
    return region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'unknown';
  }

  private resolveServiceInstance(context: ComponentContext): string {
    return process.env.HOSTNAME
      || process.env.AWS_LAMBDA_FUNCTION_NAME
      || `${context.serviceName}-instance`;
  }
}

export const defaultLoggingService = new LoggingService();
