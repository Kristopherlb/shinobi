# Micro Frontend Architecture Plan

## Overview

This document outlines the micro frontend architecture plan for the Shinobi Web UI, designed to work with the upcoming federated GraphQL schema. The architecture follows Luca Mezzalira's patterns and is optimized for independent deployment and team autonomy.

## Architecture Principles

### 1. Domain-Driven Design
- **Bounded Contexts**: Each micro frontend represents a business domain
- **Autonomous Teams**: Each team owns their micro frontend end-to-end
- **Independent Deployments**: Micro frontends can be deployed independently

### 2. Federation Strategy
- **GraphQL Federation**: Leverage federated GraphQL for data layer
- **Schema Stitching**: Each micro frontend contributes to the federated schema
- **Type Safety**: Generate types from federated schema for consistency

## Proposed Micro Frontend Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Shell Application                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Navigation    │  │   Layout        │  │   Routing   │ │
│  │   Shell         │  │   Manager       │  │   Shell     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼──────┐    ┌────────▼────────┐    ┌──────▼──────┐
│  Component   │    │  Infrastructure │    │   Tasks     │
│  Catalog     │    │  Operations     │    │ Management  │
│  MF          │    │  MF             │    │ MF          │
└──────────────┘    └─────────────────┘    └─────────────┘
        │                     │                     │
┌───────▼──────┐    ┌────────▼────────┐    ┌──────▼──────┐
│  Monitoring  │    │   Compliance    │    │  AI Tools   │
│  & Observ.   │    │   & Security    │    │  & MCP      │
│  MF          │    │  MF             │    │ MF          │
└──────────────┘    └─────────────────┘    └─────────────┘
```

## Micro Frontend Domains

### 1. Component Catalog MF
**Domain**: Component discovery, templates, and onboarding
**Team**: Platform Engineering
**Responsibilities**:
- Component browsing and search
- Template selection and customization
- Service creation wizard
- Component documentation

**GraphQL Schema Contributions**:
```graphql
type Component {
  id: ID!
  name: String!
  type: ComponentType!
  description: String!
  compliance: ComplianceInfo!
  # ... other fields
}

type Query {
  components(filters: ComponentFilters): [Component!]!
  component(id: ID!): Component
  templates: [Template!]!
}
```

### 2. Infrastructure Operations MF
**Domain**: Infrastructure management and operations
**Team**: DevOps/Infrastructure
**Responsibilities**:
- Service status monitoring
- Deployment operations
- Resource management
- Drift detection

**GraphQL Schema Contributions**:
```graphql
type Service {
  id: ID!
  name: String!
  status: ServiceStatus!
  deployments: [Deployment!]!
  # ... other fields
}

type Mutation {
  deployService(serviceId: ID!, config: DeployConfig!): Deployment!
  rollbackService(serviceId: ID!): Deployment!
}
```

### 3. Tasks Management MF
**Domain**: Task and project management
**Team**: Product/Engineering
**Responsibilities**:
- Task creation and assignment
- Progress tracking
- Collaboration features
- Activity feeds

**GraphQL Schema Contributions**:
```graphql
type Task {
  id: ID!
  title: String!
  status: TaskStatus!
  assignee: User
  # ... other fields
}

type Subscription {
  taskUpdated: Task!
  activityFeed: ActivityItem!
}
```

### 4. Monitoring & Observability MF
**Domain**: System monitoring and observability
**Team**: SRE/Platform
**Responsibilities**:
- Metrics dashboards
- Alert management
- Performance monitoring
- Log aggregation

**GraphQL Schema Contributions**:
```graphql
type Metric {
  name: String!
  value: Float!
  timestamp: DateTime!
  labels: [Label!]!
}

type Subscription {
  metricsUpdated(serviceId: ID!): [Metric!]!
  alertTriggered: Alert!
}
```

### 5. Compliance & Security MF
**Domain**: Compliance and security management
**Team**: Security/Compliance
**Responsibilities**:
- Compliance auditing
- Security scanning
- Policy management
- Risk assessment

**GraphQL Schema Contributions**:
```graphql
type ComplianceCheck {
  id: ID!
  framework: ComplianceFramework!
  status: ComplianceStatus!
  findings: [Finding!]!
}

