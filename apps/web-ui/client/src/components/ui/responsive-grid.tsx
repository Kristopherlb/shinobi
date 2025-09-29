import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: ReactNode;
  cols?: 'mobile-stack' | 'mobile-2-desktop-3' | 'mobile-1-desktop-4' | 'equal-columns';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const gridVariants = {
  'mobile-stack': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  'mobile-2-desktop-3': 'grid-cols-2 lg:grid-cols-3',
  'mobile-1-desktop-4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  'equal-columns': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
};

const gapVariants = {
  'sm': 'gap-2',
  'md': 'gap-4',
  'lg': 'gap-6'
};

export function ResponsiveGrid({ 
  children, 
  cols = 'mobile-stack',
  gap = 'md',
  className 
}: ResponsiveGridProps) {
  const gridClasses = cn(
    'grid',
    gridVariants[cols],
    gapVariants[gap],
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}