# Summary
- Component(s) added/modified:
- Compliance framework(s): <!-- commercial | fedramp-low | fedramp-moderate | fedramp-high -->
- Packs referenced: <!-- list ids from /platform-kb/packs/index.yaml -->
- Related standards: Tagging, Structured Logging, OpenTelemetry, IAM Auditing, Deprecation

## Checklist (Platform Standards)
- [ ] Component implements `synth()` sequence (build config → helper resources → L2 constructs → tags → register constructs → register capabilities)
- [ ] ConfigBuilder implements hardcoded + compliance defaults (5-layer precedence chain)
- [ ] Standard tags applied (includes `compliance:framework`, `owner`, `environment`)
- [ ] Structured logging via `@platform/logger`; no `console.log`
- [ ] OTel auto-instrumentation attached (env vars, ADOT layer/sidecar/agent)

## Checklist (Compliance & Conformance)
- [ ] Packs selected are included in `/audit/component.plan.json`
- [ ] Unit tests assert rule-critical properties (e.g., encryption/logging)
- [ ] REGO stubs generated for posture rules; `# REVIEW` included where judgment required
- [ ] OSCAL stub updated with mapped NIST control IDs
- [ ] Suppressions (if any) include `justification`, `expiresOn`

## Artifacts
- [ ] `/audit/component.plan.json` updated
- [ ] `/audit/rego/*.rego` generated/updated
- [ ] `/observability/alarms-config.json` and `/observability/otel-dashboard-template.json` added/updated
- [ ] Coverage report (> 90% lines) attached or linked

## Notes
- Link to ADRs / design docs if applicable.
