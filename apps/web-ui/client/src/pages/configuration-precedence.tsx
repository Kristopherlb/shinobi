import { useState } from 'react';
import { ConfigurationPrecedenceVisualizer } from '@/components/configuration/ConfigurationPrecedenceVisualizer';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings2, 
  Info, 
  BookOpen, 
  FileText, 
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export default function ConfigurationPrecedencePage() {
  const [selectedComponent, setSelectedComponent] = useState('user-api');
  const [selectedEnvironment, setSelectedEnvironment] = useState('development');

  const components = [
    { value: 'user-api', label: 'user-api (Lambda API)' },
    { value: 'user-db', label: 'user-db (RDS Postgres)' },
    { value: 'notification-queue', label: 'notification-queue (SQS)' },
    { value: 'auth-service', label: 'auth-service (Lambda)' }
  ];

  const environments = [
    { value: 'development', label: 'Development' },
    { value: 'staging', label: 'Staging' },
    { value: 'production', label: 'Production' }
  ];

  const handleRefreshConfiguration = () => {
    // In real implementation, this would refresh from the platform
    console.log('Refreshing configuration for', selectedComponent, 'in', selectedEnvironment);
  };

  const handleExportConfiguration = () => {
    // In real implementation, this would export the resolved configuration
    console.log('Exporting configuration for', selectedComponent);
  };

  const metadataContent = (
    <div className="space-y-4">
      {/* Component Info */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Component Info
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Type</span>
            <Badge variant="info" className="text-xs">Lambda API</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Runtime</span>
            <span className="text-xs font-mono text-muted-foreground">nodejs18.x</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Compliance</span>
            <Badge variant="warn" className="text-xs">FedRAMP Moderate</Badge>
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Configuration Status
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Schema Valid</span>
            <Badge variant="success" className="text-xs">Yes</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Policy Compliance</span>
            <Badge variant="success" className="text-xs">Passed</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Overrides</span>
            <span className="text-xs text-muted-foreground">4 active</span>
          </div>
        </div>
      </div>

      {/* Configuration Layers */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Layer Status
        </h4>
        <div className="space-y-1">
          <div className="citation-badge">Fallbacks: 4 values</div>
          <div className="citation-badge">Platform: 3 values</div>
          <div className="citation-badge">Environment: 3 values</div>
          <div className="citation-badge">Component: 3 values</div>
          <div className="citation-badge">Policy: 2 values</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick Actions
        </h4>
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-7"
            onClick={handleRefreshConfiguration}
            data-testid="button-refresh-config"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Refresh Configuration
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-7"
            onClick={handleExportConfiguration}
            data-testid="button-export-config"
          >
            <Download className="w-3 h-3 mr-2" />
            Export Resolved Config
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-7"
            data-testid="button-view-manifest"
          >
            <FileText className="w-3 h-3 mr-2" />
            View Manifest
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-7"
            data-testid="button-config-docs"
          >
            <BookOpen className="w-3 h-3 mr-2" />
            Configuration Docs
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell 
      breadcrumbs={[
        { label: 'Shinobi ADP' }, 
        { label: 'Development Tools' },
        { label: 'Configuration Precedence' }
      ]}
      showTimelineRail={false}
      showMetadataRail={true}
      metadataContent={metadataContent}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-h2 font-bold text-foreground">
                Configuration Precedence Visualizer
              </h1>
              <p className="text-muted-foreground">
                Understand how configuration values are resolved through the 5-layer precedence chain
              </p>
            </div>
          </div>
        </div>

        {/* Component & Environment Selection */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuration Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Component</label>
                <Select value={selectedComponent} onValueChange={setSelectedComponent}>
                  <SelectTrigger data-testid="select-component">
                    <SelectValue placeholder="Select component" />
                  </SelectTrigger>
                  <SelectContent>
                    {components.map(component => (
                      <SelectItem key={component.value} value={component.value}>
                        {component.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Environment</label>
                <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                  <SelectTrigger data-testid="select-environment">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map(env => (
                      <SelectItem key={env.value} value={env.value}>
                        {env.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border border-info/20 bg-info/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-info flex items-center gap-2">
              <Info className="w-4 h-4" />
              Understanding Configuration Precedence
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              Shinobi uses a 5-layer configuration precedence chain to resolve values. Higher priority layers 
              override lower ones, ensuring predictable configuration resolution.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <div className="p-2 rounded border border-border/50 text-center">
                <div className="text-xs font-medium text-foreground">1. Fallbacks</div>
                <div className="text-xs text-muted-foreground">Component defaults</div>
              </div>
              <div className="p-2 rounded border border-border/50 text-center">
                <div className="text-xs font-medium text-foreground">2. Platform</div>
                <div className="text-xs text-muted-foreground">Platform standards</div>
              </div>
              <div className="p-2 rounded border border-border/50 text-center">
                <div className="text-xs font-medium text-foreground">3. Environment</div>
                <div className="text-xs text-muted-foreground">Environment specific</div>
              </div>
              <div className="p-2 rounded border border-border/50 text-center">
                <div className="text-xs font-medium text-foreground">4. Component</div>
                <div className="text-xs text-muted-foreground">Service overrides</div>
              </div>
              <div className="p-2 rounded border border-border/50 text-center">
                <div className="text-xs font-medium text-foreground">5. Policy</div>
                <div className="text-xs text-muted-foreground">Governance enforced</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="info" className="text-xs">Deterministic resolution</Badge>
              <Badge variant="info" className="text-xs">Policy enforcement</Badge>
              <Badge variant="info" className="text-xs">Environment isolation</Badge>
              <Badge variant="info" className="text-xs">Configuration transparency</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Policy Compliance Warning */}
        {selectedEnvironment === 'production' && (
          <Card className="border border-warn/20 bg-warn/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-warn flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Production Environment Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Production configuration is subject to additional policy enforcement. Some values may be 
                locked by compliance frameworks and cannot be overridden at the component level.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Configuration Precedence Visualizer */}
        <ConfigurationPrecedenceVisualizer 
          componentName={selectedComponent}
          environment={selectedEnvironment}
          onConfigurationChange={(resolved) => {
            console.log('Configuration resolved:', resolved);
          }}
        />
      </div>
    </AppShell>
  );
}