import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Filter, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ServiceInfo, ServiceStatus, ServiceComponentStatus, Alert } from "@shared/contracts";

interface ServiceStatusDashboardProps {
  className?: string;
}

export function ServiceStatusDashboard({ className }: ServiceStatusDashboardProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");

  // Mock data - will be replaced with real MCP API calls
  const { data: services, isLoading, refetch } = useQuery({
    queryKey: ['/api/services', statusFilter, environmentFilter],
    queryFn: async (): Promise<ServiceInfo[]> => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      
      return [
        {
          name: "payment-service",
          version: "2.1.3",
          description: "Handles payment processing and transaction management",
          owner: "payments-team",
          complianceFramework: "fedramp-moderate",
          environment: "production",
          status: "degraded",
          lastDeployed: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          components: [
            {
              name: "payment-api",
              type: "api-gateway",
              version: "2.1.3",
              configuration: { replicas: 3, cpu: "500m", memory: "1Gi" },
              capabilities: ["http-api", "rate-limiting"],
              triggers: ["http-request"],
              metadata: { team: "payments" },
              bindings: [
                { target: "payment-db", capability: "database", access: "read-write", status: "active" }
              ],
              metrics: {
                cpu: { average: 45, peak: 78, unit: "%" },
                memory: { average: 512, peak: 892, unit: "MB" },
                requests: { total: 125430, errorRate: 2.1, averageLatency: 250, unit: "ms" },
                connections: { active: 48, peak: 95 }
              }
            },
            {
              name: "payment-db",
              type: "postgresql", 
              version: "14.9",
              configuration: { storage: "100Gi", backup: "enabled" },
              capabilities: ["database", "transactions"],
              triggers: ["schema-change"],
              metadata: { team: "payments" },
              bindings: [],
              metrics: {
                cpu: { average: 23, peak: 45, unit: "%" },
                memory: { average: 2048, peak: 3072, unit: "MB" },
                connections: { active: 12, peak: 25 }
              }
            }
          ],
          bindings: [],
          triggers: [],
          metadata: { criticality: "high", sla: "99.9%" }
        },
        {
          name: "user-auth-service",
          version: "1.8.2",
          description: "User authentication and authorization service",
          owner: "auth-team",
          complianceFramework: "commercial",
          environment: "production",
          status: "healthy",
          lastDeployed: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
          components: [
            {
              name: "auth-api",
              type: "api-gateway",
              version: "1.8.2",
              configuration: { replicas: 2, cpu: "300m", memory: "512Mi" },
              capabilities: ["oauth2", "jwt", "rate-limiting"],
              triggers: ["auth-request"],
              metadata: { team: "auth" },
              bindings: [
                { target: "user-db", capability: "database", access: "read-write", status: "active" }
              ],
              metrics: {
                cpu: { average: 32, peak: 58, unit: "%" },
                memory: { average: 256, peak: 410, unit: "MB" },
                requests: { total: 89230, errorRate: 0.5, averageLatency: 120, unit: "ms" },
                connections: { active: 23, peak: 67 }
              }
            }
          ],
          bindings: [],
          triggers: [],
          metadata: { criticality: "critical", sla: "99.95%" }
        }
      ];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: serviceStatuses } = useQuery({
    queryKey: ['/api/services/status', services?.map(s => s.name)],
    queryFn: async (): Promise<Record<string, ServiceStatus>> => {
      if (!services) return {};
      
      const statuses: Record<string, ServiceStatus> = {};
      
      for (const service of services) {
        statuses[service.name] = {
          service: service.name,
          environment: service.environment,
          overallStatus: service.status,
          lastChecked: new Date().toISOString(),
          components: service.components.map(comp => ({
            name: comp.name,
            type: comp.type,
            status: service.status === "degraded" && comp.name === "payment-api" ? "degraded" : "healthy",
            awsResources: [
              {
                resourceType: "ECS Service",
                resourceId: `${comp.name}-service`,
                status: "running",
                region: "us-east-1",
                lastUpdated: new Date().toISOString(),
                configuration: comp.configuration,
                tags: { team: comp.metadata.team || "", component: comp.name }
              }
            ],
            healthChecks: [
              {
                name: `${comp.name}-health`,
                status: service.status === "degraded" && comp.name === "payment-api" ? "warning" : "passing",
                lastChecked: new Date().toISOString(),
                message: service.status === "degraded" && comp.name === "payment-api" 
                  ? "High latency detected" 
                  : "All checks passing",
                endpoint: `https://${comp.name}.example.com/health`
              }
            ],
            alerts: service.status === "degraded" && comp.name === "payment-api" ? [
              {
                id: `alert-${comp.name}`,
                severity: "warning" as const,
                title: "High Response Time",
                description: "API response time above threshold",
                createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
              }
            ] : []
          }))
        };
      }
      
      return statuses;
    },
    enabled: !!services,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy": return <Activity className="w-4 h-4 text-green-500" />;
      case "degraded": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "unhealthy": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "healthy": return "outline";
      case "degraded": return "secondary";
      case "unhealthy": return "destructive";
      default: return "outline";
    }
  };

  const getMetricTrend = (current: number, threshold: number) => {
    if (current > threshold * 1.2) return { icon: TrendingUp, color: "text-red-500", status: "high" };
    if (current > threshold * 0.8) return { icon: TrendingUp, color: "text-yellow-500", status: "elevated" };
    return { icon: TrendingDown, color: "text-green-500", status: "normal" };
  };

  const filteredServices = services?.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || service.status === statusFilter;
    const matchesEnvironment = environmentFilter === "all" || service.environment === environmentFilter;
    return matchesSearch && matchesStatus && matchesEnvironment;
  }) || [];

  const overallHealthStats = {
    total: services?.length || 0,
    healthy: services?.filter(s => s.status === "healthy").length || 0,
    degraded: services?.filter(s => s.status === "degraded").length || 0,
    unhealthy: services?.filter(s => s.status === "unhealthy").length || 0
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Service Status Dashboard</h1>
          <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
            Real-time monitoring of {overallHealthStats.total} managed services
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          disabled={isLoading}
          data-testid="button-refresh-dashboard"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-services">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Services</p>
                <p className="text-2xl font-bold">{overallHealthStats.total}</p>
              </div>
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-healthy-services">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Healthy</p>
                <p className="text-2xl font-bold text-green-600">{overallHealthStats.healthy}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-degraded-services">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Degraded</p>
                <p className="text-2xl font-bold text-yellow-600">{overallHealthStats.degraded}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-unhealthy-services">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unhealthy</p>
                <p className="text-2xl font-bold text-red-600">{overallHealthStats.unhealthy}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
            data-testid="input-service-search"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="degraded">Degraded</SelectItem>
            <SelectItem value="unhealthy">Unhealthy</SelectItem>
          </SelectContent>
        </Select>

        <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
          <SelectTrigger className="w-40" data-testid="select-environment-filter">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="development">Development</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4" data-testid="loading-services">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-16 bg-muted rounded"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground" data-testid="text-no-services">
              No services found matching your filters
            </CardContent>
          </Card>
        ) : (
          filteredServices.map((service) => {
            const status = serviceStatuses?.[service.name];
            return (
              <Card key={service.name} className="hover-elevate" data-testid={`card-service-${service.name}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(service.status)}
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-service-name-${service.name}`}>
                          {service.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1" data-testid={`text-service-description-${service.name}`}>
                          {service.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(service.status)} data-testid={`badge-service-status-${service.name}`}>
                        {service.status}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-service-environment-${service.name}`}>
                        {service.environment}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Owner</p>
                      <p className="text-sm" data-testid={`text-service-owner-${service.name}`}>{service.owner}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Version</p>
                      <p className="text-sm font-mono" data-testid={`text-service-version-${service.name}`}>{service.version}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Components</p>
                      <p className="text-sm" data-testid={`text-service-components-${service.name}`}>{service.components.length}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Deployed</p>
                      <p className="text-sm" data-testid={`text-service-deployed-${service.name}`}>
                        {formatDistanceToNow(new Date(service.lastDeployed), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Components */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Components</h4>
                    {service.components.map((component, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3" data-testid={`card-component-${component.name}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium" data-testid={`text-component-name-${component.name}`}>{component.name}</h5>
                            <Badge variant="outline" className="text-xs">{component.type}</Badge>
                          </div>
                          {status?.components[idx] && (
                            <Badge variant={getStatusBadgeVariant(status.components[idx].status)}>
                              {status.components[idx].status}
                            </Badge>
                          )}
                        </div>

                        {component.metrics && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {component.metrics.cpu && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">CPU</span>
                                  <span className="text-xs">{component.metrics.cpu.average}%</span>
                                </div>
                                <Progress value={component.metrics.cpu.average} className="h-2" />
                              </div>
                            )}
                            
                            {component.metrics.memory && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">Memory</span>
                                  <span className="text-xs">{component.metrics.memory.average}{component.metrics.memory.unit}</span>
                                </div>
                                <Progress value={component.metrics.memory.average ? (component.metrics.memory.average / 1024) * 100 : 0} className="h-2" />
                              </div>
                            )}

                            {component.metrics.requests && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">Error Rate</span>
                                  <span className="text-xs">{component.metrics.requests.errorRate}%</span>
                                </div>
                                <Progress value={component.metrics.requests.errorRate} className="h-2" />
                              </div>
                            )}

                            {component.metrics.connections && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">Connections</span>
                                  <span className="text-xs">{component.metrics.connections.active}/{component.metrics.connections.peak}</span>
                                </div>
                                <Progress value={component.metrics.connections.active && component.metrics.connections.peak ? (component.metrics.connections.active / component.metrics.connections.peak) * 100 : 0} className="h-2" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ServiceStatusDashboard;