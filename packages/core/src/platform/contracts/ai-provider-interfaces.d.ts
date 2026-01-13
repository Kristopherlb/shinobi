/**
 * AI Provider Capability Interfaces
 */
export type AIProviderKind = 'openai' | 'anthropic' | 'bedrock' | 'gemini' | 'ollama';
export type AIProviderAuthType = 'apiKey' | 'aws' | 'none';
export interface AIProviderAuthConfig {
    type: AIProviderAuthType;
    secretRef?: string;
}
export interface AIProviderCapability {
    providerType: AIProviderKind;
    model: string;
    endpoint?: string;
    region?: string;
    auth: AIProviderAuthConfig;
    connectionConfig: Record<string, string>;
    environmentVariables: Record<string, string>;
}
//# sourceMappingURL=ai-provider-interfaces.d.ts.map