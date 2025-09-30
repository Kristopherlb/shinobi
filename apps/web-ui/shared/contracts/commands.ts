// Command System Contracts

export interface ICommandProvider {
  getCommands(context?: CommandContext): Promise<Command[]>;
  executeCommand(id: string, args?: Record<string, any>): Promise<CommandResult>;
  getRecentCommands(userId: string): Promise<Command[]>;
  searchCommands(query: string, context?: CommandContext): Promise<Command[]>;
  registerCommand(command: Command): void;
  unregisterCommand(id: string): void;
}

export interface Command {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  icon?: string;
  keywords: string[];
  shortcut?: KeyboardShortcut;
  args?: CommandArg[];
  condition?: CommandCondition;
  handler: CommandHandler;
}

export interface CommandContext {
  page?: string;
  selectedItems?: string[];
  activeWorkspace?: string;
  userRole?: string;
  permissions?: string[];
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  actions?: CommandAction[];
}

export interface CommandArg {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  required: boolean;
  description: string;
  options?: CommandOption[];
  defaultValue?: any;
}

export interface CommandOption {
  value: any;
  label: string;
  description?: string;
}

export interface CommandCondition {
  requiredPermissions?: string[];
  requiredContext?: string[];
  evaluator?: (context: CommandContext) => boolean;
}

export interface CommandAction {
  type: 'navigate' | 'modal' | 'toast' | 'reload' | 'callback';
  data: any;
}

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description?: string;
}

export type CommandHandler = (args?: Record<string, any>, context?: CommandContext) => Promise<CommandResult>;

export type CommandCategory = 
  | 'navigation'
  | 'tasks'
  | 'search'
  | 'ai'
  | 'collaboration'
  | 'settings'
  | 'system';

export interface IShortcutService {
  registerShortcut(shortcut: KeyboardShortcut, handler: () => void): () => void;
  unregisterShortcut(key: string): void;
  getShortcuts(): Record<string, KeyboardShortcut>;
  isShortcutActive(key: string): boolean;
}

export interface IQuickActionService {
  getQuickActions(context?: CommandContext): Promise<QuickAction[]>;
  executeQuickAction(id: string): Promise<void>;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  category: string;
  handler: () => Promise<void>;
  condition?: (context: CommandContext) => boolean;
}