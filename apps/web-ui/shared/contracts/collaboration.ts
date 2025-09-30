// Collaboration Service Contracts
import type { PresenceStatus } from './realtime';

export interface ICollaborationService {
  getMentionSuggestions(query: string, context?: string): Promise<MentionSuggestion[]>;
  sendMention(mention: MentionData): Promise<void>;
  getTeamMembers(teamId?: string): Promise<TeamMember[]>;
  createWorkspace(data: CreateWorkspaceData): Promise<Workspace>;
  getWorkspaces(userId: string): Promise<Workspace[]>;
  inviteToWorkspace(workspaceId: string, userIds: string[], role: WorkspaceRole): Promise<void>;
  getWorkspaceActivity(workspaceId: string, filter?: ActivityFilter): Promise<ActivityEntry[]>;
}

export interface MentionSuggestion {
  id: string;
  type: 'user' | 'team' | 'group';
  name: string;
  username?: string;
  avatar?: string;
  email?: string;
  context?: string;
}

export interface MentionData {
  mentionedId: string;
  mentionedType: 'user' | 'team' | 'group';
  context: string;
  entityType: string;
  entityId: string;
  message?: string;
}

export interface TeamMember {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar?: string;
  role: TeamRole;
  status: PresenceStatus;
  joinedAt: Date;
  lastActive: Date;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
  permissions: string[];
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
  isPrivate?: boolean;
  initialMembers?: string[];
}

export interface WorkspaceSettings {
  isPrivate: boolean;
  allowInvites: boolean;
  defaultRole: WorkspaceRole;
  features: WorkspaceFeature[];
}

export interface ActivityEntry {
  id: string;
  userId: string;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface ActivityFilter {
  userId?: string;
  entityType?: string;
  actions?: ActivityAction[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TeamRole = 'lead' | 'senior' | 'developer' | 'junior';

export type ActivityAction = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'commented'
  | 'mentioned'
  | 'joined'
  | 'left'
  | 'invited';

export type WorkspaceFeature = 
  | 'tasks'
  | 'chat'
  | 'planning'
  | 'analytics'
  | 'integrations';

export interface ICommentService {
  getComments(entityType: string, entityId: string): Promise<Comment[]>;
  createComment(data: CreateCommentData): Promise<Comment>;
  updateComment(id: string, content: string): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
  reactToComment(commentId: string, reaction: string): Promise<void>;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  entityType: string;
  entityId: string;
  parentId?: string;
  reactions: CommentReaction[];
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
}

export interface CreateCommentData {
  content: string;
  entityType: string;
  entityId: string;
  parentId?: string;
}

export interface CommentReaction {
  emoji: string;
  userIds: string[];
  count: number;
}