import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { MobileCard, MobileCardGrid } from '@/components/ui/mobile-card';
import { CategoryChips } from '@/components/ui/category-chips';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  Zap, 
  Shield,
  Activity,
  MessageSquare,
  CheckSquare,
  Layout
} from 'lucide-react';

export default function MobileHomePage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All', active: selectedCategory === 'all' },
    { id: 'development', label: 'Development', active: selectedCategory === 'development' },
    { id: 'infrastructure', label: 'Infrastructure', active: selectedCategory === 'infrastructure' },
    { id: 'security', label: 'Security', active: selectedCategory === 'security' },
    { id: 'analytics', label: 'Analytics', active: selectedCategory === 'analytics' },
  ];

  const featuredItems = [
    {
      id: '1',
      title: 'Real-time Task Management',
      description: 'Track development workflows with AI-powered insights and automated progress updates.',
      icon: CheckSquare,
      color: 'bg-blue-500',
      stats: '12 active tasks'
    },
    {
      id: '2', 
      title: 'AI-Powered Chat Assistant',
      description: 'Get intelligent help with deployments, troubleshooting, and infrastructure planning.',
      icon: MessageSquare,
      color: 'bg-violet-500',
      stats: '8 conversations'
    },
    {
      id: '3',
      title: 'Infrastructure Planning',
      description: 'Design and manage infrastructure changes with automated impact analysis.',
      icon: Layout,
      color: 'bg-teal-500',
      stats: '3 active plans'
    },
    {
      id: '4',
      title: 'Real-time Activity Feed',
      description: 'Monitor platform-wide events, deployments, and system changes in real-time.',
      icon: Activity,
      color: 'bg-amber-500',
      stats: '247 events today'
    }
  ];

  return (
    <AppShell breadcrumbs={[{ label: 'Shinobi ADP' }]}>
      <div className="space-y-6">
        {/* Hero Section - Mobile Optimized */}
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Where development
            <br />
            intelligence begins
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
            Professional development platform with AI-powered workflows and real-time collaboration
          </p>
        </div>

        {/* Search Bar - Prominent like Perplexity */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Ask anything about your infrastructure..."
            className="pl-12 py-4 text-base bg-muted/50 border-border/50 rounded-2xl touch-friendly"
            data-testid="mobile-search"
          />
          <Button
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-xl"
            data-testid="mobile-search-voice"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
        </div>

        {/* Category Navigation */}
        <CategoryChips 
          categories={categories}
          onCategoryClick={setSelectedCategory}
        />

        {/* Platform Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Active Tasks', value: '12', icon: CheckSquare, color: 'text-blue-500' },
            { label: 'System Events', value: '247', icon: Activity, color: 'text-green-500' },
            { label: 'AI Conversations', value: '8', icon: MessageSquare, color: 'text-violet-500' },
            { label: 'Infrastructure Plans', value: '3', icon: Layout, color: 'text-teal-500' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <MobileCard key={stat.label} compact className="text-center">
                <Icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
                <div className="text-xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </MobileCard>
            );
          })}
        </div>

        {/* Featured Workflows */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground px-2">Featured Workflows</h2>
          <div className="space-y-3">
            {featuredItems.map((item) => {
              const Icon = item.icon;
              return (
                <MobileCard 
                  key={item.id}
                  className="hover:shadow-lg transition-all"
                  data-testid={`featured-${item.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-base mb-1 line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                        {item.description}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {item.stats}
                      </Badge>
                    </div>
                  </div>
                </MobileCard>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground px-2">Quick Actions</h2>
          <MobileCardGrid cols={2} gap="sm">
            {[
              { label: 'Create Task', icon: CheckSquare, color: 'bg-blue-500' },
              { label: 'Start Chat', icon: MessageSquare, color: 'bg-violet-500' },
              { label: 'View Plans', icon: Layout, color: 'bg-teal-500' },
              { label: 'System Status', icon: Shield, color: 'bg-green-500' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <MobileCard 
                  key={action.label}
                  compact
                  className="text-center touch-friendly"
                  data-testid={`action-${action.label.toLowerCase().replace(' ', '-')}`}
                >
                  <div className={`w-10 h-10 mx-auto rounded-xl ${action.color} flex items-center justify-center mb-2`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-sm font-medium text-foreground">{action.label}</div>
                </MobileCard>
              );
            })}
          </MobileCardGrid>
        </div>
      </div>
    </AppShell>
  );
}