import { createContext, useContext, ReactNode } from 'react';
import type { ISearchService } from '@shared/contracts/search';
import { MockSearchService } from './MockSearchService';

interface SearchContextType {
  searchService: ISearchService;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

interface SearchProviderProps {
  children: ReactNode;
  searchService?: ISearchService;
}

export function SearchProvider({ children, searchService }: SearchProviderProps) {
  const service = searchService || new MockSearchService();

  return (
    <SearchContext.Provider value={{ searchService: service }}>
      {children}
    </SearchContext.Provider>
  );
}