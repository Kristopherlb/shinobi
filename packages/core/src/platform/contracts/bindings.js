/**
 * Core binding contracts and types
 *
 * Central type hub for bindings — re-exports canonical interfaces, defines capability
 * vocabularies, data shapes, IAM/SG rules, and compliance types.
 *
 * EXTENSIBILITY FOR EXTERNAL USERS
 *
 * Users without codebase access can extend the platform via configuration:
 *
 * 1. Custom Compliance Frameworks/Rules
 *    → Provide custom YAML config via context.options.complianceConfigPath
 *    → Or runtime override via context.options.complianceRulesOverride
 *    → Framework names are extensible via config (no code changes needed)
 *
 * 2. Custom Capabilities
 *    → Use any string in 'capability' field (e.g., 'db:snowflake', 'storage:gcs')
 *    → Provide target data via custom labels or metadata
 *    → Falls back to CustomCapabilityData type for type safety
 *    → Strategies should handle unknown capabilities gracefully via canHandle()
 *
 * 3. Custom Target Data
 *    → Falls back to CustomCapabilityData in union
 *    → Type system will accept any object with 'type' field
 */
export {};
//# sourceMappingURL=bindings.js.map