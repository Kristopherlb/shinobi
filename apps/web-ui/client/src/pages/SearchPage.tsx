import { AppShell } from '@/components/AppShell';
import { AdvancedSearch, useSearch } from '@/components/search';
import type { SearchResult } from '@shared/contracts/search';
import { useToast } from '@/hooks/use-toast';

export default function SearchPage() {
  const { searchService } = useSearch();
  const { toast } = useToast();

  const handleResultSelect = (result: SearchResult) => {
    toast({
      title: 'Search Result Selected',
      description: `Opening: ${result.title}`,
    });
    
    // In a real app, this would navigate to the result or open it
    console.log('Selected result:', result);
  };

  return (
    <AppShell 
      breadcrumbs={[
        { label: 'Shinobi ADP' }, 
        { label: 'Search' }
      ]}
      showTimelineRail={false}
      showMetadataRail={false}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-h1 font-bold text-foreground">
            Advanced Search
          </h1>
          <p className="text-lg text-muted-foreground">
            Search across documentation, code, team members, and infrastructure with AI-powered insights
          </p>
        </div>

        {/* Search Interface */}
        <div className="bg-card border rounded-lg p-6">
          <AdvancedSearch 
            searchService={searchService}
            onResultSelect={handleResultSelect}
            placeholder="Search for documentation, code, people, infrastructure..."
          />
        </div>
      </div>
    </AppShell>
  );
}