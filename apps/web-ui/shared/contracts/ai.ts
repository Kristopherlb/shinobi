// AI Service Contracts

export interface IAIService {
  chat(message: string, context?: AIContext): Promise<AIResponse>;
  generateSuggestions(input: string, type: SuggestionType): Promise<AISuggestion[]>;
  analyzeTask(task: any): Promise<TaskAnalysis>;
  getPrioritySuggestions(tasks: any[]): Promise<PrioritySuggestion[]>;
  generateDescription(title: string, context?: any): Promise<string>;
  detectIntent(input: string): Promise<IntentDetection>;
}

export interface AIContext {
  type: 'task' | 'chat' | 'search' | 'planning';
  relatedData?: Record<string, any>;
  history?: AIMessage[];
}

export interface AIResponse {
  id: string;
  content: string;
  type: 'text' | 'action' | 'suggestion';
  confidence: number;
  actions?: AIAction[];
  followUp?: string[];
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AISuggestion {
  id: string;
  text: string;
  confidence: number;
  reasoning?: string;
  action?: AIAction;
}

export interface TaskAnalysis {
  complexity: 'low' | 'medium' | 'high';
  estimatedTime: number;
  dependencies: string[];
  risks: string[];
  suggestions: string[];
}

export interface PrioritySuggestion {
  taskId: string;
  priority: number;
  reasoning: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface IntentDetection {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  suggestedAction?: AIAction;
}

export interface AIAction {
  type: string;
  label: string;
  parameters: Record<string, any>;
  description?: string;
}

export type SuggestionType = 
  | 'task_title' 
  | 'task_description' 
  | 'next_action' 
  | 'code_completion' 
  | 'search_query';