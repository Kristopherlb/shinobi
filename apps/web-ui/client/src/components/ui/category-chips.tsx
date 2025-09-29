import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CategoryChip {
  id: string;
  label: string;
  active?: boolean;
}

interface CategoryChipsProps {
  categories: CategoryChip[];
  onCategoryClick?: (id: string) => void;
  className?: string;
}

export function CategoryChips({ categories, onCategoryClick, className }: CategoryChipsProps) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2 scrollbar-hide', className)}>
      {categories.map((category) => (
        <Badge
          key={category.id}
          variant={category.active ? "default" : "secondary"}
          className={cn(
            'whitespace-nowrap cursor-pointer touch-friendly transition-all',
            'hover:scale-105 active:scale-95',
            category.active 
              ? 'bg-primary text-primary-foreground shadow-md' 
              : 'bg-muted hover:bg-muted/80'
          )}
          onClick={() => onCategoryClick?.(category.id)}
          data-testid={`category-${category.id}`}
        >
          {category.label}
        </Badge>
      ))}
    </div>
  );
}