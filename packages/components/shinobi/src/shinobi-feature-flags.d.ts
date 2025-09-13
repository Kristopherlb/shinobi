/**
 * Shinobi Feature Flags Integration
 *
 * Defines all feature flags used by the Shinobi component for controlling
 * functionality and enabling/disabling advanced features.
 */
import { Construct } from 'constructs';
import { FeatureFlagComponent } from '../../../feature-flag/src/feature-flag.component';
import { ComponentContext } from '../../../../src/platform/contracts/component-interfaces';
/**
 * Feature flag definitions for Shinobi component
 */
export declare const SHINOBI_FEATURE_FLAGS: {
    'shinobi.advanced-analytics': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "equals";
                value: string;
            }[];
        };
    };
    'shinobi.ai-insights': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "in";
                value: string[];
            }[];
        };
    };
    'shinobi.auto-remediation': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "not_equals";
                value: string;
            }[];
        };
    };
    'shinobi.predictive-scaling': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.cost-optimization': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.security-scanning': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "in";
                value: string[];
            }[];
        };
    };
    'shinobi.compliance-monitoring': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "in";
                value: string[];
            }[];
        };
    };
    'shinobi.performance-profiling': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.dependency-analysis': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.change-impact': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.api.catalog': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.api.graph': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.api.manifest': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.api.reliability': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.api.observability': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.api.change': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.api.security': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.api.qa': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.api.cost': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.api.dx': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.api.governance': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.data.components': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.data.services': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.data.dependencies': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.data.compliance': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
        };
    };
    'shinobi.data.cost': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "in";
                value: string[];
            }[];
        };
    };
    'shinobi.data.security': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "in";
                value: string[];
            }[];
        };
    };
    'shinobi.data.performance': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "in";
                value: string[];
            }[];
        };
    };
    'shinobi.local.seed-data': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "equals";
                value: string;
            }[];
        };
    };
    'shinobi.local.mock-services': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "equals";
                value: string;
            }[];
        };
    };
    'shinobi.experimental.gui': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "equals";
                value: string;
            }[];
        };
    };
    'shinobi.experimental.voice': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "equals";
                value: string;
            }[];
        };
    };
    'shinobi.disable-mocking': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "in";
                value: string[];
            }[];
        };
    };
    'shinobi.use-real-slo-data': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "equals";
                value: boolean;
            }[];
        };
    };
    'shinobi.use-real-cost-data': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "equals";
                value: boolean;
            }[];
        };
    };
    'shinobi.run-audited-tests-only': {
        flagKey: string;
        flagType: "boolean";
        defaultValue: boolean;
        description: string;
        targetingRules: {
            percentage: number;
            conditions: {
                attribute: string;
                operator: "in";
                value: string[];
            }[];
        };
    };
};
/**
 * Create feature flag components for Shinobi
 */
export declare function createShinobiFeatureFlags(scope: Construct, context: ComponentContext, baseName: string): FeatureFlagComponent[];
/**
 * Get feature flag configuration for Shinobi
 */
export declare function getShinobiFeatureFlagConfig(): Record<string, any>;
