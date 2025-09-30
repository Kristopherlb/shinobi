// Analytics Service Contracts

export interface IAnalyticsService {
  getMetrics(query: MetricsQuery): Promise<MetricsData>;
  getTimeTracking(filter: TimeTrackingFilter): Promise<TimeEntry[]>;
  startTimer(taskId: string): Promise<TimeEntry>;
  stopTimer(entryId: string): Promise<TimeEntry>;
  getProductivityInsights(userId: string, period: TimePeriod): Promise<ProductivityInsights>;
  getTeamAnalytics(teamId: string, period: TimePeriod): Promise<TeamAnalytics>;
  exportData(filter: ExportFilter): Promise<ExportResult>;
}

export interface MetricsQuery {
  metrics: MetricType[];
  period: TimePeriod;
  filters?: Record<string, any>;
  groupBy?: string[];
}

export interface MetricsData {
  [key: string]: MetricValue[];
}

export interface MetricValue {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // seconds
  description?: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface TimeTrackingFilter {
  userId?: string;
  taskIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  isActive?: boolean;
}

export interface ProductivityInsights {
  totalHours: number;
  averageHoursPerDay: number;
  mostProductiveHour: number;
  taskCompletionRate: number;
  focusTime: number;
  breakTime: number;
  patterns: ProductivityPattern[];
  suggestions: string[];
}

export interface ProductivityPattern {
  type: 'daily' | 'weekly' | 'monthly';
  pattern: string;
  confidence: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface TeamAnalytics {
  memberCount: number;
  totalHours: number;
  tasksCompleted: number;
  averageTaskTime: number;
  collaborationScore: number;
  members: MemberAnalytics[];
  trends: AnalyticsTrend[];
}

export interface MemberAnalytics {
  userId: string;
  hours: number;
  tasksCompleted: number;
  averageTaskTime: number;
  productivityScore: number;
}

export interface AnalyticsTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  period: string;
}

export interface ExportFilter {
  type: ExportType;
  format: ExportFormat;
  dateFrom?: Date;
  dateTo?: Date;
  includeData?: string[];
}

export interface ExportResult {
  url: string;
  filename: string;
  expiresAt: Date;
}

export type MetricType = 
  | 'tasks_completed'
  | 'time_tracked'
  | 'productivity_score'
  | 'collaboration_events'
  | 'response_time'
  | 'quality_score';

export type TimePeriod = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'custom';

export type ExportType = 'time_tracking' | 'tasks' | 'analytics' | 'all';
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export interface IChartService {
  renderChart(config: ChartConfig): Promise<ChartResult>;
  getChartData(query: ChartDataQuery): Promise<ChartData>;
}

export interface ChartConfig {
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  scales?: Record<string, any>;
  plugins?: Record<string, any>;
}

export interface ChartDataQuery {
  metric: MetricType;
  period: TimePeriod;
  groupBy?: string;
  filters?: Record<string, any>;
}

export interface ChartResult {
  chartId: string;
  config: ChartConfig;
  renderTime: number;
}

export type ChartType = 
  | 'line'
  | 'bar'
  | 'pie'
  | 'doughnut'
  | 'radar'
  | 'scatter';