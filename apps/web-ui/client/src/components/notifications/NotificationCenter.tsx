import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, CheckCircle, AlertTriangle, XCircle, Clock, Filter, Search, Archive, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Alert, ServiceHealthCheck, AuditLogEntry, ServiceComponentStatus } from "@shared/contracts";

interface NotificationData {
  alerts: Alert[];
  healthChecks: ServiceHealthCheck[];
  auditLogs: AuditLogEntry[];
}

interface NotificationCenterProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function NotificationCenter({ isOpen = false, onClose }: NotificationCenterProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { toast } = useToast();

  // Mock data for now - will be replaced with real MCP API calls
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['/api/notifications', severityFilter, typeFilter],
    queryFn: async (): Promise<NotificationData> => {
      // Mock implementation - replace with real MCP API calls
      const alerts: Alert[] = [
        {
          id: "alert-1",
          severity: "critical",
          title: "Database Connection Failed",
          description: "Payment service database is unreachable. Multiple connection timeouts detected.",
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        },
        {
          id: "alert-2", 
          severity: "warning",
          title: "High Memory Usage",
          description: "API Gateway instance memory usage at 85%. Consider scaling up.",
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        },
        {
          id: "alert-3",
          severity: "info", 
          title: "Deployment Completed",
          description: "User authentication service v2.1.3 deployed successfully to production.",
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          resolvedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        }
      ];

      const healthChecks: ServiceHealthCheck[] = [
        {
          name: "payment-db-health",
          status: "critical",
          lastChecked: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          message: "Connection timeout after 30 seconds",
          endpoint: "https://api.payment.example.com/health"
        },
        {
          name: "api-gateway-health", 
          status: "warning",
          lastChecked: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
          message: "Response time degraded (2.5s avg)",
          endpoint: "https://api.gateway.example.com/health"
        }
      ];

      const auditLogs: AuditLogEntry[] = [
        {
          id: "audit-1",
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          service: "payment-service",
          action: "configuration-updated",
          actor: { type: "user", id: "user-123", name: "Sarah Chen" },
          target: { type: "component", id: "payment-db", name: "Payment Database" },
          metadata: { environment: "production", changeType: "schema-migration" },
          severity: "info",
          complianceRelevant: true
        }
      ];

      return { alerts, healthChecks, auditLogs };
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      // Mock implementation - replace with real MCP API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Alert acknowledged",
        description: "The alert has been marked as acknowledged.",
      });
    }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="w-4 h-4 text-red-500" data-testid="icon-critical" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500" data-testid="icon-warning" />;
      case "info": return <CheckCircle className="w-4 h-4 text-blue-500" data-testid="icon-info" />;
      default: return <Clock className="w-4 h-4 text-gray-500" data-testid="icon-default" />;
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case "critical": return <XCircle className="w-4 h-4 text-red-500" data-testid="icon-health-critical" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500" data-testid="icon-health-warning" />;
      case "passing": return <CheckCircle className="w-4 h-4 text-green-500" data-testid="icon-health-passing" />;
      default: return <Clock className="w-4 h-4 text-gray-500" data-testid="icon-health-unknown" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "warning": return "secondary";
      case "info": return "outline";
      default: return "outline";
    }
  };

  const filteredAlerts = notifications?.alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesUnread = !unreadOnly || !alert.acknowledgedAt;
    return matchesSearch && matchesSeverity && matchesUnread;
  }) || [];

  const unreadCount = notifications?.alerts.filter(alert => !alert.acknowledgedAt).length || 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" data-testid="notification-center-overlay">
      <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" data-testid="icon-notifications" />
              <h2 className="text-lg font-semibold" data-testid="text-notifications-title">Notifications</h2>
              {unreadCount > 0 && (
                <Badge variant="destructive" data-testid="badge-unread-count">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              data-testid="button-close-notifications"
            >
              ×
            </Button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9"
                data-testid="input-notification-search"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="flex-1" data-testid="select-severity-filter">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="flex-1" data-testid="select-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="alerts">Alerts</SelectItem>
                  <SelectItem value="health">Health Checks</SelectItem>
                  <SelectItem value="audit">Audit Logs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={unreadOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setUnreadOnly(!unreadOnly)}
                data-testid="button-unread-filter"
              >
                Unread Only
              </Button>
              <Button variant="outline" size="sm" data-testid="button-mark-all-read">
                <Check className="w-4 h-4 mr-1" />
                Mark All Read
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={typeFilter === "all" ? "alerts" : typeFilter} onValueChange={setTypeFilter}>
              <TabsList className="grid w-full grid-cols-3 mx-4 mt-2">
                <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
                <TabsTrigger value="health" data-testid="tab-health">Health</TabsTrigger>
                <TabsTrigger value="audit" data-testid="tab-audit">Audit</TabsTrigger>
              </TabsList>

              <TabsContent value="alerts" className="mt-4">
                <ScrollArea className="h-full px-4">
                  {isLoading ? (
                    <div className="space-y-3" data-testid="loading-alerts">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filteredAlerts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8" data-testid="text-no-alerts">
                      No alerts found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAlerts.map((alert) => (
                        <Card 
                          key={alert.id} 
                          className={`transition-colors hover-elevate ${!alert.acknowledgedAt ? 'border-l-4 border-l-destructive' : ''}`}
                          data-testid={`card-alert-${alert.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2 flex-1">
                                {getSeverityIcon(alert.severity)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-sm truncate" data-testid={`text-alert-title-${alert.id}`}>
                                      {alert.title}
                                    </h4>
                                    <Badge 
                                      variant={getSeverityBadgeVariant(alert.severity)}
                                      className="text-xs"
                                      data-testid={`badge-alert-severity-${alert.id}`}
                                    >
                                      {alert.severity}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2" data-testid={`text-alert-description-${alert.id}`}>
                                    {alert.description}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground" data-testid={`text-alert-time-${alert.id}`}>
                                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                                    </span>
                                    {alert.resolvedAt ? (
                                      <Badge variant="outline" className="text-xs">
                                        Resolved
                                      </Badge>
                                    ) : !alert.acknowledgedAt ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                                        disabled={acknowledgeMutation.isPending}
                                        data-testid={`button-acknowledge-${alert.id}`}
                                      >
                                        Acknowledge
                                      </Button>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">
                                        Acknowledged
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="health" className="mt-4">
                <ScrollArea className="h-full px-4">
                  <div className="space-y-3">
                    {notifications?.healthChecks.map((check, index) => (
                      <Card key={index} className="hover-elevate" data-testid={`card-health-${index}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {getHealthStatusIcon(check.status)}
                            <h4 className="font-medium text-sm" data-testid={`text-health-name-${index}`}>
                              {check.name}
                            </h4>
                            <Badge 
                              variant={check.status === "passing" ? "outline" : check.status === "warning" ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {check.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2" data-testid={`text-health-message-${index}`}>
                            {check.message}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span data-testid={`text-health-time-${index}`}>
                              Last checked: {formatDistanceToNow(new Date(check.lastChecked), { addSuffix: true })}
                            </span>
                            {check.endpoint && (
                              <span className="font-mono truncate" data-testid={`text-health-endpoint-${index}`}>
                                {new URL(check.endpoint).hostname}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="audit" className="mt-4">
                <ScrollArea className="h-full px-4">
                  <div className="space-y-3">
                    {notifications?.auditLogs.map((log) => (
                      <Card key={log.id} className="hover-elevate" data-testid={`card-audit-${log.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium" data-testid={`text-audit-actor-${log.id}`}>
                                {log.actor.name}
                              </span>
                              <span className="text-xs text-muted-foreground">({log.actor.type})</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {log.action}
                            </Badge>
                            {log.complianceRelevant && (
                              <Badge variant="secondary" className="text-xs">
                                Compliance
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2" data-testid={`text-audit-target-${log.id}`}>
                            Target: {log.target.name} ({log.target.type})
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span data-testid={`text-audit-service-${log.id}`}>
                              Service: {log.service}
                            </span>
                            <span data-testid={`text-audit-time-${log.id}`}>
                              {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationCenter;