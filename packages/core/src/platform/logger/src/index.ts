/**
 * Platform Structured Logger
 * 
 * This is the mandatory logging library that all platform components must use.
 * It implements the Platform Structured Logging Standard v1.0 with automatic
 * correlation, formatting, and security compliance.
 */

export interface LogContext {
  action?: string;
  resource?: string;
  component?: string;
  operationId?: string;
}

export interface LogData {
  [key: string]: any;
}

export interface LogSecurity {
  classification?: 'public' | 'internal' | 'cui' | 'restricted';
  piiPresent?: boolean;
  auditRequired?: boolean;
  securityEvent?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface LogTrace {
  traceId?: string;
  spanId?: string;
  sampled?: boolean;
}

export interface LogRequest {
  id?: string;
  method?: string;
  path?: string;
  userAgent?: string;
  remoteIp?: string;
}

export interface LogUser {
  id?: string;
  sessionId?: string;
  roles?: string[];
}

export interface LogPerformance {
  duration?: number;
  memoryUsed?: number;
  cpuTime?: number;
}

export interface LogError {
  type?: string;
  code?: string;
  stack?: string;
  cause?: string;
}

export interface LogEvent {
  timestamp: string;
  level: LogLevel;
  message: string;
  logger: string;
  thread?: string;
  service: {
    name: string;
    version: string;
    instance: string;
  };
  environment: {
    name: string;
    region: string;
    compliance: string;
  };
  trace?: LogTrace;
  request?: LogRequest;
  user?: LogUser;
  context?: LogContext;
  data?: LogData;
  security?: LogSecurity;
  performance?: LogPerformance;
  error?: LogError;
}

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';

export interface LoggerOptions {
  context?: LogContext;
  data?: LogData;
  security?: LogSecurity;
  user?: LogUser;
  request?: LogRequest;
  performance?: LogPerformance;
  error?: LogError;
}

export interface Timer {
  finish(message: string, options?: LoggerOptions): void;
  elapsed(): number;
}

/**
 * Platform Logger implementation with automatic structured JSON formatting
 * and compliance-based data sanitization.
 */
export class Logger {
  private static loggers = new Map<string, Logger>();
  private static globalContext: Partial<LogEvent> = {};
  
  constructor(private name: string) {}

  /**
   * Get or create a logger instance with the specified name
   */
  static getLogger(name: string): Logger {
    if (!this.loggers.has(name)) {
      this.loggers.set(name, new Logger(name));
    }
    return this.loggers.get(name)!;
  }

  /**
   * Set global context that will be included in all log events
   */
  static setGlobalContext(context: Partial<LogEvent>): void {
    this.globalContext = { ...this.globalContext, ...context };
  }

  /**
   * Log an error event with automatic stack trace capture
   */
  error(message: string, error?: Error | any, options?: LoggerOptions): void {
    const errorInfo: LogError = {};
    
    if (error) {
      errorInfo.type = error.constructor?.name || 'Error';
      errorInfo.code = error.code || error.name;
      errorInfo.stack = this.sanitizeStackTrace(error.stack);
      errorInfo.cause = error.cause || error.message;
    }

    this.log('ERROR', message, { ...options, error: errorInfo });
  }

  /**
   * Log a warning event
   */
  warn(message: string, options?: LoggerOptions): void {
    this.log('WARN', message, options);
  }

  /**
   * Log an informational event
   */
  info(message: string, options?: LoggerOptions): void {
    this.log('INFO', message, options);
  }

  /**
   * Log a debug event (only if debug logging is enabled)
   */
  debug(message: string, options?: LoggerOptions): void {
    if (this.isDebugEnabled()) {
      this.log('DEBUG', message, options);
    }
  }

  /**
   * Log a trace event (only if trace logging is enabled)
   */
  trace(message: string, options?: LoggerOptions): void {
    if (this.isTraceEnabled()) {
      this.log('TRACE', message, options);
    }
  }

  /**
   * Start a performance timer for operation timing
   */
  startTimer(): Timer {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();
    
    return {
      finish: (message: string, options?: LoggerOptions) => {
        const duration = Date.now() - startTime;
        const memoryUsed = this.getMemoryUsage() - startMemory;
        
        this.info(message, {
          ...options,
          performance: {
            duration,
            memoryUsed,
            ...options?.performance
          }
        });
      },
      elapsed: () => Date.now() - startTime
    };
  }

