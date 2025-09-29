import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  Mic, 
  Filter, 
  Clock, 
  X, 
  Sparkles,
  FileText,
  Code,
  Users,
  Database,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { 
  ISearchService, 
  SearchQuery, 
  SearchResult, 
  SearchOptions 
} from '@shared/contracts/search';

interface AdvancedSearchProps {
  searchService: ISearchService;
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

interface VoiceRecognition {
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => VoiceRecognition;
    SpeechRecognition: new () => VoiceRecognition;
  }
}

const typeIcons = {
  'documentation': FileText,
  'code': Code,
  'people': Users,
  'infrastructure': Database,
};

const defaultFilters = [
  { key: 'type', label: 'Content Type', values: ['documentation', 'code', 'user', 'task'] },
  { key: 'modified', label: 'Last Modified', values: ['today', 'week', 'month', 'year'] },
  { key: 'workspace', label: 'Workspace', values: ['current', 'shared', 'all'] },
];

export function AdvancedSearch({ 
  searchService, 
  onResultSelect, 
  placeholder = "Search across your workspace...",
  className 
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [searchHistory, setSearchHistory] = useState<SearchQuery[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
          setIsListening(false);
          performSearch(transcript);
        };
        recognitionRef.current.onend = () => setIsListening(false);
        recognitionRef.current.onerror = () => setIsListening(false);
      }
    }
  }, []);

  // Create search options object
  const searchOptions = useMemo((): SearchOptions => ({
    filters: selectedFilters,
    limit: 10,
    includeAI: true,
    contextual: true
  }), [selectedFilters]);

  // Debounced search
  const performSearch = async (searchTerm: string = query) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      const searchResults = await searchService.search(searchTerm, searchOptions);
      setResults(searchResults);
      
      // Update search history
      const existingQuery = searchHistory.find(q => q.text === searchTerm);
      if (!existingQuery) {
        const newQuery: SearchQuery = {
          text: searchTerm,
          timestamp: new Date(),
          resultCount: searchResults.length
        };
        setSearchHistory(prev => [newQuery, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get autocomplete suggestions
  const getSuggestions = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const suggestions = await searchService.getSuggestions(searchTerm);
      setSuggestions(suggestions.map(s => s.text));
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      setSuggestions([]);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    setShowSuggestions(true);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce search and suggestions
    timeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        getSuggestions(value);
        performSearch(value);
      } else {
        setResults([]);
        setSuggestions([]);
      }
    }, 300);
  };

  // Handle voice search
  const handleVoiceSearch = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    const totalItems = suggestions.length + searchHistory.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? totalItems - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedSuggestion = selectedIndex < suggestions.length 
            ? suggestions[selectedIndex]
            : searchHistory[selectedIndex - suggestions.length].text;
          setQuery(selectedSuggestion);
          performSearch(selectedSuggestion);
        } else {
          performSearch();
        }
        setShowSuggestions(false);
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterKey: string, value: string, checked: boolean) => {
    setSelectedFilters(prev => {
      const current = prev[filterKey] || [];
      const updated = checked 
        ? [...current, value]
        : current.filter((v: string) => v !== value);
      
      return { ...prev, [filterKey]: updated };
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedFilters({});
  };

  // Get active filter count
  const activeFilterCount = Object.values(selectedFilters).flat().length;

  return (
    <div className={cn("relative w-full", className)}>
      {/* Search Input Section */}
      <div className="relative">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={placeholder}
              className="pl-10 pr-20"
              data-testid="input-advanced-search"
            />
            
            {/* Voice Search Button */}
            {recognitionRef.current && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceSearch}
                className={cn(
                  "absolute right-12 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6",
                  isListening && "text-destructive animate-pulse"
                )}
                data-testid="button-voice-search"
              >
                <Mic className="w-3 h-3" />
              </Button>
            )}

            {/* Clear Search Button */}
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setSuggestions([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
                data-testid="button-clear-search"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Filters Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="relative"
                data-testid="button-search-filters"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex items-center justify-between">
                Search Filters
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto p-1 text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {defaultFilters.map((filter) => (
                <div key={filter.key}>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {filter.label}
                  </DropdownMenuLabel>
                  {filter.values.map((value) => (
                    <DropdownMenuCheckboxItem
                      key={value}
                      checked={selectedFilters[filter.key]?.includes(value) || false}
                      onCheckedChange={(checked) => handleFilterChange(filter.key, value, checked)}
                      className="capitalize"
                    >
                      {value}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg border">
            <CardContent className="p-2">
              <ScrollArea className="max-h-80">
                {/* AI Suggestions */}
                {suggestions.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                      <Sparkles className="w-3 h-3" />
                      AI Suggestions
                    </div>
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className={cn(
                          "px-2 py-1.5 text-sm rounded cursor-pointer hover-elevate",
                          selectedIndex === index && "bg-muted"
                        )}
                        onClick={() => {
                          setQuery(suggestion);
                          performSearch(suggestion);
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}

                {/* Search History */}
                {searchHistory.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Recent Searches
                    </div>
                    {searchHistory.slice(0, 5).map((historyItem, index) => (
                      <div
                        key={historyItem.text}
                        className={cn(
                          "px-2 py-1.5 text-sm rounded cursor-pointer hover-elevate",
                          selectedIndex === (suggestions.length + index) && "bg-muted"
                        )}
                        onClick={() => {
                          setQuery(historyItem.text);
                          performSearch(historyItem.text);
                          setShowSuggestions(false);
                        }}
                      >
                        {historyItem.text}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Searching...</span>
        </div>
      )}

      {/* Search Results */}
      {!isLoading && results.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {results.length} results found
            </h3>
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtered by:</span>
                <div className="flex gap-1">
                  {Object.entries(selectedFilters).map(([key, values]) =>
                    values.map(value => (
                      <Badge
                        key={`${key}-${value}`}
                        variant="outline"
                        className="text-xs capitalize"
                      >
                        {value}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFilterChange(key, value, false)}
                          className="ml-1 h-auto p-0 w-3 h-3"
                        >
                          <X className="w-2 h-2" />
                        </Button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {results.map((result) => {
                const Icon = typeIcons[result.type as keyof typeof typeIcons] || FileText;
                
                return (
                  <Card 
                    key={result.id} 
                    className="hover-elevate cursor-pointer transition-all"
                    onClick={() => onResultSelect?.(result)}
                    data-testid={`search-result-${result.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <CardTitle className="text-sm text-foreground line-clamp-1">
                            {result.title}
                          </CardTitle>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {result.type}
                        </Badge>
                      </div>
                      {result.relevanceScore && (
                        <div className="text-xs text-muted-foreground">
                          Relevance: {Math.round(result.relevanceScore * 100)}%
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      {result.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {result.description}
                        </p>
                      )}
                      
                      {result.metadata && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {result.metadata.path && (
                            <span className="font-mono">{result.metadata.path}</span>
                          )}
                          {result.metadata.lastModified && (
                            <span>{new Date(result.metadata.lastModified).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                      
                      {result.highlights && result.highlights.length > 0 && (
                        <div className="mt-2 flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Highlights:</span>
                          {result.highlights.slice(0, 3).map((highlight, index) => (
                            <div key={index} className="citation-badge">
                              {index + 1}
                            </div>
                          ))}
                          {result.highlights.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{result.highlights.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && query && results.length === 0 && (
        <div className="text-center py-8">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No results found for "{query}"
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search terms or filters
          </p>
        </div>
      )}
    </div>
  );
}