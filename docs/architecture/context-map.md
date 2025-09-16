flowchart LR
    %% Bounded Contexts
    subgraph COMPLIANCE ["Compliance Context"]
        OSCAL["OSCAL / Rego Policies"]
        KB["KB Packs (fedramp-low/mod/high)"]
        Evidence["Evidence Bundle Exporter"]
    end

    subgraph OBSERVABILITY ["Observability Context"]
        OTel["OTel Recipes"]
        Logging["Structured Logging"]
        Dashboards["Dashboards / Alarms"]
    end

    subgraph SCAFFOLDING ["Scaffolding Context"]
        Generator["Golden Path Scaffolds"]
        ConfigSchema["Config.schema.json"]
        FeatureFlags["Feature Flags / AI Write Locks"]
    end

    subgraph INTEGRATION ["Integration Context"]
        Binds["Bindings Matrix"]
        Triggers["Triggers Matrix"]
    end

    subgraph DOCS ["Docs Context"]
        TechDocs["TechDocs / ADRs"]
        Diagrams["Architecture Diagrams"]
        Backstage["Backstage Catalog / Scorecards"]
    end

    %% Team Ownership (Team Topologies)
    PlatformTeam([Platform Team])
    EnablingTeam([Enabling Team])
    ObservabilityTeam([Stream-Aligned Team: Observability])
    InfraTeam([Stream-Aligned Team: Infra/Integration])
    ComponentTeams([Stream-Aligned Teams: Components])
    ComplicatedSubsystem([Complicated Subsystem Team: Provenance/OSCAL])

    %% Interactions
    PlatformTeam -- "X-as-a-Service" --> ComponentTeams
    PlatformTeam -- "Facilitating" --> EnablingTeam
    EnablingTeam -- "Facilitating" --> ComponentTeams
    ObservabilityTeam -- "X-as-a-Service" --> ComponentTeams
    InfraTeam -- "X-as-a-Service" --> ComponentTeams
    ComplicatedSubsystem -- "Collaboration" --> PlatformTeam

    %% Context to Teams
    PlatformTeam --- COMPLIANCE
    PlatformTeam --- SCAFFOLDING
    PlatformTeam --- DOCS

    EnablingTeam --- DOCS
    EnablingTeam --- COMPLIANCE

    ObservabilityTeam --- OBSERVABILITY
    InfraTeam --- INTEGRATION
    ComponentTeams --- SCAFFOLDING
    ComponentTeams --- OBSERVABILITY
    ComponentTeams --- INTEGRATION
