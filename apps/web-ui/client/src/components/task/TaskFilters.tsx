import { useState } from 'react';
import { SearchFilter } from '@/components/ui/search-filter';

interface TaskFiltersProps {
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
}

export function TaskFilters({ onSearch, onFilterChange }: TaskFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<{ id: string; label: string; value: string }[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...filterValues, [filterId]: value };
    setFilterValues(newFilters);
    onFilterChange?.(newFilters);

    // Update active filters display
    const filterLabels = {
      status: 'Status',
      priority: 'Priority',
      assignee: 'Assignee',
      label: 'Label'
    };

    setActiveFilters(
      Object.entries(newFilters)
        .filter(([_, val]) => val && val !== 'all')
        .map(([key, val]) => ({
          id: key,
          label: filterLabels[key as keyof typeof filterLabels] || key,
          value: val
        }))
    );
  };

  const handleRemoveFilter = (filterId: string) => {
    const newFilters = { ...filterValues };
    delete newFilters[filterId];
    setFilterValues(newFilters);
    onFilterChange?.(newFilters);

    setActiveFilters(activeFilters.filter(f => f.id !== filterId));
  };

  const filters = [
    {
      label: 'Status',
      options: [
        { id: 'all', label: 'All Statuses', value: 'all' },
        { id: 'todo', label: 'To Do', value: 'todo' },
        { id: 'in_progress', label: 'In Progress', value: 'in_progress' },
        { id: 'review', label: 'Review', value: 'review' },
        { id: 'done', label: 'Done', value: 'done' }
      ],
      value: filterValues.status || 'all',
      onChange: (value: string) => handleFilterChange('status', value)
    },
    {
      label: 'Priority',
      options: [
        { id: 'all', label: 'All Priorities', value: 'all' },
        { id: 'critical', label: 'Critical', value: 'critical' },
        { id: 'high', label: 'High', value: 'high' },
        { id: 'medium', label: 'Medium', value: 'medium' },
        { id: 'low', label: 'Low', value: 'low' }
      ],
      value: filterValues.priority || 'all',
      onChange: (value: string) => handleFilterChange('priority', value)
    },
    {
      label: 'Assignee',
      options: [
        { id: 'all', label: 'All Assignees', value: 'all' },
        { id: 'unassigned', label: 'Unassigned', value: 'unassigned' },
        { id: 'me', label: 'Assigned to me', value: 'me' },
        { id: 'alice', label: 'Alice Johnson', value: 'alice' },
        { id: 'bob', label: 'Bob Smith', value: 'bob' }
      ],
      value: filterValues.assignee || 'all',
      onChange: (value: string) => handleFilterChange('assignee', value)
    }
  ];

  return (
    <SearchFilter
      searchPlaceholder="Search tasks..."
      filters={filters}
      onSearch={onSearch}
      activeFilters={activeFilters}
      onRemoveFilter={handleRemoveFilter}
      data-testid="task-filters"
    />
  );
}