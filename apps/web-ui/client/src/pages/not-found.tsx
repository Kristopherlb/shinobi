import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <AppShell breadcrumbs={[{ label: 'Shinobi ADP' }, { label: '404 Not Found' }]}>
      <div className="flex items-center justify-center min-h-[400px]">
        <EmptyState
          title="Page not found"
          hint="The page you're looking for doesn't exist or has been moved."
          cta={
            <Link href="/">
              <Button data-testid="button-go-home">
                Go to Dashboard
              </Button>
            </Link>
          }
        />
      </div>
    </AppShell>
  );
}