type Query {
  complianceStatus(serviceId: ID!): [ComplianceCheck!]!
}
```

### 6. AI Tools & MCP MF
**Domain**: AI-powered tools and MCP integration
**Team**: AI/ML Engineering
**Responsibilities**:
- MCP tool discovery
- AI assistant integration
- Code generation tools
- Intelligent recommendations

**GraphQL Schema Contributions**:
```graphql
type MCPTool {
  id: ID!
  name: String!
  description: String!
  capabilities: [Capability!]!
}

type Mutation {
  executeMCPTool(toolId: ID!, input: JSON!): ToolResult!
}
```

## Technical Implementation

### 1. Module Federation (Webpack)
```typescript
// webpack.config.js for each MF
const ModuleFederationPlugin = require('@module-federation/webpack');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'componentCatalog',
      filename: 'remoteEntry.js',
      exposes: {
        './ComponentCatalog': './src/ComponentCatalog',
        './ServiceWizard': './src/ServiceWizard',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        '@apollo/client': { singleton: true },
      },
    }),
  ],
};
```

### 2. Shell Application
```typescript
// Shell app routing
import { loadRemote } from '@module-federation/runtime';

const ComponentCatalog = React.lazy(() => 
  loadRemote('componentCatalog/ComponentCatalog')
);

const InfrastructureOps = React.lazy(() => 
  loadRemote('infrastructureOps/InfrastructureOps')
);

// ... other remote components
```

### 3. GraphQL Client Setup
```typescript
// Shared Apollo Client configuration
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: process.env.REACT_APP_GRAPHQL_ENDPOINT,
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
```

## Migration Strategy

### Phase 1: Preparation (Current)
- [x] Feature flag infrastructure
- [ ] GraphQL schema federation setup
- [ ] Module federation configuration
- [ ] Shared component library extraction

### Phase 2: Extract First MF
- [ ] Component Catalog MF
- [ ] Shared GraphQL types generation
- [ ] Shell application setup
- [ ] Independent deployment pipeline

### Phase 3: Gradual Migration
- [ ] Infrastructure Operations MF
- [ ] Tasks Management MF
- [ ] Monitoring & Observability MF
- [ ] Compliance & Security MF
- [ ] AI Tools & MCP MF

### Phase 4: Optimization
- [ ] Performance optimization
- [ ] Bundle size analysis
- [ ] Cross-MF communication patterns
- [ ] Error boundaries and resilience

## Benefits

### Development Benefits
- **Independent Development**: Teams can work on their domains independently
- **Technology Diversity**: Each MF can use different tech stacks if needed
- **Faster Deployments**: Deploy only what changed
- **Better Testing**: Isolated testing of individual domains

### Operational Benefits
- **Reduced Blast Radius**: Issues in one MF don't affect others
- **Scalable Teams**: Easy to add new teams and domains
- **Performance**: Load only what's needed for each route
- **Maintenance**: Easier to maintain and update individual domains

## Challenges & Mitigations

### 1. Shared State Management
**Challenge**: Managing state across micro frontends
**Mitigation**: 
- Use GraphQL for shared data
- Implement event-driven communication
- Centralized state for user preferences

### 2. Styling Consistency
**Challenge**: Maintaining consistent UI across MFs
**Mitigation**:
- Shared design system
- CSS-in-JS with shared themes
- Component library federation

### 3. Bundle Size
**Challenge**: Avoiding duplicate dependencies
**Mitigation**:
- Shared dependencies in Module Federation
- Code splitting strategies
- Bundle analysis and optimization

## Next Steps

1. **Wait for Federated GraphQL Schema**: Integrate with the provided schema
2. **Setup Module Federation**: Configure webpack for micro frontend architecture
3. **Extract Shared Components**: Create a shared component library
4. **Start with Component Catalog**: Extract the first micro frontend
5. **Iterate and Improve**: Gradually migrate other domains

## References

- [Luca Mezzalira - Building Micro-Frontends](https://martinfowler.com/articles/micro-frontends.html)
- [Module Federation](https://webpack.js.org/concepts/module-federation/)
- [GraphQL Federation](https://www.apollographql.com/docs/federation/)
- [Single-SPA](https://single-spa.js.org/) (Alternative approach)
