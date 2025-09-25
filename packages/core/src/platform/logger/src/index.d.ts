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
export declare class Logger {
    private name;
    private static loggers;
    private static globalContext;
    constructor(name: string);
    /**
     * Get or create a logger instance with the specified name
     */
    static getLogger(name: string): Logger;
    /**
     * Set global context that will be included in all log events
     */
    static setGlobalContext(context: Partial<LogEvent>): void;
    /**
     * Log an error event with automatic stack trace capture
     */
    error(message: string, error?: Error | any, options?: LoggerOptions): void;
    /**
     * Log a warning event
     */
    warn(message: string, options?: LoggerOptions): void;
    /**
     * Log an informational event
     */
    info(message: string, options?: LoggerOptions): void;
    /**
     * Log a debug event (only if debug logging is enabled)
     */
    debug(message: string, options?: LoggerOptions): void;
    /**
     * Log a trace event (only if trace logging is enabled)
     */
    trace(message: string, options?: LoggerOptions): void;
    /**
     * Start a performance timer for operation timing
     */
    startTimer(): Timer;
    /**
     * Check if debug logging is enabled
     */
    isDebugEnabled(): boolean;
    /**
     * Check if trace logging is enabled
     */
    isTraceEnabled(): boolean;
    /**
     * Force flush all pending log events
     */
    flush(): Promise<void>;
    /**
     * Core logging method that creates structured JSON log events
     */
    private log;
    /**
     * Write log event to output (console for development, collector for production)
     */
    private writeLogEvent;
    /**
     * Sanitize sensitive data based on compliance requirements
     */
    private sanitizeData;
    /**
     * PII detection and redaction methods
     */
    private isEmail;
    private redactEmail;
    private isPhoneNumber;
    private redactPhoneNumber;
    private isSSN;
    private redactSSN;
    private isCreditCard;
    private redactCreditCard;
    /**
     * Sanitize request context to remove sensitive headers
     */
    private sanitizeRequestContext;
    /**
     * Sanitize user context to protect sensitive user information
     */
    private sanitizeUserContext;
    /**
     * Sanitize stack traces to remove sensitive file paths
     */
    private sanitizeStackTrace;
    /**
     * Helper methods for context retrieval
     */
    private getServiceName;
    private getServiceVersion;
    private getServiceInstance;
    private getEnvironmentName;
    private getRegion;
    private getComplianceFramework;
    private getCurrentTraceContext;
    private extractTraceFromHeaders;
    private extractTraceId;
    private extractSpanId;
    /**
     * Compliance and classification methods
     */
    private determineDataClassification;
    private detectPII;
    private isAuditRequired;
    private isLevelEnabled;
    private shouldAnonymizeIP;
    private anonymizeIP;
    private hashSensitiveId;
    private getMemoryUsage;
}
//# sourceMappingURL=index.d.ts.map