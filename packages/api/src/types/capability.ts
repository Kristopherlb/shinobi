/**
 * NOTE: This file is generated from src/schemas/capability.schema.json.
 *
 * Regenerate via:
 *   pnpm --filter @shinobi/api run generate:types
 */

export type CapabilityKind = 'resource' | 'action' | 'query';

export type RiskTier = 'R0' | 'R1' | 'R2' | 'R3';

export interface CapabilityManifest {
  /**
   * Capability identifier in URN-like format: com.shinobi.{domain}.{capability}
   */
  id: string;

  /**
   * Semantic version string (MAJOR.MINOR.PATCH with optional prerelease/build)
   */
  version: string;

  /**
   * Capability kind
   */
  kind: CapabilityKind;

  metadata: {
    /**
     * Human-friendly display name
     */
    display_name: string;

    /**
     * Human-friendly description
     */
    description: string;

    /**
     * Risk tier (governance domain)
     */
    risk_tier: RiskTier;

    /**
     * Owning team or email (e.g., team:platform or alice@example.com)
     */
    owner: string;
  };

  spec: {
    /**
     * JSON Schema object describing the input/arguments shape
     */
    input: Record<string, unknown>;

    /**
     * JSON Schema object describing the output/return shape
     */
    output: Record<string, unknown>;
  };
}


