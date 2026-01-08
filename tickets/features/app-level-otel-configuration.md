# Feature Request: App-Level OpenTelemetry Configuration with Workload-Specific Settings

**Type:** Feature Request  
**Priority:** P1 (High) - Required for production observability  
**Status:** 🟢 Planned  
**Created:** 2026-01-15  
**Component:** Platform Infrastructure, Observability  
**Labels:** `observability`, `otel`, `configuration`, `sla`, `metrics`, `workload-specific`

---

## Summary

Implement app-level OpenTelemetry (OTel) configuration in `service.yml` that provides baseline observability settings while allowing workload-specific overrides for SLAs, metrics, sampling rates, and other observability parameters. This enables teams to configure observability at the application level while maintaining flexibility for individual components.

## Problem Statement

Currently, OTel configuration is only available at the component level in `service.yml` or via platform defaults in `config/{framework}.yml`. This creates several limitations:

1. **No App-Level Baseline**: Teams cannot set application-wide OTel defaults (collector endpoint, sampling rates, custom attributes)
2. **Duplication**: Each component must repeat the same OTel configuration
3. **No Workload-Specific SLAs**: Cannot configure different sampling rates or metrics intervals based on workload criticality
4. **Inconsistent Configuration**: Components may have different OTel settings, making correlation difficult
5. **No Centralized Management**: Changes to OTel settings require updating multiple component configs

### Current State

- OTel config exists only at component level: `components[].config.observability`
- Platform defaults exist in `config/{framework}.yml` but are global per framework
- No way to set app-level baseline that components inherit
- No way to configure workload-specific SLAs (e.g., critical vs. non-critical workloads)

### Use Cases

1. **Application-Wide Collector Endpoint**: Set OTel collector endpoint once for entire application
2. **Workload-Specific Sampling**: High-priority workloads get 100% sampling, low-priority get 10%
3. **SLA-Based Metrics Intervals**: Critical workloads report metrics every 30s, others every 5min
4. **Custom Attributes**: Application-level attributes (team, project, cost-center) applied to all components
5. **Component Overrides**: Individual components can override app-level settings when needed

## Proposed Solution

Add app-level `observability` configuration to `service.yml` with the following structure:

```yaml
service: api-s3-service
owner: platform-team
complianceFramework: commercial
region: us-west-2

# App-level observability configuration (baseline)
observability:
  # Collector configuration
  collectorEndpoint: "http://adot-collector.internal:4317"
  collectorProtocol: "grpc"
  
  # Baseline sampling and metrics
  baseline:
    tracesSamplingRate: 0.1  # 10% sampling for non-critical workloads
    metricsIntervalSeconds: 300  # 5 minutes for non-critical
    logsRetentionDays: 30
  
  # Workload-specific configurations
  workloads:
    critical:
      tracesSamplingRate: 1.0  # 100% sampling for critical workloads
      metricsIntervalSeconds: 30  # 30 seconds for critical
      logsRetentionDays: 365
      alarms:
        enabled: true
        notificationTopicArn: "arn:aws:sns:..."
    
    standard:
      tracesSamplingRate: 0.1  # Inherit from baseline
      metricsIntervalSeconds: 300  # Inherit from baseline
      logsRetentionDays: 30  # Inherit from baseline
    
    low-priority:
      tracesSamplingRate: 0.01  # 1% sampling for low-priority
      metricsIntervalSeconds: 600  # 10 minutes
      logsRetentionDays: 7
  
  # Application-wide custom attributes
  customAttributes:
    team: "platform-team"
    project: "api-s3-service"
    costCenter: "engineering"
    environment: "${env:ENVIRONMENT}"
  
  # SLA-based configurations
  slas:
    p99-latency-ms: 500
    error-rate-threshold: 0.01
    availability-target: 0.999

components:
  - name: file-storage-api
    type: lambda-api
    workload: critical  # Reference to workload config
    config:
      # Component can override app-level settings
      observability:
        tracesSamplingRate: 0.5  # Override: 50% for this component
        customAttributes:
          component: "file-api"  # Merged with app-level attributes
```

## Requirements

### Functional Requirements

1. **App-Level Observability Config**
   - Add `observability` section to top-level `service.yml` schema
   - Support baseline configuration (collector endpoint, default sampling, metrics intervals)
   - Support workload-specific configurations (critical, standard, low-priority)
   - Support SLA-based configurations (latency targets, error rates, availability)

2. **Configuration Precedence Chain**
   - Component config (highest priority) → Workload config → Baseline config → Platform defaults
   - Merge custom attributes (app-level + component-level)
   - Component can reference workload by name: `workload: critical`

