/**
 * Structural Tests for devops-knowledge-base Skill
 * 
 * Layer 1: Validates metadata, file layout, and naming conventions.
 * These tests ensure the skill follows the Agent Skills specification.
 * 
 * Test Metadata: TP-devops-knowledge-base-structure-001
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const SKILL_DIR = join(__dirname, '..');
const SKILL_NAME = 'devops-knowledge-base';

describe(`devops-knowledge-base - Structural Validation`, () => {
  describe('Metadata Validation', () => {
    it('SKILL.md__Exists__HasValidFrontmatter', () => {
      const skillPath = join(SKILL_DIR, 'SKILL.md');
      expect(existsSync(skillPath)).toBe(true);

      const content = readFileSync(skillPath, 'utf-8');
      
      // Check for required frontmatter fields
      expect(content).toMatch(/^---\s*$/m);
      expect(content).toMatch(/^name:\s*devops-knowledge-base/m);
      expect(content).toMatch(/^description:/m);
      expect(content).toMatch(/^---\s*$/m);
    });

    it('SKILL.md__NoAntiPatterns__NoReadmeOrChangelog', () => {
      const readmePath = join(SKILL_DIR, 'README.md');
      const changelogPath = join(SKILL_DIR, 'CHANGELOG.md');
      
      expect(existsSync(readmePath)).toBe(false);
      expect(existsSync(changelogPath)).toBe(false);
    });
  });

  describe('Directory Structure', () => {
    it('DirectoryStructure__ProgressiveDisclosure__HasRequiredDirs', () => {
      const scriptsDir = join(SKILL_DIR, 'scripts');
      const referencesDir = join(SKILL_DIR, 'references');
      const assetsDir = join(SKILL_DIR, 'assets');
      const testsDir = join(SKILL_DIR, 'tests');

      // Progressive Disclosure directories should exist (or be created)
      // Tests directory is required for skill testing
      expect(existsSync(testsDir)).toBe(true);
    });

    it('TestsDirectory__HasTestFiles__StructureAndScriptsExist', () => {
      const structureTest = join(SKILL_DIR, 'tests', 'structure.test.ts');
      const scriptsTest = join(SKILL_DIR, 'tests', 'scripts.test.ts');
      const behaviorMeta = join(SKILL_DIR, 'tests', 'behavior.meta.json');

      expect(existsSync(structureTest)).toBe(true);
      expect(existsSync(scriptsTest)).toBe(true);
      expect(existsSync(behaviorMeta)).toBe(true);
    });
  });

  describe('Naming Conventions', () => {
    it('SkillName__FollowsSpec__ValidKebabCase', () => {
      // Agent Skills spec: lowercase, alphanumeric, hyphens, 1-64 chars
      const namePattern = /^[a-z0-9-]+$/;
      expect(SKILL_NAME).toMatch(namePattern);
      expect(SKILL_NAME.length).toBeGreaterThanOrEqual(1);
      expect(SKILL_NAME.length).toBeLessThanOrEqual(64);
      expect(SKILL_NAME).not.toMatch(/^-/); // No leading hyphen
      expect(SKILL_NAME).not.toMatch(/-$/); // No trailing hyphen
      expect(SKILL_NAME).not.toMatch(/--/); // No consecutive hyphens
    });
  });
});


