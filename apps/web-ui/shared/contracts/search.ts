// Search Service Contracts

export interface ISearchService {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  getSuggestions(partial: string): Promise<SearchSuggestion[]>;
  getRecentSearches(): SearchQuery[];
  saveSearch(query: SearchQuery): void;
  clearHistory(): void;
}

export interface SearchOptions {
  type?: SearchType[];
  filters?: Record<string, any>;
  limit?: number;
  includeAI?: boolean;
  contextual?: boolean;
}

export interface SearchResult {
  id: string;
  type: SearchType;
  title: string;
  description: string;
  url: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
  highlights?: SearchHighlight[];
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'filter' | 'completion';
  context?: string;
}

export interface SearchQuery {
  text: string;
  timestamp: Date;
  resultCount: number;
}

export interface SearchHighlight {
  field: string;
  fragments: string[];
}

export type SearchType = 
  | 'task' 
  | 'chat' 
  | 'plan' 
  | 'user' 
  | 'code' 
  | 'documentation' 
  | 'integration';

export interface IVoiceSearchService {
  startListening(): Promise<void>;
  stopListening(): void;
  isListening(): boolean;
  isSupported(): boolean;
}