// Dashboard Widget System Contracts

export interface IWidgetProvider {
  getAvailableWidgets(): Promise<WidgetDefinition[]>;
  createWidget(type: string, config: WidgetConfig): Promise<Widget>;
  updateWidget(id: string, config: Partial<WidgetConfig>): Promise<Widget>;
  deleteWidget(id: string): Promise<void>;
  getWidgetData(id: string, params?: Record<string, any>): Promise<WidgetData>;
  getDashboard(id: string): Promise<Dashboard>;
  updateDashboard(id: string, layout: DashboardLayout): Promise<Dashboard>;
}

export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  defaultSize: WidgetSize;
  configSchema: WidgetConfigSchema;
  dataSchema: WidgetDataSchema;
  supportedSizes: WidgetSize[];
}

export interface Widget {
  id: string;
  type: string;
  title: string;
  config: WidgetConfig;
  position: WidgetPosition;
  size: WidgetSize;
  data?: WidgetData;
  lastUpdated: Date;
}

export interface WidgetConfig {
  title: string;
  refreshInterval?: number; // seconds
  parameters: Record<string, any>;
  styling?: WidgetStyling;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface WidgetData {
  [key: string]: any;
  timestamp: Date;
  status: 'loading' | 'success' | 'error';
  error?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  userId: string;
  widgets: Widget[];
  layout: DashboardLayout;
  settings: DashboardSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  columns: number;
  gap: number;
  padding: number;
  responsive: boolean;
  breakpoints?: Record<string, number>;
}

export interface DashboardSettings {
  isPublic: boolean;
  allowCopy: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  theme?: 'light' | 'dark' | 'auto';
}

export interface WidgetConfigSchema {
  properties: Record<string, WidgetConfigProperty>;
  required: string[];
}

export interface WidgetConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'color';
  title: string;
  description?: string;
  default?: any;
  options?: Array<{ value: any; label: string }>;
  validation?: WidgetValidation;
}

export interface WidgetValidation {
  min?: number;
  max?: number;
  pattern?: string;
  required?: boolean;
}

export interface WidgetDataSchema {
  type: 'object' | 'array';
  properties?: Record<string, any>;
  items?: any;
}

export interface WidgetStyling {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shadow?: boolean;
}

export type WidgetCategory = 
  | 'metrics'
  | 'charts'
  | 'lists'
  | 'feeds'
  | 'controls'
  | 'media'
  | 'external';

export interface IDragDropProvider {
  onDragStart(widget: Widget): void;
  onDragEnd(widget: Widget, position: WidgetPosition): Promise<void>;
  onResize(widget: Widget, size: WidgetSize): Promise<void>;
  validatePosition(position: WidgetPosition, size: WidgetSize): boolean;
  getGridSnap(): { x: number; y: number };
}

export interface IWidgetRenderer {
  render(widget: Widget): Promise<WidgetRenderResult>;
  canRender(type: string): boolean;
  getPreview(definition: WidgetDefinition): Promise<WidgetPreview>;
}

export interface WidgetRenderResult {
  component: any; // React component
  props: Record<string, any>;
  loading: boolean;
  error?: string;
}

export interface WidgetPreview {
  thumbnail: string;
  description: string;
  exampleData: WidgetData;
}