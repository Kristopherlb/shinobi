// Notification Service Contracts

export interface INotificationProvider {
  send(notification: NotificationData): Promise<void>;
  subscribe(userId: string, callback: NotificationCallback): () => void;
  getUnread(userId: string): Promise<Notification[]>;
  markAsRead(notificationIds: string[]): Promise<void>;
  getPreferences(userId: string): Promise<NotificationPreferences>;
  updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<void>;
}

export interface NotificationData {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  expiresAt?: Date;
}

export interface Notification extends NotificationData {
  id: string;
  createdAt: Date;
  readAt?: Date;
  clickedAt?: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: Record<NotificationType, boolean>;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;
  };
}

export type NotificationCallback = (notification: Notification) => void;

export type NotificationType = 
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'chat_message'
  | 'mention'
  | 'deployment_status'
  | 'system_alert'
  | 'collaboration_invite';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationChannel = 'email' | 'push' | 'in_app' | 'sms';

export interface IToastService {
  show(toast: ToastData): void;
  dismiss(id: string): void;
  dismissAll(): void;
}

export interface ToastData {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number; // ms, 0 for persistent
  action?: ToastAction;
}

export interface ToastAction {
  label: string;
  handler: () => void;
}