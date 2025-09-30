/**
 * Web UI Logger Service
 * 
 * Structured logging service for the web-ui application.
 * Integrates with Shinobi platform's observability handlers.
 */

import { Logger } from '@shinobi/observability-handlers';
import { Request, Response } from 'express';

export class WebUILoggerService {
  private logger: Logger;
  private serviceName = 'web-ui';

  /**
   * Constructor with dependency injection support
   * 
   * @param logger Optional Logger instance. If not provided, creates a new one.
   * This follows the platform's constructor injection pattern with fallback defaults.
   */
  constructor(logger?: Logger) {
    this.logger = logger || new Logger('web-ui');
    this.configureLogger();
  }

  /**
   * Configure the logger with web-ui specific settings
   */
  private configureLogger(): void {
    this.logger.configure({
      serviceName: this.serviceName,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      structured: true,
      includeStackTrace: process.env.NODE_ENV === 'development'
    });
  }

  /**
   * Log HTTP request
   */
  async logRequest(req: Request, operation: string, metadata?: Record<string, any>): Promise<void> {
    this.logger.info('HTTP Request', {
      operation,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...metadata
    });
  }

  /**
   * Log HTTP response
   */
  async logResponse(req: Request, res: Response, operation: string, metadata?: Record<string, any>): Promise<void> {
    this.logger.info('HTTP Response', {
      operation,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: Date.now() - (req as any).startTime,
      ...metadata
    });
  }

  /**
   * Log service operation
   */
  logServiceOperation(operation: string, metadata?: Record<string, any>): void {
    this.logger.info('Service Operation', {
      operation,
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Log service error
   */
  logServiceError(operation: string, error: Error, metadata?: Record<string, any>): void {
    this.logger.error('Service Error', {
      operation,
      service: this.serviceName,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.logger.info('Performance Metric', {
      operation,
      service: this.serviceName,
      duration,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Log security events
   */
  logSecurityEvent(event: string, metadata?: Record<string, any>): void {
    this.logger.warn('Security Event', {
      event,
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Log audit events
   */
  logAuditEvent(event: string, metadata?: Record<string, any>): void {
    this.logger.info('Audit Event', {
      event,
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Log feature flag evaluation
   */
  logFeatureFlag(metadata: {
    flagKey: string;
    flagValue: any;
    reason: string;
    variant?: string;
    context?: Record<string, any>;
    metadata?: Record<string, any>;
  }): void {
    this.logger.info('Feature Flag Evaluation', {
      event: 'feature-flag-evaluation',
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }
}
