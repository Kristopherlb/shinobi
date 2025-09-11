/**
 * The Resolver & Synthesis Engine
 * Core orchestrator for translating validated configuration into CDK constructs
 */
import { Logger } from '../utils/logger';
import { Component } from '../patterns/component-factory';
import { ComponentBinder, BinderRegistry } from '../patterns/binding-strategies';
import * as cdk from 'aws-cdk-lib';
export interface ResolverEngineDependencies {
    logger: Logger;
    binderRegistry?: BinderRegistry;
    componentBinder?: ComponentBinder;
}
export interface SynthesisResult {
    app: cdk.App;
    stacks: cdk.Stack[];
    components: Component[];
    bindings: Array<{
        source: string;
        target: string;
        capability: string;
        result: any;
    }>;
    patchesApplied: boolean;
    synthesisTime: number;
}
/**
 * The heart of the platform's infrastructure generation logic
 * Orchestrates the complete two-phase process of synthesizing and binding components
 */
export declare class ResolverEngine {
    private dependencies;
    private binderRegistry;
    private componentBinder;
    constructor(dependencies: ResolverEngineDependencies);
    /**
     * Main orchestration method - transforms validated config to CDK App
     * Executes all 5 phases in strict sequential order
     */
    synthesize(validatedConfig: any): Promise<SynthesisResult>;
    /**
     * Phase 1: Component Instantiation
     * Uses Factory Method pattern to create all required components
     */
    private instantiateComponents;
    /**
     * Phase 2: Synthesis
     * Calls synth() on each component to create CDK constructs and collect capabilities
     */
    private synthesizeComponents;
    /**
     * Phase 3: Binding
     * Resolves component bindings using Strategy pattern
     */
    private bindComponents;
    /**
     * Resolve binding target by name or selector
     */
    private resolveTarget;
    /**
     * Phase 4: Patching
     * Apply escape hatch modifications if patches.ts exists
     */
    private applyPatches;
    /**
     * Build a map of component constructs for patch context
     */
    private buildConstructsMap;
    /**
     * Get detailed synthesis report for logging/debugging
     */
    getSynthesisReport(result: SynthesisResult): string;
}
