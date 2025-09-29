// Real-time Service Contracts

export interface IRealtimeProvider {
  connect(): Promise<void>;
  disconnect(): void;
  subscribe<T>(channel: string, callback: RealtimeCallback<T>): () => void;
  publish<T>(channel: string, data: T): Promise<void>;
  getPresence(channel: string): Promise<PresenceData[]>;
  updatePresence(data: Partial<PresenceData>): Promise<void>;
  isConnected(): boolean;
}

export interface RealtimeCallback<T> {
  (event: RealtimeEvent<T>): void;
}

export interface RealtimeEvent<T> {
  type: string;
  data: T;
  timestamp: Date;
  userId?: string;
  channel: string;
}

export interface PresenceData {
  userId: string;
  username: string;
  avatar?: string;
  status: PresenceStatus;
  lastSeen: Date;
  metadata?: Record<string, any>;
}

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface IPresenceService {
  getPresence(userIds: string[]): Promise<PresenceData[]>;
  subscribeToPresence(userIds: string[], callback: (presence: PresenceData[]) => void): () => void;
  updateStatus(status: PresenceStatus, metadata?: Record<string, any>): Promise<void>;
}

export interface ILiveUpdateService {
  subscribeToUpdates<T>(entityType: string, entityId: string, callback: (data: T) => void): () => void;
  broadcastUpdate<T>(entityType: string, entityId: string, data: T): Promise<void>;
}

// Common real-time events
export interface TaskUpdateEvent {
  taskId: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  changes: Record<string, any>;
  userId: string;
}

export interface ChatMessageEvent {
  messageId: string;
  chatId: string;
  content: string;
  userId: string;
  timestamp: Date;
}

export interface CollaborationEvent {
  type: 'cursor_move' | 'edit' | 'selection' | 'join' | 'leave';
  userId: string;
  data: Record<string, any>;
}