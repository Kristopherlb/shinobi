import { useState, useEffect, useMemo, useRef } from 'react';
import { Command } from 'cmdk';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Sparkles, 
  Settings, 
  Plus, 
  Home, 
  CheckSquare, 
  MessageSquare, 
  Layout,
  Activity,
  Code,
  FileText,
  Users,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  ICommandProvider, 
  Command as CommandType, 
  CommandContext, 
  CommandResult 
} from '@shared/contracts/commands';
import type { IActionDispatcher } from '../../services/ActionDispatcher';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commandProvider: ICommandProvider;
  actionDispatcher: IActionDispatcher;
  context?: CommandContext;
}

interface CommandGroup {
  name: string;
  commands: CommandType[];
}

const categoryIcons = {
  navigation: Home,
  tasks: CheckSquare,
  search: Search,
  ai: Sparkles,
  collaboration: Users,
  settings: Settings,
  system: Code,
};

export function CommandPalette({ isOpen, onClose, commandProvider, actionDispatcher, context }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [commands, setCommands] = useState<CommandType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load commands when palette opens or context changes
  useEffect(() => {
    if (isOpen) {
      loadCommands();
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, context]);

  // Search commands when search term changes
  useEffect(() => {
    if (search) {
      searchCommands();
    } else {
      loadCommands();
    }
  }, [search]);

  const loadCommands = async () => {
    setIsLoading(true);
    try {
      const commandList = await commandProvider.getCommands(context);
      setCommands(commandList);
    } catch (error) {
      console.error('Failed to load commands:', error);
      setCommands([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchCommands = async () => {
    setIsLoading(true);
    try {
      const searchResults = await commandProvider.searchCommands(search, context);
      setCommands(searchResults);
    } catch (error) {
      console.error('Failed to search commands:', error);
      setCommands([]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeCommand = async (command: CommandType) => {
    try {
      const result: CommandResult = await commandProvider.executeCommand(command.id);
      
      if (result.success) {
        onClose();
        
        // Handle command actions using the action dispatcher
        if (result.actions) {
          for (const action of result.actions) {
            await actionDispatcher.dispatch(action);
          }
        }
      } else {
        // Show error - would use external notification service
        console.error('Command failed:', result.message);
      }
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  };

  // Group commands by category
  const commandGroups = useMemo(() => {
    const groups: Record<string, CommandType[]> = {};
    
    commands.forEach(command => {
      const category = command.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(command);
    });

    return Object.entries(groups).map(([name, commands]) => ({
      name,
      commands: commands.sort((a, b) => a.name.localeCompare(b.name))
    }));
  }, [commands]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-2xl" onKeyDown={handleKeyDown}>
        <Command className="bg-background">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              ref={inputRef}
              placeholder="Type a command or search..."
              value={search}
              onValueChange={setSearch}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="command-palette-search"
            />
            {search && (
              <Badge variant="secondary" className="ml-2">
                {commands.length} results
              </Badge>
            )}
          </div>

          <Command.List className="max-h-96 overflow-y-auto p-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  Loading commands...
                </div>
              </div>
            )}

            {!isLoading && commands.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p>No commands found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            )}

            {commandGroups.map((group) => (
              <Command.Group key={group.name} heading={group.name}>
                {group.commands.map((command) => {
                  const Icon = categoryIcons[command.category as keyof typeof categoryIcons] || Code;
                  return (
                    <Command.Item
                      key={command.id}
                      value={command.id}
                      onSelect={() => executeCommand(command)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer",
                        "hover:bg-accent hover:text-accent-foreground",
                        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                      )}
                      data-testid={`command-${command.id}`}
                    >
                      <Icon className="h-4 w-4 opacity-70" />
                      <div className="flex-1">
                        <div className="font-medium">{command.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {command.description}
                        </div>
                      </div>
                      {command.shortcut && (
                        <div className="flex items-center gap-1">
                          {command.shortcut.modifiers?.map((mod: string) => (
                            <Badge key={mod} variant="outline" className="text-xs px-1 py-0">
                              {mod === 'meta' ? '⌘' : mod === 'ctrl' ? '⌃' : mod === 'alt' ? '⌥' : mod === 'shift' ? '⇧' : mod}
                            </Badge>
                          ))}
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {command.shortcut.key}
                          </Badge>
                        </div>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>

          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Press ↵ to execute • ↑↓ to navigate • esc to close</span>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>AI Assistant available</span>
              </div>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}