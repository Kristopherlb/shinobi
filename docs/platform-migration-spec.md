Engineering Specification: The Platform Migration Tool (svc migrate)
1. Product Vision & Goals
Vision: To provide a semi-automated, safe, and deterministic tool that accelerates the refactoring of existing AWS CDK codebases into our platform's declarative service.yml manifest format.
Primary Goal: To enable migration with zero changes to the deployed CloudFormation stack state. The ultimate measure of success is an empty cdk diff between the original stack and the migrated stack.
Secondary Goal: To automate 80-90% of the translation process, handling common patterns and components, while providing a clear, actionable report for the remaining manual steps.
Non-Goals:
This tool will not perform a perfect, 100% automated conversion of complex, imperative CDK code.
This tool will not migrate application logic (e.g., Lambda handler code); it only migrates the infrastructure definition.
2. Core Concepts & Workflow
The tool will operate as a "snapshot and reverse-engineer" process. It analyzes the output (the synthesized CloudFormation template) of the existing CDK app and maps it back to our platform's component model.
The workflow is a four-phase, interactive process:
Phase 1: Analysis (Read-Only)
The tool prompts the user for the path to the existing CDK project and the name of the stack to migrate.
It runs cdk synth on the existing project to produce a definitive template.json file.
It parses this template, creating an in-memory inventory of all resources, their properties, and, most importantly, their Logical IDs.
Phase 2: Mapping & Manifest Generation
The tool uses a pre-defined mapping of AWS CloudFormation resource types to our platform's component types (e.g., AWS::RDS::DBInstance -> rds-postgres, AWS::SQS::Queue -> sqs-queue).
It iterates through the resource inventory and groups resources into logical components.
It attempts to reverse-engineer the component's config by mapping the CloudFormation properties back to our component's schema.
It generates a new service.yml manifest based on this mapping.
Phase 3: Logical ID Preservation
This is the most critical step for ensuring a safe migration.
The tool generates a special sidecar file: logical-id-map.json.
This file contains a map of the newly generated Logical ID (from our platform) to the original Logical ID (from the old codebase).
Our platform's Resolver Engine will be enhanced to detect this file. If present, it will use a CDK Aspect to programmatically override the Logical IDs of all synthesized constructs to match the original ones, guaranteeing that CloudFormation sees no changes. This is a direct implementation of the refactoring strategy outlined in The CDK Book [cite: 164-166].
Phase 4: Validation & Reporting
The tool scaffolds a new directory for the migrated service.
It runs svc plan on the newly generated service.yml (using the logical-id-map.json).
It then runs a final cdk diff comparing the template synthesized from the new manifest against the original template.json.
It generates a MIGRATION_REPORT.md detailing what was migrated successfully, what was unmappable, and the result of the final diff.
3. The CLI User Experience (svc migrate)
The command will be interactive to guide the user through the process.
$ svc migrate

? Path to your existing CDK project: ../my-old-api
? Which stack do you want to migrate?: MyOldApiStack
? What is the name of the new service?: shipping-api
? Where should the new project be created?: ./shipping-api

Migrating 'MyOldApiStack' to 'shipping-api'...
(1/4) Analyzing existing stack... [DONE]
      Found 12 resources.
(2/4) Mapping resources and generating manifest... [DONE]
      Mapped 10 resources to 3 components.
      Flagged 2 resources as unmappable.
(3/4) Generating Logical ID map... [DONE]
(4/4) Validating migrated stack... [DONE]

Migration Complete!
-------------------
Final Diff Result: NO CHANGES
Report Location:   ./shipping-api/MIGRATION_REPORT.md
Next Steps:        Review the report and manually migrate unmappable resources.


4. Key Artifacts Generated
In the new ./shipping-api directory:
service.yml: The auto-generated manifest.
logical-id-map.json: The critical mapping file to prevent state loss.
patches.ts: An empty or partially filled file for migrating unmappable resources.
src/: Directory for application code (the tool will attempt to copy the original source).
MIGRATION_REPORT.md: A detailed summary of the migration.
5. Handling Edge Cases & Unmappable Resources
The tool cannot be perfect. It must fail gracefully and provide a clear path for manual intervention.
Definition: An "unmappable resource" is any resource in the original template that does not have a clear mapping to one of our platform's L3 components. This includes:
Custom Resources.
Resources not yet supported by our component library.
Resources with complex, imperative logic that cannot be represented declaratively.
Process:
The tool identifies these resources during the Mapping phase.
It lists them in the MIGRATION_REPORT.md under a section titled "Action Required: Manually Migrate Unmappable Resources."
For each unmappable resource, it provides the original CloudFormation JSON definition.
The report will instruct the developer to use the patches.ts escape hatch to programmatically add these resources back into the stack using L1 (CfnResource) constructs.
The developer can then iteratively run svc plan and cdk diff until the diff is empty, confirming their manual patches are correct.
This specification provides a blueprint for a powerful and, most importantly, safe migration tool that will be critical for driving adoption of our new platform.
