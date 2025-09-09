Technical Specification: Monorepo Version Control and Release Process



Document Identifier: PLAT-SPEC-VC-82079-1
Version: 1.1.0
Date: 2025-09-09
Status: Approved
Standard: IEC/IEEE 82079-1:2019 (Adapted)
1. Introduction
1.1 Purpose
This specification provides the official standard and process for version control, change management, and package publication for the cdk-platform monorepo. The primary objective is to establish a predictable, automated, and traceable release workflow. Adherence to this standard ensures that all packages are versioned consistently, changelogs are maintained accurately, and the process of publishing artifacts is secure and reliable.
1.2 Scope
This document applies to all software packages intended for distribution located within the /packages directory of the cdk-platform monorepo. This includes:
/packages/contracts
/packages/core-engine
All component packages within /packages/components/*
This specification governs the entire lifecycle of a code change, from commit message to final package publication. Tooling internal to the platform team located in /tools is exempt from the publishing requirements unless explicitly packaged for distribution.
2. Normative References
Semantic Versioning 2.0.0 (SemVer): All package versions must adhere to the SemVer standard. (Available at https://semver.org)
Conventional Commits 1.0.0: Commit messages must follow this specification to provide semantic meaning. (Available at https://www.conventionalcommits.org)
Git: The distributed version control system used for source code management.
3. Terms and Definitions
Monorepo: A single version control repository that holds the source code for multiple, distinct projects or packages.
Package: An independently versioned and publishable unit of code located within the /packages directory (e.g., contracts, rds-postgres).
pnpm: A fast, disk space-efficient package manager that provides first-class support for monorepo workspace management.
Changesets: A tool for managing versioning and changelogs in multi-package repositories. It separates the intent to release a version from the act of releasing, making it ideal for CI/CD automation.
Trunk-Based Development: A branching model where all development is done on a single main branch (trunk), augmented by short-lived feature branches.
Conventional Commits: A specification for commit messages that creates an explicit history, enabling automation of version bumping and changelog generation.
4. Version Control Standard
This section defines the core pillars of the version control strategy.
4.1 Monorepo Management Tool
The cdk-platform monorepo shall be managed using pnpm workspaces. This ensures efficient dependency management and provides a unified command-line interface for managing all packages.
4.2 Pillar 1: Branching Model
The repository shall use a Trunk-Based Development strategy.
main is the primary branch and represents the trunk. All new releases are cut from this branch.
All development work must be done on short-lived feature branches created from main.
Direct commits to main are forbidden.
4.2.1 Hotfix Process
For critical bug fixes that must be applied to a previously released version, a temporary release branch shall be used.
A branch (e.g., release/v8.0) shall be created from the Git tag of the version requiring a patch (e.g., v8.0.0).
The fix shall be committed to this release branch.
A patched version (e.g., v8.0.1) shall be published from this branch.
The commit containing the fix must then be cherry-picked into main to prevent regressions.
4.3 Pillar 2: Commit Hygiene
Commit messages shall follow the Conventional Commits 1.0.0 specification. This is mandatory as it enables the reliable automation of versioning and changelog generation via the Changesets tool.
Format: type(scope): subject
Example: fix(rds-postgres): correct deletion protection logic
4.4 Pillar 3: Change Integration (The Quality Gate)
All code changes must be integrated into the main branch via a Pull Request (PR). The PR process serves as the primary quality gate and shall enforce the following:
PR Template: PRs must use a standardized template that requires the author to describe the purpose, implementation, and testing of their changes.
Required Status Checks: A PR cannot be merged unless the following automated checks pass:
CI Build (compilation, linting).
Unit and Integration Tests.
Code Coverage above the defined threshold.
Changeset Validation: A check that fails if /packages code was changed without a corresponding changeset file.
Code Review: A PR must receive at least one approval from a designated code owner. Critical packages (contracts, core-engine) require two approvals.
Merge Strategy: PRs shall be merged into main using the Squash and Merge strategy. This creates a clean, atomic history on the trunk where each commit corresponds to a single, complete PR.
4.5 Pillar 4: Versioning and Release
Versioning Standard: All packages shall strictly adhere to Semantic Versioning 2.0.0.
MAJOR version bump for incompatible API changes.
MINOR version bump for adding backward-compatible functionality.
PATCH version bump for backward-compatible bug fixes.
Release Marker: Every automated publication of a new package version must be accompanied by a corresponding Git Tag. The tag serves as the immutable, auditable pointer to the exact state of the code for that release.
Tag Format: v@<package-name>@<version> (e.g., v@rds-postgres@2.4.0)
4.6 Summary of Standards
Pillar
Recommended Standard
Why
Branching
Trunk-Based Development (with release branches for hotfixes)
Aligns with CI/CD, maximizes velocity, reduces merge complexity.
Commits
Conventional Commits
Enables reliable automation of versioning and changelogs.
Integration
Strict Pull Request Workflow (Templates, Checks, Squash Merge)
Acts as the primary automated quality gate for the trunk.
Versioning
Semantic Versioning + Git Tags
Provides a clear, predictable versioning scheme and an immutable audit trail.

5. Process Description
This section details the step-by-step workflow for developers and the automated CI/CD system.
5.1 Step 1: Local Development Workflow
Create Branch: From an up-to-date main branch, create a feature branch.
git checkout main
git pull origin main
git checkout -b feat/my-new-feature


Make Changes: Implement the code changes in the relevant package(s).
Generate Changeset: After completing the changes, run the changeset command to declare the intent to version.
pnpm changeset

The CLI will interactively prompt you to:
Select the packages that have been modified.
Select the SemVer bump level (MAJOR, MINOR, or PATCH) for each selected package.
Provide a concise, clear description of the change. This description will be used to generate the final CHANGELOG.md.
Commit Changeset: A new markdown file will be generated in the .changeset/ directory. Add this file to git and commit it along with your code changes, following the Conventional Commits standard.
git add .
git commit -m "feat(rds-postgres): add new feature"


Open Pull Request: Push your branch to the remote and open a Pull Request targeting the main branch.
5.2 Step 2: Code Review and Merge
Automated Checks: The CI/CD pipeline will automatically run all required status checks as defined in section 4.4.
Peer Review: The team reviews the code for quality and correctness.
Merge: Upon approval and successful checks, the PR is squash-merged into main.
5.3 Step 3: Automated Release and Publication (CI/CD)
The merging of a PR containing a changeset file into main triggers a two-stage automated release process.
Version Packages (Stage 1):
The changeset version command is executed.
This command consumes all markdown files in the .changeset/ directory.
It automatically performs the following:
Bumps the version numbers in the package.json of all affected packages.
Updates the CHANGELOG.md file for each affected package with the descriptions from the changeset files.
Deletes the consumed changeset files.
The CI/CD system then commits these changes and pushes them to the main branch.
Publish Packages (Stage 2):
The commit from the versioning stage triggers the publication workflow.
The CI/CD system creates the appropriate Git Tag(s) for the release.
The system authenticates with the configured package registry.
It runs pnpm publish for each new package version identified in the release. This ensures only packages with updated versions are published.
6. Information for Use: Tool Configuration
6.1 Recommended Tooling
Monorepo Manager: pnpm
Versioning & Changelog: Changesets
6.2 Configuration for Publishing
The destination of the published packages is controlled via the .npmrc file and CI/CD environment variables.
Example for Public NPM:
Create a .npmrc file in the root of the repository.
//registry.npmjs.org/:_authToken=${NPM_TOKEN}


The NPM_TOKEN must be configured as a secret in the CI/CD environment.
Example for AWS CodeArtifact:
The CI/CD pipeline must be configured with AWS credentials and run the AWS CLI to get an authorization token.
# In your CI/CD script before publishing
export CODEARTIFACT_AUTH_TOKEN=`aws codeartifact get-authorization-token --domain <your-domain> --domain-owner <your-account-id> --query authorizationToken --output text`


And your .npmrc file:
//<your-domain>-<your-account-id>.d.codeartifact.<region>[.amazonaws.com/npm/](https://.amazonaws.com/npm/)<your-repo>/:_authToken=${CODEARTIFACT_AUTH_TOKEN}
@<scope>:registry=https://<your-domain>-<your-account-id>.d.codeartifact.<region>[.amazonaws.com/npm/](https://.amazonaws.com/npm/)<your-repo>/


Example for JFrog Artifactory:
//<your-artifactory-url>/api/npm/<your-repo>/:_authToken=${ARTIFACTORY_TOKEN}
@<scope>:registry=https://<your-artifactory-url>/api/npm/<your-repo>/


The ARTIFACTORY_TOKEN must be configured as a secret in the CI/CD environment.
This flexible configuration allows for easily adding or changing publishing destinations without altering the core release process.