3. **Workload Classification**
   - Support named workloads: `critical`, `standard`, `low-priority`
   - Components reference workload via `workload: <name>` field
   - Workload configs inherit from baseline, can override any setting

4. **SLA Configuration**
   - Define SLA targets (P99 latency, error rate, availability)
   - Use SLA configs to auto-generate alarms and dashboards
   - Different SLAs per workload type

5. **Metrics Configuration**
   - Per-workload metrics intervals
   - Custom metric dimensions
   - Metric export configuration (OTLP, CloudWatch, etc.)

6. **Context Loading**
   - Load app-level `observability` into `ComponentContext.observability`
   - Merge with component config during `ObservabilityService.buildConfig()`
   - Preserve precedence chain (component > workload > baseline > platform)

### Non-Functional Requirements

1. **Backward Compatibility**: Existing component-level configs continue to work
2. **Schema Validation**: Validate app-level observability config against schema
3. **Documentation**: Update manifest schema docs with observability section
4. **Testing**: Unit tests for config merging and precedence
5. **Performance**: No impact on synthesis time

## Architecture

### Configuration Precedence

```
Component Config (service.yml components[].config.observability)
    ↓ (if not specified)
Workload Config (service.yml observability.workloads[<name>])
    ↓ (if not specified)
Baseline Config (service.yml observability.baseline)
    ↓ (if not specified)
Platform Defaults (config/{framework}.yml defaults.observability)
    ↓ (if not specified)
Hardcoded Fallbacks (ObservabilityService.getFallbackConfig())
```

### Data Flow

```
service.yml (app-level observability)
    ↓
Manifest Parser
    ↓
ComponentContext.observability (app-level config)
    ↓
Component Spec (component-level config + workload reference)
    ↓
ObservabilityService.buildConfig()
    ↓
Merged ObservabilityConfig
    ↓
Component.configureObservability()
    ↓
Environment Variables (injected into resources)
```

### Integration Points

1. **Manifest Schema** (`docs/spec/manifest-schema.yaml`):
   - Add `observability` section to top-level schema
   - Add `workload` field to component schema
   - Validate workload references

2. **ComponentContext** (`packages/core/src/platform/contracts/component-interfaces.ts`):
   - Extend `ComponentContext.observability` to include app-level config
   - Add workload classification

3. **ObservabilityService** (`packages/core/src/platform/services/observability/observability.service.ts`):
   - Update `buildConfig()` to merge app-level, workload, and component configs
   - Implement precedence chain logic
   - Merge custom attributes

4. **Manifest Parser** (`packages/core/src/services/manifest-parser/`):
   - Parse app-level `observability` section
   - Load into `ComponentContext`
   - Validate workload references

## Implementation Plan

### Phase 1: Schema & Parsing (1 week)

1. **Update Manifest Schema**
   - Add `observability` section to top-level schema
   - Define workload configuration structure
   - Add `workload` field to component schema
   - Add SLA configuration structure

2. **Update Manifest Parser**
   - Parse app-level `observability` section
   - Load into `ComponentContext.observability`
   - Validate workload references exist
   - Validate SLA configurations

3. **Schema Validation**
   - Add JSON Schema for app-level observability
   - Validate during manifest parsing
   - Provide clear error messages

### Phase 2: Context & Merging (1 week)

1. **Extend ComponentContext**
   - Add app-level observability config to context
   - Add workload classification support
   - Preserve backward compatibility

2. **Update ObservabilityService**
   - Implement precedence chain in `buildConfig()`
   - Merge app-level baseline → workload → component configs
   - Merge custom attributes (app + component)
   - Handle workload references

3. **Configuration Merging Logic**
   - Deep merge for nested configs
   - Attribute merging (app-level + component-level)
   - Precedence resolution

### Phase 3: SLA & Metrics Integration (1 week)

1. **SLA Configuration**
   - Parse SLA targets from config
   - Generate alarms based on SLA targets
   - Create dashboards with SLA indicators

2. **Metrics Configuration**
   - Apply workload-specific metrics intervals
   - Configure metric dimensions
   - Set up metric export (OTLP, CloudWatch)

3. **Workload Classification**
   - Support `workload: <name>` in component config
   - Resolve workload config from app-level config
   - Apply workload settings to component

### Phase 4: Testing & Documentation (1 week)

1. **Unit Tests**
   - Config merging tests
   - Precedence chain tests
   - Workload resolution tests
   - SLA configuration tests

