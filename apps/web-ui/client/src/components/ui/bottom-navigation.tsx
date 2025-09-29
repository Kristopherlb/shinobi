import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  Activity, 
  CheckSquare, 
  MessageSquare, 
  Layout, 
  Archive,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'Home', icon: Home, href: '/' },
  { id: 'feed', label: 'Feed', icon: Activity, href: '/feed' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/tasks', badge: '3' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, href: '/chat' },
  { id: 'plans', label: 'Plans', icon: Layout, href: '/plans' },
];

export function BottomNavigation() {
  const [location] = useLocation();

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-card/95 backdrop-blur-md"
      style={{ height: 'var(--bottom-nav-height)' }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          
          return (
            <Link key={item.id} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'flex flex-col items-center gap-1 h-auto py-2 px-3 relative min-w-16',
                  'touch-target hover:bg-transparent active:bg-transparent',
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                )}
                data-testid={`nav-${item.id}`}
              >
                <div className="relative">
                  <Icon className={cn(
                    'w-5 h-5 transition-all',
                    isActive ? 'scale-110' : 'scale-100'
                  )} />
                  {item.badge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  'text-xs font-medium transition-all',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}