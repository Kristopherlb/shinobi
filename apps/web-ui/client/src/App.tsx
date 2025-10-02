import { Switch, Route, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from "@/components/AppShell";
import ActivityFeedPage from "@/pages/ActivityFeed";
import TasksPage from "@/pages/Tasks";
import ChatPage from "@/pages/Chat";
import PlansPage from "@/pages/Plans";
import CatalogPage from "@/pages/catalog";
import SearchPage from "@/pages/SearchPage";
import MonitoringPage from "@/pages/monitoring";
import OperationsPage from "@/pages/operations";
import CollaborationPage from "@/pages/collaboration";
import AIToolsPage from "@/pages/AIToolsPage";
import OnboardingPage from "@/pages/onboarding";
import ManifestEditorPage from "@/pages/manifest-editor";
import ConfigurationPrecedencePage from "@/pages/configuration-precedence";
import LocalDevelopmentPage from "@/pages/local-development";
import ComponentDetail from "@/pages/ComponentDetail";
import ComponentDetailDemo from "@/pages/ComponentDetailDemo";
import NotFound from "@/pages/not-found";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { CodeBlock } from "@/components/CodeBlock";
import { TagList } from "@/components/TagList";
import { Timestamp } from "@/components/Timestamp";
import { Activity, CheckSquare, MessageSquare, AlertTriangle, Zap, Database, Globe, Shield, Server, Users, BarChart3 } from "lucide-react";
import { CommandProvider, MockCommandProvider, MockShortcutService } from "@/components/command-palette";
import { CommandPaletteIntegration } from "@/components/command-palette/CommandPaletteIntegration";
import { CommandPaletteButton } from "@/components/CommandPaletteButton";
import { SearchProvider } from "@/components/search";

function Dashboard() {
  const mockTimestamp = new Date(Date.now() - 1000 * 60 * 15).toISOString();

  return (
    <AppShell
      breadcrumbs={[{ label: 'Shinobi ADP' }, { label: 'Platform Overview' }]}
      showTimelineRail={true}
      showMetadataRail={true}
    >
      <div className="space-y-8">
        {/* Hero Section with Gradient */}
        <div className="gradient-accent rounded-lg border border-border/50 p-8">
          <div className="max-w-4xl">
            <h1 className="text-h1 font-bold text-foreground mb-3">
              Shinobi Internal Developer Platform
            </h1>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              CDK-based IDP with declarative service.yml manifests, compliance-aware infrastructure,
              and AI-powered component generation for modern cloud deployments.
            </p>
            <div className="flex items-center gap-4">
              <CommandPaletteButton />
              <Button
                variant="outline"
                data-testid="button-view-documentation"
              >
                View Documentation
              </Button>
            </div>
          </div>
        </div>

        {/* Platform Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'Active Tasks',
              value: '12',
              icon: CheckSquare,
              status: 'warn',
              change: '+3 from yesterday',
              description: 'Pipeline tasks in progress'
            },
            {
              title: 'System Events',
              value: '247',
              icon: Activity,
              status: 'info',
              change: '+12% this hour',
              description: 'Real-time platform events'
            },
            {
              title: 'AI Conversations',
              value: '8',
              icon: MessageSquare,
              status: 'success',
              change: '2 active sessions',
              description: 'Assistant interactions'
            },
            {
              title: 'Critical Alerts',
              value: '3',
              icon: AlertTriangle,
              status: 'danger',
              change: 'Requires attention',
              description: 'Infrastructure warnings'
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title} className="hover-elevate cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold text-foreground">
                    {metric.value}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={metric.status === 'success' ? 'success' :
                        metric.status === 'warn' ? 'warn' :
                          metric.status === 'danger' ? 'danger' : 'info'}
                      className="text-xs"
                    >
                      {metric.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{metric.change}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feature Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Design System Preview */}
          <Card className="chrome-minimal">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Design System Components
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3 text-foreground">Status Indicators</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">Operational</Badge>
                  <Badge variant="warn">Degraded</Badge>
                  <Badge variant="danger">Critical</Badge>
                  <Badge variant="info">Maintenance</Badge>
                  <div className="citation-badge">Citation #1</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3 text-foreground">Platform Tags</h4>
                <TagList
                  tags={['kubernetes', 'production', 'auto-scaling', 'monitoring', 'security']}
                  variant="outline"
                />
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3 text-foreground">Timeline Metadata</h4>
                <div className="flex items-center gap-3 text-sm">
                  <div className="timeline-marker" />
                  <span className="text-foreground">Last deployment:</span>
                  <Timestamp iso={mockTimestamp} format="relative" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Code Examples */}
          <Card className="chrome-minimal">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-accent" />
                Platform Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={`# service.yml - Shinobi IDP Manifest
name: user-service
version: 1.2.3
environment: production

components:
  - name: user-api
    type: lambda-api
    config:
      runtime: nodejs18.x
      memory: 512
      timeout: 30
      
  - name: user-db
    type: rds-postgres
    config:
      instance_class: db.t3.micro
      allocated_storage: 20
      backup_retention: 7

compliance:
  framework: fedramp-moderate
  encryption: required
  logging: enabled`}
                lang="yaml"
                className="mt-3"
              />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Server,
              title: 'Infrastructure Operations',
              description: 'Deploy and manage CDK services with svc commands and real-time monitoring',
              action: 'View Operations',
              href: '/operations'
            },
            {
              icon: BarChart3,
              title: 'Service Monitoring',
              description: 'Monitor service health, compliance status, and performance metrics',
              action: 'View Monitoring',
              href: '/monitoring'
            },
            {
              icon: Globe,
              title: 'Component Catalog',
              description: 'Browse CDK components with compliance frameworks and deployment templates',
              action: 'View Catalog',
              href: '/catalog'
            },
            {
              icon: Users,
              title: 'Team Collaboration',
              description: 'Collaborate with team workspaces, real-time presence, and smart mentions',
              action: 'View Workspaces',
              href: '/collaboration'
            },
            {
              icon: Zap,
              title: 'AI Component Generator',
              description: 'Generate CDK components with schemas, builders, and compliance validation',
              action: 'Generate Components',
              href: '/ai-tools'
            },
            {
              icon: Activity,
              title: 'Activity Feed',
              description: 'Monitor platform-wide events, deployments, and system changes',
              action: 'View Feed',
              href: '/feed'
            },
            {
              icon: Globe,
              title: 'Component Detail Demo',
              description: 'View the component detail page design implementation with dark mode',
              action: 'View Demo',
              href: '/component-detail-demo'
            }
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="hover-elevate cursor-pointer chrome-minimal">
                <CardHeader className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  <Link href={feature.href || '#'}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      data-testid={`button-${feature.action.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {feature.action}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State Demo */}
        <Card className="chrome-minimal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-info" />
              Security Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No security violations detected"
              hint="Your infrastructure meets all compliance requirements. Regular scans are scheduled every 6 hours."
              cta={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-run-manual-scan"
                  >
                    Run Manual Scan
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="button-view-history"
                  >
                    View History
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/manifest-editor" component={ManifestEditorPage} />
      <Route path="/configuration-precedence" component={ConfigurationPrecedencePage} />
      <Route path="/local-development" component={LocalDevelopmentPage} />
      <Route path="/operations" component={OperationsPage} />
      <Route path="/monitoring" component={MonitoringPage} />
      <Route path="/catalog" component={CatalogPage} />
      <Route path="/collaboration" component={CollaborationPage} />
      <Route path="/ai-tools" component={AIToolsPage} />
      <Route path="/feed" component={ActivityFeedPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/plans" component={PlansPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/component/:componentName" component={ComponentDetail} />
      <Route path="/component-detail-demo" component={ComponentDetailDemo} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Initialize providers outside component to prevent re-instantiation
const commandProvider = new MockCommandProvider();
const shortcutService = new MockShortcutService();

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SearchProvider>
          <CommandProvider commandProvider={commandProvider} shortcutService={shortcutService}>
            <div className="dark min-h-screen bg-background text-foreground">
              <Toaster />
              <Router />
              <CommandPaletteIntegration />
              {/* Bottom Navigation for Mobile */}
              <div className="lg:hidden">
                <div className="h-[var(--bottom-nav-height)]" /> {/* Spacer */}
              </div>
            </div>
          </CommandProvider>
        </SearchProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;