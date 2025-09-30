import { Badge } from './Badge';
import { cn } from '@/lib/utils';

interface TagListProps {
  tags: string[];
  className?: string;
  variant?: 'default' | 'outline';
}

export function TagList({ tags, className, variant = 'outline' }: TagListProps) {
  if (!tags.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((tag, index) => (
        <Badge key={index} variant={variant} className="text-xs">
          {tag}
        </Badge>
      ))}
    </div>
  );
}