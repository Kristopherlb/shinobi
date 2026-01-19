export type { ToolCallEnvelope } from './contracts/tool-envelope.js';
export type { CapabilityManifest, CapabilityKind, RiskTier } from './types/capability.js';

// Re-export schema path for tooling that wants to load the schema at runtime.
export const CAPABILITY_SCHEMA_PATH = new URL('./schemas/capability.schema.json', import.meta.url);


