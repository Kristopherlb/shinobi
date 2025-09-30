import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users, Eye, Clock, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { UserProfile, PresenceData, UserActivity, PresenceStatus } from "@shared/contracts";

interface PresenceAvatarsProps {
  maxVisible?: number;
  showActivity?: boolean;
  className?: string;
  context?: string; // e.g., "workspace:123", "document:456", "page:/monitoring"
}

interface UserPresence extends UserProfile {
  presence: PresenceData;
  activity?: UserActivity;
  cursor?: {
    x: number;
    y: number;
    color: string;
  };
}

export function PresenceAvatars({ 
  maxVisible = 5, 
  showActivity = true, 
  className,
  context = "global"
}: PresenceAvatarsProps) {
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);

  // Mock data - will be replaced with real collaboration service API calls
  const { data: presenceData, refetch } = useQuery({
    queryKey: ['/api/collaboration/presence', context],
    queryFn: async (): Promise<UserPresence[]> => {
      // Simulate real-time presence data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return [
        {
          id: "user-1",
          name: "Sarah Chen",
          email: "sarah.chen@company.com",
          avatar: undefined,
          presence: {
            status: "active",
            lastSeen: new Date().toISOString(),
            location: "Infrastructure Dashboard"
          },
          activity: {
            type: "editing",
            target: "drift-detection-config",
            timestamp: new Date(Date.now() - 1000 * 30).toISOString()
          },
          cursor: {
            x: 245,
            y: 180,
            color: "#3b82f6"
          }
        },
        {
          id: "user-2",
          name: "Marcus Rodriguez", 
          email: "marcus.rodriguez@company.com",
          avatar: undefined,
          presence: {
            status: "active",
            lastSeen: new Date().toISOString(),
            location: "AI Tools"
          },
          activity: {
            type: "viewing",
            target: "component-generator",
            timestamp: new Date(Date.now() - 1000 * 120).toISOString()
          },
          cursor: {
            x: 450,
            y: 320,
            color: "#10b981"
          }
        },
        {
          id: "user-3",
          name: "Emily Watson",
          email: "emily.watson@company.com", 
          avatar: undefined,
          presence: {
            status: "away",
            lastSeen: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            location: "Compliance Audit"
          },
          activity: {
            type: "commenting",
            target: "security-scan-results",
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
          }
        },
        {
          id: "user-4",
          name: "David Kim",
          email: "david.kim@company.com",
          avatar: undefined,
          presence: {
            status: "active",
            lastSeen: new Date().toISOString(),
            location: "Service Monitoring"
          },
          activity: {
            type: "investigating",
            target: "payment-service-alerts",
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
          },
          cursor: {
            x: 680,
            y: 240,
            color: "#f59e0b"
          }
        },
        {
          id: "user-5",
          name: "Lisa Zhang",
          email: "lisa.zhang@company.com",
          avatar: undefined,
          presence: {
            status: "busy", 
            lastSeen: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            location: "Chat - Incident Response"
          },
          activity: {
            type: "coordinating",
            target: "incident-response-001",
            timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString()
          }
        },
        {
          id: "user-6",
          name: "Alex Thompson",
          email: "alex.thompson@company.com",
          avatar: undefined,
          presence: {
            status: "offline",
            lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            location: null
          }
        }
      ];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Auto-refresh presence data
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  const activeUsers = presenceData?.filter(user => {
    const status: PresenceStatus = user.presence.status;
    return status === 'active' || status === 'busy';
  }) || [];
  
  const visibleUsers = activeUsers.slice(0, maxVisible);
  const overflowCount = Math.max(0, activeUsers.length - maxVisible);

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-red-500';  
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getActivityIcon = (type?: string) => {
    switch (type) {
      case 'editing': return <Pencil className="w-3 h-3" />;
      case 'viewing': return <Eye className="w-3 h-3" />;
      case 'commenting': return <Users className="w-3 h-3" />;
      case 'investigating': return <Eye className="w-3 h-3" />;
      case 'coordinating': return <Users className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getActivityDescription = (activity?: UserActivity) => {
    if (!activity) return null;
    
    const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
    const target = activity.target.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return `${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} ${target} ${timeAgo}`;
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center ${className}`}>
        {/* Active User Avatars */}
        <div className="flex -space-x-2">
          {visibleUsers.map((user, index) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div
                  className="relative cursor-pointer hover:z-10 transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredUser(user.id)}
                  onMouseLeave={() => setHoveredUser(null)}
                  data-testid={`presence-avatar-${user.id}`}
                >
                  <Avatar className="w-8 h-8 border-2 border-background ring-2 ring-muted">
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback className="text-xs font-medium">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Status indicator */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(user.presence.status)}`} />
                  
                  {/* Activity indicator */}
                  {user.activity && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                      {getActivityIcon(user.activity.type)}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" data-testid={`tooltip-name-${user.id}`}>{user.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {user.presence.status}
                    </Badge>
                  </div>
                  
                  {user.presence.location && (
                    <div className="text-xs text-muted-foreground" data-testid={`tooltip-location-${user.id}`}>
                      📍 {user.presence.location}
                    </div>
                  )}
                  
                  {showActivity && user.activity && (
                    <div className="text-xs" data-testid={`tooltip-activity-${user.id}`}>
                      {getActivityDescription(user.activity)}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Last seen {formatDistanceToNow(new Date(user.presence.lastSeen), { addSuffix: true })}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {/* Overflow indicator */}
          {overflowCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative cursor-pointer" data-testid="presence-overflow">
                  <Avatar className="w-8 h-8 border-2 border-background ring-2 ring-muted bg-muted">
                    <AvatarFallback className="text-xs font-medium">
                      +{overflowCount}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="space-y-1">
                  <div className="font-medium">+{overflowCount} more online</div>
                  <div className="text-xs text-muted-foreground">
                    {activeUsers.slice(maxVisible).map(u => u.name).join(', ')}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Summary info */}
        {activeUsers.length > 0 && (
          <div className="ml-3 text-sm text-muted-foreground" data-testid="presence-summary">
            {activeUsers.length} online
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default PresenceAvatars;