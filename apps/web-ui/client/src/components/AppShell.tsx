import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Command, Search, Menu, Settings, Activity, MessageSquare, CheckSquare, Archive, Layout, X, PanelLeft, PanelRight, Home } from 'lucide-react';
import { NotificationTrigger } from '@/components/notifications/NotificationTrigger';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { BottomNavigation } from '@/components/ui/bottom-navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppShellProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  showMetadataRail?: boolean;
  showTimelineRail?: boolean;
  metadataContent?: ReactNode;
  timelineContent?: ReactNode;
  className?: string;
}

function MobileNavigation({ onClose }: { onClose: () => void }) {
  const navigationItems = [
    { label: 'Platform Overview', href: '/', icon: Home },
    { label: 'Activity Feed', href: '/feed', icon: Activity },
    { label: 'Service Monitoring', href: '/monitoring', icon: Activity },
    { label: 'Infrastructure Ops', href: '/infrastructure', icon: Settings },
    { label: 'AI Tools', href: '/ai-tools', icon: Settings },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Chat', href: '/chat', icon: MessageSquare },
    { label: 'Plans', href: '/plans', icon: Layout },
    { label: 'Catalog', href: '/catalog', icon: Archive },
  ];

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Shinobi ADP</h2>
        <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-mobile-nav">
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-left"
                  onClick={onClose}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3" data-testid="button-mobile-settings">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">SA</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Shinobi Agent</p>
              <p className="text-xs text-muted-foreground">admin@shinobi.dev</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ 
  children, 
  breadcrumbs = [], 
  showMetadataRail = false,
  showTimelineRail = false,
  metadataContent,
  timelineContent,
  className 
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);

  return (
    <div className={cn('flex h-screen bg-background', className)}>
      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:h-screen mobile-safe-height lg:mobile-safe-height-none">
        {/* Top Navigation Bar - Responsive */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-border bg-card/50">
          {/* Left Section: Mobile Menu & Search */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Mobile Navigation Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="lg:hidden" data-testid="button-mobile-menu">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <MobileNavigation onClose={() => setMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Desktop Menu Button (Hidden on Mobile) */}
            <Button size="icon" variant="ghost" className="hidden lg:flex" data-testid="button-menu">
              <Menu className="w-4 h-4" />
            </Button>
            
            {/* Command Palette Trigger - Responsive */}
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 px-3 py-1.5 h-auto bg-muted/50 rounded-md border border-border hover-elevate justify-start min-w-[120px] sm:min-w-[180px] lg:min-w-[240px]"
              data-testid="button-command-palette"
              aria-label="Open command palette"
              onClick={() => {/* TODO: Implement command palette */}}
            >
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground flex-1 hidden sm:block">Search or run command...</span>
              <span className="text-sm text-muted-foreground flex-1 sm:hidden">Search...</span>
              <Badge variant="secondary" className="text-xs hidden lg:flex">
                <Command className="w-3 h-3 mr-1" />K
              </Badge>
            </Button>
          </div>

          {/* Center Section: Breadcrumbs - Hidden on Mobile */}
          {breadcrumbs.length > 0 && (
            <nav className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              {breadcrumbs.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <span>/</span>}
                  <span className={index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}>
                    {item.label}
                  </span>
                </div>
              ))}
            </nav>
          )}

          {/* Right Section: Actions & Rails */}
          <div className="flex items-center gap-1 lg:gap-2">
            {/* Timeline Rail Toggle - Mobile/Desktop */}
            {showTimelineRail && (
              <Sheet open={timelineOpen} onOpenChange={setTimelineOpen}>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" className="lg:hidden" data-testid="button-timeline-mobile">
                    <PanelLeft className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-foreground">Activity Timeline</h3>
                      <Button size="icon" variant="ghost" onClick={() => setTimelineOpen(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {timelineContent || <DefaultTimelineContent />}
                  </div>
                </SheetContent>
              </Sheet>
            )}
            
            {/* Metadata Rail Toggle - Mobile/Desktop */}
            {showMetadataRail && (
              <Sheet open={metadataOpen} onOpenChange={setMetadataOpen}>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" className="lg:hidden" data-testid="button-metadata-mobile">
                    <PanelRight className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-foreground">Context & Citations</h3>
                      <Button size="icon" variant="ghost" onClick={() => setMetadataOpen(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {metadataContent || <DefaultMetadataContent />}
                  </div>
                </SheetContent>
              </Sheet>
            )}
            
            <NotificationTrigger unreadCount={3} />
            <Button size="icon" variant="ghost" className="hidden sm:flex" data-testid="button-activity">
              <Activity className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="hidden sm:flex" data-testid="button-settings">
              <Settings className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">SA</span>
            </div>
          </div>
        </header>

        {/* Main Content Area - Responsive Split Pane Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Timeline Rail (Left) - Hidden on Mobile */}
          {showTimelineRail && (
            <aside className="timeline-rail p-4 hidden lg:block">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Activity Timeline</h3>
                {timelineContent || <DefaultTimelineContent />}
              </div>
            </aside>
          )}

          {/* Primary Workspace - Responsive */}
          <main className="workspace-main p-4 lg:p-6 overflow-auto pb-4 lg:pb-6">
            <div className="max-w-6xl mx-auto">
              {/* Mobile Breadcrumbs */}
              {breadcrumbs.length > 0 && (
                <nav className="flex md:hidden items-center gap-2 text-sm text-muted-foreground mb-4">
                  {breadcrumbs.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {index > 0 && <span>/</span>}
                      <span className={index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </nav>
              )}
              {children}
            </div>
          </main>

          {/* Metadata Rail (Right) - Hidden on Mobile */}
          {showMetadataRail && (
            <aside className="metadata-rail p-4 hidden lg:block">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Context & Citations</h3>
                {metadataContent || <DefaultMetadataContent />}
              </div>
            </aside>
          )}
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

function DefaultTimelineContent() {
  const timelineItems = [
    { id: 1, type: 'deployment', status: 'success', title: 'Production deploy completed', time: '2m ago' },
    { id: 2, type: 'task', status: 'pending', title: 'Infrastructure plan updated', time: '8m ago' },
    { id: 3, type: 'alert', status: 'warning', title: 'Memory usage elevated', time: '12m ago' },
    { id: 4, type: 'chat', status: 'info', title: 'AI assistant conversation', time: '18m ago' },
  ];

  return (
    <div className="space-y-3">
      {timelineItems.map((item) => (
        <div key={item.id} className="flex items-start gap-3 p-2 rounded-md hover-elevate">
          <div className="timeline-marker mt-1.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {item.type === 'deployment' && <Layout className="w-3 h-3 text-muted-foreground" />}
              {item.type === 'task' && <CheckSquare className="w-3 h-3 text-muted-foreground" />}
              {item.type === 'alert' && <Activity className="w-3 h-3 text-muted-foreground" />}
              {item.type === 'chat' && <MessageSquare className="w-3 h-3 text-muted-foreground" />}
              <Badge 
                variant={item.status === 'success' ? 'default' : item.status === 'warning' ? 'secondary' : 'outline'}
                className="text-xs"
              >
                {item.status}
              </Badge>
            </div>
            <p className="text-sm text-foreground leading-tight">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DefaultMetadataContent() {
  const citations = [
    { id: 1, title: 'Infrastructure Documentation', type: 'docs', url: '#' },
    { id: 2, title: 'Deployment Pipeline Config', type: 'config', url: '#' },
    { id: 3, title: 'Security Guidelines', type: 'policy', url: '#' },
  ];

  return (
    <div className="space-y-4">
      {/* Context Information */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Context</h4>
        <div className="space-y-1">
          <div className="citation-badge">Production Environment</div>
          <div className="citation-badge">us-east-1</div>
          <div className="citation-badge">v2.4.1</div>
        </div>
      </div>

      {/* Citations & References */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Citations</h4>
        <div className="space-y-2">
          {citations.map((citation, index) => (
            <div key={citation.id} className="p-2 bg-muted/30 rounded border border-border/50 hover-elevate">
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
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs"
            data-testid="button-export-current-view"
          >
            <Archive className="w-3 h-3 mr-2" />
            Export current view
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs"
            data-testid="button-ask-ai-assistant"
          >
            <MessageSquare className="w-3 h-3 mr-2" />
            Ask AI assistant
          </Button>
        </div>
      </div>
    </div>
  );
}