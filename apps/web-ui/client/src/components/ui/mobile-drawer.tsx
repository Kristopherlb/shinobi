import { ReactNode } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileDrawerProps {
  trigger: ReactNode;
  title: string;
  children: ReactNode;
  side?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
}

export function MobileDrawer({ 
  trigger, 
  title, 
  children, 
  side = 'bottom',
  className 
}: MobileDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent 
        side={side} 
        className={cn(
          'touch-friendly mobile-safe-area',
          side === 'bottom' && 'max-h-[90vh]',
          className
        )}
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}