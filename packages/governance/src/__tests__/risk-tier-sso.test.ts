import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { RiskTier } from '../constants/risk-tiers.js';

// Resolve path to capability schema
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const capabilitySchemaPath = join(__dirname, '../../../api/src/schemas/capability.schema.json');
const capabilitySchema = JSON.parse(readFileSync(capabilitySchemaPath, 'utf-8'));

describe('RiskTier__SingleSourceOfTruth__MatchesApiSchema', () => {
  it('RiskTier__Values__EqualCapabilitySchemaEnum', () => {
    const schemaEnum = (capabilitySchema as any).properties?.metadata?.properties?.risk_tier?.enum as unknown;
    expect(Array.isArray(schemaEnum)).toBe(true);

    const governanceValues = Object.values(RiskTier).sort();
    const apiValues = [...(schemaEnum as string[])].sort();

    expect(governanceValues).toEqual(apiValues);
  });
});


