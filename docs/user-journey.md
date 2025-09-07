Here is a comprehensive, step-by-step journey of a developer using the platform, from the initial idea to a fully deployed and tested service in a live environment.
This narrative combines the user's actions with the platform's internal workings, detailing how our design patterns and components work together at each stage.
The Complete User & Code Journey
Phase 1: Local Development & Intent Definition
This phase is entirely focused on the developer's experience on their local machine.
Step 1: Initialization (The "First 15 Minutes")
User: A developer has been tasked with creating a new "shipping-api" service. They start in an empty directory and run a single command: svc init.
Platform (svc init): The CLI launches an interactive survey, asking for the service name, owner, the required compliance framework (commercial or fedramp-high), and an initial template (e.g., lambda-api-with-db).
Result: The tool scaffolds a new project directory containing a service.yml pre-filled with their answers, boilerplate Lambda handler code in src/, and a commented-out patches.ts file.
Step 2: Defining the Service (Declaring Intent)
User: The developer opens the service.yml manifest. They add and configure the components their service needs, such as an SQS queue. They might also reference an external environment configuration file for their region-specific settings (environments: { $ref: './config/environments.yml' }).
If they need a resource not yet available in the component library (e.g., an ElastiCache cluster), they write the standard CDK code for it in the patches.ts file and register it in the manifest.
Result: The service.yml now represents the complete desired state of the service's infrastructure.
Step 3: Local Validation & Iteration (svc plan)
User: Before committing any code, the developer runs svc plan --env dev-us-east-1 locally.
Platform (svc plan): The platform engine kicks off its internal orchestration (detailed in Phase 2) without connecting to AWS. It validates the manifest, synthesizes the infrastructure in memory, and generates a preview.
Result: The developer gets immediate feedback in their terminal: a validation status, a preview of the resources to be created, a cost estimate, and any policy warnings from cdk-nag. They can now iterate on their manifest until the plan is correct.
Step 4: Commit & Push (The Handoff)
User: Satisfied with the plan, the developer commits their service.yml, patches.ts, and application code to their service's Git repository and opens a pull request.
Result: This action is the trigger that hands off the process to the automated CI/CD pipeline.
Phase 2: Platform's Internal Orchestration (Under the Hood)
This is what happens inside the platform engine during the svc plan or svc up command.
Step 5: The Validation Pipeline (Chain of Responsibility)
The engine receives the service.yml and begins a sequential validation process.
Handlers: ParsingHandler (checks YAML syntax) -> SchemaValidationHandler (checks against component schemas) -> ContextHydrationHandler (resolves $refs and injects environment variables) -> SemanticValidationHandler (checks that all binds targets exist). A failure at any step halts the process.
Step 6: Component Instantiation (Abstract Factory & Factory Method)
Using the complianceFramework from the manifest, the engine's ComponentFactoryProvider selects the correct factory (e.g., FedRAMPHighComponentFactory).
This factory produces a ComponentRegistry that is pre-populated only with FedRAMP High-compliant component creators.
The engine then iterates through the manifest and uses this registry's Factory Method (.createComponent()) to create in-memory instances of all the required L3 component objects (e.g., MaxSecurityRdsPostgresComponent).
Step 7: Synthesis (Builder & Composite)
The engine iterates through the newly created component instances and calls the .synth() method on each one.
Inside the synth() method, the Builder pattern assembles the final, layered configuration.
The component then composes the native CDK L2 constructs (e.g., new rds.DatabaseInstance(...)), adding them to the CDK's in-memory construct tree. The concepts of L3 constructs composing L2 constructs are detailed in "The CDK Book".
Step 8: Binding (Strategy)
After all components have been synthesized, the engine makes a final pass to handle the binds directives.
For each binding, it uses the BinderRegistry to select the correct Strategy (e.g., LambdaToRdsBinderStrategy).
It executes the binder, which directly modifies the already-synthesized CDK constructs, calling high-level methods like .grantConnect() and .connections.allowFrom() to create the necessary IAM permissions and security group rules.
Phase 3: CI/CD & Deployment
This phase is orchestrated by the service's CI/CD pipeline, which is owned and configured by your DevOps team.
Step 9: Plan, Diff & Archive (The Audit Trail)
The pipeline's first stage runs svc plan --ci --env <target-env>.
The command prints a diff of the proposed changes against the currently deployed stack state to the pipeline logs.
Upon success, the pipeline archives the entire synthesized output (the CloudFormation template and any assets) as an immutable, versioned artifact. This ensures that what is planned is exactly what will be deployed, a core principle of CI/CD.
Step 10: Approval Gate
The pipeline pauses for a manual approval. A team lead or DevOps engineer reviews the diff and the policy check results from the previous stage's logs.
Step 11: Deploy from Artifact (svc up)
After approval, the deploy stage begins. It downloads the exact artifact archived in Step 9.
It then runs svc up, pointing to the downloaded artifact.
The platform passes the template to the CDK Toolkit, which executes the deployment via CloudFormation to update the live environment. This method of building once and deploying the same artifact to multiple stages is a best practice.
Step 12: Post-Deployment Testing
Once the deployment is complete, the final pipeline stage runs the automated infrastructure tests (smoke tests) against the live service endpoints.
These tests verify that the application is healthy and correctly configured (e.g., the API can connect to the database). The use of such tests to validate a deployed system is a key practice.
Result: The user and code journey is complete. The developer's intent, declared in a simple manifest, has been safely and compliantly transformed into a running, tested application in a live environment.
