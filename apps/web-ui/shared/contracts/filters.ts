// Advanced Filtering System Contracts

export interface IFilterService {
  getFilters(entityType: string): Promise<FilterDefinition[]>;
  applyFilter(filter: Filter, data: any[]): Promise<any[]>;
  saveFilter(filter: SavedFilter): Promise<SavedFilter>;
  getSavedFilters(userId: string, entityType?: string): Promise<SavedFilter[]>;
  deleteFilter(filterId: string): Promise<void>;
  validateFilter(filter: Filter): Promise<FilterValidationResult>;
  getFilterPresets(entityType: string): Promise<FilterPreset[]>;
}

export interface FilterDefinition {
  field: string;
  label: string;
  type: FilterType;
  operators: FilterOperator[];
  options?: FilterOption[];
  validation?: FilterFieldValidation;
  category?: string;
}

export interface Filter {
  id?: string;
  conditions: FilterCondition[];
  logic: FilterLogic;
  sort?: SortConfig[];
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
  type: FilterType;
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  userId: string;
  filter: Filter;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  entityType: string;
  filter: Filter;
  category: string;
  icon?: string;
}

export interface FilterOption {
  value: any;
  label: string;
  count?: number;
  category?: string;
}

export interface FilterValidationResult {
  isValid: boolean;
  errors: FilterError[];
  warnings: FilterWarning[];
}

export interface FilterError {
  field: string;
  message: string;
  code: string;
}

export interface FilterWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface FilterFieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: (value: any) => boolean;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
  priority: number;
}

export type FilterType = 
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'user'
  | 'tag';

export type FilterOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_equal'
  | 'less_than_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null'
  | 'regex';

export type FilterLogic = 'and' | 'or';

export interface IFilterBuilder {
  createCondition(field: string, operator: FilterOperator, value: any): FilterCondition;
  addCondition(filter: Filter, condition: FilterCondition): Filter;
  removeCondition(filter: Filter, index: number): Filter;
  updateCondition(filter: Filter, index: number, condition: FilterCondition): Filter;
  setLogic(filter: Filter, logic: FilterLogic): Filter;
  validate(filter: Filter): FilterValidationResult;
  toQuery(filter: Filter): string;
  fromQuery(query: string): Filter;
}

export interface ISmartFilterService {
  suggestFilters(query: string, entityType: string): Promise<FilterSuggestion[]>;
  autoComplete(field: string, partial: string): Promise<string[]>;
  getPopularFilters(entityType: string): Promise<SavedFilter[]>;
  optimizeFilter(filter: Filter): Promise<Filter>;
}

export interface FilterSuggestion {
  type: 'condition' | 'preset' | 'saved';
  label: string;
  description: string;
  filter: Filter | FilterCondition;
  confidence: number;
}