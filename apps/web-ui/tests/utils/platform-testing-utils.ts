/**
 * Platform Testing Utilities
 * 
 * Utilities for Platform Testing Standard v1.0 compliance.
 * Provides deterministic test setup and metadata validation.
 */

import { beforeEach, afterEach } from 'vitest';

/**
 * Determinism harness for test setup
 */
export class DeterminismHarness {
  private originalDateNow: typeof Date.now;
  private originalMathRandom: typeof Math.random;
  private frozenTime: number;

  constructor() {
    this.originalDateNow = Date.now;
    this.originalMathRandom = Math.random;
    this.frozenTime = Date.now();
  }

  /**
   * Freeze time for deterministic testing
   */
  freezeTime(time?: number): void {
    this.frozenTime = time || this.frozenTime;
    Date.now = vi.fn(() => this.frozenTime);
  }

  /**
   * Advance time by specified milliseconds
   */
  advanceTime(ms: number): void {
    this.frozenTime += ms;
    Date.now = vi.fn(() => this.frozenTime);
  }

  /**
   * Seed random number generator for deterministic results
   */
  seedRandom(seed: number): void {
    Math.random = vi.fn(() => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    });
  }

  /**
   * Restore original functions
   */
  restore(): void {
    Date.now = this.originalDateNow;
    Math.random = this.originalMathRandom;
  }
}

/**
 * Test metadata interface for Platform Testing Standard compliance
 */
export interface TestMetadata {
  id: string;
  level: 'unit' | 'integration' | 'e2e' | 'contract';
  capability: string;
  oracle: string;
  compliance_refs: string[];
  ai_generated: boolean;
  human_reviewed_by?: string;
}

/**
 * Setup deterministic test environment
 */
export function setupDeterministicTest(): DeterminismHarness {
  const harness = new DeterminismHarness();
  harness.freezeTime();
  harness.seedRandom(12345); // Fixed seed for reproducibility
  return harness;
}

/**
 * Teardown deterministic test environment
 */
export function teardownDeterministicTest(harness: DeterminismHarness): void {
  harness.restore();
}

/**
 * Snapshot masker for volatile fields
 */
export class SnapshotMasker {
  private masks: Map<string, (value: any) => string> = new Map();

  /**
   * Add a mask for a specific field
   */
  addMask(field: string, maskFn: (value: any) => string): void {
    this.masks.set(field, maskFn);
  }

  /**
   * Mask an object by applying masks to specified fields
   */
  maskObject(obj: any, fields: string[]): any {
    const masked = JSON.parse(JSON.stringify(obj));
    
    fields.forEach(field => {
      if (this.masks.has(field)) {
        const maskFn = this.masks.get(field)!;
        const value = this.getNestedValue(masked, field);
        if (value !== undefined) {
          this.setNestedValue(masked, field, maskFn(value));
        }
      }
    });

    return masked;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

/**
 * Create a deterministic test wrapper
 */
export function createDeterministicTest(harness: DeterminismHarness) {
  return {
    beforeEach: () => {
      beforeEach(() => {
        harness.freezeTime();
        harness.seedRandom(12345);
      });
    },
    afterEach: () => {
      afterEach(() => {
        // Reset to original state after each test
        harness.restore();
      });
    }
  };
}