2. **Integration Tests**
   - End-to-end config loading
   - Component synthesis with app-level config
   - Workload-specific settings applied

3. **Documentation**
   - Update manifest schema documentation
   - Add observability configuration guide
   - Examples for different workload types
   - Migration guide from component-level to app-level

## Usage Examples

### Example 1: App-Level Baseline with Workload Overrides

```yaml
service: payment-service
observability:
  collectorEndpoint: "http://adot-collector.prod:4317"
  baseline:
    tracesSamplingRate: 0.1
    metricsIntervalSeconds: 300
  workloads:
    critical:
      tracesSamplingRate: 1.0
      metricsIntervalSeconds: 30
    standard:
      tracesSamplingRate: 0.1  # Inherit from baseline
  customAttributes:
    team: "payments"
    costCenter: "revenue"

components:
  - name: payment-processor
    type: lambda-api
    workload: critical  # Uses critical workload config
    config:
      # Component inherits: 100% sampling, 30s metrics, app-level attributes
      
  - name: payment-logger
    type: lambda-worker
    workload: standard  # Uses standard workload config
    config:
      # Component inherits: 10% sampling, 5min metrics, app-level attributes
```

### Example 2: Component Override

```yaml
service: api-service
observability:
  baseline:
    tracesSamplingRate: 0.1
  customAttributes:
    team: "platform"

components:
  - name: health-check
    type: lambda-api
    config:
      observability:
        tracesSamplingRate: 0.0  # Override: No sampling for health checks
        customAttributes:
          component: "health"  # Merged with app-level: team=platform, component=health
```

### Example 3: SLA-Based Configuration

```yaml
service: critical-api
observability:
  baseline:
    tracesSamplingRate: 0.1
  workloads:
    critical:
      tracesSamplingRate: 1.0
      metricsIntervalSeconds: 30
  slas:
    p99-latency-ms: 100
    error-rate-threshold: 0.001
    availability-target: 0.9999

components:
  - name: api-endpoint
    type: lambda-api
    workload: critical
    # SLA-based alarms auto-generated from slas config
```

## Success Criteria

1. ✅ **App-Level Config**: App-level `observability` section in `service.yml` is parsed and loaded
2. ✅ **Workload Support**: Components can reference workloads and inherit workload-specific settings
3. ✅ **Precedence Chain**: Configuration precedence (component > workload > baseline > platform) works correctly
4. ✅ **SLA Integration**: SLA configurations generate appropriate alarms and dashboards
5. ✅ **Backward Compatibility**: Existing component-level configs continue to work
6. ✅ **Attribute Merging**: App-level and component-level custom attributes are merged correctly
7. ✅ **Schema Validation**: App-level observability config is validated against schema
8. ✅ **Documentation**: Complete documentation with examples

## Dependencies

- Manifest schema parser (`packages/core/src/services/manifest-parser/`)
- ObservabilityService (`packages/core/src/platform/services/observability/`)
- ComponentContext interface (`packages/core/src/platform/contracts/component-interfaces.ts`)
- Platform configuration system (`config/{framework}.yml`)

## Related Work

- **Current State**: Component-level OTel config only (`components[].config.observability`)
- **Platform Config**: Global defaults in `config/{framework}.yml`
- **Observability Standard**: Platform OpenTelemetry Observability Standard v1.0
- **Configuration Standard**: Platform Configuration Standard (5-layer precedence chain)

## Notes

- **Priority**: P1 - Required for production observability at scale
- **Complexity**: Medium - Requires changes to manifest parser, context, and observability service
- **Risk**: Low - Backward compatible, existing configs continue to work
- **Timeline**: 4 weeks for full implementation
- **Alternative**: Could use environment variables, but less declarative and harder to manage

## Acceptance Criteria

- [ ] App-level `observability` section added to manifest schema
- [ ] Manifest parser loads app-level observability into `ComponentContext`
- [ ] `ObservabilityService.buildConfig()` implements precedence chain
- [ ] Workload classification supported (`workload: <name>`)
- [ ] SLA configuration parsed and used for alarm generation
- [ ] Custom attributes merged (app-level + component-level)
- [ ] Backward compatibility maintained (component-level configs work)
- [ ] Schema validation for app-level observability
- [ ] Unit tests with >90% coverage
- [ ] Integration tests for full config flow
- [ ] Documentation updated with examples
- [ ] Migration guide from component-level to app-level config

---

**Estimated Effort:** 4 weeks  
**Complexity:** Medium  
**Risk:** Low (backward compatible)

