/**
 * Mock File Discovery Helpers
 * 
 * Provides utilities for creating mock FileDiscovery instances for testing.
 */

import type { FileDiscovery } from '../../utils/file-discovery.js';

/**
 * Creates a mock FileDiscovery with findManifest stubbed
 */
export function createMockFileDiscovery(): FileDiscovery {
  return {
    findManifest: jest.fn()
  } as unknown as FileDiscovery;
}

/**
 * Creates a FileDiscovery that returns a specific manifest path
 */
export function createFileDiscoveryWithManifest(manifestPath: string | null): FileDiscovery {
  return {
    findManifest: jest.fn().mockResolvedValue(manifestPath)
  } as unknown as FileDiscovery;
}



