import type { 
  ISearchService, 
  SearchQuery, 
  SearchResult, 
  SearchSuggestion,
  SearchOptions
} from '@shared/contracts/search';

export class MockSearchService implements ISearchService {
  private mockResults: SearchResult[] = [
    {
      id: 'doc-1',
      title: 'Getting Started with Shinobi ADP',
      type: 'documentation',
      description: 'Learn how to set up and configure your Shinobi Agentic Developer Platform workspace. This comprehensive guide covers installation, configuration, and basic workflow setup.',
      url: '/docs/getting-started',
      relevanceScore: 0.95,
      metadata: {
        path: '/docs/getting-started.md',
        lastModified: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        author: 'Platform Team',
        tags: ['setup', 'configuration', 'onboarding']
      }
    },
    {
      id: 'code-1',
      title: 'TaskService Implementation',
      type: 'code',
      description: 'export class TaskService implements ITaskService { async createTask(task: CreateTaskRequest): Promise<Task> { // Implementation details for task creation and management',
      url: '/code/services/TaskService.ts',
      relevanceScore: 0.88,
      metadata: {
        path: '/src/services/TaskService.ts',
        lastModified: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        author: 'Sarah Chen',
        language: 'typescript',
        lines: 234
      }
    },
    {
      id: 'people-1',
      title: 'Sarah Chen',
      type: 'user',
      description: 'Senior Full-Stack Engineer specializing in AI-powered developer tools and infrastructure automation. Lead contributor to the Shinobi platform core.',
      url: '/team/sarah-chen',
      relevanceScore: 0.82,
      metadata: {
        role: 'Senior Engineer',
        team: 'Platform Core',
        email: 'sarah.chen@company.com',
        timezone: 'US/Pacific'
      }
    },
    {
      id: 'infra-1',
      title: 'Production Kubernetes Cluster',
      type: 'task',
      description: 'Main production cluster running Shinobi platform services. Auto-scaling enabled with 3-99 nodes, currently serving 45.2K requests/minute.',
      url: '/infrastructure/k8s-prod',
      relevanceScore: 0.78,
      metadata: {
        region: 'us-east-1',
        nodes: 12,
        status: 'healthy',
        lastDeployment: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
      }
    },
    {
      id: 'doc-2',
      title: 'API Authentication Guide',
      type: 'documentation',
      description: 'Comprehensive guide to API authentication patterns used in the Shinobi platform. Covers JWT tokens, API keys, and OAuth2 integration.',
      url: '/docs/api-auth',
      relevanceScore: 0.75,
      metadata: {
        path: '/docs/api/authentication.md',
        lastModified: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        author: 'Platform Team',
        tags: ['api', 'security', 'authentication']
      }
    },
    {
      id: 'code-2',
      title: 'WebSocket Connection Manager',
      type: 'code',
      description: 'class WebSocketManager { private connections = new Map<string, WebSocket>(); async connect(userId: string): Promise<void> { // Real-time connection management',
      url: '/code/realtime/WebSocketManager.ts',
      relevanceScore: 0.72,
      metadata: {
        path: '/src/realtime/WebSocketManager.ts',
        lastModified: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        author: 'Alex Rodriguez',
        language: 'typescript',
        lines: 156
      }
    }
  ];

  private mockSuggestions: SearchSuggestion[] = [
    { text: 'authentication setup', type: 'query' },
    { text: 'task management', type: 'query' },
    { text: 'kubernetes deployment', type: 'query' },
    { text: 'websocket configuration', type: 'query' },
    { text: 'api documentation', type: 'query' },
    { text: 'team collaboration', type: 'query' },
    { text: 'monitoring dashboard', type: 'query' },
    { text: 'security best practices', type: 'query' }
  ];

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));

    let results = [...this.mockResults];

    // Filter by query
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(result => 
        result.title.toLowerCase().includes(searchTerm) ||
        result.description.toLowerCase().includes(searchTerm) ||
        result.metadata?.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply filters from options
    if (options?.filters) {
      Object.entries(options.filters).forEach(([filterKey, filterValues]) => {
        if (Array.isArray(filterValues) && filterValues.length > 0) {
          switch (filterKey) {
            case 'type':
              results = results.filter(result => filterValues.includes(result.type));
              break;
            case 'modified':
              results = results.filter(result => {
                if (!result.metadata?.lastModified) return false;
                const modifiedDate = new Date(result.metadata.lastModified);
                const now = new Date();
                
                return filterValues.some(period => {
                  switch (period) {
                    case 'today':
                      return modifiedDate.getDate() === now.getDate() &&
                             modifiedDate.getMonth() === now.getMonth() &&
                             modifiedDate.getFullYear() === now.getFullYear();
                    case 'week':
                      return (now.getTime() - modifiedDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
                    case 'month':
                      return (now.getTime() - modifiedDate.getTime()) < 30 * 24 * 60 * 60 * 1000;
                    case 'year':
                      return (now.getTime() - modifiedDate.getTime()) < 365 * 24 * 60 * 60 * 1000;
                    default:
                      return true;
                  }
                });
              });
              break;
            case 'workspace':
              // For demo purposes, simulate workspace filtering
              if (!filterValues.includes('all')) {
                // Filter by simulated workspace assignment
                results = results.filter(result => {
                  const workspaceType = result.metadata?.team || 'current';
                  return filterValues.some(workspace => {
                    switch (workspace) {
                      case 'current':
                        return workspaceType === 'Platform Core' || workspaceType === 'current';
                      case 'shared':
                        return workspaceType === 'Shared' || result.type === 'documentation';
                      default:
                        return true;
                    }
                  });
                });
              }
              break;
          }
        }
      });
    }

    // Sort by relevance score (higher scores first)
    results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Apply limit from options
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async getSuggestions(partial: string): Promise<SearchSuggestion[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 300));

    const searchTerm = partial.toLowerCase();
    return this.mockSuggestions
      .filter(suggestion => suggestion.text.toLowerCase().includes(searchTerm))
      .slice(0, 5);
  }

  getRecentSearches(): SearchQuery[] {
    return [
      { text: 'task management api', timestamp: new Date(Date.now() - 3600000), resultCount: 8 },
      { text: 'kubernetes deployment guide', timestamp: new Date(Date.now() - 7200000), resultCount: 12 },
      { text: 'websocket authentication', timestamp: new Date(Date.now() - 10800000), resultCount: 15 },
      { text: 'team collaboration features', timestamp: new Date(Date.now() - 86400000), resultCount: 6 },
      { text: 'monitoring setup', timestamp: new Date(Date.now() - 172800000), resultCount: 10 }
    ];
  }

  saveSearch(query: SearchQuery): void {
    console.log(`Saved search: ${query.text}`);
  }

  clearHistory(): void {
    console.log('Search history cleared');
  }
}