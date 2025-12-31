/**
 * Manifest Test Fixtures
 * 
 * Provides factory functions for creating test manifests.
 */

export interface TestManifest {
  service: string;
  owner?: string;
  complianceFramework?: string;
  environment?: string;
  components?: any[];
  [key: string]: any;
}

/**
 * Creates a valid service.yml structure
 */
export function createValidManifest(): TestManifest {
  return {
    service: 'test-service',
    owner: 'platform-team',
    complianceFramework: 'commercial',
    environment: 'dev',
    components: []
  };
}

/**
 * Creates a manifest with schema errors (invalid structure)
 */
export function createInvalidManifest(): any {
  return {
    // Missing required 'service' field
    owner: 'platform-team',
    invalidField: 'this should not be here'
  };
}

/**
 * Creates a manifest with warnings but valid structure
 */
export function createManifestWithWarnings(): TestManifest {
  return {
    service: 'test-service',
    owner: 'platform-team',
    complianceFramework: 'commercial',
    environment: 'dev',
    components: [],
    // Deprecated field that might generate warnings
    deprecatedField: 'old-value'
  };
}

/**
 * Creates a manifest with component references
 */
export function createManifestWithComponents(): TestManifest {
  return {
    service: 'test-service',
    owner: 'platform-team',
    complianceFramework: 'commercial',
    environment: 'dev',
    components: [
      {
        name: 'my-bucket',
        type: 's3-bucket',
        config: {
          versioning: true
        }
      },
      {
        name: 'my-api',
        type: 'lambda-api',
        config: {
          runtime: 'nodejs20.x'
        }
      }
    ]
  };
}

/**
 * Creates an environment-specific manifest
 */
export function createManifestForEnvironment(env: string = 'dev'): TestManifest {
  return {
    service: 'test-service',
    owner: 'platform-team',
    complianceFramework: 'commercial',
    environment: env,
    components: []
  };
}

/**
 * Creates a manifest with FedRAMP compliance framework
 */
export function createFedRAMPManifest(level: 'moderate' | 'high' = 'moderate'): TestManifest {
  return {
    service: 'test-service',
    owner: 'platform-team',
    complianceFramework: `fedramp-${level}`,
    environment: 'dev',
    components: []
  };
}


