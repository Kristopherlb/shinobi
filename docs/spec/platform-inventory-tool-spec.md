Platform Inventory Tool Specification
Version: 1.0
Status: Proposed
Last Updated: September 8, 2025

1. Overview & Vision
This document defines the specification for the platform's inventory and analysis tool, available via the svc inventory command. The primary goal of our platform is to provide high-value, reusable components that accelerate development. To do this effectively, we must base our component roadmap on data, not guesswork.

The vision is to provide a powerful tool that can be run against any existing AWS CDK codebase to automatically discover which AWS resources are being used, how frequently, and in what common patterns. This provides the platform team with a data-driven backlog, ensuring that we prioritize building the L3 components that will have the greatest impact on developer productivity.

2. Guiding Principles
Read-Only Analysis: The tool MUST only analyze code. It MUST NOT make any modifications to the source files.

Pattern Recognition: The tool should not just count individual resources; it should actively look for common groupings of resources that represent a potential L3 component pattern.

Actionable Output: The output MUST be a clear, human-readable report that provides both a raw inventory and a prioritized list of component candidates.

3. Technical Implementation
The svc inventory command will be a static analysis tool that leverages ts-morph to parse the Abstract Syntax Tree (AST) of a given CDK project.

Discovery Process:

The tool recursively scans all .ts files within the target directory.

It builds an AST for each file.

It traverses the tree, looking for new X(...) instantiation expressions where X is a class imported from the aws-cdk-lib.

It records every L2 construct instantiation it finds, along with its file location.

Pattern Analysis:

After building the raw inventory, the tool analyzes the co-location of resources.

It identifies common groupings within the same file or construct (e.g., an apigateway.RestApi created alongside a lambda.Function and a dynamodb.Table).

It counts the frequency of these patterns across the entire codebase.

4. The User Experience
The platform engineer runs a single, simple command.

# Analyze a specific project directory
svc inventory --directory ../my-old-service

# Or analyze the entire monorepo
svc inventory --directory ./

5. The Output: The INVENTORY_REPORT.md
The command will generate a clear, human-readable Markdown report detailing its findings.

INVENTORY_REPORT.md
Platform Inventory Report
Scanned Directory: ../my-old-service
Timestamp: 2025-09-08T08:30:00Z

1. Raw Construct Inventory
This table shows a raw count of all AWS CDK L2 constructs found in the codebase.

Construct Type

Count

Example File Locations

lambda.Function

12

lib/api-stack.ts, lib/worker-stack.ts

s3.Bucket

8

lib/assets-stack.ts, lib/data-lake.ts

dynamodb.Table

6

lib/api-stack.ts

apigateway.RestApi

5

lib/api-stack.ts

sqs.Queue

4

lib/worker-stack.ts

...and so on





2. Identified Patterns & Component Candidates
This section identifies frequently co-located constructs that are strong candidates for being encapsulated into a new, reusable L3 platform component.

Candidate: serverless-api (High Priority)
Pattern: apigateway.RestApi -> lambda.Function -> dynamodb.Table

Frequency: Detected 5 times across the codebase.

Recommendation: This is a very strong candidate for a new lambda-api component in our platform library. It would significantly reduce boilerplate for our API teams.

Found In:

lib/users-api.ts

lib/orders-api.ts

lib/products-api.ts

...etc.

Candidate: event-processor (Medium Priority)
Pattern: s3.Bucket -> sqs.Queue -> lambda.Function

Frequency: Detected 3 times across the codebase.

Recommendation: A good candidate for a new s3-triggered-worker or similar component.

Found In:

lib/image-processing.ts

lib/document-analysis.ts

...etc.

6. Handling Edge Cases & Unmappable Resources
The tool cannot be perfect. It must fail gracefully and provide a clear path for manual review.

Definition: An "unmappable resource" is any resource instantiation that the tool cannot confidently categorize, such as constructs with complex, imperative logic (e.g., a resource created inside an if block or a for loop).

Process:

The tool identifies these resources during the analysis phase.

It lists them in the INVENTORY_REPORT.md under a dedicated section titled "Action Required: Review Unmappable Resources."

For each unmappable resource, it provides the file name and line number where it was found.

This gives the platform team a clear, actionable list of the complex, bespoke infrastructure patterns that may require a more nuanced component design or may not be suitable for abstraction.

7. Integration into the Platform Lifecycle
This tool is a core part of the platform engineering team's workflow for managing the component library's roadmap.

Quarterly Review: The svc inventory command should be run against all service repositories on a quarterly basis.

Roadmap Planning: The generated reports serve as a primary data source for the platform team's quarterly planning sessions, helping them prioritize which new components to build based on demonstrated, real-world demand from development teams.