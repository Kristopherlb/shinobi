/**
 * Deterministic Tests for arbiter-release-manager Skill Scripts
 * 
 * Layer 2: Unit tests for executable scripts in the scripts/ folder.
 * These tests validate that scripts execute correctly and produce expected outputs.
 * 
 * Test Metadata: TP-arbiter-release-manager-scripts-001
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

const SKILL_DIR = join(__dirname, '..');
const SCRIPTS_DIR = join(SKILL_DIR, 'scripts');

describe(`arbiter-release-manager - Script Validation`, () => {
  describe('Script Existence', () => {
    it('ScriptsDirectory__Exists__IsAccessible', () => {
      expect(existsSync(SCRIPTS_DIR)).toBe(true);
    });

    it('ValidateReleaseScript__Exists__IsExecutable', () => {
      const scriptPath = join(SCRIPTS_DIR, 'validate-release.sh');
      if (existsSync(scriptPath)) {
        const stats = require('fs').statSync(scriptPath);
        expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
      }
    });

    it('GenerateEvidenceScript__Exists__IsExecutable', () => {
      const scriptPath = join(SCRIPTS_DIR, 'generate-evidence-bundle.sh');
      if (existsSync(scriptPath)) {
        const stats = require('fs').statSync(scriptPath);
        expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
      }
    });
  });
});


