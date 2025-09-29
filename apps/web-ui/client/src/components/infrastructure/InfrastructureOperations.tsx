import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Play, Square, RefreshCw, Terminal, FileText, CheckCircle, XCircle, Clock, AlertTriangle, Zap, Database, Globe, Server, Eye, Settings, Upload, Download, GitBranch, Shield, Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface InfrastructureOperationsProps {
  className?: string;
}

interface ServiceManifest {
  id: string;
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  status: 'deployed' | 'pending' | 'failed' | 'updating' | 'unknown';
  components: {
    name: string;
    type: 'lambda-api' | 'sqs-queue' | 'rds-postgres' | 'ecs-service' | 's3-bucket';
    status: 'healthy' | 'unhealthy' | 'deploying';
  }[];
  compliance: {
    framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
    validated: boolean;
    lastAudit: string;
  };
  lastDeployment: {
    timestamp: string;
    user: string;
    commit?: string;
    duration: number; // seconds
  };
  manifestPath: string;
}

interface DeploymentOperation {
  id: string;
  service: string;
  command: 'validate' | 'plan' | 'up' | 'audit' | 'migrate';
  status: 'running' | 'completed' | 'failed' | 'queued';
  startTime: string;
  endTime?: string;
  logs: string[];
  user: string;
  environment: string;
  progressPercentage?: number;
}

interface SvcCommand {
  command: 'validate' | 'plan' | 'up' | 'audit' | 'migrate';
  description: string;
  icon: typeof CheckCircle;
  color: string;
  requiresConfirmation: boolean;
}

