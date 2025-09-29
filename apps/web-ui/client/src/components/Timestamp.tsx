import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimestampProps {
  iso: string;
  format?: 'relative' | 'absolute';
  className?: string;
}

export function Timestamp({ iso, format: formatType = 'relative', className }: TimestampProps) {
  const date = new Date(iso);
  
  const displayText = formatType === 'relative' 
    ? formatDistanceToNow(date, { addSuffix: true })
    : format(date, 'MMM d, yyyy HH:mm');

  return (
    <time 
      dateTime={iso} 
      className={cn('text-sm text-muted-foreground', className)}
      title={format(date, 'PPPPp')}
    >
      {displayText}
    </time>
  );
}