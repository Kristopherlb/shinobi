# Contributing Conformance Packs & Recipes

## Adding a new Pack
1. Place the original YAML under `vendor/aws-packs/`.
2. Run:
   ```bash
   node tools/import-aws-packs.mjs --in ./vendor/aws-packs --out ./platform-kb/packs/aws --index ./platform-kb/packs/index.yaml --id-prefix aws.custom --scope compliance
   node tools/generate-mappings.mjs ./platform-kb/packs/aws
   node tools/svc-kb-validate.mjs
   ```
3. Open a PR.

## Authoring Guidelines
- Each rule must include `services[]` (specific types; avoid `*`).
- Include `nist_controls[]` where known; otherwise leave empty and enrich later.
- Provide `resource_kinds[]` for CFN targets (e.g., `AWS::S3::Bucket`).

## Observability Recipes
- Every `service_type` referenced by packs must have a recipe in `observability/recipes/`.
- Encode log retention per framework (`commercial`, `fedramp-low|moderate|high`).
