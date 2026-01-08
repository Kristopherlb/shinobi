# Feature Request: Generalized OSCAL Component Definition System

**Type:** Feature Request  
**Priority:** P2 (Medium) - Deferred for MVP  
**Status:** 🟡 Deferred  
**Created:** 2025-01-15  
**Component:** Platform Infrastructure  
**Labels:** `compliance`, `oscal`, `audit`, `deferred`, `post-mvp`

---

## Summary

Create a **generalized, reusable OSCAL component definition system** that automatically generates OSCAL 1.0.4 compliance documentation for all platform components. This system should replace component-specific OSCAL snapshots with a standardized, maintainable approach.

## Problem Statement

Currently, OSCAL files are manually maintained per-component as static JSON snapshots. This approach has several limitations:

1. **Duplication**: Each component has its own OSCAL file with similar structure but different content
2. **Maintenance Burden**: Updates require manual editing across multiple files
3. **Inconsistency**: Different components may document controls differently
4. **Not Reusable**: No shared infrastructure for generating OSCAL documentation
5. **Out of Sync**: OSCAL files can become stale as components evolve
6. **Not Generalizable**: Current approach creates component-specific snapshots rather than a reusable system

## Proposed Solution

Build a **generalized OSCAL component definition system** that:

1. **Automatically generates OSCAL 1.0.4 documents** from component metadata and code analysis
2. **Provides reusable templates** for common control implementations
3. **Integrates with component registry** to discover all components
4. **Validates against platform standards** automatically
5. **Supports multiple compliance frameworks** (Commercial, FedRAMP Moderate, FedRAMP High)
6. **Generates evidence references** from actual code locations
7. **Maintains audit trail** of compliance status changes

## Requirements

### Functional Requirements

1. **OSCAL Generator Service**
   - Accepts component metadata (type, version, capabilities, controls)
   - Generates OSCAL 1.0.4 compliant documents
   - Supports component-definition, assessment-results, and system-security-plan models
   - Validates output against OSCAL schema

2. **Component Metadata Integration**
   - Reads from component registry (`@shinobi/core`)
   - Extracts control implementations from component code
   - Maps platform capabilities to security controls
   - Identifies evidence locations (code files, line numbers)

3. **Control Template Library**
   - Reusable templates for common controls (AC-2, AC-3, SC-7, SC-13, SI-4, etc.)
   - Framework-specific control variations
   - Implementation statement templates
   - Evidence collection patterns

4. **Code Analysis Integration**
   - Static analysis to identify control implementations
   - Pattern matching for security controls (encryption, IAM, monitoring, etc.)
   - Evidence extraction (file paths, line numbers, method names)
   - Compliance framework detection

5. **Multi-Framework Support**
   - Commercial baseline controls
   - FedRAMP Moderate controls
   - FedRAMP High controls
   - Framework-specific control enhancements

6. **Validation & Quality Checks**
   - OSCAL schema validation
   - Control completeness checks
   - Evidence reference validation
   - Compliance status verification

### Non-Functional Requirements

1. **Performance**: Generate OSCAL for all components in < 30 seconds
2. **Reliability**: 100% valid OSCAL output (schema-compliant)
3. **Maintainability**: Template-based approach for easy updates
4. **Extensibility**: Support for new compliance frameworks
5. **Documentation**: Comprehensive usage guide and examples

## Architecture

### Components

```
packages/
├── core/
│   └── oscal/
│       ├── generator/
│       │   ├── oscal-generator.ts          # Main generator service
│       │   ├── component-analyzer.ts       # Code analysis for controls
│       │   ├── evidence-extractor.ts       # Extract evidence from code
│       │   └── template-engine.ts          # Template rendering
│       ├── templates/
│       │   ├── component-definition.json   # OSCAL component-definition template
│       │   ├── assessment-results.json     # OSCAL assessment-results template
│       │   └── controls/                   # Control-specific templates
│       │       ├── ac-2.json               # Account Management template
│       │       ├── ac-3.json               # Access Enforcement template
│       │       ├── sc-7.json               # Boundary Protection template
│       │       ├── sc-13.json              # Cryptographic Protection template
│       │       └── si-4.json                # System Monitoring template
│       ├── validators/
│       │   ├── schema-validator.ts         # OSCAL schema validation
│       │   └── control-validator.ts        # Control completeness validation
│       └── index.ts
└── cli/
    └── commands/
        └── generate-oscal.ts               # CLI command for OSCAL generation
```

### Data Flow

```
Component Registry
    ↓
Component Metadata Extraction
    ↓
Code Analysis (Static Analysis)
    ↓
Control Implementation Detection
    ↓
Evidence Collection
    ↓
Template Rendering (OSCAL 1.0.4)
    ↓
Schema Validation
    ↓
OSCAL Document Output
```

