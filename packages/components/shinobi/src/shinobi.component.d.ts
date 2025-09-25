/**
 * Shinobi Component - The Platform Intelligence Brain
 *
 * A production-grade Ops MCP Server that becomes the brain for SRE/DevOps/DPE/Developers and leadership.
 * Delivers exceptional DX/UX from day one, runs locally and in AWS, and provides a clean runway
 * to a drag-and-drop GUI that outputs platform L3 construct manifests.
 *
 * Core Philosophy: "Ask the brain, get an answer or an action." No AWS trivia, no yak-shaving.
 */
import { Construct } from 'constructs';
import { Component, ComponentSpec, ComponentContext, ComponentCapabilities } from '@platform/contracts';
/**
 * Shinobi Component - The Platform Intelligence Brain
 */
export declare class ShinobiComponent extends Component {
    private cluster?;
    private service?;
    private taskDefinition?;
    private loadBalancer?;
    private repository?;
    private logGroup?;
    private dataTable?;
    private eventRule?;
    private config?;
    constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec);
    /**
     * Synthesis phase - Create AWS resources
     */
    synth(): void;
    /**
     * Get the capabilities this component provides
     */
    getCapabilities(): ComponentCapabilities;
    /**
     * Get the component type identifier
     */
    getType(): string;
    private buildConfigSync;
    private createEcrRepository;
    private createEcsCluster;
    private createLogGroup;
    private createDataStore;
    private createTaskDefinition;
    private createEcsService;
    private createLoadBalancer;
    private createReindexingSchedule;
    private createDatabaseSecret;
    private buildApiCapability;
    private buildContainerCapability;
    private buildIntelligenceCapability;
    /**
     * Configure observability for Shinobi
     */
    private _configureObservabilityForShinobi;
    private applyComplianceDefaults;
    private applyComplianceHardening;
}
//# sourceMappingURL=shinobi.component.d.ts.map