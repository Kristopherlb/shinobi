import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { 
  ICommandProvider, 
  Command, 
  CommandContext, 
  CommandResult, 
  IShortcutService 
} from '@shared/contracts/commands';

interface CommandProviderContextType {
  commandProvider: ICommandProvider;
  shortcutService: IShortcutService;
  showPalette: () => void;
  hidePalette: () => void;
  isPaletteOpen: boolean;
}

const CommandProviderContext = createContext<CommandProviderContextType | null>(null);

interface CommandProviderProps {
  children: ReactNode;
  commandProvider: ICommandProvider;
  shortcutService: IShortcutService;
}

export function CommandProvider({ children, commandProvider, shortcutService }: CommandProviderProps) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const showPalette = () => setIsPaletteOpen(true);
  const hidePalette = () => setIsPaletteOpen(false);

  // Register global command palette shortcut
  useEffect(() => {
    const unregister = shortcutService.registerShortcut(
      { key: 'k', modifiers: ['meta'], description: 'Open command palette' },
      showPalette
    );

    return unregister;
  }, [shortcutService]);

  const contextValue: CommandProviderContextType = {
    commandProvider,
    shortcutService,
    showPalette,
    hidePalette,
    isPaletteOpen
  };

  return (
    <CommandProviderContext.Provider value={contextValue}>
      {children}
    </CommandProviderContext.Provider>
  );
}

export function useCommandPalette() {
  const context = useContext(CommandProviderContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandProvider');
  }
  return context;
}