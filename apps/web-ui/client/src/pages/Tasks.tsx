import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Timestamp } from '@/components/Timestamp';
import { TagList } from '@/components/TagList';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  User, 
  Plus,
  Filter,
  Search,
  Calendar,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  dueDate?: string;
  createdAt: string;
  tags: string[];
  citations: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Implement database migration for user profiles',
    description: 'Create PostgreSQL migration scripts to add new user profile fields and update existing data structure.',
    status: 'in-progress',
    priority: 'high',
    assignee: 'database-team',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    tags: ['migration', 'postgresql', 'user-data'],
    citations: [
      { id: 'task-1-1', title: 'Migration Strategy Doc', type: 'docs' },
      { id: 'task-1-2', title: 'User Profile Schema', type: 'schema' }
    ]
  },
  {
    id: '2',
    title: 'Security audit for authentication system',
    description: 'Comprehensive security review of OAuth implementation and session management.',
    status: 'todo',
    priority: 'critical',
    assignee: 'security-team',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    tags: ['security', 'oauth', 'audit'],
    citations: [
      { id: 'task-2-1', title: 'Security Checklist', type: 'policy' },
      { id: 'task-2-2', title: 'OAuth Implementation Guide', type: 'docs' }
    ]
  },
  {
    id: '3',
    title: 'Performance optimization for API endpoints',
    description: 'Optimize slow database queries and implement caching for frequently accessed endpoints.',
    status: 'review',
    priority: 'medium',
    assignee: 'backend-team',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    tags: ['performance', 'api', 'caching'],
    citations: [
      { id: 'task-3-1', title: 'Performance Benchmarks', type: 'metrics' }
    ]
  },
  {
    id: '4',
    title: 'Deploy monitoring dashboard',
    description: 'Set up comprehensive monitoring for production infrastructure with alerting.',
    status: 'done',
    priority: 'medium',
    assignee: 'infrastructure-team',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    tags: ['monitoring', 'infrastructure', 'deployment'],
    citations: [
      { id: 'task-4-1', title: 'Monitoring Setup Guide', type: 'docs' }
    ]
  }
];

export default function TasksPage() {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const getStatusBadge = (status: Task['status']) => {
    const variants = {
      'todo': 'outline',
      'in-progress': 'warn',
      'review': 'info',
      'done': 'success'
    } as const;
    
    return <Badge variant={variants[status]} className="text-xs">{status.replace('-', ' ')}</Badge>;
  };

  const getPriorityBadge = (priority: Task['priority']) => {
    const variants = {
      'low': 'outline',
      'medium': 'info', 
      'high': 'warn',
      'critical': 'danger'
    } as const;
    
    return <Badge variant={variants[priority]} className="text-xs">{priority}</Badge>;
  };

  const timelineContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Task Activity</h3>
        <Badge variant="info" className="text-xs">Live</Badge>
      </div>
      
      <div className="space-y-3">
        {mockTasks.slice(0, 3).map((task, index) => (
          <div key={task.id} className="flex items-start gap-3 p-2 rounded-md hover-elevate cursor-pointer">
            <div className="timeline-marker mt-1.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare className="w-3 h-3 text-muted-foreground" />
                {getStatusBadge(task.status)}
              </div>
              <p className="text-sm text-foreground leading-tight line-clamp-2">{task.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <Timestamp iso={task.createdAt} format="relative" />
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <Button variant="ghost" size="sm" className="w-full text-xs" data-testid="button-view-all-tasks">
        View all tasks
      </Button>
    </div>
  );

  const metadataContent = (
    <div className="space-y-4">
      {/* Task Summary */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Task Summary</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Todo</span>
            <Badge variant="outline" className="text-xs">2</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">In Progress</span>
            <Badge variant="warn" className="text-xs">1</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">In Review</span>
            <Badge variant="info" className="text-xs">1</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Completed</span>
            <Badge variant="success" className="text-xs">1</Badge>
          </div>
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority Distribution</h4>
        <div className="space-y-1">
          <div className="citation-badge">1 Critical</div>
          <div className="citation-badge">1 High</div>
          <div className="citation-badge">2 Medium</div>
        </div>
      </div>

      {/* Recent References */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent References</h4>
        <div className="space-y-2">
          {mockTasks.slice(0, 2).flatMap(task => task.citations.slice(0, 1)).map((citation, index) => (
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
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" data-testid="button-create-task">
            <Plus className="w-3 h-3 mr-2" />
            Create new task
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" data-testid="button-task-reports">
            <Target className="w-3 h-3 mr-2" />
            Generate reports
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      breadcrumbs={[{ label: 'Shinobi ADP' }, { label: 'Task Management' }]}
      showTimelineRail={true}
      showMetadataRail={true}
      timelineContent={timelineContent}
      metadataContent={metadataContent}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 font-bold text-foreground mb-2">Task Management</h1>
            <p className="text-muted-foreground">
              Track, organize, and manage development tasks and workflows
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" data-testid="button-filter-tasks">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button size="sm" data-testid="button-new-task">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <Card className="chrome-minimal">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks, assignees, or tags..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-tasks"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {['all', 'todo', 'in-progress', 'review', 'done'].map((status) => (
                  <Button
                    key={status}
                    variant={filter === status ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(status)}
                    className="capitalize"
                    data-testid={`button-filter-${status}`}
                  >
                    {status === 'in-progress' ? 'in progress' : status}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mockTasks.map((task) => (
            <Card key={task.id} className="hover-elevate cursor-pointer chrome-minimal">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Timeline Marker & Status */}
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div className="timeline-marker" />
                    <CheckSquare className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-base font-semibold text-foreground leading-tight">
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(task.status)}
                          {getPriorityBadge(task.priority)}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {task.description}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.assignee}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <Timestamp iso={task.createdAt} format="relative" />
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due <Timestamp iso={task.dueDate} format="relative" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {task.tags.length > 0 && (
                      <div>
                        <TagList tags={task.tags} variant="outline" />
                      </div>
                    )}

                    {/* Citations */}
                    {task.citations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          References
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {task.citations.map((citation, index) => (
                            <div
                              key={citation.id}
                              className="flex items-center gap-1 p-1.5 bg-muted/30 rounded border border-border/50 hover-elevate cursor-pointer"
                              data-testid={`citation-${citation.id}`}
                            >
                              <span className="citation-badge">{index + 1}</span>
                              <span className="text-xs text-foreground">{citation.title}</span>
                              <span className="text-xs text-accent">({citation.type})</span>
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