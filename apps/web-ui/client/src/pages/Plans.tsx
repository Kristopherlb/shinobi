import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/ui/button';
import { Timestamp } from '@/components/Timestamp';
import { CodeBlock } from '@/components/CodeBlock';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Play, 
  AlertTriangle, 
  CheckCircle, 
  GitCommit,
  Database,
  Server,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanChange {
  id: string;
  type: 'create' | 'modify' | 'delete';
  resource: string;
  resourceType: 'database' | 'compute' | 'network' | 'security';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimatedTime: string;
  dependencies: string[];
  diff?: string;
  warnings?: string[];
}

interface PlanData {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  estimatedDuration: string;
  totalChanges: number;
  changes: PlanChange[];
  citations: {
    id: string;
    title: string;
    type: string;
  }[];
}

export default function PlansPage() {
  const [selectedChange, setSelectedChange] = useState<string | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [serviceName] = useState('user-api');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch plan data using the API
  const { data: planResponse, isLoading: planLoading, refetch: refetchPlan } = useQuery({
    queryKey: ['/api/local-dev/commands/plan', serviceName],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/local-dev/commands/plan', { serviceName });
      return response.json();
    },
  });

  // Generate new plan
  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/local-dev/commands/plan', { serviceName });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/local-dev/commands/plan'] });
      toast({
        title: 'Plan Generated',
        description: 'Infrastructure plan has been successfully generated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Plan Generation Failed',
        description: 'Failed to generate infrastructure plan. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Extract plan data from API response
  const planData: PlanData = planResponse?.metadata ? {
    id: 'plan-' + Date.now(),
    title: 'Infrastructure Deployment Plan',
    description: 'Infrastructure changes generated from service manifest',
    status: planResponse.metadata.status || 'ready',
    createdAt: new Date().toISOString(),
    estimatedDuration: planResponse.metadata.estimatedDuration || '45 minutes',
    totalChanges: planResponse.metadata.totalChanges || 0,
    changes: planResponse.metadata.changes || [],
    citations: [
      { id: 'plan-1', title: 'Service Manifest', type: 'config' },
      { id: 'plan-2', title: 'Platform Policies', type: 'compliance' },
      { id: 'plan-3', title: 'Cost Optimization', type: 'financial' }
    ]
  } : {
    id: 'plan-loading',
    title: 'Loading Plan...',
    description: 'Generating infrastructure plan from service manifest',
    status: 'loading',
    createdAt: new Date().toISOString(),
    estimatedDuration: 'Calculating...',
    totalChanges: 0,
    changes: [],
    citations: []
  };

  const changes = planData.changes;

  const getChangeIcon = (type: PlanChange['type']) => {
    switch (type) {
      case 'create': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'modify': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'delete': return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
  };

  const getResourceIcon = (type: PlanChange['resourceType']) => {
    switch (type) {
      case 'database': return <Database className="w-4 h-4" />;
      case 'compute': return <Server className="w-4 h-4" />;
      default: return <GitCommit className="w-4 h-4" />;
    }
  };

  const getImpactBadge = (impact: PlanChange['impact']) => {
    const variants = {
      'low': 'success',
      'medium': 'warn',
      'high': 'danger'
    } as const;
    
    return <Badge variant={variants[impact]} className="text-xs">{impact} impact</Badge>;
  };

  const selectedChangeData = selectedChange 
    ? changes.find(change => change.id === selectedChange)
    : null;

  const timelineContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Plan History</h3>
        <Badge variant="info" className="text-xs">Ready</Badge>
      </div>
      
      <div className="space-y-3">
        {changes.slice(0, 3).map((change, index) => (
          <div key={change.id} className="flex items-start gap-3 p-2 rounded-md hover-elevate cursor-pointer">
            <div className="timeline-marker mt-1.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getChangeIcon(change.type)}
                <Badge variant="outline" className="text-xs">
                  {change.type}
                </Badge>
              </div>
              <p className="text-sm text-foreground leading-tight line-clamp-2">{change.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{change.estimatedTime}</p>
            </div>
          </div>
        ))}
      </div>
      
      <Button variant="ghost" size="sm" className="w-full text-xs" data-testid="button-view-plan-history">
        View full plan
      </Button>
    </div>
  );

  const metadataContent = (
    <div className="space-y-4">
      {/* Plan Status */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan Status</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Validation</span>
            <Badge variant="success" className="text-xs">Passed</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Dependencies</span>
            <Badge variant="info" className="text-xs">Resolved</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Approval</span>
            <Badge variant="warn" className="text-xs">Pending</Badge>
          </div>
        </div>
      </div>

      {/* Change Summary */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Change Summary</h4>
        <div className="space-y-1">
          <div className="citation-badge">4 Creates</div>
          <div className="citation-badge">1 Modify</div>
          <div className="citation-badge">0 Deletes</div>
        </div>
      </div>

      {/* Citations */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan References</h4>
        <div className="space-y-2">
          {planData.citations.map((citation: any, index: number) => (
            <div key={citation.id} className="p-2 bg-muted/30 rounded border border-border/50 hover-elevate cursor-pointer">
              <div className="flex items-start gap-2">
                <span className="citation-badge">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-tight">{citation.title}</p>
                  <p className="text-xs text-accent mt-1">{citation.type}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Actions</h4>
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" data-testid="button-validate-plan">
            <FileText className="w-3 h-3 mr-2" />
            Re-validate plan
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" data-testid="button-export-plan">
            <ExternalLink className="w-3 h-3 mr-2" />
            Export plan
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      breadcrumbs={[{ label: 'Shinobi ADP' }, { label: 'Infrastructure Plans' }]}
      showTimelineRail={true}
      showMetadataRail={true}
      timelineContent={timelineContent}
      metadataContent={metadataContent}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 font-bold text-foreground mb-2">{planData.title}</h1>
            <p className="text-muted-foreground">
              {planData.description} • {planData.totalChanges} changes • Est. {planData.estimatedDuration}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => generatePlanMutation.mutate()}
              disabled={generatePlanMutation.isPending}
              data-testid="button-generate-plan"
            >
              {generatePlanMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {generatePlanMutation.isPending ? 'Generating...' : 'Generate Plan'}
            </Button>
            <Button size="sm" data-testid="button-apply-plan">
              <Play className="w-4 h-4 mr-2" />
              Apply Plan
            </Button>
          </div>
        </div>

        {/* Plan Summary */}
        <Card className="chrome-minimal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-primary" />
              Plan Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-400">+4</div>
                <p className="text-sm text-muted-foreground">Resources to create</p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-amber-400">~1</div>
                <p className="text-sm text-muted-foreground">Resources to modify</p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-muted-foreground">0</div>
                <p className="text-sm text-muted-foreground">Resources to delete</p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-foreground">45m</div>
                <p className="text-sm text-muted-foreground">Estimated duration</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Changes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-h2 font-semibold">Planned Changes</h2>
            {changes.map((change: PlanChange) => (
              <Card
                key={change.id}
                className={cn(
                  'hover-elevate cursor-pointer chrome-minimal transition-all',
                  selectedChange === change.id ? 'border-primary' : ''
                )}
                onClick={() => setSelectedChange(change.id)}
                data-testid={`change-${change.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Timeline Marker & Icons */}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <div className="timeline-marker" />
                      {getChangeIcon(change.type)}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {change.type}
                            </Badge>
                            {getResourceIcon(change.resourceType)}
                            <span className="text-xs font-mono text-muted-foreground">
                              {change.resource}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-foreground leading-tight mb-1">
                            {change.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {change.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getImpactBadge(change.impact)}
                          <span className="text-xs text-muted-foreground">{change.estimatedTime}</span>
                        </div>
                      </div>

                      {/* Warnings */}
                      {change.warnings && change.warnings.length > 0 && (
                        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          {change.warnings.join(', ')}
                        </div>
                      )}

                      {/* Dependencies */}
                      {change.dependencies.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Depends on: {change.dependencies.map((dep: string) => `Change #${dep}`).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedChangeData ? (
              <Card className="sticky top-6 chrome-minimal">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {getResourceIcon(selectedChangeData.resourceType)}
                    {selectedChangeData.resource}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-foreground">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedChangeData.description}</p>
                  </div>
                  
                  {selectedChangeData.diff && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-foreground">Resource Diff</h4>
                      <CodeBlock
                        code={selectedChangeData.diff}
                        lang="typescript"
                        className="text-xs"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Impact:</span>
                      <div className="mt-1">{getImpactBadge(selectedChangeData.impact)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <div className="mt-1 text-foreground">{selectedChangeData.estimatedTime}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="sticky top-6 chrome-minimal">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Select a change to view detailed information and resource diff
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}