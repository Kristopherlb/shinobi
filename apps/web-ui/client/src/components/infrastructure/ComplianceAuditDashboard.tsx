import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, FileText, User, Calendar, Filter, Search, Download, Eye, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { AuditLogEntry, AuditLogFilters } from "@shared/contracts";

interface ComplianceAuditDashboardProps {
  className?: string;
}

export function ComplianceAuditDashboard({ className }: ComplianceAuditDashboardProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [complianceOnly, setComplianceOnly] = useState(false);
  const [dateRange, setDateRange] = useState<string>("24h");
  const { toast } = useToast();

  // Mock data - will be replaced with real MCP API calls
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['/api/admin/audit', serviceFilter, actionFilter, severityFilter, actorFilter, dateRange],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return [
        {
          id: "audit-001",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          service: "payment-service",
          component: "payment-db",
          action: "schema-migration",
          actor: { type: "user", id: "user-123", name: "Sarah Chen" },
          target: { type: "database", id: "payment-db-prod", name: "Payment Database" },
          changes: {
            before: { version: "1.2.3", tables: 15 },
            after: { version: "1.3.0", tables: 17 }
          },
          metadata: { 
            environment: "production", 
            migrationScript: "V1_3_0__Add_refund_tables.sql",
            reviewedBy: "tech-lead@company.com",
            automatedBackup: true
          },
          severity: "info",
          complianceRelevant: true
        },
        {
          id: "audit-002",
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          service: "user-auth-service",
          component: "auth-api",
          action: "configuration-updated",
          actor: { type: "automation", id: "github-actions", name: "GitHub Actions CI/CD" },
          target: { type: "service", id: "auth-api-prod", name: "Authentication API" },
          changes: {
            before: { replicas: 2, cpu: "300m", memory: "512Mi" },
            after: { replicas: 3, cpu: "300m", memory: "512Mi" }
          },
          metadata: { 
            environment: "production", 
            deploymentId: "deploy-789",
            triggeredBy: "auto-scaling",
            reason: "high-load-detected"
          },
          severity: "info",
          complianceRelevant: false
        },
        {
          id: "audit-003",
          timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
          service: "payment-service",
          component: "payment-api",
          action: "security-policy-violation",
          actor: { type: "system", id: "security-scanner", name: "Security Scanner" },
          target: { type: "endpoint", id: "/api/payments/process", name: "Payment Processing Endpoint" },
          changes: {
            before: { allowedIPs: ["*"] },
            after: { allowedIPs: ["10.0.0.0/8", "172.16.0.0/12"] }
          },
          metadata: { 
            environment: "production", 
            violationType: "unrestricted-access",
            severity: "high",
            autoRemediated: true,
            complianceFramework: "fedramp-moderate"
          },
          severity: "warning",
          complianceRelevant: true
        },
        {
          id: "audit-004",
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          service: "notification-service",
          component: "notification-queue",
          action: "access-granted",
          actor: { type: "user", id: "user-456", name: "Mike Johnson" },
          target: { type: "resource", id: "notification-queue-prod", name: "Notification Queue" },
          metadata: { 
            environment: "production", 
            accessLevel: "read-write",
            grantedBy: "admin@company.com",
            justification: "oncall-debugging",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString()
          },
          severity: "info",
          complianceRelevant: true
        },
        {
          id: "audit-005",
          timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          service: "payment-service",
          action: "compliance-scan-completed",
          actor: { type: "system", id: "compliance-scanner", name: "Compliance Scanner" },
          target: { type: "service", id: "payment-service", name: "Payment Service" },
          metadata: { 
            environment: "production", 
            scanType: "fedramp-moderate",
            findings: 3,
            criticalFindings: 0,
            status: "passed-with-warnings",
            reportId: "compliance-rpt-001"
          },
          severity: "info",
          complianceRelevant: true
        }
      ];
    }
  });

  const filteredLogs = auditLogs?.filter(log => {
    const matchesSearch = log.service.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         log.actor.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesService = serviceFilter === "all" || log.service === serviceFilter;
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
    const matchesActor = actorFilter === "all" || log.actor.type === actorFilter;
    const matchesCompliance = !complianceOnly || log.complianceRelevant;
    
    return matchesSearch && matchesService && matchesAction && matchesSeverity && matchesActor && matchesCompliance;
  }) || [];

  const getActorIcon = (actorType: string) => {
    switch (actorType) {
      case "user": return <User className="w-4 h-4 text-blue-500" />;
      case "system": return <Shield className="w-4 h-4 text-purple-500" />;
      case "automation": return <FileText className="w-4 h-4 text-green-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
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

  const exportAuditReport = () => {
    toast({
      title: "Audit report generated",
      description: "Compliance audit report has been exported successfully.",
    });
  };

  const complianceStats = {
    totalLogs: auditLogs?.length || 0,
    complianceLogs: auditLogs?.filter(log => log.complianceRelevant).length || 0,
    criticalEvents: auditLogs?.filter(log => log.severity === "critical").length || 0,
    userActions: auditLogs?.filter(log => log.actor.type === "user").length || 0,
    systemActions: auditLogs?.filter(log => log.actor.type === "system").length || 0,
    automationActions: auditLogs?.filter(log => log.actor.type === "automation").length || 0
  };

  const actionTypes = Array.from(new Set(auditLogs?.map(log => log.action) || []));
  const services = Array.from(new Set(auditLogs?.map(log => log.service) || []));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-audit-title">Compliance Audit Trail</h1>
          <p className="text-muted-foreground" data-testid="text-audit-subtitle">
            Monitor and track all platform activities for compliance and governance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportAuditReport} data-testid="button-export-audit">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card data-testid="card-total-logs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-xl font-bold">{complianceStats.totalLogs}</p>
              </div>
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-compliance-logs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliance</p>
                <p className="text-xl font-bold text-blue-600">{complianceStats.complianceLogs}</p>
              </div>
              <Shield className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-events">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-xl font-bold text-red-600">{complianceStats.criticalEvents}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-user-actions">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">User Actions</p>
                <p className="text-xl font-bold text-blue-600">{complianceStats.userActions}</p>
              </div>
              <User className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-system-actions">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Actions</p>
                <p className="text-xl font-bold text-purple-600">{complianceStats.systemActions}</p>
              </div>
              <Shield className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-automation-actions">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Automation</p>
                <p className="text-xl font-bold text-green-600">{complianceStats.automationActions}</p>
              </div>
              <FileText className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search audit logs..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
            data-testid="input-audit-search"
          />
        </div>
        
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger data-testid="select-service-filter">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {services.map(service => (
              <SelectItem key={service} value={service}>{service}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger data-testid="select-action-filter">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes.map(action => (
              <SelectItem key={action} value={action}>{action}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger data-testid="select-severity-filter">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={actorFilter} onValueChange={setActorFilter}>
          <SelectTrigger className="w-40" data-testid="select-actor-filter">
            <SelectValue placeholder="Actor Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actors</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="automation">Automation</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32" data-testid="select-date-range">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={complianceOnly ? "default" : "outline"}
          onClick={() => setComplianceOnly(!complianceOnly)}
          data-testid="button-compliance-filter"
        >
          <Shield className="w-4 h-4 mr-2" />
          Compliance Only
        </Button>
      </div>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-4" data-testid="loading-audit-logs">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground" data-testid="text-no-audit-logs">
                    No audit logs found matching your filters
                  </CardContent>
                </Card>
              ) : (
                filteredLogs.map((log) => (
                  <Card key={log.id} className="hover-elevate" data-testid={`card-audit-log-${log.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {getActorIcon(log.actor.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-sm" data-testid={`text-audit-action-${log.id}`}>
                                {log.action.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h4>
                              <Badge variant={getSeverityBadgeVariant(log.severity)} className="text-xs">
                                {log.severity}
                              </Badge>
                              {log.complianceRelevant && (
                                <Badge variant="outline" className="text-xs">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Compliance
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                              <div>
                                <p className="text-muted-foreground">Actor</p>
                                <p data-testid={`text-audit-actor-${log.id}`}>
                                  {log.actor.name} ({log.actor.type})
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Target</p>
                                <p data-testid={`text-audit-target-${log.id}`}>
                                  {log.target.name}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Service</p>
                                <p data-testid={`text-audit-service-${log.id}`}>
                                  {log.service}{log.component && ` / ${log.component}`}
                                </p>
                              </div>
                            </div>

                            {log.changes && (
                              <div className="mb-3">
                                <p className="text-muted-foreground text-sm mb-1">Changes</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Before</p>
                                    <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto" data-testid={`text-audit-before-${log.id}`}>
                                      {JSON.stringify(log.changes.before, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">After</p>
                                    <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto" data-testid={`text-audit-after-${log.id}`}>
                                      {JSON.stringify(log.changes.after, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span data-testid={`text-audit-timestamp-${log.id}`}>
                                {format(new Date(log.timestamp), 'PPpp')} 
                                ({formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })})
                              </span>
                              <span>ID: {log.id}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button variant="ghost" size="sm" data-testid={`button-view-audit-${log.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ComplianceAuditDashboard;