  /**
   * Check if debug logging is enabled
   */
  isDebugEnabled(): boolean {
    return this.isLevelEnabled('DEBUG');
  }

  /**
   * Check if trace logging is enabled
   */
  isTraceEnabled(): boolean {
    return this.isLevelEnabled('TRACE');
  }

  /**
   * Force flush all pending log events
   */
  async flush(): Promise<void> {
    // In production, this would flush buffered logs to the collector
    // For now, this is a no-op as we're using synchronous console output
  }

  /**
   * Core logging method that creates structured JSON log events
   */
  private log(level: LogLevel, message: string, options?: LoggerOptions): void {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      message,
      logger: this.name,
      thread: 'main',
      service: {
        name: this.getServiceName(),
        version: this.getServiceVersion(),
        instance: this.getServiceInstance()
      },
      environment: {
        name: this.getEnvironmentName(),
        region: this.getRegion(),
        compliance: this.getComplianceFramework()
      },
      ...Logger.globalContext
    };

    // Add trace correlation if available
    const traceContext = this.getCurrentTraceContext();
    if (traceContext) {
      logEvent.trace = traceContext;
    }

    // Add request context if available
    if (options?.request) {
      logEvent.request = this.sanitizeRequestContext(options.request);
    }

    // Add user context if available
    if (options?.user) {
      logEvent.user = this.sanitizeUserContext(options.user);
    }

    // Add application context
    if (options?.context) {
      logEvent.context = options.context;
    }

    // Add and sanitize application data
    if (options?.data) {
      logEvent.data = this.sanitizeData(options.data);
    }

    // Add security context with automatic classification
    if (options?.security) {
      logEvent.security = {
        classification: this.determineDataClassification(logEvent) as LogSecurity['classification'],
        piiPresent: this.detectPII(logEvent),
        auditRequired: this.isAuditRequired(level),
        ...options.security
      };
    }

    // Add performance metrics
    if (options?.performance) {
      logEvent.performance = options.performance;
    }

    // Add error information  
    if (options?.error) {
      logEvent.error = options.error;
    }

    // Output structured JSON log
    this.writeLogEvent(logEvent);
  }

  /**
   * Write log event to output (console for development, collector for production)
   */
  private writeLogEvent(logEvent: LogEvent): void {
    // In production, this would send to the OpenTelemetry log collector
    // For development, output to console as structured JSON
    const jsonLog = JSON.stringify(logEvent);
    
    switch (logEvent.level) {
      case 'ERROR':
        console.error(jsonLog);
        break;
      case 'WARN':
        console.warn(jsonLog);
        break;
      default:
        console.log(jsonLog);
    }
  }

