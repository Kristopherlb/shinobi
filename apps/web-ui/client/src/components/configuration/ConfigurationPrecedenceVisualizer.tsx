import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronDown, 
  ChevronRight, 
  Settings, 
  Shield, 
  Globe, 
  Package, 
  FileText,
  Eye,
  EyeOff,
  Info,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigurationLayer {
  id: string;
  name: string;
  description: string;
  icon: any;
  priority: number;
  values: Record<string, ConfigValue>;
  isActive: boolean;
  source: string;
}

interface ConfigValue {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  isOverridden: boolean;
  overriddenBy?: string;
  isUsed: boolean;
  description?: string;
}

interface ResolvedConfiguration {
  [key: string]: {
    finalValue: any;
    resolvedFrom: string;
    precedenceChain: Array<{
      layer: string;
      value: any;
      isActive: boolean;
    }>;
  };
}

interface ConfigurationPrecedenceVisualizerProps {
  componentName?: string;
  environment?: string;
  onConfigurationChange?: (resolved: ResolvedConfiguration) => void;
  className?: string;
}

// Configuration data based on component type and environment
const getConfigurationLayers = (componentName: string, environment: string): ConfigurationLayer[] => {
  const isProduction = environment === 'production';
  const isLambda = componentName.includes('api') || componentName.includes('service');
  const isDatabase = componentName.includes('db');
  const isQueue = componentName.includes('queue');
  
  // Generate environment-specific configuration
  const environmentMemory = environment === 'production' ? 1024 : environment === 'staging' ? 512 : 256;
  const environmentTimeout = environment === 'production' ? 60 : environment === 'staging' ? 45 : 30;
  const environmentLogLevel = environment === 'production' ? 'warn' : environment === 'staging' ? 'info' : 'debug';
  
  // Component-specific defaults
  const componentMemory = isLambda ? 512 : isDatabase ? 2048 : 256;
  const componentConfig = isLambda 
    ? { runtime: 'nodejs18.x', handler: 'index.handler' }
    : isDatabase
    ? { instanceClass: 'db.t3.micro', storage: 20 }
    : { visibilityTimeout: 300, maxReceiveCount: 3 };

  return [
    {
      id: 'fallback',
      name: 'Hardcoded Fallbacks',
      description: 'Default values built into component schemas',
      icon: Package,
      priority: 1,
      isActive: true,
      source: `components/${componentName.split('-')[1] || 'base'}-schema.ts`,
      values: {
        memory: { key: 'memory', value: 128, type: 'number', isOverridden: false, isUsed: false, description: 'Default memory allocation' },
        timeout: { key: 'timeout', value: 10, type: 'number', isOverridden: false, isUsed: false, description: 'Default timeout in seconds' },
        ...(isLambda && {
          runtime: { key: 'runtime', value: 'nodejs16.x', type: 'string', isOverridden: false, isUsed: false, description: 'Default Lambda runtime' },
          handler: { key: 'handler', value: 'index.handler', type: 'string', isOverridden: false, isUsed: false, description: 'Lambda entry point' }
        }),
        ...(isDatabase && {
          instanceClass: { key: 'instanceClass', value: 'db.t3.nano', type: 'string', isOverridden: false, isUsed: false, description: 'Default RDS instance class' },
          storage: { key: 'storage', value: 10, type: 'number', isOverridden: false, isUsed: false, description: 'Default storage in GB' }
        }),
        ...(isQueue && {
          visibilityTimeout: { key: 'visibilityTimeout', value: 30, type: 'number', isOverridden: false, isUsed: false, description: 'Default visibility timeout' },
          maxReceiveCount: { key: 'maxReceiveCount', value: 3, type: 'number', isOverridden: false, isUsed: false, description: 'Maximum retry attempts' }
        })
      }
    },
    {
      id: 'platform',
      name: 'Platform Defaults',
      description: 'Platform-wide configuration standards',
      icon: Globe,
      priority: 2,
      isActive: true,
      source: 'platform/defaults.yml',
      values: {
        memory: { key: 'memory', value: 256, type: 'number', isOverridden: false, isUsed: false, description: 'Platform standard memory' },
        encryption: { key: 'encryption', value: true, type: 'boolean', isOverridden: false, isUsed: false, description: 'Encryption at rest enabled' },
        logLevel: { key: 'logLevel', value: 'info', type: 'string', isOverridden: false, isUsed: false, description: 'Default logging level' },
        ...(isLambda && {
          runtime: { key: 'runtime', value: 'nodejs18.x', type: 'string', isOverridden: false, isUsed: false, description: 'Platform standard Lambda runtime' }
        }),
        ...(isDatabase && {
          instanceClass: { key: 'instanceClass', value: 'db.t3.micro', type: 'string', isOverridden: false, isUsed: false, description: 'Platform standard instance class' }
        })
      }
    },
    {
      id: 'environment',
      name: 'Environment Defaults',
      description: `Environment-specific configuration (${environment})`,
      icon: Settings,
      priority: 3,
      isActive: true,
      source: `environments/${environment}.yml`,
      values: {
        memory: { key: 'memory', value: environmentMemory, type: 'number', isOverridden: false, isUsed: false, description: `${environment} environment memory` },
        timeout: { key: 'timeout', value: environmentTimeout, type: 'number', isOverridden: false, isUsed: false, description: `${environment} timeout` },
        logLevel: { key: 'logLevel', value: environmentLogLevel, type: 'string', isOverridden: false, isUsed: false, description: `${environment} log level` },
        ...(environment === 'development' && {
          debug: { key: 'debug', value: true, type: 'boolean', isOverridden: false, isUsed: false, description: 'Debug mode for development' }
        }),
        ...(environment === 'production' && {
          monitoring: { key: 'monitoring', value: true, type: 'boolean', isOverridden: false, isUsed: false, description: 'Enhanced monitoring in production' }
        })
      }
    },
    {
      id: 'component',
      name: 'Component Overrides',
      description: 'Service-level component configuration',
      icon: FileText,
      priority: 4,
      isActive: true,
      source: 'service.yml',
      values: {
        memory: { key: 'memory', value: componentMemory, type: 'number', isOverridden: false, isUsed: false, description: 'Custom memory allocation for this component' },
        logLevel: { key: 'logLevel', value: environmentLogLevel === 'debug' ? 'debug' : 'info', type: 'string', isOverridden: false, isUsed: false, description: 'Component-specific log level' },
        environment: { key: 'environment', value: { NODE_ENV: environment, API_BASE: `https://api.${environment === 'production' ? '' : environment + '.'}company.com` }, type: 'object', isOverridden: false, isUsed: false, description: 'Component environment variables' },
        ...(isDatabase && {
          storage: { key: 'storage', value: environment === 'production' ? 100 : 20, type: 'number', isOverridden: false, isUsed: false, description: 'Component storage allocation' }
        }),
        ...(isQueue && {
          visibilityTimeout: { key: 'visibilityTimeout', value: 300, type: 'number', isOverridden: false, isUsed: false, description: 'Component visibility timeout' }
        }),
        ...Object.fromEntries(Object.entries(componentConfig).map(([key, value]) => [
          key, { key, value, type: typeof value, isOverridden: false, isUsed: false, description: `Component-specific ${key}` }
        ]))
      }
    },
    {
      id: 'policy',
      name: 'Policy Overrides', 
      description: 'Compliance and governance enforced values',
      icon: Shield,
      priority: 5,
      isActive: isProduction || environment === 'staging',
      source: `policies/${isProduction ? 'fedramp-moderate' : 'commercial'}.yml`,
      values: {
        ...(isProduction && {
          encryption: { key: 'encryption', value: true, type: 'boolean', isOverridden: false, isUsed: false, description: 'Encryption required by FedRAMP Moderate' },
          auditLogs: { key: 'auditLogs', value: true, type: 'boolean', isOverridden: false, isUsed: false, description: 'Audit logging mandated by policy' },
          ...(isDatabase && {
            instanceClass: { key: 'instanceClass', value: 'db.t3.medium', type: 'string', isOverridden: false, isUsed: false, description: 'Minimum instance class for production' }
          })
        }),
        ...(environment === 'staging' && {
          auditLogs: { key: 'auditLogs', value: true, type: 'boolean', isOverridden: false, isUsed: false, description: 'Audit logging enabled for staging' }
        })
      }
    }
  ];
};

