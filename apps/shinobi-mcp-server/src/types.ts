export interface ServiceManifestComponent {
  name: string;
  type: string;
  config?: Record<string, any>;
}

export interface ServiceManifestBinding {
  source: string;
  target: string;
  capability: string;
  access?: string;
  description?: string;
}

export interface ServiceMetadata {
  name: string;
  owner: string;
  environment: string;
  complianceFramework: string;
  description?: string;
  costCenter?: string;
}

export interface ServiceManifest {
  service: ServiceMetadata;
  components: ServiceManifestComponent[];
  bindings?: ServiceManifestBinding[];
  policies?: Record<string, any>;
}