  /**
   * Sanitize sensitive data based on compliance requirements
   */
  private sanitizeData(data: LogData): LogData {
    const sanitized = { ...data };
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        // Email redaction
        if (this.isEmail(value)) {
          sanitized[key] = this.redactEmail(value);
        }
        // Phone number redaction
        else if (this.isPhoneNumber(value)) {
          sanitized[key] = this.redactPhoneNumber(value);
        }
        // SSN redaction
        else if (this.isSSN(value)) {
          sanitized[key] = this.redactSSN(value);
        }
        // Credit card redaction
        else if (this.isCreditCard(value)) {
          sanitized[key] = this.redactCreditCard(value);
        }
      }
      // Recursively sanitize nested objects
      else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      }
    }
    
    return sanitized;
  }

  /**
   * PII detection and redaction methods
   */
  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private redactEmail(email: string): string {
    const [local, domain] = email.split('@');
    const redactedLocal = local.charAt(0) + '***';
    const [domainName, tld] = domain.split('.');
    const redactedDomain = '***.' + tld;
    return `${redactedLocal}@${redactedDomain}`;
  }

  private isPhoneNumber(value: string): boolean {
    return /^\+?[\d\s\-\(\)]{10,}$/.test(value);
  }

  private redactPhoneNumber(phone: string): string {
    if (phone.startsWith('+1')) {
      return '+1-***-****';
    }
    return '***-***-****';
  }

  private isSSN(value: string): boolean {
    return /^\d{3}-?\d{2}-?\d{4}$/.test(value);
  }

  private redactSSN(ssn: string): string {
    return '***-**-****';
  }

  private isCreditCard(value: string): boolean {
    return /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/.test(value);
  }

  private redactCreditCard(card: string): string {
    return '****-****-****-' + card.slice(-4);
  }

  /**
   * Sanitize request context to remove sensitive headers
   */
  private sanitizeRequestContext(request: LogRequest): LogRequest {
    return {
      ...request,
      userAgent: request.userAgent?.substring(0, 100) + (request.userAgent && request.userAgent.length > 100 ? '...' : ''),
      remoteIp: this.shouldAnonymizeIP() ? this.anonymizeIP(request.remoteIp) : request.remoteIp
    };
  }

  /**
   * Sanitize user context to protect sensitive user information
   */
  private sanitizeUserContext(user: LogUser): LogUser {
    return {
      ...user,
      id: user.id ? 'user_' + this.hashSensitiveId(user.id) : undefined
    };
  }

  /**
   * Sanitize stack traces to remove sensitive file paths
   */
  private sanitizeStackTrace(stack?: string): string {
    if (!stack) return '';
    
    return stack
      .split('\n')
      .map(line => line.replace(/\/.*\/([^\/]+\.js)/, '/***/$1'))
      .join('\n');
  }

  /**
   * Helper methods for context retrieval
   */
  private getServiceName(): string {
    return process.env.OTEL_SERVICE_NAME || process.env.SERVICE_NAME || 'unknown-service';
  }

  private getServiceVersion(): string {
    return process.env.OTEL_SERVICE_VERSION || process.env.SERVICE_VERSION || '1.0.0';
  }

  private getServiceInstance(): string {
    return process.env.HOSTNAME || process.env.AWS_LAMBDA_FUNCTION_NAME || 'local-instance';
  }

  private getEnvironmentName(): string {
    return process.env.ENVIRONMENT || process.env.NODE_ENV || 'unknown';
  }

  private getRegion(): string {
    return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'unknown';
  }

  private getComplianceFramework(): string {
    return process.env.COMPLIANCE_FRAMEWORK || 'unknown';
  }

  private getCurrentTraceContext(): LogTrace | undefined {
    // Extract trace context from OpenTelemetry or X-Ray
    const traceId = process.env._X_AMZN_TRACE_ID || this.extractTraceFromHeaders();
    if (traceId) {
      return {
        traceId: this.extractTraceId(traceId),
        spanId: this.extractSpanId(traceId),
        sampled: true
      };
    }
    return undefined;
  }

  private extractTraceFromHeaders(): string | undefined {
    // In production, this would extract from HTTP headers or OpenTelemetry context
    return undefined;
  }

  private extractTraceId(traceHeader: string): string {
    // Parse trace ID from X-Ray or OpenTelemetry format
    const match = traceHeader.match(/Root=([^;]+)/);
    return match ? match[1] : traceHeader.substring(0, 32);
  }

  private extractSpanId(traceHeader: string): string {
    // Parse span ID from trace header
    return traceHeader.substring(32, 48) || 'unknown-span';
  }

  /**
   * Compliance and classification methods
   */
  private determineDataClassification(logEvent: LogEvent): string {
    const compliance = this.getComplianceFramework();
    
    if (compliance.includes('fedramp')) {
      return 'cui';
    }
    
    if (this.detectPII(logEvent)) {
      return 'restricted';
    }
    
    return 'internal';
  }

  private detectPII(logEvent: LogEvent): boolean {
    const dataStr = JSON.stringify(logEvent.data || {});
    return this.isEmail(dataStr) || this.isPhoneNumber(dataStr) || this.isSSN(dataStr) || this.isCreditCard(dataStr);
  }

  private isAuditRequired(level: LogLevel): boolean {
    const compliance = this.getComplianceFramework();
    
    if (compliance.includes('fedramp')) {
      return ['ERROR', 'WARN', 'INFO'].includes(level);
    }
    
    return level === 'ERROR';
  }

  private isLevelEnabled(level: LogLevel): boolean {
    const configuredLevel = process.env.PLATFORM_LOG_LEVEL || 'INFO';
    const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
    const configuredIndex = levels.indexOf(configuredLevel);
    const requestedIndex = levels.indexOf(level);
    
    return requestedIndex <= configuredIndex;
  }

  private shouldAnonymizeIP(): boolean {
    return this.getComplianceFramework().includes('fedramp');
  }

  private anonymizeIP(ip?: string): string {
    if (!ip) return 'unknown';
    const parts = ip.split('.');
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.***.**` : 'anonymized';
  }

  private hashSensitiveId(id: string): string {
    // Simple hash for demo purposes - in production use proper cryptographic hash
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }
}
