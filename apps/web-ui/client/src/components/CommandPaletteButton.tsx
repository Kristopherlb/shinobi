import { Button } from '@/components/ui/button';
import { useCommandPalette } from '@/components/command-palette';
import { Command } from 'lucide-react';

export function CommandPaletteButton() {
  const { showPalette } = useCommandPalette();

  return (
    <Button 
      onClick={showPalette}
      className="bg-primary text-primary-foreground hover:bg-primary/90"
      data-testid="button-launch-command-palette"
    >
      <Command className="w-4 h-4 mr-2" />
      Launch Command Palette
      <span className="ml-2 text-xs opacity-70">⌘K</span>
    </Button>
  );
}