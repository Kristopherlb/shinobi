/**
 * Test Metadata: TP-application-generator-structure-001
 * {
 *   "id": "TP-application-generator-structure-001",
 *   "level": "unit",
 *   "capability": "Application generator skill structure validation",
 *   "oracle": "exact",
 *   "invariants": ["Skill files exist", "Reference docs exist", "Scripts executable"],
 *   "fixtures": ["FileSystem"],
 *   "inputs": { "shape": "Skill directory", "notes": "Validates skill structure" },
 *   "risks": [],
 *   "dependencies": ["fs", "path"],
 *   "evidence": ["File existence assertions"],
 *   "compliance_refs": ["skills/skill-architect/SKILL.md"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "platform-team"
 * }
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

const SKILL_DIR = join(__dirname, '..');

describe('ApplicationGeneratorSkill__Structure__ValidatesFilesExist', () => {
  it('SKILL.md exists', () => {
    expect(existsSync(join(SKILL_DIR, 'SKILL.md'))).toBe(true);
  });

  it('project.json exists', () => {
    expect(existsSync(join(SKILL_DIR, 'project.json'))).toBe(true);
  });

  it('Reference documentation exists', () => {
    expect(existsSync(join(SKILL_DIR, 'references', 'MANIFEST_SCHEMA.md'))).toBe(true);
    expect(existsSync(join(SKILL_DIR, 'references', 'COMPONENT_DISCOVERY.md'))).toBe(true);
    expect(existsSync(join(SKILL_DIR, 'references', 'TESTING_PATTERNS.md'))).toBe(true);
    expect(existsSync(join(SKILL_DIR, 'references', 'LOG_RETRIEVAL_PATTERNS.md'))).toBe(true);
    expect(existsSync(join(SKILL_DIR, 'references', 'VALIDATION_PATTERNS.md'))).toBe(true);
  });

  it('Scripts directory exists', () => {
    expect(existsSync(join(SKILL_DIR, 'scripts', 'generate-application.sh'))).toBe(true);
  });
});

