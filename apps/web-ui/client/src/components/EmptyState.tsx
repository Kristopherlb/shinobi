import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  hint?: string;
  cta?: ReactNode;
  className?: string;
}

export function EmptyState({ title, hint, cta, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <div className="w-8 h-8 rounded-full bg-muted-foreground/20" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {hint && (
        <p className="text-muted-foreground mb-4 max-w-md">{hint}</p>
      )}
      {cta && <div>{cta}</div>}
    </div>
  );
}