### Integration Points

1. **Component Registry**: Discover all components and their metadata
2. **Code Analysis**: Static analysis tools (TypeScript compiler API, AST parsing)
3. **Platform Standards**: Reference platform security standards for control mappings
4. **MCP Servers**: AWS knowledge base for control guidance
5. **Audit Framework**: Integration with existing audit.md framework

## Implementation Plan

### Phase 1: Foundation (2-3 weeks)

1. **OSCAL Schema Integration**
   - Add OSCAL 1.0.4 JSON Schema validation
   - Create TypeScript types for OSCAL models
   - Build schema validator

2. **Component Metadata Extraction**
   - Extend component registry to expose metadata
   - Extract component capabilities, controls, evidence
   - Build metadata collector service

3. **Basic Template Engine**
   - Create template system for OSCAL generation
   - Build control template library (5-10 common controls)
   - Implement template rendering

### Phase 2: Code Analysis (2-3 weeks)

1. **Static Analysis Integration**
   - Integrate TypeScript compiler API
   - Build AST parser for control detection
   - Pattern matching for security controls

2. **Evidence Extraction**
   - Extract code locations (file, line, method)
   - Identify control implementations
   - Generate evidence references

3. **Control Mapping**
   - Map component capabilities to security controls
   - Framework-specific control variations
   - Control enhancement detection

### Phase 3: Generator Service (2-3 weeks)

1. **OSCAL Generator**
   - Build main generator service
   - Integrate all components (metadata, analysis, templates)
   - Generate OSCAL 1.0.4 documents

2. **Validation & Quality**
   - Schema validation
   - Control completeness checks
   - Evidence reference validation

3. **CLI Integration**
   - Add `svc generate oscal` command
   - Support for single component or all components
   - Output formatting options

### Phase 4: Testing & Documentation (1-2 weeks)

1. **Testing**
   - Unit tests for generator components
   - Integration tests for full generation
   - Validation tests for OSCAL output

2. **Documentation**
   - Usage guide
   - Template customization guide
   - Control mapping documentation
   - Examples and best practices

## Usage Example

```bash
# Generate OSCAL for a single component
svc generate oscal --component ecs-cluster --framework fedramp-moderate

# Generate OSCAL for all components
svc generate oscal --all --framework fedramp-high

# Generate with custom template
svc generate oscal --component lambda-api --template custom-controls.json

# Validate existing OSCAL file
svc validate oscal --file packages/components/ecs-cluster/audit/ecs-cluster.oscal.json
```

## Success Criteria

1. ✅ **Automated Generation**: Generate valid OSCAL 1.0.4 documents for all components
2. ✅ **Schema Compliance**: 100% of generated OSCAL files pass schema validation
3. ✅ **Control Coverage**: All platform components have complete control documentation
4. ✅ **Evidence References**: All controls include accurate evidence references
5. ✅ **Framework Support**: Support for Commercial, FedRAMP Moderate, and FedRAMP High
6. ✅ **Maintainability**: Template-based approach allows easy updates
7. ✅ **Performance**: Generate OSCAL for all components in < 30 seconds

## Dependencies

- OSCAL 1.0.4 JSON Schema
- TypeScript Compiler API
- Component Registry (`@shinobi/core`)
- Platform Standards Documentation
- AWS MCP Servers (for control guidance)

## Related Work

- **Current State**: Component-specific OSCAL snapshots (ecs-cluster, lambda-api, deployment-bundle-pipeline, dagger-engine-pool)
- **Audit Framework**: Integration with existing `audit.md` framework
- **Component Standards**: Alignment with Platform Component API Spec
- **Compliance Standards**: FedRAMP, Commercial baseline requirements

## Notes

- This feature is **deferred for MVP** - current component-specific OSCAL snapshots are sufficient for initial compliance needs
- The generalized system will replace manual OSCAL maintenance post-MVP
- Consider integration with automated compliance reporting systems
- May integrate with external OSCAL tooling (OSCAL-CLI, OSCAL-Validator)

## References

- [OSCAL 1.0.4 Specification](https://pages.nist.gov/OSCAL/)
- [OSCAL Component Definition Model](https://pages.nist.gov/OSCAL/documentation/schema/component-definition/)
- [OSCAL Assessment Results Model](https://pages.nist.gov/OSCAL/documentation/schema/assessment-results/)
- Platform Component Standards (`docs/platform-standards/`)
- FedRAMP Security Controls (NIST SP 800-53)

---

**Estimated Effort:** 8-12 weeks  
**Complexity:** High  
**Risk:** Medium (OSCAL schema complexity, code analysis accuracy)

