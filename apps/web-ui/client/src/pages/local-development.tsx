import { useState } from 'react';
import { LocalEnvironmentManager } from '@/components/development/LocalEnvironmentManager';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Terminal, 
  Info, 
  BookOpen, 
  Laptop, 
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function LocalDevelopmentPage() {
  const [selectedService, setSelectedService] = useState('user-api');

  const services = [
    { value: 'user-api', label: 'user-api (Lambda API)' },
    { value: 'user-db', label: 'user-db (RDS Postgres)' },
    { value: 'notification-queue', label: 'notification-queue (SQS)' },
    { value: 'auth-service', label: 'auth-service (Lambda)' }
  ];

  const handleOpenTerminal = () => {
    // In real implementation, this would open a terminal or command palette
    console.log('Opening terminal for local development');
  };

  const handleDownloadLogs = () => {
    // In real implementation, this would download all service logs
    console.log('Downloading all service logs');
  };

  const metadataContent = (
    <div className="space-y-4">
      {/* Environment Info */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Environment Status
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Docker</span>
            <Badge variant="success" className="text-xs">Running</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">LocalStack</span>
            <Badge variant="success" className="text-xs">Ready</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Databases</span>
            <Badge variant="success" className="text-xs">Connected</Badge>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Resource Usage
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">CPU</span>
            <span className="text-xs font-mono text-muted-foreground">35.8%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Memory</span>
            <span className="text-xs font-mono text-muted-foreground">896MB</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Disk</span>
            <span className="text-xs font-mono text-muted-foreground">2.1GB</span>
          </div>
        </div>
      </div>

      {/* Active Services */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Active Services
        </h4>
        <div className="space-y-1">
          <div className="citation-badge">LocalStack: Port 4566</div>
          <div className="citation-badge">PostgreSQL: Port 5432</div>
          <div className="citation-badge">User API: Port 3001</div>
          <div className="citation-badge">Redis: Stopped</div>
        </div>
      </div>

      {/* Quick Tools */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Development Tools
        </h4>
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-7"
            onClick={handleOpenTerminal}
            data-testid="button-open-terminal"
          >
            <Terminal className="w-3 h-3 mr-2" />
            Open Terminal
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-7"
            onClick={handleDownloadLogs}
            data-testid="button-download-logs"
          >
            <Download className="w-3 h-3 mr-2" />
            Download Logs
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-7"
            data-testid="button-dev-docs"
          >
            <BookOpen className="w-3 h-3 mr-2" />
            Development Docs
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
        { label: 'Local Development' }
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
              <Laptop className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-h2 font-bold text-foreground">
                Local Development Environment
              </h1>
              <p className="text-muted-foreground">
                One-click local environment startup with service monitoring and integrated development tools
              </p>
            </div>
          </div>
        </div>

        {/* Service Selection */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Service Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium text-foreground">Service</label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger data-testid="select-service">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.value} value={service.value}>
                        {service.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground invisible">Actions</label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border border-info/20 bg-info/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-info flex items-center gap-2">
              <Info className="w-4 h-4" />
              Local Development Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              Shinobi provides integrated local development tools to mirror AWS services locally using LocalStack, 
              enabling fast feedback loops without cloud costs or network latency.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="p-2 rounded border border-border/50 text-center">
                <div className="text-xs font-medium text-foreground">One-Click Startup</div>
                <div className="text-xs text-muted-foreground">Start all dependencies</div>
              </div>
              <div className="p-2 rounded border border-border/50 text-center">
                <div className="text-xs font-medium text-foreground">Live Monitoring</div>
                <div className="text-xs text-muted-foreground">Service health & logs</div>
              </div>
              <div className="p-2 rounded border border-border/50 text-center">
                <div className="text-xs font-medium text-foreground">Integrated Commands</div>
                <div className="text-xs text-muted-foreground">svc graph, cost, test</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="info" className="text-xs">LocalStack integration</Badge>
              <Badge variant="info" className="text-xs">Container orchestration</Badge>
              <Badge variant="info" className="text-xs">Real-time logs</Badge>
              <Badge variant="info" className="text-xs">Cost analysis</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Prerequisites Warning */}
        <Card className="border border-warn/20 bg-warn/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-warn flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Prerequisites Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Ensure the following tools are installed and running before starting local development:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Docker Desktop (for container orchestration)</li>
              <li>LocalStack CLI (for AWS service mocking)</li>
              <li>PostgreSQL client tools (for database access)</li>
              <li>Node.js and npm/yarn (for application dependencies)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Local Environment Manager */}
        <LocalEnvironmentManager serviceName={selectedService} />
      </div>
    </AppShell>
  );
}