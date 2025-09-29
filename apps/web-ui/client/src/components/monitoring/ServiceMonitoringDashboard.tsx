import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, Activity, TrendingUp, TrendingDown, Clock, Shield, Zap, Database, Globe, Server, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";

interface ServiceMonitoringDashboardProps {
  className?: string;
}

interface ServiceHealthStatus {
  id: string;
  name: string;
  type: 'lambda-api' | 'sqs-queue' | 'rds-postgres' | 'ecs-service' | 's3-bucket';
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  environment: 'production' | 'staging' | 'development';
  region: string;
  uptime: number; // percentage
  lastChecked: string;
  metrics: {
    latency?: number; // ms
    errorRate?: number; // percentage  
    throughput?: number; // requests/min
    memory?: number; // percentage
    cpu?: number; // percentage
  };
  alerts: ServiceAlert[];
  compliance: {
    framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
    status: 'compliant' | 'non-compliant' | 'pending';
    lastAudit: string;
    score: number; // percentage
  };
}

interface ServiceAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface PlatformMetrics {
  totalServices: number;
  healthyServices: number;
  servicesWithAlerts: number;
  averageUptime: number;
  totalAlerts: number;
  complianceScore: number;
}

export function ServiceMonitoringDashboard({ className }: ServiceMonitoringDashboardProps) {
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("24h");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/metrics'] });
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, queryClient]);

  // Fetch platform metrics from Shinobi monitoring service
  const { data: platformMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/monitoring/metrics', selectedEnvironment, selectedTimeRange]
  });

  // Fetch service health data from Shinobi monitoring service
  const { data: services, isLoading: servicesLoading, refetch } = useQuery({
    queryKey: ['/api/monitoring/services', selectedEnvironment]
  });

  // Provide safe defaults for platform data until backend APIs are implemented
  const safeServices = Array.isArray(services) ? services : [];
  const safePlatformMetrics: PlatformMetrics = (platformMetrics as PlatformMetrics) || {
    totalServices: 0,
    healthyServices: 0,
    servicesWithAlerts: 0,
    averageUptime: 0,
    totalAlerts: 0,
    complianceScore: 0
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'degraded': return 'secondary'; 
      case 'unhealthy': return 'destructive';
      default: return 'outline';
    }
  };

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'lambda-api': return <Zap className="w-4 h-4" />;
      case 'sqs-queue': return <Activity className="w-4 h-4" />;
      case 'rds-postgres': return <Database className="w-4 h-4" />;
      case 'ecs-service': return <Server className="w-4 h-4" />;
      case 's3-bucket': return <Globe className="w-4 h-4" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-500';
      case 'non-compliant': return 'text-red-500';
      case 'pending': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const filteredServices = safeServices;
  const healthyCount = filteredServices.filter(s => s.status === 'healthy').length;
  const degradedCount = filteredServices.filter(s => s.status === 'degraded').length;
  const unhealthyCount = filteredServices.filter(s => s.status === 'unhealthy').length;

  const allAlerts = filteredServices.flatMap(s => 
    s.alerts.map((alert: ServiceAlert) => ({ ...alert, serviceName: s.name, serviceId: s.id }))
  ).filter(alert => !alert.resolved).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical');
  const warningAlerts = allAlerts.filter(a => a.severity === 'warning');

  return (
    <TooltipProvider>
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-monitoring-title">Service Monitoring</h1>
            <p className="text-muted-foreground" data-testid="text-monitoring-subtitle">
              Monitor infrastructure health, performance, and compliance across all environments
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
              <SelectTrigger className="w-32" data-testid="select-environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Envs</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-24" data-testid="select-timerange">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="24h">24h</SelectItem>
                <SelectItem value="7d">7d</SelectItem>
                <SelectItem value="30d">30d</SelectItem>
              </SelectContent>
            </Select>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    refetch();
                    queryClient.invalidateQueries({ queryKey: ['/api/monitoring/metrics'] });
                  }}
                  data-testid="button-refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  data-testid="button-auto-refresh"
                >
                  <Activity className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {autoRefresh ? "Auto-refresh enabled" : "Auto-refresh disabled"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Platform Overview Metrics */}
        {metricsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4" data-testid="loading-metrics">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card data-testid="metric-total-services">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Total Services</span>
                </div>
                <p className="text-2xl font-bold" data-testid="value-total-services">
                  {safePlatformMetrics.totalServices || filteredServices.length}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-healthy-services">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-muted-foreground">Healthy</span>
                </div>
                <p className="text-2xl font-bold text-green-600" data-testid="value-healthy-services">
                  {healthyCount}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-alerts">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-muted-foreground">Active Alerts</span>
                </div>
                <p className="text-2xl font-bold text-red-600" data-testid="value-active-alerts">
                  {allAlerts.length}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-uptime">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-muted-foreground">Avg Uptime</span>
                </div>
                <p className="text-2xl font-bold text-blue-600" data-testid="value-avg-uptime">
                  {safePlatformMetrics.averageUptime || 
                    (filteredServices.reduce((sum, s) => sum + s.uptime, 0) / filteredServices.length || 0).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-compliance">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-muted-foreground">Compliance</span>
                </div>
                <p className="text-2xl font-bold text-purple-600" data-testid="value-compliance-score">
                  {safePlatformMetrics.complianceScore || 
                    (filteredServices.reduce((sum, s) => sum + s.compliance.score, 0) / filteredServices.length || 0).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-degraded">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-muted-foreground">Issues</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600" data-testid="value-degraded-services">
                  {degradedCount + unhealthyCount}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="services" className="space-y-4">
          <TabsList>
            <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">
              Alerts {allAlerts.length > 0 && <Badge variant="destructive" className="ml-2">{allAlerts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            {servicesLoading ? (
              <div className="space-y-4" data-testid="loading-services">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-1/3 mb-3"></div>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-4 bg-muted rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredServices.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground" data-testid="text-no-services">
                  No services found for the selected environment.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredServices.map((service) => (
                  <Card key={service.id} className="hover-elevate" data-testid={`card-service-${service.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getServiceTypeIcon(service.type)}
                          <div>
                            <h3 className="font-semibold text-lg" data-testid={`service-name-${service.id}`}>
                              {service.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="capitalize">{service.type.replace('-', ' ')}</span>
                              <span>•</span>
                              <span className="capitalize" data-testid={`service-env-${service.id}`}>{service.environment}</span>
                              <span>•</span>
                              <span data-testid={`service-region-${service.id}`}>{service.region}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(service.status)} data-testid={`service-status-${service.id}`}>
                            {getStatusIcon(service.status)}
                            <span className="ml-1 capitalize">{service.status}</span>
                          </Badge>
                          
                          {service.alerts.length > 0 && (
                            <Badge variant="destructive" data-testid={`service-alerts-${service.id}`}>
                              {service.alerts.length} alert{service.alerts.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                          <div className="flex items-center gap-2">
                            <Progress value={service.uptime} className="flex-1" />
                            <span className="text-sm font-medium" data-testid={`service-uptime-${service.id}`}>
                              {service.uptime}%
                            </span>
                          </div>
                        </div>

                        {service.metrics.latency && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Latency</p>
                            <p className="text-lg font-semibold" data-testid={`service-latency-${service.id}`}>
                              {service.metrics.latency}ms
                            </p>
                          </div>
                        )}

                        {service.metrics.errorRate !== undefined && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                            <p className="text-lg font-semibold" data-testid={`service-error-rate-${service.id}`}>
                              {service.metrics.errorRate}%
                            </p>
                          </div>
                        )}

                        {service.metrics.throughput && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Throughput</p>
                            <p className="text-lg font-semibold" data-testid={`service-throughput-${service.id}`}>
                              {service.metrics.throughput}/min
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span data-testid={`service-last-checked-${service.id}`}>
                            Last checked {formatDistanceToNow(new Date(service.lastChecked), { addSuffix: true })}
                          </span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            <span className={getComplianceStatusColor(service.compliance.status)} data-testid={`service-compliance-${service.id}`}>
                              {service.compliance.score}% compliant
                            </span>
                          </div>
                        </div>
                        
                        <Button variant="outline" size="sm" data-testid={`button-view-details-${service.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {allAlerts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center" data-testid="text-no-alerts">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No Active Alerts</h3>
                  <p className="text-muted-foreground">All services are operating normally.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Alert Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card data-testid="alert-summary-critical">
                    <CardContent className="p-4 text-center">
                      <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
                      <p className="text-sm text-muted-foreground">Critical</p>
                    </CardContent>
                  </Card>
                  
                  <Card data-testid="alert-summary-warning">
                    <CardContent className="p-4 text-center">
                      <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-yellow-600">{warningAlerts.length}</p>
                      <p className="text-sm text-muted-foreground">Warning</p>
                    </CardContent>
                  </Card>
                  
                  <Card data-testid="alert-summary-total">
                    <CardContent className="p-4 text-center">
                      <AlertCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600">{allAlerts.length}</p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Alert List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Active Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-3">
                        {allAlerts.map((alert) => (
                          <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border" data-testid={`alert-${alert.id}`}>
                            <AlertCircle className={`w-5 h-5 mt-0.5 ${getAlertSeverityColor(alert.severity)}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                                  {alert.severity.toUpperCase()}
                                </Badge>
                                <span className="text-sm text-muted-foreground" data-testid={`alert-service-${alert.id}`}>
                                  {(alert as any).serviceName}
                                </span>
                              </div>
                              <p className="text-sm font-medium" data-testid={`alert-message-${alert.id}`}>
                                {alert.message}
                              </p>
                              <p className="text-xs text-muted-foreground" data-testid={`alert-time-${alert.id}`}>
                                {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Compliance Overview */}
              <Card data-testid="compliance-overview">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Compliance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Compliance Score</span>
                      <span className="font-medium" data-testid="overall-compliance-score">
                        {(filteredServices.reduce((sum, s) => sum + s.compliance.score, 0) / filteredServices.length || 0).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={filteredServices.reduce((sum, s) => sum + s.compliance.score, 0) / filteredServices.length || 0} />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Compliant Services</span>
                      <Badge variant="default" data-testid="compliant-services-count">
                        {filteredServices.filter(s => s.compliance.status === 'compliant').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Non-Compliant Services</span>
                      <Badge variant="destructive" data-testid="non-compliant-services-count">
                        {filteredServices.filter(s => s.compliance.status === 'non-compliant').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending Review</span>
                      <Badge variant="secondary" data-testid="pending-services-count">
                        {filteredServices.filter(s => s.compliance.status === 'pending').length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Framework Distribution */}
              <Card data-testid="framework-distribution">
                <CardHeader>
                  <CardTitle>Compliance Frameworks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {['commercial', 'fedramp-moderate', 'fedramp-high'].map(framework => {
                    const count = filteredServices.filter(s => s.compliance.framework === framework).length;
                    const percentage = filteredServices.length > 0 ? (count / filteredServices.length) * 100 : 0;
                    
                    return (
                      <div key={framework} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize" data-testid={`framework-${framework}-label`}>
                            {framework.replace('-', ' ')}
                          </span>
                          <span className="font-medium" data-testid={`framework-${framework}-count`}>
                            {count} service{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <Progress value={percentage} />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Service Compliance Details */}
            <Card data-testid="service-compliance-details">
              <CardHeader>
                <CardTitle>Service Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`compliance-service-${service.id}`}>
                      <div className="flex items-center gap-3">
                        {getServiceTypeIcon(service.type)}
                        <div>
                          <p className="font-medium" data-testid={`compliance-service-name-${service.id}`}>
                            {service.name}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {service.compliance.framework.replace('-', ' ')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-medium" data-testid={`compliance-score-${service.id}`}>
                            {service.compliance.score}%
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`compliance-audit-${service.id}`}>
                            Audited {formatDistanceToNow(new Date(service.compliance.lastAudit), { addSuffix: true })}
                          </p>
                        </div>
                        
                        <Badge 
                          variant={service.compliance.status === 'compliant' ? 'default' : 
                                   service.compliance.status === 'non-compliant' ? 'destructive' : 'secondary'}
                          data-testid={`compliance-status-${service.id}`}
                        >
                          {service.compliance.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export default ServiceMonitoringDashboard;