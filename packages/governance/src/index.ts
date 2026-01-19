export { RiskTier } from './constants/risk-tiers.js';

// Re-export schema path for tooling that wants to load the schema at runtime.
export const AUDIT_RECORD_SCHEMA_PATH = new URL('./schemas/audit-record.schema.json', import.meta.url);


