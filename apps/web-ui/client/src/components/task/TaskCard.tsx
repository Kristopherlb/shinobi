import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Timestamp } from '@/components/Timestamp';
import { 
  CheckSquare, 
  Clock, 
  User, 
  AlertTriangle, 
  MessageSquare,
  MoreVertical,
  Play,
  Pause,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignee?: { name: string; avatar?: string };
    dueDate?: string;
    labels?: string[];
    comments?: number;
  };
  onClick?: () => void;
  className?: string;
}

export function TaskCard({ task, onClick, className }: TaskCardProps) {
  const statusConfig = {
    todo: { icon: CheckSquare, color: 'bg-muted text-muted-foreground', label: 'To Do' },
    in_progress: { icon: Play, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'In Progress' },
    review: { icon: Pause, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Review' },
    done: { icon: Check, color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Done' }
  };

  const priorityConfig = {
    low: { color: 'bg-gray-500/10 text-gray-400', label: 'Low' },
    medium: { color: 'bg-blue-500/10 text-blue-400', label: 'Medium' },
    high: { color: 'bg-amber-500/10 text-amber-400', label: 'High' },
    critical: { color: 'bg-red-500/10 text-red-400', label: 'Critical' }
  };

  const StatusIcon = statusConfig[task.status].icon;

  return (
    <Card 
      className={cn(
        'hover-elevate cursor-pointer touch-friendly transition-all',
        className
      )}
      onClick={onClick}
      data-testid={`task-card-${task.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="timeline-marker flex-shrink-0" />
            <CardTitle className="text-base line-clamp-1 mobile-optimized">
              {task.title}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8"
            data-testid={`task-menu-${task.id}`}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Status and Priority */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            variant="outline" 
            className={cn('flex items-center gap-1', statusConfig[task.status].color)}
          >
            <StatusIcon className="w-3 h-3" />
            {statusConfig[task.status].label}
          </Badge>
          <Badge 
            variant="outline"
            className={priorityConfig[task.priority].color}
          >
            {priorityConfig[task.priority].label}
          </Badge>
        </div>

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.slice(0, 3).map((label, index) => (
              <span key={index} className="citation-badge">
                {label}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="citation-badge">
                +{task.labels.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {task.assignee && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{task.assignee.name}</span>
              </div>
            )}
            {task.comments && task.comments > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{task.comments}</span>
              </div>
            )}
          </div>
          
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <Timestamp iso={task.dueDate} format="relative" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}