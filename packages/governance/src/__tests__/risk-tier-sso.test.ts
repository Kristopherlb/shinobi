import { describe, expect, it } from 'vitest';
import capabilitySchema from '@shinobi/api/src/schemas/capability.schema.json';
import { RiskTier } from '../constants/risk-tiers.js';

describe('RiskTier__SingleSourceOfTruth__MatchesApiSchema', () => {
  it('RiskTier__Values__EqualCapabilitySchemaEnum', () => {
    const schemaEnum = (capabilitySchema as any).properties?.metadata?.properties?.risk_tier?.enum as unknown;
    expect(Array.isArray(schemaEnum)).toBe(true);

    const governanceValues = Object.values(RiskTier).sort();
    const apiValues = [...(schemaEnum as string[])].sort();

    expect(governanceValues).toEqual(apiValues);
  });
});


