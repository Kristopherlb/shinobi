# Tools

- `import-aws-packs.mjs`: Normalize AWS Conformance Pack YAML into `platform-kb/packs/aws/*.yaml`.
- `generate-mappings.mjs`: Refresh `nist-to-config.yaml` and `config-to-service.yaml` from normalized packs.
- `svc-kb-validate.mjs`: Validate KB presence/linkage (extend to JSON Schema checks).
- `svc-plan.mjs`: Placeholder for your platform CLI's 'plan' step to emit audit artifacts.
