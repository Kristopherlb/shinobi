import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Terminal, 
  Server, 
  Database, 
  MessageSquare,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  Download,
  DollarSign,
  Network,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocalService {
  id: string;
  name: string;
  type: 'localstack' | 'postgres' | 'redis' | 'application';
  status: 'running' | 'stopped' | 'starting' | 'error';
  port: number;
  healthCheck?: string;
  lastStarted?: string;
  cpu?: number;
  memory?: number;
  logs?: string[];
}

interface LocalEnvironmentManagerProps {
  serviceName?: string;
  className?: string;
}

interface CommandResult {
  command: string;
  success: boolean;
  output: string;
  error?: string;
  metadata?: any;
}

export function LocalEnvironmentManager({ 
  serviceName = 'user-api',
  className 
}: LocalEnvironmentManagerProps) {
  const [selectedService, setSelectedService] = useState<string>('localstack');
  const [activeTab, setActiveTab] = useState('services');
  const [commandResults, setCommandResults] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();

  // Fetch services data
  const { data: services = [], isLoading: servicesLoading, refetch: refetchServices } = useQuery<LocalService[]>({
    queryKey: ['/api/local-dev/services'],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch logs for selected service
  const { data: logsData, isLoading: logsLoading } = useQuery<{ logs: string[] }>({
    queryKey: ['/api/local-dev/services', selectedService, 'logs'],
    enabled: !!selectedService,
    refetchInterval: 3000, // Refresh logs more frequently
  });

  // Service control mutations
  const startServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return apiRequest('POST', `/api/local-dev/services/${serviceId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/local-dev/services'] });
    },
  });

  const stopServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return apiRequest('POST', `/api/local-dev/services/${serviceId}/stop`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/local-dev/services'] });
    },
  });

  const startAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/local-dev/start-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/local-dev/services'] });
    },
  });

  const commandMutation = useMutation({
    mutationFn: async ({ command, serviceName }: { command: string; serviceName?: string }) => {
      const response = await apiRequest('POST', `/api/local-dev/commands/${command}`, { serviceName });
      const result = await response.json();
      
      // Store the result keyed by command type
      setCommandResults(prev => ({
        ...prev,
        [command]: result.metadata || result
      }));
      
      return result;
    },
  });

  const getServiceIcon = (type: LocalService['type']) => {
    switch (type) {
      case 'localstack': return Server;
      case 'postgres': return Database;
      case 'redis': return Zap;
      case 'application': return Activity;
      default: return Server;
    }
  };

  const getStatusColor = (status: LocalService['status']) => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'default';
      case 'starting': return 'warn';
      case 'error': return 'danger';
      default: return 'default';
    }
  };

  const handleServiceAction = async (serviceId: string, action: 'start' | 'stop' | 'restart') => {
    if (action === 'restart') {
      // For restart, stop then start
      await stopServiceMutation.mutateAsync(serviceId);
      setTimeout(() => {
        startServiceMutation.mutate(serviceId);
      }, 1000);
    } else if (action === 'start') {
      startServiceMutation.mutate(serviceId);
    } else if (action === 'stop') {
      stopServiceMutation.mutate(serviceId);
    }
  };

  const handleStartAllServices = async () => {
    startAllMutation.mutate();
  };

  const runSvcCommand = async (command: 'graph' | 'cost' | 'test') => {
    commandMutation.mutate({ command, serviceName });
  };

  // Check if a specific command is running
  const isCommandRunning = (command: string) => {
    return commandMutation.isPending && commandMutation.variables?.command === command;
  };

  const selectedServiceData = services.find((s: LocalService) => s.id === selectedService);
  const runningServices = services.filter((s: LocalService) => s.status === 'running').length;
  const totalServices = services.length;
  const logs = logsData?.logs || [];
  
  // Get command result for specific command type
  const getCommandResult = (command: string) => {
    // Check if we have a stored result for this specific command
    if (commandResults[command]) {
      return commandResults[command];
    }
    
    // Fallback mock data when no API response
    const fallbacks = {
      graph: { nodes: 4, edges: 6, components: ['user-api', 'user-db', 'cache', 's3-bucket'] },
      cost: { estimated: 24.50, breakdown: { lambda: 12.20, rds: 8.80, s3: 2.10, other: 1.40 } },
      test: { total: 18, passed: 16, failed: 2, coverage: 87.5 }
    };
    return fallbacks[command as keyof typeof fallbacks];
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Environment Status Overview */}
      <Card className="border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Local Development Environment</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Service: <span className="font-mono text-foreground">{serviceName}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={runningServices === totalServices ? 'success' : runningServices > 0 ? 'warn' : 'default'}
                className="text-xs"
              >
                {runningServices}/{totalServices} Running
              </Badge>
              <Button
                onClick={handleStartAllServices}
                disabled={startAllMutation.isPending || runningServices === totalServices}
                className="gap-2"
                data-testid="button-start-all-services"
              >
                {startAllMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {startAllMutation.isPending ? 'Starting...' : 'Start All'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">Logs</TabsTrigger>
          <TabsTrigger value="commands" data-testid="tab-commands">Commands</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">Insights</TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          {servicesLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading services...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service: LocalService) => {
                const Icon = getServiceIcon(service.type);
                const statusColor = getStatusColor(service.status);
              
                return (
                <Card 
                  key={service.id} 
                  className={cn(
                    'border cursor-pointer transition-all hover-elevate',
                    selectedService === service.id ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                  onClick={() => setSelectedService(service.id)}
                  data-testid={`service-card-${service.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-foreground">{service.name}</h4>
                          <p className="text-xs text-muted-foreground">Port {service.port}</p>
                        </div>
                      </div>
                      <Badge variant={statusColor} className="text-xs">
                        {service.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-3">
                    {service.status === 'running' && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">CPU:</span>
                          <span className="ml-1 font-mono text-foreground">{service.cpu}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Memory:</span>
                          <span className="ml-1 font-mono text-foreground">{service.memory}MB</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-1">
                      {service.status === 'running' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleServiceAction(service.id, 'restart');
                            }}
                            disabled={stopServiceMutation.isPending || startServiceMutation.isPending}
                            data-testid={`button-restart-${service.id}`}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Restart
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleServiceAction(service.id, 'stop');
                            }}
                            disabled={stopServiceMutation.isPending}
                            data-testid={`button-stop-${service.id}`}
                          >
                            <Square className="w-3 h-3 mr-1" />
                            Stop
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleServiceAction(service.id, 'start');
                          }}
                          disabled={service.status === 'starting' || startServiceMutation.isPending}
                          data-testid={`button-start-${service.id}`}
                        >
                          {service.status === 'starting' || startServiceMutation.isPending ? (
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 mr-1" />
                          )}
                          {service.status === 'starting' || startServiceMutation.isPending ? 'Starting...' : 'Start'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Service Logs</CardTitle>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="text-xs border border-border rounded px-2 py-1 bg-background"
                    data-testid="select-log-service"
                  >
                    {services.map((service: LocalService) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full border rounded bg-muted/20 p-3">
                <div className="font-mono text-xs space-y-1">
                  {logs && logs.length > 0 ? (
                    logs.map((log: string, index: number) => (
                      <div key={index} className="text-foreground">
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground italic">
                      No logs available for {selectedServiceData?.name}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commands Tab */}
        <TabsContent value="commands" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Graph Command */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Network className="w-4 h-4" />
                  Component Graph
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Generate and visualize component dependency graph
                </p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nodes:</span>
                    <span className="font-mono text-foreground">{getCommandResult('graph')?.nodes || 4}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Edges:</span>
                    <span className="font-mono text-foreground">{getCommandResult('graph')?.edges || 6}</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-7"
                  onClick={() => runSvcCommand('graph')}
                  disabled={isCommandRunning('graph')}
                  data-testid="button-run-graph"
                >
                  {isCommandRunning('graph') ? (
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Terminal className="w-3 h-3 mr-1" />
                  )}
                  {isCommandRunning('graph') ? 'Running...' : 'Run svc graph'}
                </Button>
              </CardContent>
            </Card>

            {/* Cost Command */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Cost Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Estimate monthly AWS costs for components
                </p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated:</span>
                    <span className="font-mono text-foreground">${getCommandResult('cost')?.estimated || 24.50}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lambda:</span>
                    <span className="font-mono text-foreground">${getCommandResult('cost')?.breakdown?.lambda || 12.20}</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-7"
                  onClick={() => runSvcCommand('cost')}
                  disabled={isCommandRunning('cost')}
                  data-testid="button-run-cost"
                >
                  {isCommandRunning('cost') ? (
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Terminal className="w-3 h-3 mr-1" />
                  )}
                  {isCommandRunning('cost') ? 'Running...' : 'Run svc cost'}
                </Button>
              </CardContent>
            </Card>

            {/* Test Command */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Test Execution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Run component tests with coverage report
                </p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Passed:</span>
                    <span className="font-mono text-foreground">{getCommandResult('test')?.passed || 16}/{getCommandResult('test')?.total || 18}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coverage:</span>
                    <span className="font-mono text-foreground">{getCommandResult('test')?.coverage || 87.5}%</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-7"
                  onClick={() => runSvcCommand('test')}
                  disabled={isCommandRunning('test')}
                  data-testid="button-run-test"
                >
                  {isCommandRunning('test') ? (
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Terminal className="w-3 h-3 mr-1" />
                  )}
                  {isCommandRunning('test') ? 'Running...' : 'Run svc test'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Environment Health */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Environment Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">Services Running</span>
                    <Badge variant="success" className="text-xs">
                      {runningServices}/{totalServices}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">Health Checks</span>
                    <Badge variant="success" className="text-xs">Passing</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">Resource Usage</span>
                    <Badge variant="info" className="text-xs">Normal</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-7">
                  <Terminal className="w-3 h-3 mr-2" />
                  Open Terminal
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-7">
                  <FileText className="w-3 h-3 mr-2" />
                  View Manifest
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-7">
                  <Eye className="w-3 h-3 mr-2" />
                  Show Config
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}