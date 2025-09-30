import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MobileCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  image?: string;
  overlay?: ReactNode;
}

export function MobileCard({ 
  children, 
  onClick, 
  className, 
  compact = false,
  image,
  overlay 
}: MobileCardProps) {
  return (
    <Card 
      className={cn(
        'hover-elevate transition-all cursor-pointer overflow-hidden',
        'border border-border/50 bg-card/50 backdrop-blur-sm',
        compact ? 'p-3' : 'p-0',
        className
      )}
      onClick={onClick}
    >
      {image && (
        <div className="relative aspect-video overflow-hidden">
          <img 
            src={image} 
            alt="" 
            className="w-full h-full object-cover"
          />
          {overlay && (
            <div className="absolute inset-0 bg-black/40 flex items-end p-4">
              {overlay}
            </div>
          )}
        </div>
      )}
      <div className={cn(compact ? '' : 'p-4')}>
        {children}
      </div>
    </Card>
  );
}

interface MobileCardGridProps {
  children: ReactNode;
  cols?: 1 | 2;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MobileCardGrid({ 
  children, 
  cols = 2, 
  gap = 'md',
  className 
}: MobileCardGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4', 
    lg: 'gap-6'
  };

  return (
    <div className={cn(
      'grid',
      cols === 1 ? 'grid-cols-1' : 'grid-cols-2',
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}