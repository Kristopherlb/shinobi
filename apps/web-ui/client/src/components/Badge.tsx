import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'outline' | 'success' | 'warn' | 'danger' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const badgeVariants = {
  default: 'bg-secondary text-secondary-foreground border-secondary-border',
  outline: 'border border-border text-foreground bg-transparent',
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  warn: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border whitespace-nowrap',
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}