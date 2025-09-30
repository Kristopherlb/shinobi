import { CommandPalette } from './CommandPalette';
import { useCommandPalette } from './CommandProvider';
import { ActionDispatcher } from '../../services/ActionDispatcher';
import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

// Integration component that connects the command palette to the app
export function CommandPaletteIntegration() {
  const { commandProvider, isPaletteOpen, hidePalette } = useCommandPalette();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Initialize action dispatcher with real services
  const actionDispatcher = useMemo(() => new ActionDispatcher({
    navigate,
    showToast: toast
  }), [navigate, toast]);

  // Get current context - in a real app this would come from app state
  const context = {
    page: window.location.pathname,
    selectedItems: [],
    activeWorkspace: 'default',
    userRole: 'admin',
    permissions: ['read', 'write', 'admin']
  };

  return (
    <CommandPalette
      isOpen={isPaletteOpen}
      onClose={hidePalette}
      commandProvider={commandProvider}
      actionDispatcher={actionDispatcher}
      context={context}
    />
  );
}