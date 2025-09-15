export interface ComponentSpec {
  name: string;
  // Define common component interface (properties, methods, etc.)
}

export interface ComponentConfig {
  [key: string]: any;
}

export interface ComponentBinding {
  from: string;
  to: string;
  capability: string;
}

export interface ComponentMetadata {
  version: string;
  description?: string;
  tags?: string[];
  compliance?: string[];
}
