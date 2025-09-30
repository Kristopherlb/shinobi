import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { MobileDrawer } from './mobile-drawer';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

interface SearchFilterProps {
  searchPlaceholder?: string;
  filters?: {
    label: string;
    options: FilterOption[];
    value?: string;
    onChange: (value: string) => void;
  }[];
  onSearch?: (query: string) => void;
  activeFilters?: { id: string; label: string; value: string }[];
  onRemoveFilter?: (filterId: string) => void;
  className?: string;
}

export function SearchFilter({
  searchPlaceholder = 'Search...',
  filters = [],
  onSearch,
  activeFilters = [],
  onRemoveFilter,
  className
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const FilterContent = () => (
    <div className="space-y-4">
      {filters.map((filter, index) => (
        <div key={index} className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {filter.label}
          </label>
          <Select value={filter.value} onValueChange={filter.onChange}>
            <SelectTrigger className="touch-friendly">
              <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filter Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 touch-friendly"
            data-testid="input-search"
          />
        </div>
        
        {/* Desktop Filters */}
        <div className="hidden lg:flex items-center gap-2">
          {filters.map((filter, index) => (
            <Select key={index} value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        {/* Mobile Filter Drawer */}
        {filters.length > 0 && (
          <MobileDrawer
            trigger={
              <Button 
                variant="outline" 
                size="icon"
                className="lg:hidden touch-target"
                data-testid="button-mobile-filters"
              >
                <Filter className="w-4 h-4" />
              </Button>
            }
            title="Filters"
            side="bottom"
          >
            <FilterContent />
          </MobileDrawer>
        )}
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="touch-friendly flex items-center gap-1"
            >
              <span>{filter.label}: {filter.value}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onRemoveFilter?.(filter.id)}
                data-testid={`button-remove-filter-${filter.id}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}