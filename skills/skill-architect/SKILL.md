---
name: skill-architect
description: Use this skill to scaffold, validate, and package new Agent Skills. It enforces the "Progressive Disclosure" design principle and uses the Nx Generator for consistency. Use when you need to create a new Agent Skill following the Agent Skills specification.
compatibility: Requires Nx workspace and @shinobi/generators package. Designed for use in the Shinobi platform codebase.
metadata:
  author: shinobi-platform
  version: "1.0"
---

# skill-architect

## Instructions

Use this skill to create new Agent Skills following the [Agent Skills specification](https://agentskills.io/specification). This skill guides you through the process using the Nx generator, ensuring consistency and adherence to Progressive Disclosure principles.

### Workflow

1. **Analyze**: Determine if the task needs Low, Medium, or High "Degrees of Freedom"
   - **Low**: Step-by-step prescriptive instructions (e.g., "Run command X, then Y, then Z")
   - **Medium**: Structured approach with flexibility (e.g., "Analyze context, apply approach, validate")
   - **High**: Principles and guardrails (e.g., "Follow these principles, agent decides approach")

2. **Scaffold**: Run the Nx generator to create the skill structure:
   ```bash
   nx g @shinobi/generators:new-agent-skill \
     --name=<kebab-case-name> \
     --description="Clear description of what this skill does and when to use it" \
     --degreesOfFreedom=<Low|Medium|High> \
     --license="<optional>" \
     --compatibility="<optional>" \
     --author="<optional>" \
     --version="<optional>"
   ```

3. **Draft**: Write the `SKILL.md` following the "Concise is Key" principle:
   - Keep the main `SKILL.md` body under 500 lines
   - Move detailed reference material to `references/` directory
   - Put executable scripts in `scripts/` directory
   - Place static resources in `assets/` directory

4. **Test**: Run the 3-layer test suite to validate the skill:
   ```bash
   # Run all tests (structural, deterministic, behavioral)
   pnpm nx test @shinobi/skill-<skill-name>
   
   # Generate evidence bundle for FedRAMP compliance
   ./skills/<skill-name>/scripts/generate-evidence.sh
   ```

5. **Validate/Package**: Run validation and packaging (if `pnpm nx validate` and `pnpm nx package` targets exist):
   ```bash
   pnpm nx validate @shinobi/skill-<skill-name>
   pnpm nx package @shinobi/skill-<skill-name>
   ```

## Progressive Disclosure Pattern

Agent Skills follow a three-level Progressive Disclosure pattern for efficient context usage:

- **Level 1 (Metadata)**: `SKILL.md` frontmatter (`name`, `description`) - loaded at startup for all skills (~100 tokens)
  - This is what agents see during skill discovery
  - Must be clear and keyword-rich for accurate matching

- **Level 2 (Instructions)**: `SKILL.md` body - loaded when skill is activated (< 5000 tokens recommended)
  - Contains step-by-step instructions, examples, and edge cases
  - Keep concise - move detailed content to `references/` if needed

- **Level 3 (Resources)**: Files in `scripts/`, `references/`, `assets/` - loaded only when explicitly needed
  - `scripts/`: Executable code for deterministic reliability
  - `references/`: Deep domain knowledge, technical references
  - `assets/`: Static templates, images, data files

## Examples

### Example 1: Creating a PDF Processing Skill

```bash
pnpm nx g @shinobi/generators:new-agent-skill \
  --name=pdf-processing \
  --description="Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction." \
  --degreesOfFreedom=Low \
  --license="Apache-2.0" \
  --author="shinobi-platform"
```

### Example 2: Creating a Data Analysis Skill

```bash
pnpm nx g @shinobi/generators:new-agent-skill \
  --name=data-analysis \
  --description="Performs statistical analysis on datasets, generates visualizations, and identifies patterns. Use when analyzing data, creating charts, or performing statistical operations." \
  --degreesOfFreedom=High \
  --compatibility="Requires pandas, matplotlib, and numpy"
```

## Validation Rules

The generator enforces the following validation rules from the Agent Skills specification:

- **Name constraints**:
  - 1-64 characters
  - Lowercase letters, numbers, and hyphens only (`a-z`, `0-9`, `-`)
  - Must not start or end with a hyphen
  - Must not contain consecutive hyphens (`--`)
  - Must match the directory name

- **Description constraints**:
  - 1-1024 characters
  - Should describe both what the skill does and when to use it
  - Should include specific keywords that help agents identify relevant tasks

## Anti-Patterns to Avoid

**DO NOT** create these files in Agent Skills (they are anti-patterns):

- ❌ `README.md` - Use `SKILL.md` instead
- ❌ `CHANGELOG.md` - Version information belongs in metadata or `references/`

If you need additional documentation:
- ✅ Put it in `references/` directory (e.g., `references/REFERENCE.md`)
- ✅ Reference it from `SKILL.md` when needed

## Bundled Resources

- **Scripts**: Use `scripts/` for deterministic reliability. Load only when specific automation is needed.
- **References**: Load `references/` files only when deep domain knowledge is required. Keep these files focused and small.
- **Assets**: Use `assets/` for static templates, images, or data files. Reference these in instructions when needed.

## Testing Infrastructure

Every skill generated includes a **3-layer testing hierarchy** for FedRAMP High compliance:

### Layer 1: Structural Tests (`tests/structure.test.ts`)

Validates metadata, file layout, and naming conventions:
- ✅ `SKILL.md` exists with valid frontmatter
- ✅ No anti-patterns (README.md, CHANGELOG.md)
- ✅ Progressive Disclosure directories exist
- ✅ Skill name follows specification rules

**Test ID Format**: `TP-<skill-name>-structure-001`

### Layer 2: Deterministic Tests (`tests/scripts.test.ts`)

Unit tests for executable scripts in `scripts/`:
- ✅ Script existence and accessibility
- ✅ Script execution with valid inputs
- ✅ Script syntax validation (e.g., shellcheck for bash)

**Test ID Format**: `TP-<skill-name>-scripts-001`

### Layer 3: Behavioral Evals (`tests/behavior.meta.json`)

LLM-as-a-judge evaluations for instruction adherence:
- ✅ Agent follows SKILL.md instructions correctly
- ✅ Edge case handling as documented
- ✅ Output quality and format validation

**Test ID Format**: `TP-<skill-name>-behavior-001`

### Running Tests

```bash
# Run all test layers
pnpm nx test @shinobi/skill-<skill-name>

# Run with coverage
pnpm nx test @shinobi/skill-<skill-name> --coverage

# Run specific test file
pnpm nx test @shinobi/skill-<skill-name> -- tests/structure.test.ts
```

### Evidence Bundle Generation

For FedRAMP compliance, generate an evidence report after tests:

```bash
cd skills/<skill-name>
./scripts/generate-evidence.sh [test-output-file]
```

This creates `EVIDENCE.md` in the skill root with:
- Test summary table
- Test results (appended from test output)
- Compliance notes
- Test IDs for audit trail

The evidence bundle is consumed by the **Arbiter** during the release process.

## Edge Cases

- **Skill name conflicts**: If a skill with the same name already exists, the generator will fail with a clear error message
- **Invalid skill names**: The generator validates names and provides specific error messages for each violation
- **Long descriptions**: Keep descriptions under 1024 characters. If you need more detail, use the `references/` directory
- **Complex skills**: If your skill needs extensive documentation, split it across multiple files in `references/` and reference them from `SKILL.md`
- **Test failures**: If structural tests fail, fix the skill structure before proceeding. If deterministic tests fail, fix the scripts. If behavioral evals fail, review and update SKILL.md instructions

## Testing Best Practices

### The "Agent Self-Test" Workflow

When creating a new skill, follow this verification workflow:

1. **Generate**: `nx g @shinobi/generators:new-agent-skill ...`
2. **Implement**: Write the SKILL.md logic and scripts
3. **Test**: `pnpm nx test @shinobi/skill-<name>`
   - **Step 3a**: Structural validator runs automatically
   - **Step 3b**: Unit tests execute for any scripts
   - **Step 3c**: (Optional) Run LLM Judge dry-run for behavioral evals
4. **Evidence**: Generate `EVIDENCE.md` for compliance audit
5. **Iterate**: Fix any failures and re-test

### Critical Testing Rules

**REQUIRED**: Every skill MUST have all three test layers:
- ❌ **FAIL** if `tests/structure.test.ts` is missing
- ❌ **FAIL** if `tests/scripts.test.ts` is missing  
- ❌ **FAIL** if `tests/behavior.meta.json` is missing

**REQUIRED**: Evidence bundle MUST be generated before release:
- Generate `EVIDENCE.md` after successful test run
- Include test IDs in evidence for audit trail
- Timestamp all test results for compliance

**PROHIBITED**: "Vibe checks" are not acceptable in FedRAMP environments:
- No skills without tests
- No manual validation only
- All tests must be automated and repeatable

## Additional Resources

- [Agent Skills Specification](https://agentskills.io/specification) - Complete format specification
- [Agent Skills Overview](https://agentskills.io/home) - Introduction to Agent Skills
- See `references/NX_GENERATOR_REFERENCE.md` for detailed generator options
- Use `scripts/validate-skill-name.sh` to validate skill names before generation
- See generated `tests/` directory for test examples and patterns