export function ConfigurationPrecedenceVisualizer({ 
  componentName = 'user-api',
  environment = 'development',
  onConfigurationChange,
  className 
}: ConfigurationPrecedenceVisualizerProps) {
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['component', 'policy']));
  const [selectedKey, setSelectedKey] = useState<string | null>('memory');
  const [showOnlyUsed, setShowOnlyUsed] = useState(false);

  // Generate base configuration layers 
  const baseConfigurationLayers = getConfigurationLayers(componentName, environment);

  const toggleLayer = (layerId: string) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedLayers(newExpanded);
  };

  // Calculate resolved configuration dynamically
  const resolveConfiguration = (): ResolvedConfiguration => {
    const resolved: ResolvedConfiguration = {};
    const allKeys = new Set<string>();
    
    // Collect all configuration keys from active layers
    baseConfigurationLayers.forEach(layer => {
      if (layer.isActive) {
        Object.keys(layer.values).forEach(key => allKeys.add(key));
      }
    });

    // Resolve each key through the precedence chain
    allKeys.forEach(key => {
      const precedenceChain = baseConfigurationLayers.map(layer => ({
        layer: layer.name,
        value: layer.values[key]?.value,
        isActive: !!layer.values[key] && layer.isActive
      }));

      // Find the highest priority layer with this key
      let finalValue = undefined;
      let resolvedFrom = 'Not configured';
      
      for (let i = baseConfigurationLayers.length - 1; i >= 0; i--) {
        const layer = baseConfigurationLayers[i];
        if (layer.values[key] && layer.isActive) {
          finalValue = layer.values[key].value;
          resolvedFrom = layer.name;
          break;
        }
      }

      resolved[key] = {
        finalValue,
        resolvedFrom,
        precedenceChain
      };
    });

    return resolved;
  };

  const resolvedConfig = resolveConfiguration();

  // Update configuration layers with computed resolution status
  const configurationLayers = baseConfigurationLayers.map(layer => {
    const updatedValues: Record<string, ConfigValue> = {};
    
    Object.keys(layer.values).forEach(key => {
      const originalValue = layer.values[key];
      const resolvedValue = resolvedConfig[key];
      
      // Determine if this layer's value is actually used
      const isUsed = resolvedValue?.resolvedFrom === layer.name;
      
      // Determine if this layer's value is overridden by a higher priority layer
      const isOverridden = !isUsed && !!resolvedValue && resolvedValue.resolvedFrom !== layer.name;
      
      // Find which layer overrode this value
      let overriddenBy: string | undefined = undefined;
      if (isOverridden && resolvedValue) {
        overriddenBy = resolvedValue.resolvedFrom.toLowerCase().replace(/\s+/g, '');
      }
      
      updatedValues[key] = {
        ...originalValue,
        isUsed,
        isOverridden,
        overriddenBy
      };
    });
    
    return {
      ...layer,
      values: updatedValues
    };
  });

  const getLayerStatus = (layer: ConfigurationLayer) => {
    const activeValues = Object.values(layer.values).filter(v => v.isUsed).length;
    const totalValues = Object.keys(layer.values).length;
    
    if (activeValues === 0) return 'none';
    if (activeValues === totalValues) return 'all';
    return 'partial';
  };

  const formatValue = (value: any, type: string): string => {
    if (value === null || value === undefined) return 'null';
    if (type === 'object') return JSON.stringify(value, null, 2);
    if (type === 'boolean') return value ? 'true' : 'false';
    return String(value);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Controls */}
      <Card className="border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Configuration Precedence Chain</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Component: <span className="font-mono text-foreground">{componentName}</span> 
                {' • '}
                Environment: <span className="font-mono text-foreground">{environment}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnlyUsed(!showOnlyUsed)}
                data-testid="button-toggle-used-only"
              >
                {showOnlyUsed ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                {showOnlyUsed ? 'Show All' : 'Used Only'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Precedence Chain Layers */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Configuration Layers</h3>
          
          {configurationLayers.map((layer, index) => {
            const isExpanded = expandedLayers.has(layer.id);
            const status = getLayerStatus(layer);
            const Icon = layer.icon;
            
            const visibleValues = showOnlyUsed 
              ? Object.values(layer.values).filter(v => v.isUsed)
              : Object.values(layer.values);

            return (
              <Card key={layer.id} className={cn(
                'border transition-all duration-200',
                status === 'all' ? 'border-success/30 bg-success/5' :
                status === 'partial' ? 'border-warn/30 bg-warn/5' :
                'border-border'
              )}>
                <CardHeader 
                  className="pb-3 cursor-pointer hover-elevate"
                  onClick={() => toggleLayer(layer.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-foreground">{layer.name}</h4>
                          <Badge 
                            variant={status === 'all' ? 'success' : status === 'partial' ? 'warn' : 'info'}
                            className="text-xs"
                          >
                            Priority {layer.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{layer.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {status === 'all' && <CheckCircle2 className="w-4 h-4 text-success" />}
                      {status === 'partial' && <AlertTriangle className="w-4 h-4 text-warn" />}
                      {status === 'none' && <Info className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Source: {layer.source}</span>
                        <span className="text-muted-foreground">
                          {visibleValues.length} value{visibleValues.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        {visibleValues.map(configValue => (
                          <div 
                            key={configValue.key}
                            className={cn(
                              'p-2 rounded border cursor-pointer transition-all',
                              selectedKey === configValue.key 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border/50 hover:border-border hover-elevate'
                            )}
                            onClick={() => setSelectedKey(configValue.key)}
                            data-testid={`config-value-${configValue.key}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-foreground">{configValue.key}</span>
                                {configValue.isUsed ? (
                                  <Badge variant="success" className="text-xs">Active</Badge>
                                ) : configValue.isOverridden ? (
                                  <Badge variant="warn" className="text-xs">Overridden</Badge>
                                ) : (
                                  <Badge variant="info" className="text-xs">Available</Badge>
                                )}
                              </div>
                              <span className="text-xs font-mono text-muted-foreground">
                                {formatValue(configValue.value, configValue.type)}
                              </span>
                            </div>
                            {configValue.description && (
                              <p className="text-xs text-muted-foreground mt-1">{configValue.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Resolved Values Inspector */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Resolved Configuration</h3>
          
          {selectedKey ? (
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {selectedKey}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {resolvedConfig[selectedKey] && (
                  <>
                    {/* Final Resolved Value */}
                    <div className="p-3 rounded bg-success/10 border border-success/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Final Value</span>
                        <Badge variant="success" className="text-xs">
                          {resolvedConfig[selectedKey].resolvedFrom}
                        </Badge>
                      </div>
                      <pre className="text-sm font-mono text-foreground">
                        {formatValue(resolvedConfig[selectedKey].finalValue, 'string')}
                      </pre>
                    </div>

                    <Separator />

                    {/* Precedence Chain */}
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">Resolution Chain</h4>
                      <div className="space-y-2">
                        {resolvedConfig[selectedKey].precedenceChain.map((step, index) => {
                          const isResolved = step.layer === resolvedConfig[selectedKey].resolvedFrom;
                          const hasValue = step.value !== undefined && step.value !== null;
                          
                          return (
                            <div 
                              key={index}
                              className={cn(
                                'flex items-center justify-between p-2 rounded border text-sm',
                                isResolved 
                                  ? 'border-success bg-success/5' 
                                  : hasValue 
                                    ? 'border-warn/30 bg-warn/5' 
                                    : 'border-border/30 bg-muted/20'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'w-2 h-2 rounded-full',
                                  isResolved 
                                    ? 'bg-success' 
                                    : hasValue 
                                      ? 'bg-warn' 
                                      : 'bg-muted-foreground'
                                )} />
                                <span className={cn(
                                  'font-medium',
                                  isResolved ? 'text-success' : 'text-foreground'
                                )}>
                                  {step.layer}
                                </span>
                                {isResolved && (
                                  <Badge variant="success" className="text-xs">Used</Badge>
                                )}
                              </div>
                              
                              <span className={cn(
                                'font-mono text-xs',
                                hasValue ? 'text-foreground' : 'text-muted-foreground'
                              )}>
                                {hasValue ? formatValue(step.value, 'string') : 'Not configured'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-dashed">
              <CardContent className="py-8 text-center">
                <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Select a configuration key to see its resolution chain
                </p>
              </CardContent>
            </Card>
          )}

          {/* Summary Statistics */}
          <Card className="border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Keys:</span>
                  <span className="ml-2 font-mono text-foreground">
                    {Object.keys(resolvedConfig).length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Active Layers:</span>
                  <span className="ml-2 font-mono text-foreground">
                    {configurationLayers.filter(l => l.isActive).length}/{configurationLayers.length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Overrides:</span>
                  <span className="ml-2 font-mono text-foreground">
                    {Object.values(resolvedConfig).filter(v => v.resolvedFrom !== 'Hardcoded Fallbacks').length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Policy Enforced:</span>
                  <span className="ml-2 font-mono text-foreground">
                    {Object.values(resolvedConfig).filter(v => v.resolvedFrom === 'Policy Overrides').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}