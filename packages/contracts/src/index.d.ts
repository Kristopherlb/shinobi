export interface ComponentContext {
    serviceName: string;
    service?: string;
    environment: string;
    complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
    compliance?: string;
    owner?: string;
    accountId?: string;
    account?: string;
    region?: string;
    scope: any;
    observability?: {
        collectorEndpoint?: string;
    };
    tags?: Record<string, string>;
}
export interface ComponentSpec {
    type: string;
    name: string;
    config: any;
    binds?: any[];
    triggers?: any[];
    policy?: any;
}
export interface ComponentConfig {
    [key: string]: any;
}
export interface ComponentBinding {
    from: string;
    to: string;
    capability: string;
}
export interface ComponentMetadata {
    version: string;
    description?: string;
    tags?: string[];
    compliance?: string[];
}
export interface ComponentCapabilities {
    [key: string]: any;
}
export interface BaseComponent {
    synth(): void;
}
//# sourceMappingURL=index.d.ts.map