export function InfrastructureOperations({ className }: InfrastructureOperationsProps) {
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("development");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<SvcCommand | null>(null);
  const [commandParameters, setCommandParameters] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const svcCommands: SvcCommand[] = [
    {
      command: 'validate',
      description: 'Validate service manifest and component schemas',
      icon: CheckCircle,
      color: 'text-blue-500',
      requiresConfirmation: false
    },
    {
      command: 'plan',
      description: 'Generate deployment plan showing infrastructure changes',
      icon: FileText,
      color: 'text-green-500',
      requiresConfirmation: false
    },
    {
      command: 'up',
      description: 'Deploy infrastructure to the target environment',
      icon: Upload,
      color: 'text-orange-500',
      requiresConfirmation: true
    },
    {
      command: 'audit',
      description: 'Run compliance audit and security checks',
      icon: Shield,
      color: 'text-purple-500',
      requiresConfirmation: false
    },
    {
      command: 'migrate',
      description: 'Migrate existing infrastructure to Shinobi manifests',
      icon: GitBranch,
      color: 'text-red-500',
      requiresConfirmation: true
    }
  ];

  // Fetch service manifests
  const { data: services, isLoading: servicesLoading, refetch: refetchServices } = useQuery({
    queryKey: ['/api/infrastructure/services', selectedEnvironment],
    queryFn: async (): Promise<ServiceManifest[]> => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockServices: ServiceManifest[] = [
        {
          id: "user-service",
          name: "User Service",
          version: "1.2.3",
          environment: "production",
          status: "deployed",
          components: [
            { name: "user-api", type: "lambda-api", status: "healthy" },
            { name: "user-queue", type: "sqs-queue", status: "healthy" },
            { name: "user-db", type: "rds-postgres", status: "healthy" }
          ],
          compliance: {
            framework: "fedramp-moderate",
            validated: true,
            lastAudit: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
          },
          lastDeployment: {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            user: "Sarah Chen",
            commit: "a7f3c2e",
            duration: 342
          },
          manifestPath: "services/user-service/service.yml"
        },
        {
          id: "analytics-service",
          name: "Analytics Service",
          version: "2.1.0",
          environment: "production",
          status: "updating",
          components: [
            { name: "analytics-api", type: "lambda-api", status: "deploying" },
            { name: "data-queue", type: "sqs-queue", status: "healthy" },
            { name: "analytics-storage", type: "s3-bucket", status: "healthy" }
          ],
          compliance: {
            framework: "commercial",
            validated: true,
            lastAudit: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString()
          },
          lastDeployment: {
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            user: "Marcus Rodriguez",
            commit: "b9d8e1f",
            duration: 0 // Still running
          },
          manifestPath: "services/analytics-service/service.yml"
        },
        {
          id: "notification-service",
          name: "Notification Service",
          version: "1.0.8",
          environment: "staging",
          status: "failed",
          components: [
            { name: "notification-api", type: "lambda-api", status: "unhealthy" },
            { name: "email-queue", type: "sqs-queue", status: "healthy" }
          ],
          compliance: {
            framework: "commercial",
            validated: false,
            lastAudit: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
          },
          lastDeployment: {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
            user: "Emily Watson",
            commit: "c2f9a4b",
            duration: 89
          },
          manifestPath: "services/notification-service/service.yml"
        },
        {
          id: "payment-service",
          name: "Payment Service",
          version: "3.4.1",
          environment: "development",
          status: "deployed",
          components: [
            { name: "payment-api", type: "lambda-api", status: "healthy" },
            { name: "payment-db", type: "rds-postgres", status: "healthy" },
            { name: "payment-processor", type: "ecs-service", status: "healthy" }
          ],
          compliance: {
            framework: "fedramp-high",
            validated: true,
            lastAudit: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
          },
          lastDeployment: {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
            user: "David Kim",
            commit: "f1a7b3d",
            duration: 567
          },
          manifestPath: "services/payment-service/service.yml"
        }
      ];
      
      return selectedEnvironment === "all" ? mockServices : 
        mockServices.filter(s => s.environment === selectedEnvironment);
    }
  });

  // Fetch active operations
  const { data: operations, isLoading: operationsLoading } = useQuery({
    queryKey: ['/api/infrastructure/operations'],
    queryFn: async (): Promise<DeploymentOperation[]> => {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      return [
        {
          id: "op-1",
          service: "analytics-service",
          command: "up",
          status: "running",
          startTime: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          logs: [
            "Starting deployment of analytics-service v2.1.0",
            "Validating service manifest...",
            "✓ Manifest validation successful",
            "Generating deployment plan...",
            "✓ Plan generated: 3 resources to create, 1 to update",
            "Deploying CDK stack analytics-service-production...",
            "Creating Lambda function analytics-api...",
            "Updating IAM roles and policies...",
            "Deploying in progress..."
          ],
          user: "Marcus Rodriguez",
          environment: "production",
          progressPercentage: 75
        },
        {
          id: "op-2",
          service: "user-service",
          command: "audit",
          status: "completed",
          startTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          endTime: new Date(Date.now() - 1000 * 60 * 60 * 2 + 1000 * 45).toISOString(),
          logs: [
            "Starting compliance audit for user-service v1.2.3",
            "Checking FedRAMP Moderate compliance requirements...",
            "✓ Encryption at rest: ENABLED",
            "✓ Encryption in transit: ENABLED", 
            "✓ IAM least privilege: CONFIGURED",
            "✓ CloudTrail logging: ENABLED",
            "✓ VPC security groups: CONFIGURED",
            "✓ All compliance checks passed",
            "Audit completed successfully"
          ],
          user: "Emily Watson",
          environment: "production"
        }
      ];
    },
    refetchInterval: 5000 // Refresh every 5 seconds for active operations
  });

  const executeCommandMutation = useMutation({
    mutationFn: async ({ service, command, parameters }: { service: string, command: string, parameters?: string }) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        operationId: `op-${Date.now()}`,
        message: `${command} command executed successfully for ${service}`
      };
    },
    onSuccess: (result) => {
      toast({
        title: "Command executed",
        description: result.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/infrastructure/operations'] });
      setShowCommandDialog(false);
      setSelectedCommand(null);
      setCommandParameters("");
    },
    onError: () => {
      toast({
        title: "Command failed",
        description: "Failed to execute the command. Please check the logs.",
        variant: "destructive"
      });
    }
  });

  const handleExecuteCommand = () => {
    if (!selectedService || !selectedCommand) return;
    
    executeCommandMutation.mutate({
      service: selectedService,
      command: selectedCommand.command,
      parameters: commandParameters.trim() || undefined
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'updating': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'deployed': return 'default';
      case 'updating': return 'secondary';
      case 'failed': return 'destructive';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const getComponentTypeIcon = (type: string) => {
    switch (type) {
      case 'lambda-api': return <Zap className="w-4 h-4 text-orange-500" />;
      case 'sqs-queue': return <Activity className="w-4 h-4 text-blue-500" />;
      case 'rds-postgres': return <Database className="w-4 h-4 text-green-500" />;
      case 'ecs-service': return <Server className="w-4 h-4 text-purple-500" />;
      case 's3-bucket': return <Globe className="w-4 h-4 text-red-500" />;
      default: return <Server className="w-4 h-4 text-gray-500" />;
    }
  };

  const getComponentStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'unhealthy': return 'text-red-500';
      case 'deploying': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getOperationStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'queued': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const activeOperations = operations?.filter(op => op.status === 'running') || [];
  const recentOperations = operations?.filter(op => op.status !== 'running').slice(0, 5) || [];

  return (
    <TooltipProvider>
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-operations-title">Infrastructure Operations</h1>
            <p className="text-muted-foreground" data-testid="text-operations-subtitle">
              Manage service deployments with svc commands and monitor infrastructure operations
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
              <SelectTrigger className="w-36" data-testid="select-environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => refetchServices()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Active Operations */}
        {activeOperations.length > 0 && (
          <Card data-testid="card-active-operations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                Active Operations ({activeOperations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeOperations.map((operation) => (
                <div key={operation.id} className="border rounded-lg p-4" data-testid={`active-operation-${operation.id}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" data-testid={`operation-command-${operation.id}`}>
                        svc {operation.command}
                      </Badge>
                      <span className="font-medium" data-testid={`operation-service-${operation.id}`}>
                        {operation.service}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        by {operation.user}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getOperationStatusIcon(operation.status)}
                      <span className="text-sm font-medium capitalize">{operation.status}</span>
                    </div>
                  </div>
                  
                  {operation.progressPercentage !== undefined && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{operation.progressPercentage}%</span>
                      </div>
                      <Progress value={operation.progressPercentage} />
                    </div>
                  )}
                  
                  <ScrollArea className="h-32 bg-muted rounded p-3">
                    <div className="space-y-1 font-mono text-xs">
                      {operation.logs.map((log, index) => (
                        <div key={index} className="text-foreground" data-testid={`operation-log-${operation.id}-${index}`}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="services" className="space-y-4">
          <TabsList>
            <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
            <TabsTrigger value="operations" data-testid="tab-operations">
              Recent Operations {recentOperations.length > 0 && <Badge variant="outline" className="ml-2">{recentOperations.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="commands" data-testid="tab-commands">svc Commands</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            {servicesLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="loading-services">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-1/3 mb-3"></div>
                      <div className="h-4 bg-muted rounded w-full mb-2"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : services?.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground" data-testid="text-no-services">
                  No services found for the selected environment.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {services?.map((service) => (
                  <Card key={service.id} className="hover-elevate" data-testid={`card-service-${service.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg" data-testid={`service-name-${service.id}`}>
                            {service.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span data-testid={`service-version-${service.id}`}>v{service.version}</span>
                            <span>•</span>
                            <span className="capitalize" data-testid={`service-environment-${service.id}`}>
                              {service.environment}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(service.status)} data-testid={`service-status-${service.id}`}>
                            {getStatusIcon(service.status)}
                            <span className="ml-1 capitalize">{service.status}</span>
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Components</p>
                          <div className="grid grid-cols-2 gap-2">
                            {service.components.map((component, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm" data-testid={`service-component-${service.id}-${index}`}>
                                {getComponentTypeIcon(component.type)}
                                <span className="flex-1 truncate">{component.name}</span>
                                <div className={`w-2 h-2 rounded-full ${getComponentStatusColor(component.status)}`}></div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            <span className="text-muted-foreground">Compliance:</span>
                            <span className={service.compliance.validated ? 'text-green-600' : 'text-red-600'} data-testid={`service-compliance-${service.id}`}>
                              {service.compliance.framework} {service.compliance.validated ? '✓' : '✗'}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Last deployed {formatDistanceToNow(new Date(service.lastDeployment.timestamp), { addSuffix: true })} by {service.lastDeployment.user}
                          {service.lastDeployment.commit && (
                            <span> ({service.lastDeployment.commit})</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setSelectedService(service.id);
                            setShowCommandDialog(true);
                          }}
                          data-testid={`button-deploy-${service.id}`}
                        >
                          <Terminal className="w-4 h-4 mr-2" />
                          svc Commands
                        </Button>
                        <Button size="sm" variant="outline" data-testid={`button-view-manifest-${service.id}`}>
                          <FileText className="w-4 h-4 mr-2" />
                          View Manifest
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            {operationsLoading ? (
              <div className="space-y-4" data-testid="loading-operations">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-1/3 mb-3"></div>
                      <div className="h-20 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recentOperations.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground" data-testid="text-no-operations">
                  No recent operations found.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recentOperations.map((operation) => (
                  <Card key={operation.id} data-testid={`card-operation-${operation.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getOperationStatusIcon(operation.status)}
                          <div>
                            <h3 className="font-semibold" data-testid={`operation-title-${operation.id}`}>
                              svc {operation.command} - {operation.service}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {operation.user} • {operation.environment} • 
                              {operation.endTime ? 
                                ` completed ${formatDistanceToNow(new Date(operation.endTime), { addSuffix: true })}` :
                                ` started ${formatDistanceToNow(new Date(operation.startTime), { addSuffix: true })}`
                              }
                            </p>
                          </div>
                        </div>
                        
                        <Badge 
                          variant={operation.status === 'completed' ? 'default' : 
                                   operation.status === 'failed' ? 'destructive' : 'secondary'}
                          data-testid={`operation-status-${operation.id}`}
                        >
                          {operation.status}
                        </Badge>
                      </div>
                      
                      <ScrollArea className="h-40 bg-muted rounded p-3">
                        <div className="space-y-1 font-mono text-xs">
                          {operation.logs.map((log, index) => (
                            <div key={index} className="text-foreground" data-testid={`operation-log-${operation.id}-${index}`}>
                              {log}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="commands" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {svcCommands.map((cmd) => (
                <Card key={cmd.command} className="hover-elevate" data-testid={`card-command-${cmd.command}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <cmd.icon className={`w-6 h-6 ${cmd.color}`} />
                      <div>
                        <h3 className="font-semibold" data-testid={`command-name-${cmd.command}`}>
                          svc {cmd.command}
                        </h3>
                        {cmd.requiresConfirmation && (
                          <Badge variant="outline" className="text-xs">Requires confirmation</Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4" data-testid={`command-description-${cmd.command}`}>
                      {cmd.description}
                    </p>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setSelectedCommand(cmd);
                        setShowCommandDialog(true);
                      }}
                      data-testid={`button-run-${cmd.command}`}
                    >
                      <Terminal className="w-4 h-4 mr-2" />
                      Run Command
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Command Execution Dialog */}
        <Dialog open={showCommandDialog} onOpenChange={setShowCommandDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Execute svc {selectedCommand?.command || 'command'}
              </DialogTitle>
              <DialogDescription>
                {selectedCommand?.description || 'Execute the selected svc command'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {!selectedService && (
                <div className="space-y-2">
                  <Label htmlFor="service-select">Select Service *</Label>
                  <Select value={selectedService || ""} onValueChange={setSelectedService}>
                    <SelectTrigger data-testid="select-service-for-command">
                      <SelectValue placeholder="Choose a service..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services?.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({service.environment})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="command-parameters">Additional Parameters (optional)</Label>
                <Textarea
                  id="command-parameters"
                  placeholder="--dry-run --verbose --compliance-framework fedramp-moderate"
                  value={commandParameters}
                  onChange={(e) => setCommandParameters(e.target.value)}
                  rows={3}
                  data-testid="input-command-parameters"
                />
              </div>
              
              {selectedCommand?.requiresConfirmation && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">This command will modify infrastructure</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please confirm that you want to proceed with this deployment operation.
                  </p>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCommandDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleExecuteCommand}
                  disabled={!selectedService || executeCommandMutation.isPending}
                  data-testid="button-execute-command"
                >
                  {executeCommandMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Execute Command
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default InfrastructureOperations;