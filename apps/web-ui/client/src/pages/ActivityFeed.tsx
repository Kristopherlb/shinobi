import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Timestamp } from '@/components/Timestamp';
import { TagList } from '@/components/TagList';
import { 
  Activity, 
  GitCommit, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Server, 
  Shield,
  Filter,
  Search,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedItem {
  id: string;
  type: 'deployment' | 'alert' | 'task' | 'security' | 'collaboration';
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  environment?: string;
  tags: string[];
  citations: Array<{
    id: string;
    title: string;
    type: string;
    url?: string;
  }>;
  metrics?: {
    duration?: string;
    affected?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
}

const mockFeedData: FeedItem[] = [
  {
    id: '1',
    type: 'deployment',
    status: 'success', 
    title: 'Production deployment completed',
    description: 'Successfully deployed shinobi-adp v2.4.1 to production cluster with zero downtime migration',
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    actor: 'deployment-bot',
    environment: 'production',
    tags: ['deployment', 'v2.4.1', 'zero-downtime', 'kubernetes'],
    citations: [
      { id: 'dep-1', title: 'Deployment Pipeline Config', type: 'config' },
      { id: 'dep-2', title: 'Release Notes v2.4.1', type: 'docs' },
    ],
    metrics: { duration: '3.2min', affected: 0 }
  },
  {
    id: '2',
    type: 'alert',
    status: 'warning',
    title: 'Memory usage elevated in us-west-2',
    description: 'Multiple pods showing memory usage above 85% threshold. Auto-scaling triggered.',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    actor: 'monitoring-system',
    environment: 'production',
    tags: ['memory', 'auto-scaling', 'us-west-2', 'performance'],
    citations: [
      { id: 'alert-1', title: 'Memory Monitoring Dashboard', type: 'dashboard', url: '#' },
      { id: 'alert-2', title: 'Auto-scaling Policy', type: 'policy' },
    ],
    metrics: { severity: 'medium', affected: 12 }
  },
  {
    id: '3',
    type: 'security',
    status: 'error',
    title: 'Security scan detected vulnerabilities',
    description: 'Critical vulnerability found in nginx base image. Immediate patch required.',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    actor: 'security-scanner',
    environment: 'staging',
    tags: ['vulnerability', 'nginx', 'cve-2024-1234', 'critical'],
    citations: [
      { id: 'sec-1', title: 'CVE-2024-1234 Details', type: 'security', url: '#' },
      { id: 'sec-2', title: 'Patch Deployment Guide', type: 'docs' },
      { id: 'sec-3', title: 'Security Compliance Policy', type: 'policy' },
    ],
    metrics: { severity: 'critical', affected: 8 }
  },
  {
    id: '4',
    type: 'collaboration',
    status: 'info',
    title: 'Infrastructure review completed',
    description: 'Team completed quarterly infrastructure review with 12 optimization recommendations.',
    timestamp: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    actor: 'infrastructure-team',
    tags: ['review', 'optimization', 'quarterly', 'infrastructure'],
    citations: [
      { id: 'collab-1', title: 'Q4 Infrastructure Review', type: 'report' },
      { id: 'collab-2', title: 'Optimization Recommendations', type: 'docs' },
    ],
    metrics: { affected: 12 }
  },
  {
    id: '5',
    type: 'task',
    status: 'pending',
    title: 'Database migration scheduled',
    description: 'PostgreSQL 15 migration planned for maintenance window this weekend.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    actor: 'database-team',
    environment: 'production',
    tags: ['migration', 'postgresql', 'maintenance', 'scheduled'],
    citations: [
      { id: 'task-1', title: 'Migration Runbook', type: 'docs' },
      { id: 'task-2', title: 'Rollback Procedure', type: 'docs' },
    ],
    metrics: { duration: '2-4 hours' }
  }
];

function ActivityFeedPage() {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const getStatusIcon = (type: FeedItem['type'], status: FeedItem['status']) => {
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    if (status === 'error') return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (status === 'pending') return <Clock className="w-4 h-4 text-blue-400" />;
    
    switch (type) {
      case 'deployment': return <GitCommit className="w-4 h-4 text-muted-foreground" />;
      case 'security': return <Shield className="w-4 h-4 text-muted-foreground" />;
      case 'collaboration': return <Users className="w-4 h-4 text-muted-foreground" />;
      case 'alert': return <Activity className="w-4 h-4 text-muted-foreground" />;
      default: return <Server className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusChip = (status: FeedItem['status']) => {
    const variants = {
      success: 'status-chip--success',
      warning: 'status-chip--warning', 
      error: 'status-chip--error',
      info: 'status-chip--info',
      pending: 'status-chip--info'
    };
    
    return (
      <div className={cn('status-chip', variants[status])}>
        {status}
      </div>
    );
  };

  const timelineContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Live Activity</h3>
        <Badge variant="success" className="text-xs">Real-time</Badge>
      </div>
      
      <div className="space-y-3">
        {mockFeedData.slice(0, 3).map((item, index) => (
          <div key={item.id} className="flex items-start gap-3 p-2 rounded-md hover-elevate cursor-pointer">
            <div className="timeline-marker mt-1.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(item.type, item.status)}
                {getStatusChip(item.status)}
              </div>
              <p className="text-sm text-foreground leading-tight line-clamp-2">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <Timestamp iso={item.timestamp} format="relative" />
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <Button variant="ghost" size="sm" className="w-full text-xs" data-testid="button-view-all-activity">
        View all activity
      </Button>
    </div>
  );

  const metadataContent = (
    <div className="space-y-4">
      {/* Active Filters */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Filters</h4>
        <div className="space-y-1">
          <div className="citation-badge">Last 24 hours</div>
          <div className="citation-badge">Production env</div>
          <div className="citation-badge">High priority</div>
        </div>
      </div>

      {/* System Status */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">System Status</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Infrastructure</span>
            {getStatusChip('success')}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Security</span>
            {getStatusChip('warning')}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Deployments</span>
            {getStatusChip('success')}
          </div>
        </div>
      </div>

      {/* Citation References */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Citations</h4>
        <div className="space-y-2">
          {mockFeedData.slice(0, 2).flatMap(item => item.citations.slice(0, 1)).map((citation, index) => (
            <div key={citation.id} className="p-2 bg-muted/30 rounded border border-border/50 hover-elevate cursor-pointer">
              <div className="flex items-start gap-2">
                <span className="citation-badge">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-tight">{citation.title}</p>
                  <p className="text-xs text-accent mt-1">{citation.type}</p>
                </div>
                {citation.url && <ExternalLink className="w-3 h-3 text-muted-foreground mt-0.5" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Actions</h4>
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" data-testid="button-create-alert">
            <AlertTriangle className="w-3 h-3 mr-2" />
            Create custom alert
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" data-testid="button-export-feed">
            <Server className="w-3 h-3 mr-2" />
            Export activity log
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      breadcrumbs={[{ label: 'Shinobi ADP' }, { label: 'Activity Feed' }]}
      showTimelineRail={true}
      showMetadataRail={true}
      timelineContent={timelineContent}
      metadataContent={metadataContent}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 font-bold text-foreground mb-2">Activity Feed</h1>
            <p className="text-muted-foreground">
              Real-time platform events, deployments, and system changes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" data-testid="button-configure-alerts">
              <Filter className="w-4 h-4 mr-2" />
              Configure
            </Button>
            <Button size="sm" data-testid="button-refresh-feed">
              <Activity className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters & Search */}
        <Card className="chrome-minimal">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search activity, tags, or environments..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-activity"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {['all', 'deployment', 'alert', 'security', 'task'].map((filterType) => (
                  <Button
                    key={filterType}
                    variant={filter === filterType ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(filterType)}
                    className="capitalize"
                    data-testid={`button-filter-${filterType}`}
                  >
                    {filterType}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <div className="space-y-4">
          {mockFeedData.map((item, index) => (
            <Card key={item.id} className="hover-elevate cursor-pointer chrome-minimal">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Timeline Marker & Icon */}
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div className="timeline-marker" />
                    {getStatusIcon(item.type, item.status)}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-semibold text-foreground leading-tight">
                            {item.title}
                          </h3>
                          {getStatusChip(item.status)}
                          {item.environment && (
                            <Badge variant="outline" className="text-xs">
                              {item.environment}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                      
                      {/* Metrics */}
                      {item.metrics && (
                        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                          {item.metrics.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.metrics.duration}
                            </div>
                          )}
                          {item.metrics.affected !== undefined && (
                            <div className="flex items-center gap-1">
                              <Server className="w-3 h-3" />
                              {item.metrics.affected} affected
                            </div>
                          )}
                          {item.metrics.severity && (
                            <Badge 
                              variant={item.metrics.severity === 'critical' ? 'danger' : 
                                      item.metrics.severity === 'high' ? 'warn' : 'info'}
                              className="text-xs"
                            >
                              {item.metrics.severity}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Metadata Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {item.actor}
                        </div>
                        <Timestamp iso={item.timestamp} format="absolute" />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          data-testid={`button-discuss-${item.id}`}
                          onClick={() => {
                            // TODO: Implement discussion panel
                            console.log('Discussion panel not yet implemented for item:', item.id);
                          }}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Discuss
                        </Button>
                      </div>
                    </div>

                    {/* Tags */}
                    {item.tags.length > 0 && (
                      <div>
                        <TagList tags={item.tags} variant="outline" />
                      </div>
                    )}

                    {/* Citations */}
                    {item.citations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          References
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {item.citations.map((citation, citationIndex) => (
                            <div
                              key={citation.id}
                              className="flex items-center gap-1 p-1.5 bg-muted/30 rounded border border-border/50 hover-elevate cursor-pointer"
                              data-testid={`citation-${citation.id}`}
                            >
                              <span className="citation-badge">{citationIndex + 1}</span>
                              <span className="text-xs text-foreground">{citation.title}</span>
                              <span className="text-xs text-accent">({citation.type})</span>
                              {citation.url && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export default ActivityFeedPage;