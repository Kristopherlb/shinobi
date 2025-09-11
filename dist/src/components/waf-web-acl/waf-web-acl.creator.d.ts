/**
 * Creator for WafWebAclComponent Component
 *
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */
import { Construct } from 'constructs';
import { ComponentSpec, ComponentContext, IComponentCreator } from '../../../src/platform/contracts/component-interfaces';
import { WafWebAclComponent } from './waf-web-acl.component';
/**
 * Creator class for WafWebAclComponent component
 *
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export declare class WafWebAclCreator implements IComponentCreator {
    /**
     * Component type identifier
     */
    readonly componentType = "waf-web-acl";
    /**
     * Component display name
     */
    readonly displayName = "WAF Web ACL";
    /**
     * Component description
     */
    readonly description = "AWS WAF Web Application Firewall with comprehensive security rules and compliance hardening";
    /**
     * Component category for organization
     */
    readonly category = "security";
    /**
     * AWS service this component manages
     */
    readonly awsService = "WAFV2";
    /**
     * Component tags for discovery
     */
    readonly tags: string[];
    /**
     * JSON Schema for component configuration validation
     */
    readonly configSchema: {
        type: string;
        properties: {
            name: {
                type: string;
                description: string;
                pattern: string;
                maxLength: number;
            };
            description: {
                type: string;
                description: string;
                maxLength: number;
            };
            scope: {
                type: string;
                enum: string[];
                default: string;
                description: string;
            };
            defaultAction: {
                type: string;
                enum: string[];
                default: string;
                description: string;
            };
            managedRuleGroups: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                            description: string;
                        };
                        vendorName: {
                            type: string;
                            description: string;
                        };
                        priority: {
                            type: string;
                            description: string;
                        };
                        overrideAction: {
                            type: string;
                            enum: string[];
                            description: string;
                        };
                        excludedRules: {
                            type: string;
                            items: {
                                type: string;
                            };
                            description: string;
                        };
                    };
                    required: string[];
                    additionalProperties: boolean;
                };
            };
            customRules: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                            description: string;
                        };
                        priority: {
                            type: string;
                            description: string;
                        };
                        action: {
                            type: string;
                            enum: string[];
                            description: string;
                        };
                        statement: {
                            type: string;
                            description: string;
                            additionalProperties: boolean;
                        };
                    };
                    required: string[];
                    additionalProperties: boolean;
                };
            };
            logging: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        default: boolean;
                        description: string;
                    };
                    destinationArn: {
                        type: string;
                        description: string;
                    };
                    logDestinationType: {
                        type: string;
                        enum: string[];
                        default: string;
                        description: string;
                    };
                    redactedFields: {
                        type: string;
                        description: string;
                        items: {
                            type: string;
                            properties: {
                                type: {
                                    type: string;
                                    enum: string[];
                                };
                                name: {
                                    type: string;
                                };
                            };
                            required: string[];
                            additionalProperties: boolean;
                        };
                    };
                };
                additionalProperties: boolean;
            };
            monitoring: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        default: boolean;
                        description: string;
                    };
                    detailedMetrics: {
                        type: string;
                        default: boolean;
                        description: string;
                    };
                    alarms: {
                        type: string;
                        description: string;
                        properties: {
                            blockedRequestsThreshold: {
                                type: string;
                                default: number;
                                description: string;
                            };
                            allowedRequestsThreshold: {
                                type: string;
                                default: number;
                                description: string;
                            };
                            sampledRequestsEnabled: {
                                type: string;
                                default: boolean;
                                description: string;
                            };
                        };
                        additionalProperties: boolean;
                    };
                };
                additionalProperties: boolean;
            };
            tags: {
                type: string;
                description: string;
                additionalProperties: {
                    type: string;
                };
            };
        };
        additionalProperties: boolean;
    };
    /**
     * Factory method to create component instances
     */
    createComponent(scope: Construct, spec: ComponentSpec, context: ComponentContext): WafWebAclComponent;
    /**
     * Validates component specification beyond JSON Schema validation
     */
    validateSpec(spec: ComponentSpec, context: ComponentContext): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Returns the capabilities this component provides when synthesized
     */
    getProvidedCapabilities(): string[];
    /**
     * Returns the capabilities this component requires from other components
     */
    getRequiredCapabilities(): string[];
    /**
     * Returns construct handles that will be registered by this component
     */
    getConstructHandles(): string[];
}
