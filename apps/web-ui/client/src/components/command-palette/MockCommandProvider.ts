// Mock implementation of ICommandProvider for development/testing
import type { 
  ICommandProvider, 
  IShortcutService,
  Command, 
  CommandContext, 
  CommandResult,
  KeyboardShortcut
} from '@shared/contracts/commands';

export class MockCommandProvider implements ICommandProvider {
  private commands: Command[] = [
    {
      id: 'navigate-home',
      name: 'Go to Home',
      description: 'Navigate to the dashboard home page',
      category: 'navigation',
      icon: 'home',
      keywords: ['home', 'dashboard', 'main'],
      shortcut: { key: 'h', modifiers: ['meta'] },
      handler: async () => ({ success: true, actions: [{ type: 'navigate', data: '/' }] })
    },
    {
      id: 'navigate-tasks',
      name: 'Go to Tasks',
      description: 'Navigate to task management',
      category: 'navigation', 
      icon: 'check-square',
      keywords: ['tasks', 'todo', 'work'],
      shortcut: { key: 't', modifiers: ['meta'] },
      handler: async () => ({ success: true, actions: [{ type: 'navigate', data: '/tasks' }] })
    },
    {
      id: 'create-task',
      name: 'Create New Task',
      description: 'Create a new task or project item',
      category: 'tasks',
      icon: 'plus',
      keywords: ['create', 'new', 'task', 'add'],
      shortcut: { key: 'n', modifiers: ['meta'] },
      handler: async () => ({ 
        success: true, 
        actions: [{ type: 'toast', data: { title: 'Create Task', message: 'Task creation dialog would open here' } }] 
      })
    },
    {
      id: 'ai-assistant',
      name: 'AI Assistant',
      description: 'Open AI chat assistant for help',
      category: 'ai',
      icon: 'sparkles',
      keywords: ['ai', 'assistant', 'help', 'chat'],
      shortcut: { key: 'a', modifiers: ['meta'] },
      handler: async () => ({ 
        success: true, 
        actions: [{ type: 'navigate', data: '/chat' }] 
      })
    },
    {
      id: 'search-global',
      name: 'Global Search',
      description: 'Search across all content and data',
      category: 'search',
      icon: 'search',
      keywords: ['search', 'find', 'lookup'],
      shortcut: { key: 'f', modifiers: ['meta'] },
      handler: async () => ({ 
        success: true, 
        actions: [{ type: 'toast', data: { title: 'Global Search', message: 'Advanced search interface would open here' } }] 
      })
    },
    {
      id: 'team-invite',
      name: 'Invite Team Member',
      description: 'Invite someone to join your workspace',
      category: 'collaboration',
      icon: 'users',
      keywords: ['invite', 'team', 'collaborate', 'share'],
      handler: async () => ({ 
        success: true, 
        actions: [{ type: 'toast', data: { title: 'Team Invite', message: 'User invitation dialog would open here' } }] 
      })
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'Open application settings',
      category: 'settings',
      icon: 'settings',
      keywords: ['settings', 'preferences', 'config'],
      shortcut: { key: ',', modifiers: ['meta'] },
      handler: async () => ({ 
        success: true, 
        actions: [{ type: 'navigate', data: '/settings' }] 
      })
    },
    {
      id: 'reload-page',
      name: 'Reload Page',
      description: 'Refresh the current page',
      category: 'system',
      icon: 'refresh-cw',
      keywords: ['reload', 'refresh', 'restart'],
      shortcut: { key: 'r', modifiers: ['meta'] },
      handler: async () => ({ 
        success: true, 
        actions: [{ type: 'reload', data: {} }] 
      })
    }
  ];

  private recentCommands: Command[] = [];

  async getCommands(context?: CommandContext): Promise<Command[]> {
    // Filter commands based on context if provided
    if (context?.permissions) {
      return this.commands.filter(cmd => 
        !cmd.condition?.requiredPermissions || 
        cmd.condition.requiredPermissions.every((perm: string) => context.permissions!.includes(perm))
      );
    }
    return this.commands;
  }

  async executeCommand(id: string, args?: Record<string, any>): Promise<CommandResult> {
    const command = this.commands.find(cmd => cmd.id === id);
    if (!command) {
      return { success: false, message: 'Command not found' };
    }

    // Add to recent commands
    this.recentCommands = [command, ...this.recentCommands.filter(c => c.id !== id)].slice(0, 10);

    try {
      return await command.handler(args);
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Command execution failed' 
      };
    }
  }

  async getRecentCommands(userId: string): Promise<Command[]> {
    return this.recentCommands;
  }

  async searchCommands(query: string, context?: CommandContext): Promise<Command[]> {
    const allCommands = await this.getCommands(context);
    const lowerQuery = query.toLowerCase();
    
    return allCommands.filter(command => 
      command.name.toLowerCase().includes(lowerQuery) ||
      command.description.toLowerCase().includes(lowerQuery) ||
      command.keywords.some((keyword: string) => keyword.toLowerCase().includes(lowerQuery))
    );
  }

  registerCommand(command: Command): void {
    this.commands.push(command);
  }

  unregisterCommand(id: string): void {
    this.commands = this.commands.filter(cmd => cmd.id !== id);
  }
}

export class MockShortcutService implements IShortcutService {
  private shortcuts: Record<string, { shortcut: KeyboardShortcut; handler: () => void }> = {};

  registerShortcut(shortcut: KeyboardShortcut, handler: () => void): () => void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts[key] = { shortcut, handler };

    // Register keyboard event listener
    const listener = (e: KeyboardEvent) => {
      if (this.matchesShortcut(e, shortcut)) {
        e.preventDefault();
        handler();
      }
    };

    document.addEventListener('keydown', listener);

    return () => {
      delete this.shortcuts[key];
      document.removeEventListener('keydown', listener);
    };
  }

  unregisterShortcut(key: string): void {
    delete this.shortcuts[key];
  }

  getShortcuts(): Record<string, KeyboardShortcut> {
    const result: Record<string, KeyboardShortcut> = {};
    Object.entries(this.shortcuts).forEach(([key, { shortcut }]) => {
      result[key] = shortcut;
    });
    return result;
  }

  isShortcutActive(key: string): boolean {
    return key in this.shortcuts;
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const modifiers = shortcut.modifiers?.sort().join('+') || '';
    return modifiers ? `${modifiers}+${shortcut.key}` : shortcut.key;
  }

  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
      return false;
    }

    const modifiers = shortcut.modifiers || [];
    const hasCtrl = modifiers.includes('ctrl') || modifiers.includes('meta');
    const hasAlt = modifiers.includes('alt');
    const hasShift = modifiers.includes('shift');

    return (
      (hasCtrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey) &&
      (hasAlt ? event.altKey : !event.altKey) &&
      (hasShift ? event.shiftKey : !event.shiftKey)
    );
  }
}