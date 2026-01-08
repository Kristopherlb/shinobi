# Nx Generator Reference: new-agent-skill

This document provides detailed reference information for the `new-agent-skill` Nx generator.

## Generator Command

```bash
nx g @shinobi/generators:new-agent-skill [options]
```

## Required Options

### `--name` (or positional argument)

- **Type**: `string`
- **Required**: Yes
- **Description**: Name of the skill (must follow Agent Skills naming rules)
- **Constraints**:
  - 1-64 characters
  - Lowercase letters, numbers, and hyphens only (`a-z`, `0-9`, `-`)
  - Must not start or end with a hyphen
  - Must not contain consecutive hyphens (`--`)
  - Must match the directory name

**Examples**:
- ✅ `pdf-processing`
- ✅ `data-analysis`
- ✅ `code-review`
- ❌ `PDF-Processing` (uppercase not allowed)
- ❌ `-pdf` (cannot start with hyphen)
- ❌ `pdf--processing` (consecutive hyphens not allowed)

### `--description`

- **Type**: `string`
- **Required**: Yes
- **Max Length**: 1024 characters
- **Description**: Skill description that describes what the skill does and when to use it
- **Best Practices**:
  - Include specific keywords that help agents identify relevant tasks
  - Describe both what the skill does and when to use it
  - Be concise but informative

**Example**:
```
--description="Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction."
```

## Optional Options

### `--degreesOfFreedom`

- **Type**: `"Low" | "Medium" | "High"`
- **Default**: `"Medium"`
- **Description**: Guides the template's instruction style

**Values**:
- **Low**: Step-by-step prescriptive instructions
  - Use when the task has a clear, deterministic sequence
  - Example: "1. Run command X, 2. Run command Y, 3. Verify result Z"
  
- **Medium**: Structured approach with flexibility
  - Use when the task has a general structure but allows adaptation
  - Example: "1. Analyze context, 2. Apply approach, 3. Validate result"
  
- **High**: Principles and guardrails
  - Use when the task requires agent judgment and creativity
  - Example: "Follow these principles: X, Y, Z. Never do A. Agent determines specific approach."

### `--license`

- **Type**: `string`
- **Description**: License identifier or reference to a bundled license file
- **Example**: `--license="Apache-2.0"` or `--license="Proprietary. LICENSE.txt has complete terms"`

### `--compatibility`

- **Type**: `string`
- **Max Length**: 500 characters
- **Description**: Compatibility requirements (intended product, system packages, network access, etc.)
- **When to use**: Only include if your skill has specific environment requirements
- **Examples**:
  - `--compatibility="Designed for Claude Code (or similar products)"`
  - `--compatibility="Requires git, docker, jq, and access to the internet"`

### `--author`

- **Type**: `string`
- **Description**: Author name for metadata
- **Example**: `--author="shinobi-platform"`

### `--version`

- **Type**: `string`
- **Description**: Version for metadata
- **Example**: `--version="1.0"`

## Complete Example

```bash
nx g @shinobi/generators:new-agent-skill \
  --name=pdf-processing \
  --description="Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction." \
  --degreesOfFreedom=Low \
  --license="Apache-2.0" \
  --compatibility="Requires pdf-lib and pdf-parse npm packages" \
  --author="shinobi-platform" \
  --version="1.0"
```

## Generated Structure

The generator creates the following structure:

```
skills/<skill-name>/
├── SKILL.md          # Main skill file with frontmatter and instructions
├── scripts/          # Executable scripts (Progressive Disclosure)
│   └── .gitkeep
├── references/       # Additional documentation (Progressive Disclosure)
│   └── .gitkeep
└── assets/           # Static resources (Progressive Disclosure)
    └── .gitkeep
```

## Progressive Disclosure Pattern

The generator automatically creates the Progressive Disclosure directories (`scripts/`, `references/`, `assets/`) to encourage the pattern:

- **Level 1**: `SKILL.md` frontmatter (metadata) - loaded at startup
- **Level 2**: `SKILL.md` body (instructions) - loaded when skill is activated
- **Level 3**: Files in `scripts/`, `references/`, `assets/` - loaded on demand

## Validation

The generator performs the following validations:

1. **Skill name validation**: Checks against Agent Skills specification rules
2. **Description length**: Ensures description is within 1-1024 characters
3. **Directory existence**: Prevents overwriting existing skills
4. **Anti-pattern detection**: Warns if `README.md` or `CHANGELOG.md` exist

## Error Messages

The generator provides clear error messages for common issues:

- Invalid skill name format
- Skill already exists
- Description too long
- Invalid degrees of freedom value

## Integration with Agent Skills Specification

This generator implements the [Agent Skills specification](https://agentskills.io/specification) and ensures:

- Proper YAML frontmatter format
- Correct naming conventions
- Progressive Disclosure directory structure
- Anti-pattern avoidance (no README.md, CHANGELOG.md)

