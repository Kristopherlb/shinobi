// Task Management Service Contracts

export interface ITaskService {
  getTasks(filter?: TaskFilter): Promise<Task[]>;
  getTask(id: string): Promise<Task>;
  createTask(data: CreateTaskData): Promise<Task>;
  updateTask(id: string, data: Partial<UpdateTaskData>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  getTaskDependencies(id: string): Promise<TaskDependency[]>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task>;
  assignTask(id: string, userId: string): Promise<Task>;
  getTaskHistory(id: string): Promise<TaskHistoryEntry[]>;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  creatorId: string;
  projectId?: string;
  tags: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[];
  metadata: Record<string, any>;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  projectId?: string;
  tags?: string[];
  dueDate?: Date;
  estimatedHours?: number;
  dependencies?: string[];
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  status?: TaskStatus;
  actualHours?: number;
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string;
  creatorId?: string;
  projectId?: string;
  tags?: string[];
  dueBefore?: Date;
  dueAfter?: Date;
  search?: string;
}

export interface TaskDependency {
  id: string;
  dependentTaskId: string;
  dependencyTaskId: string;
  type: DependencyType;
  createdAt: Date;
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  action: TaskAction;
  userId: string;
  changes: Record<string, any>;
  timestamp: Date;
}

export type TaskStatus = 
  | 'todo' 
  | 'in_progress' 
  | 'review' 
  | 'testing' 
  | 'done' 
  | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type DependencyType = 'blocks' | 'relates_to' | 'subtask_of';

export type TaskAction = 
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'commented'
  | 'dependency_added'
  | 'dependency_removed';

export interface IKanbanService {
  getBoard(projectId: string): Promise<KanbanBoard>;
  updateBoard(boardId: string, data: Partial<KanbanBoard>): Promise<KanbanBoard>;
  moveTask(taskId: string, fromColumn: string, toColumn: string, position: number): Promise<void>;
  reorderColumn(columnId: string, taskIds: string[]): Promise<void>;
}

export interface KanbanBoard {
  id: string;
  name: string;
  projectId: string;
  columns: KanbanColumn[];
  settings: KanbanSettings;
}

export interface KanbanColumn {
  id: string;
  name: string;
  status: TaskStatus;
  taskIds: string[];
  color?: string;
  limit?: number;
}

export interface KanbanSettings {
  swimlanes?: 'none' | 'assignee' | 'priority';
  showSubtasks: boolean;
  showTags: boolean;
  autoAssign: boolean;
}