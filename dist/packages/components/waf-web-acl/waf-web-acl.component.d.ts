/**
 * WAF Web ACL Component implementing Platform Component API Contract v1.1
 *
 * AWS WAF Web Application Firewall with comprehensive security rules and compliance hardening.
 * Provides protection against common web exploits, OWASP Top 10, and compliance-specific threats.
 */
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../../../src/platform/contracts/component-interfaces';
/**
 * WAF Web ACL Component
 *
 * Extends BaseComponent and implements the Platform Component API Contract.
 */
export declare class WafWebAclComponent extends BaseComponent {
    /** Final resolved configuration */
    private config;
    /** Main WAF Web ACL construct */
    private webAcl;
    /** CloudWatch Log Group for WAF logs */
    private logGroup?;
    /** WAF logging configuration */
    private loggingConfiguration?;
    /**
     * Constructor
     */
    constructor(scope: Construct, spec: ComponentSpec, context: ComponentContext);
    /**
     * Component type identifier
     */
    getType(): string;
    /**
     * Main synthesis method following Platform Component API Contract
     */
    synth(): void;
    /**
     * Creates CloudWatch log group if logging is enabled
     */
    private createLogGroup;
    /**
     * Creates the main WAF Web ACL with rules
     */
    private createWebAcl;
    /**
     * Creates WAF logging configuration
     */
    private createLoggingConfiguration;
    /**
     * Creates CloudWatch monitoring alarms
     */
    private createMonitoringAlarms;
    /**
     * Applies standard tags to all resources
     */
    private applyResourceTags;
    /**
     * Registers construct handles for patches.ts access
     */
    private registerConstructs;
    /**
     * Registers capabilities for component binding
     */
    private registerCapabilities;
    /**
     * Returns the machine-readable capabilities of the component
     */
    getCapabilities(): ComponentCapabilities;
    /**
     * Builds a custom rule statement based on configuration
     */
    private buildCustomRuleStatement;
    /**
     * Gets log retention days based on compliance framework
     */
    private getLogRetentionDays;
    /**
     * Gets removal policy based on compliance framework
     */
    private getRemovalPolicy;
}
