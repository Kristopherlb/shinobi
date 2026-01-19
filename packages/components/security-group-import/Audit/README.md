# Security Group Import Component - Audit Documentation

**Component:** `@shinobi/components-security-group-import`  
**Status:** ⚠️ **REQUIRES REMEDIATION** - Compliance framework check in builder  
**Audit Date:** 2025-01-22  

## Compliance Summary

**Overall Score: 85/100** (10/11 audits passing)

### ⚠️ Violations

1. **Compliance Framework Check in ConfigBuilder**
   - **Location:** `packages/components/security-group-import/src/security-group-import.builder.ts:164-166`
   - **Violation:** Direct compliance framework checks (`framework === 'fedramp-high'`) instead of using only `highRiskEnvironment` flag
   - **Remediation:** Remove framework checks, use only `highRiskEnvironment` flag pattern

**Note:** Component has `getComplianceFrameworkDefaults()` but incorrectly checks compliance framework directly instead of using risk-based flags only.

---

**Last Updated:** 2025-01-22

