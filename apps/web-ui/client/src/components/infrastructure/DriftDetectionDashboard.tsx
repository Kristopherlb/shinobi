import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Filter, Search, FileText, Settings, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { DriftDetectionResult, DriftItem, ComponentDriftStatus } from "@shared/contracts";

interface DriftDetectionDashboardProps {
  className?: string;
}

export function DriftDetectionDashboard({ className }: DriftDetectionDashboardProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();

  // Mock data - will be replaced with real MCP API calls
  const { data: driftResults, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/drift', serviceFilter],
    queryFn: async (): Promise<DriftDetectionResult[]> => {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate loading
      
      return [
        {
          service: "payment-service",
          environment: "production",
          overallStatus: "drift-detected",
          scannedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          summary: {
            totalComponents: 3,
            componentsWithDrift: 2,
            totalDrifts: 5,
            criticalDrifts: 1
          },
          components: [
            {
              name: "payment-api",
              type: "api-gateway",
              status: "drift-detected",
              drifts: [
                {
                  resourceType: "ECS Service",
                  resourceId: "payment-api-service",
                  property: "desiredCount",
                  expectedValue: "3",
                  actualValue: "2",
                  severity: "high",
                  category: "performance",
                  remediation: "Scale service to match desired replica count"
                },
                {
                  resourceType: "Security Group",
                  resourceId: "sg-payment-api",
                  property: "ingress_rules",
                  expectedValue: "80,443",
                  actualValue: "80,443,8080",
                  severity: "critical",
                  category: "security",
                  remediation: "Remove unauthorized port 8080 from security group"
                }
              ]
            },
            {
              name: "payment-db",
              type: "postgresql",
              status: "drift-detected",
              drifts: [
                {
                  resourceType: "RDS Instance",
                  resourceId: "payment-db-prod",
                  property: "backup_retention_period",
                  expectedValue: "7",
                  actualValue: "3",
                  severity: "medium",
                  category: "compliance",
                  remediation: "Increase backup retention to meet compliance requirements"
                },
                {
                  resourceType: "RDS Instance",
                  resourceId: "payment-db-prod",
                  property: "multi_az",
                  expectedValue: "true",
                  actualValue: "false",
                  severity: "high",
                  category: "performance",
                  remediation: "Enable Multi-AZ deployment for high availability"
                }
              ]
            },
            {
              name: "payment-cache",
              type: "redis",
              status: "no-drift",
              drifts: []
            }
          ]
        },
        {
          service: "user-auth-service",
          environment: "production",
          overallStatus: "no-drift",
          scannedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          summary: {
            totalComponents: 2,
            componentsWithDrift: 0,
            totalDrifts: 0,
            criticalDrifts: 0
          },
          components: [
            {
              name: "auth-api",
              type: "api-gateway",
              status: "no-drift",
              drifts: []
            },
            {
              name: "user-db",
              type: "postgresql",
              status: "no-drift",
              drifts: []
            }
          ]
        }
      ];
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const remediateDriftMutation = useMutation({
    mutationFn: async ({ serviceId, driftId }: { serviceId: string; driftId: string }) => {
      // Mock implementation - replace with real MCP API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Remediation initiated",
        description: "Configuration drift remediation has been started.",
      });
      refetch();
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "no-drift": return <CheckCircle className="w-4 h-4 text-green-500" data-testid="icon-no-drift" />;
      case "drift-detected": return <AlertTriangle className="w-4 h-4 text-yellow-500" data-testid="icon-drift-detected" />;
      case "scan-failed": return <XCircle className="w-4 h-4 text-red-500" data-testid="icon-scan-failed" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" data-testid="icon-unknown" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="w-4 h-4 text-red-500" />;
      case "high": return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "medium": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "low": return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "security": return <Shield className="w-4 h-4 text-red-500" />;
      case "compliance": return <FileText className="w-4 h-4 text-blue-500" />;
      case "performance": return <Settings className="w-4 h-4 text-orange-500" />;
      case "configuration": return <Settings className="w-4 h-4 text-gray-500" />;
      default: return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "no-drift": return "outline";
      case "drift-detected": return "secondary";
      case "scan-failed": return "destructive";
      default: return "outline";
    }
  };

  const filteredResults = driftResults?.filter(result => {
    const matchesSearch = result.service.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesService = serviceFilter === "all" || result.service === serviceFilter;
    return matchesSearch && matchesService;
  }) || [];

  const allDrifts = driftResults?.flatMap(result => 
    result.components.flatMap(component => 
      component.drifts.map(drift => ({
        ...drift,
        service: result.service,
        component: component.name,
        scannedAt: result.scannedAt
      }))
    )
  ) || [];

  const filteredDrifts = allDrifts.filter(drift => {
    const matchesSearch = drift.resourceId.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         drift.property.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesSeverity = severityFilter === "all" || drift.severity === severityFilter;
    const matchesCategory = categoryFilter === "all" || drift.category === categoryFilter;
    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const overallStats = {
    totalServices: driftResults?.length || 0,
    servicesWithDrift: driftResults?.filter(r => r.overallStatus === "drift-detected").length || 0,
    totalDrifts: driftResults?.reduce((sum, r) => sum + r.summary.totalDrifts, 0) || 0,
    criticalDrifts: driftResults?.reduce((sum, r) => sum + r.summary.criticalDrifts, 0) || 0
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-drift-title">Configuration Drift Detection</h1>
          <p className="text-muted-foreground" data-testid="text-drift-subtitle">
            Monitor infrastructure configuration drift across {overallStats.totalServices} services
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          disabled={isLoading}
          data-testid="button-refresh-drift"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Scanning...' : 'Scan Now'}
        </Button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-services">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Services</p>
                <p className="text-2xl font-bold">{overallStats.totalServices}</p>
              </div>
              <Settings className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-drift-services">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Drift</p>
                <p className="text-2xl font-bold text-yellow-600">{overallStats.servicesWithDrift}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-drifts">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Drifts</p>
                <p className="text-2xl font-bold text-orange-600">{overallStats.totalDrifts}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-drifts">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{overallStats.criticalDrifts}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search services, resources, or properties..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
            data-testid="input-drift-search"
          />
        </div>
        
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-48" data-testid="select-service-filter">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="payment-service">Payment Service</SelectItem>
            <SelectItem value="user-auth-service">User Auth Service</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-32" data-testid="select-severity-filter">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="compliance">Compliance</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="configuration">Configuration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services" data-testid="tab-services">Services Overview</TabsTrigger>
          <TabsTrigger value="drifts" data-testid="tab-drifts">Drift Details</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4" data-testid="loading-services">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredResults.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground" data-testid="text-no-services">
                No services found matching your filters
              </CardContent>
            </Card>
          ) : (
            filteredResults.map((result) => (
              <Card key={result.service} className="hover-elevate" data-testid={`card-service-${result.service}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.overallStatus)}
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-service-name-${result.service}`}>
                          {result.service}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground" data-testid={`text-service-env-${result.service}`}>
                          Environment: {result.environment}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(result.overallStatus)} data-testid={`badge-service-status-${result.service}`}>
                        {result.overallStatus.replace('-', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground" data-testid={`text-service-scanned-${result.service}`}>
                        {formatDistanceToNow(new Date(result.scannedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Components</p>
                      <p className="text-sm">{result.summary.totalComponents}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">With Drift</p>
                      <p className="text-sm text-yellow-600">{result.summary.componentsWithDrift}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Drifts</p>
                      <p className="text-sm text-orange-600">{result.summary.totalDrifts}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Critical</p>
                      <p className="text-sm text-red-600">{result.summary.criticalDrifts}</p>
                    </div>
                  </div>

                  {result.summary.totalDrifts > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Component Details</h4>
                      {result.components.filter(c => c.status === "drift-detected").map((component, idx) => (
                        <div key={idx} className="border rounded-lg p-4" data-testid={`card-component-${component.name}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium" data-testid={`text-component-name-${component.name}`}>{component.name}</h5>
                              <Badge variant="outline" className="text-xs">{component.type}</Badge>
                            </div>
                            <Badge variant="secondary">
                              {component.drifts.length} drift{component.drifts.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            {component.drifts.slice(0, 2).map((drift, driftIdx) => (
                              <div key={driftIdx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                <div className="flex items-center gap-2">
                                  {getSeverityIcon(drift.severity)}
                                  <span className="text-sm">{drift.property}</span>
                                  <Badge variant={getSeverityBadgeVariant(drift.severity)} className="text-xs">
                                    {drift.severity}
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => remediateDriftMutation.mutate({ 
                                    serviceId: result.service, 
                                    driftId: `${component.name}-${driftIdx}` 
                                  })}
                                  disabled={remediateDriftMutation.isPending}
                                  data-testid={`button-remediate-${component.name}-${driftIdx}`}
                                >
                                  Remediate
                                </Button>
                              </div>
                            ))}
                            {component.drifts.length > 2 && (
                              <p className="text-xs text-muted-foreground">
                                +{component.drifts.length - 2} more drift{component.drifts.length - 2 !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="drifts" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-4">
              {isLoading ? (
                <div className="space-y-3" data-testid="loading-drifts">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredDrifts.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground" data-testid="text-no-drifts">
                    No configuration drifts found matching your filters
                  </CardContent>
                </Card>
              ) : (
                filteredDrifts.map((drift, index) => (
                  <Card key={index} className="hover-elevate" data-testid={`card-drift-${index}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {getSeverityIcon(drift.severity)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm" data-testid={`text-drift-resource-${index}`}>
                                {drift.resourceType}: {drift.resourceId}
                              </h4>
                              <Badge variant={getSeverityBadgeVariant(drift.severity)} className="text-xs">
                                {drift.severity}
                              </Badge>
                              <div className="flex items-center gap-1">
                                {getCategoryIcon(drift.category)}
                                <span className="text-xs text-muted-foreground">{drift.category}</span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Property</p>
                                <p className="font-mono" data-testid={`text-drift-property-${index}`}>{drift.property}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Service</p>
                                <p data-testid={`text-drift-service-${index}`}>{drift.service} / {drift.component}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Expected</p>
                                <p className="font-mono text-green-600" data-testid={`text-drift-expected-${index}`}>{drift.expectedValue}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Actual</p>
                                <p className="font-mono text-red-600" data-testid={`text-drift-actual-${index}`}>{drift.actualValue}</p>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <p className="text-muted-foreground text-sm mb-1">Remediation</p>
                              <p className="text-sm" data-testid={`text-drift-remediation-${index}`}>{drift.remediation}</p>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => remediateDriftMutation.mutate({ 
                            serviceId: drift.service, 
                            driftId: `drift-${index}` 
                          })}
                          disabled={remediateDriftMutation.isPending}
                          data-testid={`button-remediate-drift-${index}`}
                        >
                          Fix Drift
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DriftDetectionDashboard;