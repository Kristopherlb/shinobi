#!/usr/bin/env bash
# Generate SLSA provenance predicate JSON for a subject (OCI artifact digest).
# Usage: gen-provenance.sh <subject_ref> <service> <version> [compliance_framework] [runner_image] [image_refs...]

set -euo pipefail

SUBJECT_REF="${1:?subject_ref (e.g., registry/org/bundles@sha256:...)}"
SERVICE_NAME="${2:?service_name}"
VERSION_TAG="${3:?version_tag}"
COMPLIANCE_FRAMEWORK="${4:-commercial}"
RUNNER_IMAGE="${5:-registry/org/platform-runner:1.5.0}"
shift 5 || true
IMAGE_REFS=("$@")    # optional: any container images built during this run

# Build context
BUILD_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
BUILD_INVOCATION_ID="${CI_BUILD_ID:-$(uuidgen)}"
GIT_COMMIT="${GIT_COMMIT:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
GIT_BRANCH="${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)}"
BUILDER_ID="${BUILDER_ID:-dagger-engine-pool}"
BUILDER_VERSION="${BUILDER_VERSION:-1.0.0}"
DAGGER_VERSION="${DAGGER_VERSION:-$(dagger version 2>/dev/null || echo unknown)}"

# Resolve runner digest (best-effort)
RUNNER_DIGEST="$(skopeo inspect --no-tags --format '{{.Digest}}' "docker://${RUNNER_IMAGE}" 2>/dev/null || echo unknown)"

# Materials: repo + runner + built images
materials_json=$(jq -n --arg git "$GIT_COMMIT" \
  --arg runner "$RUNNER_IMAGE" \
  --arg rdig "$RUNNER_DIGEST" \
  '[
     { "uri": ("git+https://example.invalid/repo@" + $git),
       "digest": { "gitCommit": $git } },
     { "uri": ("pkg:oci/" + $runner),
       "digest": { "sha256": $rdig } }
   ]')

# Append image refs if provided
for ref in "${IMAGE_REFS[@]:-}"; do
  dig="$(skopeo inspect --no-tags --format '{{.Digest}}' "docker://${ref}" 2>/dev/null || echo unknown)"
  materials_json="$(jq --arg img "$ref" --arg dg "$dig" \
    '. + [{ "uri": ("pkg:oci/" + $img), "digest": { "sha256": $dg } }]' \
    <<< "$materials_json")"
done

# Emit SLSA provenance predicate (v0.2 style; cosign sets predicateType)
jq -n \
  --arg buildType "https://slsa.dev/provenance/v0.2" \
  --arg invocationId "$BUILD_INVOCATION_ID" \
  --arg startedOn "$BUILD_TIMESTAMP" \
  --arg finishedOn "$BUILD_TIMESTAMP" \
  --arg builderId "$BUILDER_ID" \
  --arg builderVersion "$BUILDER_VERSION" \
  --arg service "$SERVICE_NAME" \
  --arg version "$VERSION_TAG" \
  --arg framework "$COMPLIANCE_FRAMEWORK" \
  --arg dagger "$DAGGER_VERSION" \
  --arg runnerImg "$RUNNER_IMAGE" \
  --argjson materials "$materials_json" \
'{
  "buildType": $buildType,
  "buildInvocationID": $invocationId,
  "buildStartTime": $startedOn,
  "buildFinishTime": $finishedOn,
  "builder": {
    "id": $builderId,
    "version": $builderVersion
  },
  "buildConfig": {
    "service": $service,
    "version": $version,
    "compliance_framework": $framework,
    "dagger_version": $dagger,
    "runner_image": $runnerImg
  },
  "metadata": {
    "invocationId": $invocationId,
    "startedOn": $startedOn,
    "finishedOn": $finishedOn,
    "reproducible": true,
    "completeness": { "parameters": true, "environment": true, "materials": true }
  },
  "materials": $materials
}'
