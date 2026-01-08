# RDS PostgreSQL Component - Invalid Default Engine Version

**Ticket ID:** BUG-RDS-POSTGRES-VERSION-001  
**Priority:** 🔴 **P0 - CRITICAL**  
**Status:** Open  
**Component:** `rds-postgres`  
**Created:** 2026-01-07  
**Reporter:** System (from deployment failure)

## 🐛 Issue Summary

The RDS PostgreSQL component defaults to PostgreSQL version `15.4`, which is not available in AWS RDS for all regions. This causes deployment failures when the default version is used without explicit configuration.

## 📋 Error Details

### Error Message
```
Cannot find version 15.4 for postgres (Service: Rds, Status Code: 400, Request ID: 8c92f22f-1a43-4265-8d2f-bc456c90f503)
```

### Stack Trace
```
CREATE_FAILED | AWS::RDS::DBInstance | database/Database (databaseDatabaseBBB9D38F) 
Resource handler returned message: "Cannot find version 15.4 for postgres"
```

### Affected Region
- `us-west-2` (tested)
- Potentially other regions where PostgreSQL 15.4 is not available

## 🔍 Root Cause Analysis

### Problem Location
The component has hardcoded PostgreSQL version `15.4` in multiple places:

1. **Schema Default** (`packages/components/rds-postgres/src/rds-postgres.builder.ts:187`):
   ```typescript
   engineVersion: { type: 'string', default: '15.4' }
   ```

2. **Hardcoded Fallback** (`packages/components/rds-postgres/src/rds-postgres.builder.ts:407`):
   ```typescript
   protected getHardcodedFallbacks(): Partial<RdsPostgresConfig> {
     return {
       instance: {
         engineVersion: '15.4',  // ❌ Invalid default
         // ...
       }
     };
   }
   ```

3. **Normalization** (`packages/components/rds-postgres/src/rds-postgres.builder.ts:587`):
   ```typescript
   engineVersion: config.instance?.engineVersion ?? '15.4'  // ❌ Invalid fallback
   ```

### Why This Fails
- PostgreSQL version availability varies by AWS region
- Version `15.4` may not exist or may have been deprecated/removed
- The component doesn't validate version availability before deployment
- No fallback mechanism when default version is unavailable

## 📝 Reproduction Steps

1. Create a `service.yml` with RDS PostgreSQL component:
   ```yaml
   components:
     - name: database
       type: rds-postgres
       config:
         instance:
           instanceType: db.t3.micro
           allocatedStorage: 20
         # No engineVersion specified - uses default 15.4
   ```

2. Deploy to region `us-west-2` (or any region where 15.4 is unavailable):
   ```bash
   pnpm shinobi up --file service.yml --env dev --yes
   ```

3. **Expected:** Deployment succeeds with a valid default version  
4. **Actual:** Deployment fails with "Cannot find version 15.4 for postgres"

## 🎯 Impact

### Severity: **CRITICAL**
- **Blocks deployments** in regions where 15.4 is unavailable
- **Affects all users** who don't explicitly specify `engineVersion`
- **No workaround** except manually specifying a valid version in every service.yml
- **Violates platform principle** of "safe defaults that work everywhere"

### Affected Users
- All services using `rds-postgres` component without explicit `engineVersion`
- New users following component documentation/examples
- CI/CD pipelines that rely on component defaults

## ✅ Expected Behavior

1. Component should default to a **widely available** PostgreSQL version
2. Default version should be **validated** against AWS RDS API for the target region
3. If default version is unavailable, component should:
   - Query AWS for available versions in the region
   - Select the latest available version from a supported major version (e.g., 15.x, 16.x, 17.x)
   - Log a warning about version selection
   - Continue with deployment

## 🔧 Proposed Solution

### Option 1: Query AWS for Available Versions (Recommended)
- During synthesis, query `describe-db-engine-versions` API for the target region
- Select the latest available version from a stable major version (e.g., 16.x or 17.x)
- Cache version selection per region to avoid repeated API calls
- Log the selected version for transparency

### Option 2: Use More Recent Default Version
- Change default to `16.1` or `17.1` (more likely to be available)
- Still requires validation to ensure availability

### Option 3: Make Version Required
- Remove default entirely
- Require explicit `engineVersion` in service.yml
- Provide clear error message if missing
- **Not recommended** - violates "safe defaults" principle

### Implementation Notes
- Version resolution should happen in `ConfigBuilder` during `buildSync()`
- Use AWS SDK `RDS.describeDBEngineVersions()` to query available versions
- Consider caching results per region to improve performance
- Add structured logging for version selection decisions

## 📚 Related Files

- `packages/components/rds-postgres/src/rds-postgres.builder.ts` (lines 187, 407, 587)
- `packages/components/rds-postgres/src/rds-postgres.component.ts` (line 832 - `resolveEngineVersion()`)
- `packages/components/rds-postgres/Config.schema.json`

## 🧪 Testing Requirements

- [ ] Test deployment in `us-west-2` without explicit version
- [ ] Test deployment in `us-east-1` without explicit version
- [ ] Test deployment in `eu-west-1` without explicit version
- [ ] Verify version selection is logged
- [ ] Verify explicit version override still works
- [ ] Test with invalid version specified (should fail gracefully)

## 📊 Priority Justification

**P0 - CRITICAL** because:
1. **Blocks deployments** - Users cannot deploy RDS PostgreSQL without workarounds
2. **Affects all users** - Anyone using component defaults is impacted
3. **No workaround** - Requires manual version specification in every service.yml
4. **Platform principle violation** - Defaults should "just work"

## 🔗 Related Issues

- Component defaults should be validated against AWS APIs
- Consider similar issues in other database components (rds-mysql, rds-mariadb, etc.)

## 📝 Additional Notes

- AWS RDS PostgreSQL versions vary by region
- Version availability changes over time (deprecations, new releases)
- Component should be resilient to version availability changes
- Consider adding a version validation step in `svc validate` command

---

**Next Steps:**
1. Investigate which PostgreSQL versions are available in `us-west-2`
2. Implement version resolution logic in ConfigBuilder
3. Add version validation tests
4. Update component documentation with version selection behavior

